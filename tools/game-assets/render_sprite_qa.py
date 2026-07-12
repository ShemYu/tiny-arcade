#!/usr/bin/env python3
"""Render deterministic review artifacts from a sprite QA JSON report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


CHECKER_A = (36, 43, 48, 255)
CHECKER_B = (47, 55, 60, 255)
INK = (239, 244, 224, 255)
MUTED = (168, 184, 166, 255)
CYAN = (71, 224, 214, 255)
YELLOW = (255, 212, 107, 255)
RED = (255, 98, 91, 255)
MAGENTA = (235, 116, 255, 255)
SAFE = (126, 230, 151, 255)
PANEL = (17, 25, 30, 255)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("out_dir", type=Path)
    return parser.parse_args()


def font(size: int = 12) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", size=size)
    except OSError:
        return ImageFont.load_default()


def checker(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], tile: int = 8) -> None:
    left, top, right, bottom = box
    for y in range(top, bottom, tile):
        for x in range(left, right, tile):
            color = CHECKER_A if ((x - left) // tile + (y - top) // tile) % 2 == 0 else CHECKER_B
            draw.rectangle((x, y, min(right - 1, x + tile - 1), min(bottom - 1, y + tile - 1)), fill=color)


def frame_metric(action: dict[str, Any], direction: str, column: int) -> dict[str, Any]:
    for metric in action["frames"]:
        if metric["direction"] == direction and metric["column"] == column:
            return metric
    raise KeyError((direction, column))


def extract_frame(
    root: Path,
    action: dict[str, Any],
    direction: str,
    column: int,
    direction_rows: list[str],
    cell: tuple[int, int],
) -> Image.Image:
    image = Image.open(root / action["path"]).convert("RGBA")
    row = direction_rows.index(direction)
    width, height = cell
    return image.crop((column * width, row * height, (column + 1) * width, (row + 1) * height))


def draw_frame_overlays(
    draw: ImageDraw.ImageDraw,
    left: int,
    top: int,
    metric: dict[str, Any],
    anchor: tuple[int, int],
    cell: tuple[int, int] = (96, 96),
    body_padding: int = 4,
    body_top_padding: int = 8,
) -> None:
    draw.rectangle(
        (
            left + body_padding,
            top + body_top_padding,
            left + cell[0] - body_padding - 1,
            top + cell[1] - body_padding - 1,
        ),
        outline=SAFE,
        width=1,
    )
    if metric["bbox"]:
        x0, y0, x1, y1 = metric["bbox"]
        draw.rectangle((left + x0, top + y0, left + x1 - 1, top + y1 - 1), outline=CYAN, width=1)
    if metric["core_bbox"]:
        x0, y0, x1, y1 = metric["core_bbox"]
        draw.rectangle((left + x0, top + y0, left + x1 - 1, top + y1 - 1), outline=YELLOW, width=1)
        if y0 < body_top_padding:
            draw.line((left + x0, top + body_top_padding, left + x1 - 1, top + body_top_padding), fill=RED, width=2)
        if cell[1] - y1 < body_padding:
            draw.line(
                (left + x0, top + cell[1] - body_padding - 1, left + x1 - 1, top + cell[1] - body_padding - 1),
                fill=RED,
                width=2,
            )

    anchor_x, anchor_y = anchor
    draw.line((left, top + anchor_y, left + 95, top + anchor_y), fill=RED, width=1)
    draw.line((left + anchor_x - 3, top + anchor_y, left + anchor_x + 3, top + anchor_y), fill=RED, width=1)
    draw.line((left + anchor_x, top + anchor_y - 3, left + anchor_x, top + anchor_y + 3), fill=RED, width=1)
    root_x, root_y = metric["measured_root_px"]
    draw.ellipse((left + root_x - 2, top + root_y - 2, left + root_x + 2, top + root_y + 2), outline=MAGENTA, width=1)


def render_contact_sheet(
    root: Path,
    report: dict[str, Any],
    out_path: Path,
) -> Image.Image:
    actions = list(report["actions"])
    directions = report["contract"]["direction_rows"]
    cell = tuple(int(value) for value in report["contract"]["cell"])
    anchor = tuple(int(value) for value in report["contract"]["anchor_px"])
    left_label = 54
    header = 70
    gap = 8
    panel_width = cell[0] + gap
    panel_height = cell[1] + gap
    width = left_label + len(actions) * panel_width + 12
    height = header + len(directions) * panel_height + 12
    sheet = Image.new("RGBA", (width, height), PANEL)
    draw = ImageDraw.Draw(sheet)
    body_padding = int(report["contract"].get("body_padding_px", 4))
    body_top_padding = int(report["contract"].get("body_top_padding_px", body_padding))
    draw.text((12, 8), "REJECTED SOURCE / comparable entry frames", fill=RED, font=font(13))
    draw.text((12, 29), "green=body-safe area  cyan=alpha  yellow=core proxy", fill=MUTED, font=font(9))
    draw.text((12, 43), "red=violated edge/root y82  magenta=measured root", fill=MUTED, font=font(9))

    for action_index, action_id in enumerate(actions):
        left = left_label + action_index * panel_width
        draw.text((left + 2, header - 14), action_id.upper(), fill=INK, font=font(9))

    for row, direction in enumerate(directions):
        top = header + row * panel_height
        draw.text((10, top + 41), direction, fill=INK, font=font(12))
        for action_index, action_id in enumerate(actions):
            action = report["actions"][action_id]
            column = int(action["comparable_columns"][0])
            left = left_label + action_index * panel_width
            checker(draw, (left, top, left + cell[0], top + cell[1]))
            sprite = extract_frame(root, action, direction, column, directions, cell)
            sheet.alpha_composite(sprite, (left, top))
            metric = frame_metric(action, direction, column)
            draw_frame_overlays(draw, left, top, metric, anchor, cell, body_padding, body_top_padding)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)
    return sheet


def terrain(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGBA", size, (25, 55, 46, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, height, 16):
        tone = (30 + (y // 16) % 3 * 3, 66 + (y // 16) % 2 * 4, 53, 255)
        draw.rectangle((0, y, width, y + 15), fill=tone)
    path_left = int(width * 0.34)
    path_right = int(width * 0.66)
    draw.polygon(
        ((path_left - 18, 0), (path_right + 18, 0), (path_right, height), (path_left, height)),
        fill=(74, 78, 62, 255),
    )
    for y in range(8, height, 28):
        draw.line((path_left, y, path_right, y + 9), fill=(98, 99, 75, 150), width=2)
    return image


def draw_normalized_candidate(
    image: Image.Image,
    frame: Image.Image,
    center_x: int,
    root_y: int,
    scale: float,
) -> tuple[int, int]:
    bbox = frame.getchannel("A").getbbox()
    if bbox is None:
        return (0, 0)
    content = frame.crop(bbox)
    size = (
        max(1, round(content.width * scale)),
        max(1, round(content.height * scale)),
    )
    resized = content.resize(size, Image.Resampling.NEAREST)
    image.alpha_composite(resized, (center_x - resized.width // 2, root_y - resized.height))
    return resized.size


def render_scale_lineup(root: Path, report: dict[str, Any], out_path: Path) -> None:
    width, height = 960, 430
    image = terrain((width, height))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, width, 76), fill=(10, 17, 21, 232))
    draw.text((24, 16), "SOURCE REJECTED / SCALE DIAGNOSTIC ONLY", fill=RED, font=font(20))
    draw.text((24, 45), "No existing frame is an approved seed. Scaling cannot repair transition drift.", fill=MUTED, font=font(12))

    identity = report["diagnostic_reference"]
    action = report["actions"][identity["action"]]
    directions = report["contract"]["direction_rows"]
    cell = tuple(int(value) for value in report["contract"]["cell"])
    frame = extract_frame(root, action, identity["direction"], int(identity["column"]), directions, cell)
    root_y = 315
    positions = [120, 360, 600, 840]
    candidates = [
        ("LEGACY 1.00", 1.0, False),
        ("DIAG 0.84", 0.84, True),
        ("DIAG 0.82", 0.82, True),
        ("DIAG 0.72", 0.72, True),
    ]

    draw.line((24, root_y, width - 24, root_y), fill=RED, width=2)
    for center_x, (label, scale, normalized) in zip(positions, candidates):
        if normalized:
            rendered_size = draw_normalized_candidate(image, frame, center_x, root_y, scale)
            foot_note = "root corrected"
        else:
            anchor_y = int(report["contract"]["anchor_px"][1])
            image.alpha_composite(frame, (center_x - cell[0] // 2, root_y - anchor_y))
            rendered_size = cell
            foot_note = "feet +12px"

        css_height = round(87 * scale * 390 / 720, 1)
        draw.text((center_x - 70, 350), label, fill=INK, font=font(12))
        draw.text((center_x - 70, 372), f"390px view: ~{css_height}px body", fill=MUTED, font=font(10))
        draw.text((center_x - 70, 391), f"{foot_note} / render {rendered_size[1]}px", fill=YELLOW if normalized else RED, font=font(9))

    image.save(out_path)


def stage_frame(
    root: Path,
    report: dict[str, Any],
    action_id: str,
    direction: str,
    column: int,
    *,
    size: tuple[int, int] = (390, 440),
) -> Image.Image:
    width, height = size
    image = terrain(size)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, width, 58), fill=(9, 15, 19, 235))
    draw.text((16, 12), f"{action_id.upper()} / {direction} / frame {column + 1}", fill=INK, font=font(15))
    draw.text((16, 34), "actual 390px battle projection", fill=MUTED, font=font(10))
    directions = report["contract"]["direction_rows"]
    cell = tuple(int(value) for value in report["contract"]["cell"])
    frame = extract_frame(root, report["actions"][action_id], direction, column, directions, cell)
    world_scale = width / 720
    display_size = (round(cell[0] * world_scale), round(cell[1] * world_scale))
    frame = frame.resize(display_size, Image.Resampling.NEAREST)
    root_x = width // 2
    root_y = 270
    anchor_x, anchor_y = report["contract"]["anchor_px"]
    left = round(root_x - anchor_x * world_scale)
    top = round(root_y - anchor_y * world_scale)
    image.alpha_composite(frame, (left, top))
    metric = frame_metric(report["actions"][action_id], direction, column)
    body_padding = int(report["contract"].get("body_padding_px", 4))
    body_top_padding = int(report["contract"].get("body_top_padding_px", body_padding))
    draw.rectangle(
        (left, top, left + display_size[0] - 1, top + display_size[1] - 1),
        outline=CYAN,
        width=1,
    )
    inset = max(1, round(body_padding * world_scale))
    top_inset = max(1, round(body_top_padding * world_scale))
    draw.rectangle(
        (
            left + inset,
            top + top_inset,
            left + display_size[0] - inset - 1,
            top + display_size[1] - inset - 1,
        ),
        outline=SAFE,
        width=1,
    )
    if metric["core_bbox"]:
        core = metric["core_bbox"]
        core_box = tuple(round(value * world_scale) for value in core)
        draw.rectangle(
            (
                left + core_box[0],
                top + core_box[1],
                left + core_box[2] - 1,
                top + core_box[3] - 1,
            ),
            outline=YELLOW,
            width=1,
        )
        if core[1] < body_top_padding:
            draw.rectangle((width - 132, 68, width - 16, 91), fill=(91, 20, 23, 235), outline=RED, width=1)
            draw.text((width - 123, 74), "EDGE COLLISION", fill=INK, font=font(10))
    draw.line((root_x - 42, root_y, root_x + 42, root_y), fill=RED, width=1)
    draw.line((root_x, root_y - 5, root_x, root_y + 5), fill=RED, width=1)
    draw.text((16, height - 42), "RED = runtime root y82 | visible feet land below it", fill=RED, font=font(10))
    draw.text((16, height - 22), "Review identity, equipment, scale pop and acting continuity.", fill=INK, font=font(9))
    return image


def render_transition_strips(root: Path, report: dict[str, Any], out_path: Path) -> None:
    directions = report["contract"]["direction_rows"]
    cell = tuple(int(value) for value in report["contract"]["cell"])
    anchor = tuple(int(value) for value in report["contract"]["anchor_px"])
    body_padding = int(report["contract"].get("body_padding_px", 4))
    body_top_padding = int(report["contract"].get("body_top_padding_px", body_padding))
    action_ids = [action for action in report["actions"] if action != "idle"]
    labels = ("idle-last", "entry", "extreme", "exit", "idle-first")
    group_gap = 14
    left_label = 46
    header = 72
    row_gap = 10
    group_width = cell[0] * len(labels)
    width = left_label + len(action_ids) * group_width + max(0, len(action_ids) - 1) * group_gap + 12
    height = header + len(directions) * (cell[1] + row_gap) + 12
    image = Image.new("RGBA", (width, height), PANEL)
    draw = ImageDraw.Draw(image)
    draw.text((12, 8), "REJECTED SOURCE / transition endpoints", fill=RED, font=font(14))
    draw.text((12, 29), "idle-last | entry | worst edge/scale frame | exit | idle-first", fill=MUTED, font=font(9))
    draw.text((12, 44), "Every action must enter and recover at the locked identity scale.", fill=MUTED, font=font(9))

    idle = report["actions"]["idle"]
    idle_last_column = idle["grid"][0] - 1
    for action_index, action_id in enumerate(action_ids):
        group_left = left_label + action_index * (group_width + group_gap)
        draw.text((group_left, 58), action_id.upper(), fill=INK, font=font(10))

    for direction_index, direction in enumerate(directions):
        top = header + direction_index * (cell[1] + row_gap)
        draw.text((10, top + 42), direction, fill=INK, font=font(11))
        idle_reference = frame_metric(idle, direction, 0)
        reference_height = int(idle_reference["core_height_px"])
        for action_index, action_id in enumerate(action_ids):
            action = report["actions"][action_id]
            transition = action.get("transition_columns", {})
            entry = int(transition.get("entry", 0))
            exit_column = int(transition.get("exit", action["grid"][0] - 1))
            candidates = [frame for frame in action["frames"] if frame["direction"] == direction]
            unsafe = [
                frame for frame in candidates
                if frame["core_bbox"] is not None and frame["core_bbox"][1] < body_top_padding
            ]
            if unsafe:
                extreme = min(unsafe, key=lambda frame: (frame["core_bbox"][1], -frame["core_height_px"]))
            else:
                extreme = max(
                    candidates,
                    key=lambda frame: abs(int(frame["core_height_px"]) - reference_height),
                )
            columns = [idle_last_column, entry, int(extreme["column"]), exit_column, 0]
            sources = [idle, action, action, action, idle]
            group_left = left_label + action_index * (group_width + group_gap)

            for slot, (label, source, column) in enumerate(zip(labels, sources, columns)):
                left = group_left + slot * cell[0]
                checker(draw, (left, top, left + cell[0], top + cell[1]))
                sprite = extract_frame(root, source, direction, column, directions, cell)
                image.alpha_composite(sprite, (left, top))
                metric = frame_metric(source, direction, column)
                draw_frame_overlays(draw, left, top, metric, anchor, cell, body_padding, body_top_padding)
                delta = int(metric["core_height_px"]) - reference_height
                color = RED if abs(delta) > max(2, round(reference_height * 0.03)) else MUTED
                draw.text((left + 3, top + 3), f"{label[:3]} {delta:+d}", fill=color, font=font(8))

    image.save(out_path)


def render_headroom_failures(root: Path, report: dict[str, Any], out_path: Path) -> None:
    directions = report["contract"]["direction_rows"]
    cell = tuple(int(value) for value in report["contract"]["cell"])
    anchor = tuple(int(value) for value in report["contract"]["anchor_px"])
    body_padding = int(report["contract"].get("body_padding_px", 4))
    body_top_padding = int(report["contract"].get("body_top_padding_px", body_padding))
    failures: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    for action_id, action in report["actions"].items():
        for metric in action["frames"]:
            if metric["core_bbox"] is not None and metric["core_bbox"][1] < body_top_padding:
                failures.append((action_id, action, metric))

    columns = 8
    label_height = 20
    gap = 6
    rows = max(1, (len(failures) + columns - 1) // columns)
    width = 12 + columns * (cell[0] + gap)
    height = 48 + rows * (cell[1] + label_height + gap)
    sheet = Image.new("RGBA", (width, height), PANEL)
    draw = ImageDraw.Draw(sheet)
    draw.text((12, 8), f"HEADROOM FAILURES / {len(failures)} frames below {body_top_padding}px", fill=RED, font=font(14))
    draw.text((12, 28), "Green = required safe box; red edge = body proxy crossed it.", fill=MUTED, font=font(9))

    for index, (action_id, action, metric) in enumerate(failures):
        row = index // columns
        column = index % columns
        left = 12 + column * (cell[0] + gap)
        top = 48 + row * (cell[1] + label_height + gap)
        checker(draw, (left, top, left + cell[0], top + cell[1]))
        sprite = extract_frame(
            root,
            action,
            metric["direction"],
            int(metric["column"]),
            directions,
            cell,
        )
        sheet.alpha_composite(sprite, (left, top))
        draw_frame_overlays(draw, left, top, metric, anchor, cell, body_padding, body_top_padding)
        draw.text(
            (left, top + cell[1] + 3),
            f"{action_id[:4]} {metric['direction']} f{metric['column'] + 1} top={metric['core_bbox'][1]}",
            fill=INK,
            font=font(8),
        )

    sheet.resize((sheet.width * 4, sheet.height * 4), Image.Resampling.NEAREST).save(out_path)


def render_transition_reel(root: Path, report: dict[str, Any], out_path: Path) -> None:
    direction = str(report["diagnostic_reference"].get("direction", "SE"))
    sequence: list[tuple[str, int, int]] = []

    def add(action: str, columns: list[int], duration: int) -> None:
        sequence.extend((action, column, duration) for column in columns)

    add("idle", list(range(6)), 143)
    add("walk", list(range(8)), 83)
    add("idle", [0, 1, 2], 143)
    add("attack", list(range(8)), 71)
    add("idle", [0, 1, 2], 143)
    add("cast", list(range(8)), 83)
    add("idle", [0, 1, 2], 143)
    add("hurt", list(range(4)), 83)
    add("idle", [0, 1, 2], 143)
    add("death", list(range(8)), 100)
    add("death", [7, 7, 7, 7], 160)

    frames = [
        stage_frame(root, report, action, direction, column)
        for action, column, _ in sequence
    ]
    durations = [duration for _, _, duration in sequence]
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        lossless=True,
        method=6,
    )


def render_action_loops(root: Path, report: dict[str, Any], out_path: Path) -> None:
    actions = list(report["actions"])
    direction = str(report["diagnostic_reference"].get("direction", "SE"))
    directions = report["contract"]["direction_rows"]
    cell = tuple(int(value) for value in report["contract"]["cell"])
    anchor = tuple(int(value) for value in report["contract"]["anchor_px"])
    frame_count = max(action["grid"][0] for action in report["actions"].values())
    rendered_frames: list[Image.Image] = []

    for tick in range(frame_count):
        image = Image.new("RGBA", (6 * 132 + 20, 190), PANEL)
        draw = ImageDraw.Draw(image)
        for action_index, action_id in enumerate(actions):
            action = report["actions"][action_id]
            column = min(tick, action["grid"][0] - 1)
            left = 10 + action_index * 132 + 18
            top = 38
            checker(draw, (left, top, left + cell[0], top + cell[1]))
            sprite = extract_frame(root, action, direction, column, directions, cell)
            image.alpha_composite(sprite, (left, top))
            metric = frame_metric(action, direction, column)
            draw_frame_overlays(
                draw,
                left,
                top,
                metric,
                anchor,
                cell,
                int(report["contract"].get("body_padding_px", 4)),
                int(report["contract"].get("body_top_padding_px", 8)),
            )
            draw.text((10 + action_index * 132, 12), action_id.upper(), fill=INK, font=font(11))
            draw.text((10 + action_index * 132, 148), f"core {metric['core_height_px']}px", fill=MUTED, font=font(9))
            draw.text((10 + action_index * 132, 165), f"root dY {metric['root_delta_px'][1]:g}", fill=RED, font=font(9))
        rendered_frames.append(image)

    rendered_frames[0].save(
        out_path,
        save_all=True,
        append_images=rendered_frames[1:],
        duration=140,
        loop=0,
        lossless=True,
        method=6,
    )


def main() -> None:
    args = parse_args()
    manifest_path = args.manifest.resolve()
    root = manifest_path.parent
    report = json.loads(args.report.resolve().read_text(encoding="utf-8"))
    out_dir = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    contact = render_contact_sheet(root, report, out_dir / "contact-sheet-1x.png")
    contact.resize((contact.width * 4, contact.height * 4), Image.Resampling.NEAREST).save(
        out_dir / "contact-sheet-4x.png"
    )
    render_scale_lineup(root, report, out_dir / "scale-lineup.png")
    render_action_loops(root, report, out_dir / "action-loops.webp")
    render_transition_reel(root, report, out_dir / "transition-reel.webp")
    render_transition_strips(root, report, out_dir / "transition-strips-1x.png")
    render_headroom_failures(root, report, out_dir / "headroom-failures-4x.png")

    summary = {
        "sprite_set_id": report["sprite_set_id"],
        "computed_qa_status": report["computed_qa_status"],
        "manual_art_status": report.get("manual_review", {}).get("status"),
        "release_eligible": report["summary"].get("production_eligible", False),
        "replacement_strategy": report.get("replacement_strategy"),
        "generated_artifacts": [
            "report.json",
            "contact-sheet-1x.png",
            "contact-sheet-4x.png",
            "scale-lineup.png",
            "action-loops.webp",
            "transition-reel.webp",
            "transition-strips-1x.png",
            "headroom-failures-4x.png",
        ],
        "browser_review_artifacts": [
            "mobile-390-current.png",
            "mobile-390-scale-082.png",
            "mobile-430-current.png",
            "mobile-430-scale-082.png",
            "mobile-390-hurt-se-f4.png",
            "mobile-430-hurt-se-f4.png",
        ],
    }
    (out_dir / "README.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
