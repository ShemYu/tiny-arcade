#!/usr/bin/env python3
"""Normalize one clean-room concept into review-only 96px sprite seeds.

This tool deliberately does not update runtime assets.  It creates several
uniform-scale candidates, one selected review frame, its semantic QA mask, and
deterministic preview/report artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, deque
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


RGBA = tuple[int, int, int, int]
RGB = tuple[int, int, int]


def pixels_of(image: Image.Image):
    return image.get_flattened_data()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_chroma_magenta(color: RGB) -> bool:
    red, green, blue = color
    return (
        red >= 180
        and blue >= 180
        and green <= 120
        and red - green >= 100
        and blue - green >= 100
        and abs(red - blue) <= 80
    )


def largest_component(mask: bytearray, width: int, height: int) -> bytearray:
    seen = bytearray(len(mask))
    largest: list[int] = []

    for start, value in enumerate(mask):
        if not value or seen[start]:
            continue
        queue = deque([start])
        seen[start] = 1
        component: list[int] = []

        while queue:
            index = queue.popleft()
            component.append(index)
            x = index % width
            y = index // width
            if x and mask[index - 1] and not seen[index - 1]:
                seen[index - 1] = 1
                queue.append(index - 1)
            if x + 1 < width and mask[index + 1] and not seen[index + 1]:
                seen[index + 1] = 1
                queue.append(index + 1)
            if y and mask[index - width] and not seen[index - width]:
                seen[index - width] = 1
                queue.append(index - width)
            if y + 1 < height and mask[index + width] and not seen[index + width]:
                seen[index + width] = 1
                queue.append(index + width)

        if len(component) > len(largest):
            largest = component

    result = bytearray(len(mask))
    for index in largest:
        result[index] = 1
    return result


def mask_bbox(mask: bytearray, width: int, height: int) -> tuple[int, int, int, int]:
    xs: list[int] = []
    ys: list[int] = []
    for index, value in enumerate(mask):
        if value:
            xs.append(index % width)
            ys.append(index // width)
    if not xs:
        raise ValueError("No foreground subject found after chroma segmentation.")
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1


def decontaminate_edge(
    pixels: list[RGB], mask: bytearray, width: int, height: int
) -> list[RGB]:
    """Replace the first contaminated silhouette ring with nearby interior color."""

    result = list(pixels)
    interior = bytearray(len(mask))
    boundary: list[int] = []

    for index, value in enumerate(mask):
        if not value:
            continue
        x = index % width
        y = index // width
        neighbors = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                neighbors.append(
                    0 <= nx < width
                    and 0 <= ny < height
                    and bool(mask[ny * width + nx])
                )
        if all(neighbors):
            interior[index] = 1
        else:
            boundary.append(index)

    for index in boundary:
        x = index % width
        y = index // width
        replacement: RGB | None = None
        for radius in range(1, 6):
            candidates: list[tuple[int, int, RGB]] = []
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    if max(abs(dx), abs(dy)) != radius:
                        continue
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    neighbor = ny * width + nx
                    if interior[neighbor] and not is_chroma_magenta(result[neighbor]):
                        candidates.append((dx * dx + dy * dy, neighbor, result[neighbor]))
            if candidates:
                replacement = min(candidates, key=lambda item: (item[0], item[1]))[2]
                break
        if replacement is not None:
            result[index] = replacement

    return result


def load_clean_subject(source: Path) -> tuple[Image.Image, tuple[int, int, int, int], int]:
    image = Image.open(source).convert("RGB")
    pixels = list(pixels_of(image))
    raw_mask = bytearray(0 if is_chroma_magenta(pixel) else 1 for pixel in pixels)
    subject_mask = largest_component(raw_mask, image.width, image.height)
    bbox = mask_bbox(subject_mask, image.width, image.height)
    cleaned = decontaminate_edge(pixels, subject_mask, image.width, image.height)
    rgba: list[RGBA] = [
        (*color, 255) if subject_mask[index] else (0, 0, 0, 0)
        for index, color in enumerate(cleaned)
    ]
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.putdata(rgba)
    return result, bbox, sum(subject_mask)


def normalized_raw(
    source: Image.Image,
    bbox: tuple[int, int, int, int],
    source_root: tuple[int, int],
    canvas_root: tuple[int, int],
    canvas_size: int,
    envelope: int,
) -> Image.Image:
    left, top, right, bottom = bbox
    source_height = source_root[1] - top
    if source_height <= 0:
        raise ValueError("Source root must be below the detected subject top.")
    scale = envelope / source_height
    crop = source.crop(bbox)
    resized_width = max(1, round(crop.width * scale))
    resized = crop.resize((resized_width, envelope), Image.Resampling.BOX)
    local_root_x = (source_root[0] - left) * resized_width / crop.width
    paste_x = round(canvas_root[0] - local_root_x)
    paste_y = canvas_root[1] - envelope
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (paste_x, paste_y))
    return canvas


def repair_target_chroma(image: Image.Image) -> Image.Image:
    pixels = list(pixels_of(image.convert("RGBA")))
    width, height = image.size
    output = list(pixels)
    contaminated = [
        index
        for index, (red, green, blue, alpha) in enumerate(pixels)
        if alpha and is_chroma_magenta((red, green, blue))
    ]
    for index in contaminated:
        x = index % width
        y = index // width
        replacement: RGBA | None = None
        for radius in range(1, 5):
            candidates: list[tuple[int, int, RGBA]] = []
            for dy in range(-radius, radius + 1):
                for dx in range(-radius, radius + 1):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < width and 0 <= ny < height):
                        continue
                    neighbor = ny * width + nx
                    color = pixels[neighbor]
                    if color[3] and not is_chroma_magenta(color[:3]):
                        candidates.append((dx * dx + dy * dy, neighbor, color))
            if candidates:
                replacement = min(candidates, key=lambda item: (item[0], item[1]))[2]
                break
        output[index] = replacement or (45, 25, 22, pixels[index][3])
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.putdata(output)
    return result


def quantize_values(values: list[RGB], colors: int) -> list[RGB]:
    if not values or colors <= 0:
        return []
    sample = Image.new("RGB", (len(values), 1))
    sample.putdata(values)
    quantized = sample.quantize(
        colors=min(colors, len(set(values))),
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.NONE,
    )
    used = sorted(set(pixels_of(quantized)))
    raw_palette = quantized.getpalette()
    return [
        tuple(raw_palette[index * 3 : index * 3 + 3])
        for index in used
    ]


def derive_palette(image: Image.Image, colors: int) -> list[RGB]:
    visible: list[RGB] = []
    teal: list[RGB] = []
    steel: list[RGB] = []
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = image.getpixel((x, y))
            if alpha < 96:
                continue
            color = (red, green, blue)
            visible.append(color)
            if green > red * 1.08 and blue > red * 0.9:
                teal.append(color)
            if (
                18 <= x <= 35
                and 57 <= y <= 78
                and max(color) - min(color) <= 85
                and sum(color) / 3 >= 72
            ):
                steel.append(color)
    if not visible:
        raise ValueError("Normalized seed contains no visible pixels.")

    # Global median-cut alone erases small but identity-critical teal and steel
    # accents.  Reserve eight slots for those semantic color families.
    base_count = max(1, colors - 8)
    candidates = (
        quantize_values(visible, base_count)
        + quantize_values(teal, 4)
        + quantize_values(steel, 4)
    )
    palette: list[RGB] = []
    for color in candidates + quantize_values(visible, colors):
        if color not in palette and not is_chroma_magenta(color):
            palette.append(color)
        if len(palette) == colors:
            break
    return palette


def nearest_palette(color: RGB, palette: list[RGB]) -> RGB:
    red, green, blue = color
    return min(
        palette,
        key=lambda candidate: (
            (red - candidate[0]) ** 2
            + (green - candidate[1]) ** 2
            + (blue - candidate[2]) ** 2,
            candidate,
        ),
    )


def connected_components(alpha: Image.Image) -> list[list[tuple[int, int]]]:
    width, height = alpha.size
    pixels = alpha.load()
    visible = {(x, y) for y in range(height) for x in range(width) if pixels[x, y]}
    components: list[list[tuple[int, int]]] = []
    while visible:
        start = min(visible, key=lambda item: (item[1], item[0]))
        visible.remove(start)
        queue = [start]
        component: list[tuple[int, int]] = []
        while queue:
            x, y = queue.pop()
            component.append((x, y))
            for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if neighbor in visible:
                    visible.remove(neighbor)
                    queue.append(neighbor)
        components.append(component)
    return sorted(components, key=lambda component: (-len(component), component[0]))


def finalize_seed(raw: Image.Image, palette: list[RGB]) -> Image.Image:
    raw = repair_target_chroma(raw)
    pixels = list(pixels_of(raw.convert("RGBA")))
    binary: list[RGBA] = []
    for red, green, blue, alpha in pixels:
        if alpha < 96:
            binary.append((0, 0, 0, 0))
        else:
            binary.append((*nearest_palette((red, green, blue), palette), 255))
    result = Image.new("RGBA", raw.size, (0, 0, 0, 0))
    result.putdata(binary)

    alpha = result.getchannel("A")
    components = connected_components(alpha)
    keep = {point for component in components if len(component) >= 2 for point in component}
    cleaned: list[RGBA] = []
    for y in range(result.height):
        for x in range(result.width):
            cleaned.append(result.getpixel((x, y)) if (x, y) in keep else (0, 0, 0, 0))
    result.putdata(cleaned)

    outline = min(
        palette,
        key=lambda color: (color[0] * 2126 + color[1] * 7152 + color[2] * 722, color),
    )
    alpha_pixels = result.getchannel("A").load()
    output = list(pixels_of(result))
    for y in range(result.height):
        for x in range(result.width):
            if not alpha_pixels[x, y]:
                continue
            exposed = False
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < result.width and 0 <= ny < result.height) or not alpha_pixels[nx, ny]:
                        exposed = True
                        break
                if exposed:
                    break
            if exposed:
                output[y * result.width + x] = (*outline, 255)
    result.putdata(output)
    return result


def source_label_canvas(size: tuple[int, int], subject_alpha: Image.Image) -> Image.Image:
    labels = Image.new("L", size, 0)
    labels.paste(2, mask=subject_alpha)
    shapes = Image.new("L", size, 0)
    draw = ImageDraw.Draw(shapes)
    draw.ellipse((470, 302, 760, 525), fill=255)
    draw.polygon(((448, 505), (704, 495), (735, 812), (433, 812)), fill=255)
    labels.paste(1, mask=Image.composite(subject_alpha, Image.new("L", size, 0), shapes))

    equipment = Image.new("L", size, 0)
    draw = ImageDraw.Draw(equipment)
    draw.polygon(
        ((204, 972), (247, 972), (407, 812), (395, 772), (432, 730), (466, 768), (431, 809), (286, 970)),
        fill=255,
    )
    draw.ellipse((702, 580, 952, 908), fill=255)
    labels.paste(3, mask=Image.composite(subject_alpha, Image.new("L", size, 0), equipment))
    return labels


def normalize_labels(
    source_labels: Image.Image,
    bbox: tuple[int, int, int, int],
    source_root: tuple[int, int],
    canvas_root: tuple[int, int],
    envelope: int,
    alpha: Image.Image,
    foot_ranges: list[tuple[int, int]],
) -> Image.Image:
    left, top, right, _bottom = bbox
    crop = source_labels.crop(bbox)
    scale = envelope / (source_root[1] - top)
    width = max(1, round(crop.width * scale))
    resized = crop.resize((width, envelope), Image.Resampling.NEAREST)
    local_root_x = (source_root[0] - left) * width / crop.width
    paste_x = round(canvas_root[0] - local_root_x)
    paste_y = canvas_root[1] - envelope
    labels = Image.new("L", alpha.size, 0)
    labels.paste(resized, (paste_x, paste_y))
    alpha_pixels = alpha.load()
    label_pixels = labels.load()

    for y in range(alpha.height):
        for x in range(alpha.width):
            if alpha_pixels[x, y] and label_pixels[x, y] == 0:
                label_pixels[x, y] = 2
            elif not alpha_pixels[x, y]:
                label_pixels[x, y] = 0

    # The generated concept has a narrow diagonal blade whose area reduction is
    # thinner than the high-resolution semantic polygon.  Restore the complete
    # equipment silhouette in logical coordinates after normalization.
    equipment_target = Image.new("L", alpha.size, 0)
    equipment_draw = ImageDraw.Draw(equipment_target)
    equipment_draw.polygon(
        ((17, 78), (26, 78), (38, 61), (41, 58), (40, 53), (34, 51), (31, 56), (34, 58)),
        fill=255,
    )
    equipment_draw.ellipse((56, 40, 75, 70), fill=255)
    equipment_pixels = equipment_target.load()
    for y in range(alpha.height):
        for x in range(alpha.width):
            if alpha_pixels[x, y] and equipment_pixels[x, y]:
                label_pixels[x, y] = 3

    for source_left, source_right in foot_ranges:
        target_left = round(canvas_root[0] + (source_left - source_root[0]) * scale)
        target_right = round(canvas_root[0] + (source_right - source_root[0]) * scale)
        for x in range(max(0, target_left), min(alpha.width, target_right + 1)):
            candidates = [
                y
                for y in range(max(0, canvas_root[1] - envelope // 3), canvas_root[1])
                if alpha_pixels[x, y] and label_pixels[x, y] != 3
            ]
            if candidates:
                label_pixels[x, max(candidates)] = 4
    return labels


def bbox_for_values(image: Image.Image, values: Iterable[int]) -> tuple[int, int, int, int] | None:
    selected = set(values)
    mask = image.point(lambda value: 255 if value in selected else 0)
    return mask.getbbox()


def component_sizes(alpha: Image.Image) -> list[int]:
    return [len(component) for component in connected_components(alpha)]


def seed_metrics(image: Image.Image, labels: Image.Image, canvas_root: tuple[int, int]) -> dict:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    body_bbox = bbox_for_values(labels, (1, 2, 4))
    core_bbox = bbox_for_values(labels, (1,))
    equipment_bbox = bbox_for_values(labels, (3,))
    contact_bbox = bbox_for_values(labels, (4,))
    if not bbox or not body_bbox or not core_bbox or not equipment_bbox or not contact_bbox:
        raise ValueError("Static seed mask is missing a required semantic region.")
    measured_root = [round((contact_bbox[0] + contact_bbox[2]) / 2), contact_bbox[3]]
    alpha_values = sorted(set(pixels_of(alpha)))
    transparent_rgb = sum(
        1 for red, green, blue, value in pixels_of(image)
        if value == 0 and (red or green or blue)
    )
    magenta_pixels = sum(
        1 for red, green, blue, value in pixels_of(image)
        if value and is_chroma_magenta((red, green, blue))
    )
    label_counts = Counter(pixels_of(labels))
    return {
        "bbox": list(bbox),
        "body_bbox": list(body_bbox),
        "core_bbox": list(core_bbox),
        "equipment_bbox": list(equipment_bbox),
        "contact_bbox": list(contact_bbox),
        "measured_root_px": measured_root,
        "root_delta_px": [measured_root[0] - canvas_root[0], measured_root[1] - canvas_root[1]],
        "top_clearance_px": body_bbox[1],
        "bottom_clearance_px": image.height - body_bbox[3],
        "side_clearance_px": [body_bbox[0], image.width - body_bbox[2]],
        "equipment_clearance_px": [
            equipment_bbox[0],
            equipment_bbox[1],
            image.width - equipment_bbox[2],
            image.height - equipment_bbox[3],
        ],
        "alpha_values": alpha_values,
        "transparent_rgb_pixels": transparent_rgb,
        "magenta_pixels": magenta_pixels,
        "foreground_colors": len({pixel[:3] for pixel in pixels_of(image) if pixel[3]}),
        "connected_components": component_sizes(alpha),
        "label_counts": {str(key): label_counts.get(key, 0) for key in range(6)},
    }


def evaluate_gates(metrics: dict, palette_limit: int) -> list[dict]:
    checks = [
        ("binary_alpha", metrics["alpha_values"] == [0, 255], metrics["alpha_values"]),
        ("transparent_rgb_zero", metrics["transparent_rgb_pixels"] == 0, metrics["transparent_rgb_pixels"]),
        ("no_chroma_spill", metrics["magenta_pixels"] == 0, metrics["magenta_pixels"]),
        ("palette_limit", metrics["foreground_colors"] <= palette_limit, metrics["foreground_colors"]),
        ("single_component", len(metrics["connected_components"]) == 1, metrics["connected_components"]),
        ("head_clearance", metrics["top_clearance_px"] >= 8, metrics["top_clearance_px"]),
        ("body_side_clearance", min(metrics["side_clearance_px"]) >= 4, metrics["side_clearance_px"]),
        ("body_bottom_clearance", metrics["bottom_clearance_px"] >= 4, metrics["bottom_clearance_px"]),
        ("equipment_clearance", min(metrics["equipment_clearance_px"]) >= 2, metrics["equipment_clearance_px"]),
        ("root_tolerance", max(abs(value) for value in metrics["root_delta_px"]) <= 2, metrics["root_delta_px"]),
        ("mask_has_no_vfx", metrics["label_counts"]["5"] == 0, metrics["label_counts"]["5"]),
    ]
    return [
        {"id": check_id, "passed": passed, "observed": observed}
        for check_id, passed, observed in checks
    ]


def terrain(width: int, height: int, tone: str) -> Image.Image:
    palettes = {
        "grass": ((52, 88, 67, 255), (63, 104, 77, 255)),
        "stone": ((83, 84, 72, 255), (104, 103, 85, 255)),
        "dark": ((22, 30, 36, 255), (31, 43, 48, 255)),
    }
    base, accent = palettes[tone]
    image = Image.new("RGBA", (width, height), base)
    draw = ImageDraw.Draw(image)
    for y in range(0, height, 12):
        for x in range((y // 12 % 2) * 6, width, 24):
            draw.rectangle((x, y, x + 7, y + 2), fill=accent)
    return image


def write_previews(
    out_dir: Path,
    seeds: dict[int, Image.Image],
    selected: int,
    labels: Image.Image,
    metrics: dict,
    palette: list[RGB],
    canvas_root: tuple[int, int],
) -> None:
    qa = out_dir / "qa"
    qa.mkdir(parents=True, exist_ok=True)
    seed = seeds[selected]
    seed.save(qa / "seed-1x.png")
    seed.resize((384, 384), Image.Resampling.NEAREST).save(qa / "seed-4x.png")

    guide = terrain(96, 96, "grass")
    guide.alpha_composite(seed)
    draw = ImageDraw.Draw(guide)
    draw.rectangle((2, 2, 93, 93), outline=(255, 116, 109, 255), width=1)
    draw.rectangle((4, 8, 91, 91), outline=(126, 230, 151, 255), width=1)
    draw.rectangle(tuple(metrics["bbox"]), outline=(121, 231, 213, 255), width=1)
    root_x, root_y = canvas_root
    draw.line((root_x - 5, root_y, root_x + 5, root_y), fill=(255, 116, 109, 255), width=1)
    draw.line((root_x, root_y - 5, root_x, root_y + 5), fill=(255, 116, 109, 255), width=1)
    guide.resize((384, 384), Image.Resampling.NEAREST).save(qa / "seed-guides-4x.png")

    ordered = sorted(seeds)
    lineup = terrain(96 * len(ordered), 112, "grass")
    draw = ImageDraw.Draw(lineup)
    for index, envelope in enumerate(ordered):
        panel_x = index * 96
        lineup.alpha_composite(seeds[envelope], (panel_x, 12))
        draw.text((panel_x + 4, 2), f"{envelope}px", fill=(255, 247, 202, 255))
        draw.line((panel_x + 43, 94, panel_x + 53, 94), fill=(255, 116, 109, 255))
    lineup.resize((lineup.width * 4, lineup.height * 4), Image.Resampling.NEAREST).save(
        qa / "scale-lineup-4x.png"
    )

    readability = Image.new("RGBA", (96 * 3, 112), (0, 0, 0, 255))
    for index, tone in enumerate(("grass", "stone", "dark")):
        panel = terrain(96, 112, tone)
        panel.alpha_composite(seed, (0, 12))
        ImageDraw.Draw(panel).text((4, 2), tone, fill=(255, 247, 202, 255))
        readability.alpha_composite(panel, (index * 96, 0))
    readability.resize((readability.width * 4, readability.height * 4), Image.Resampling.NEAREST).save(
        qa / "terrain-readability-4x.png"
    )

    swatch_size = 24
    swatches = Image.new("RGB", (swatch_size * 8, swatch_size * 4), (16, 22, 27))
    draw = ImageDraw.Draw(swatches)
    for index, color in enumerate(palette):
        x = (index % 8) * swatch_size
        y = (index // 8) * swatch_size
        draw.rectangle((x, y, x + swatch_size - 1, y + swatch_size - 1), fill=color)
    swatches.save(qa / "palette-swatches.png")


def parse_foot_range(value: str) -> tuple[int, int]:
    left, right = value.split(":", 1)
    return int(left), int(right)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--canvas-size", type=int, default=96)
    parser.add_argument("--source-root", nargs=2, type=int, default=(598, 1071))
    parser.add_argument("--canvas-root", nargs=2, type=int, default=(48, 82))
    parser.add_argument("--envelopes", nargs="+", type=int, default=(64, 70, 74))
    parser.add_argument("--selected-envelope", type=int, default=70)
    parser.add_argument("--palette-colors", type=int, default=28)
    parser.add_argument(
        "--scale-review-status",
        choices=("pending", "approved"),
        default="pending",
    )
    parser.add_argument("--scale-reviewed-on")
    parser.add_argument(
        "--art-review-status",
        choices=("pending", "approved", "rejected"),
        default="pending",
    )
    parser.add_argument(
        "--mobile-review-status",
        choices=("pending", "approved", "rejected"),
        default="pending",
    )
    parser.add_argument(
        "--semantic-direction-status",
        choices=("manual_review_required", "approved", "rejected_with_source_process"),
        default="manual_review_required",
    )
    parser.add_argument(
        "--source-foot-range",
        action="append",
        type=parse_foot_range,
        default=[],
        help="Inclusive source x range such as 433:585; repeat for both feet.",
    )
    args = parser.parse_args()

    source = args.source.resolve()
    out_dir = args.out_dir.resolve()
    candidate_dir = out_dir / "candidate"
    candidate_dir.mkdir(parents=True, exist_ok=True)
    foot_ranges = args.source_foot_range or [(433, 585), (608, 771)]
    source_root = tuple(args.source_root)
    canvas_root = tuple(args.canvas_root)
    envelopes = sorted(set(args.envelopes))
    if args.selected_envelope not in envelopes:
        raise ValueError("Selected envelope must be present in --envelopes.")

    subject, bbox, foreground_pixels = load_clean_subject(source)
    raw = {
        envelope: normalized_raw(
            subject,
            bbox,
            source_root,
            canvas_root,
            args.canvas_size,
            envelope,
        )
        for envelope in envelopes
    }
    palette = derive_palette(repair_target_chroma(raw[args.selected_envelope]), args.palette_colors)
    seeds = {envelope: finalize_seed(image, palette) for envelope, image in raw.items()}

    selected_seed = seeds[args.selected_envelope]
    source_labels = source_label_canvas(subject.size, subject.getchannel("A"))
    labels = normalize_labels(
        source_labels,
        bbox,
        source_root,
        canvas_root,
        args.selected_envelope,
        selected_seed.getchannel("A"),
        foot_ranges,
    )
    metrics = seed_metrics(selected_seed, labels, canvas_root)
    checks = evaluate_gates(metrics, args.palette_colors)
    passed = all(check["passed"] for check in checks)

    for envelope, image in seeds.items():
        image.save(candidate_dir / f"seed-se-{envelope}.png")
    selected_seed.save(candidate_dir / "seed-se.png")
    labels.save(candidate_dir / "seed-se-mask.png")

    palette_data = {
        "count": len(palette),
        "colors": [
            {"index": index, "hex": "#%02X%02X%02X" % color, "rgb": list(color)}
            for index, color in enumerate(palette)
        ],
    }
    (candidate_dir / "palette.json").write_text(
        json.dumps(palette_data, indent=2) + "\n", encoding="utf-8"
    )

    write_previews(out_dir, seeds, args.selected_envelope, labels, metrics, palette, canvas_root)
    report = {
        "schema_version": 1,
        "candidate_id": "blade-rank1-frontier-r1-se",
        "source": {
            "path": str(args.source),
            "sha256": sha256(source),
            "size": list(Image.open(source).size),
            "detected_subject_bbox": list(bbox),
            "foreground_pixels": foreground_pixels,
            "segmentation": "largest non-magenta component with tolerant chroma classifier",
        },
        "normalization": {
            "canvas_px": [args.canvas_size, args.canvas_size],
            "source_root_px": list(source_root),
            "canonical_root_px": list(canvas_root),
            "envelopes_px": envelopes,
            "selected_envelope_px": args.selected_envelope,
            "resampling": "premultiplied RGBA box reduction",
            "palette_limit": args.palette_colors,
            "alpha": "binary",
            "scale_scope": "single static candidate family",
        },
        "metrics": metrics,
        "checks": checks,
        "auto_qa_status": "passed" if passed else "failed",
        "review": {
            "concept": "approved",
            "scale": args.scale_review_status,
            "normalized_art": args.art_review_status,
            "mobile": args.mobile_review_status,
            "semantic_direction": args.semantic_direction_status,
        },
        "golden_scale": {
            "envelope_px": args.selected_envelope,
            "status": args.scale_review_status,
            "reviewed_on": args.scale_reviewed_on,
            "reason": (
                "70 px preserves the preferred novice-chibi silhouette and 12 px headroom; "
                "74 px remains a max-safe comparison at the 8 px minimum."
                if args.scale_review_status == "approved"
                else None
            ),
        },
        "manual_warning": (
            "The source body reads closer to South/front than an unambiguous 45-degree SE pose. "
            "Identity approval does not waive the direction/camera review gate."
        ),
        "generation_seed_eligible": False,
        "release_eligible": False,
        "files": {
            "seed": {
                "path": "../candidate/seed-se.png",
                "sha256": sha256(candidate_dir / "seed-se.png"),
            },
            "mask": {
                "path": "../candidate/seed-se-mask.png",
                "sha256": sha256(candidate_dir / "seed-se-mask.png"),
            },
            "palette": {
                "path": "../candidate/palette.json",
                "sha256": sha256(candidate_dir / "palette.json"),
            },
        },
    }
    report_path = out_dir / "qa" / "seed-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"STATIC SEED QA: {'PASSED' if passed else 'FAILED'}")
    print(f"- source bbox: {bbox}")
    print(f"- selected bbox: {metrics['bbox']}")
    print(f"- measured root: {metrics['measured_root_px']} delta={metrics['root_delta_px']}")
    print(f"- palette: {metrics['foreground_colors']} colors")
    for check in checks:
        print(f"- {'PASS' if check['passed'] else 'FAIL'} {check['id']}: {check['observed']}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
