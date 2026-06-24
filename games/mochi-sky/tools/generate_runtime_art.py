#!/usr/bin/env python3
"""Build deterministic runtime art for Mochi Sky.

The scene and inhale animation are authored independently so they stay stable:
- backdrop: distant scenery only, never foreground terrain
- tiles: horizontally seamless foreground terrain
- inhale sheet: eight fixed-size, fixed-baseline frames
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
OUT.mkdir(exist_ok=True)

INK = (52, 32, 61, 255)
INK_SOFT = (88, 53, 94, 255)
PINK = (255, 132, 183, 255)
PINK_DARK = (224, 82, 137, 255)
PINK_DEEP = (188, 61, 118, 255)
PINK_LIGHT = (255, 198, 220, 255)
FOOT = (232, 82, 120, 255)
FOOT_DARK = (190, 57, 100, 255)
WHITE = (255, 248, 232, 255)
YELLOW_LIGHT = (255, 245, 174, 255)

SKY_TOP = (185, 239, 255, 255)
SKY_BOTTOM = (112, 211, 250, 255)
CLOUD = (255, 250, 240, 255)
CLOUD_SHADE = (213, 235, 241, 255)
FAR_HILL = (166, 228, 206, 255)
FAR_HILL_DARK = (141, 211, 190, 255)
MID_HILL = (104, 205, 159, 255)
MID_HILL_DARK = (83, 179, 143, 255)
MIST = (150, 220, 209, 255)
MIST_DARK = (118, 196, 187, 255)

GRASS_LIGHT = (190, 239, 112, 255)
GRASS = (112, 214, 93, 255)
GRASS_DARK = (65, 160, 82, 255)
DIRT = (203, 137, 88, 255)
DIRT_LIGHT = (221, 158, 99, 255)
DIRT_DARK = (153, 91, 71, 255)
STONE = (178, 116, 88, 255)


def rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill) -> None:
    draw.rectangle((x, y, x + w - 1, y + h - 1), fill=fill)


def ellipse(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill) -> None:
    draw.ellipse(box, fill=fill)


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def draw_eye(draw: ImageDraw.ImageDraw, x: int, y: int, *, blink: bool = False) -> None:
    if blink:
        rect(draw, x, y + 2, 4, 1, INK)
        rect(draw, x + 3, y + 1, 1, 1, INK_SOFT)
        return

    rect(draw, x, y, 3, 5, INK)
    rect(draw, x + 2, y + 1, 2, 4, (120, 77, 157, 255))
    rect(draw, x, y, 1, 1, WHITE)
    rect(draw, x + 3, y + 3, 1, 1, (27, 17, 42, 255))


def draw_inhale_frame(frame: int) -> Image.Image:
    """Draw one 48x32 logical frame and upscale it to the 96x64 runtime cell."""
    img = Image.new("RGBA", (48, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Frames 0-4 are anticipation/ramp-up. Frames 5-7 form the hold loop.
    # Every pose shares the same foot contact line.
    states = [
        (17, 17, 11, 11, 2, False),
        (18, 18, 12, 10, 3, False),
        (19, 17, 12, 11, 4, False),
        (20, 16, 12, 12, 5, True),
        (20, 16, 13, 12, 6, True),
        (20, 16, 13, 12, 6, True),
        (21, 16, 13, 12, 7, True),
        (20, 17, 13, 11, 6, True),
    ]
    cx, cy, rx, ry, mouth, blink = states[frame]

    if frame >= 2:
        offsets_by_frame = {
            2: (0, 3, 6),
            3: (2, 5, 8),
            4: (4, 7, 1),
            5: (0, 4, 8),
            6: (3, 7, 1),
            7: (6, 1, 4),
        }
        colors = (
            (255, 249, 210, 220),
            (255, 255, 255, 160),
            (219, 245, 255, 185),
        )
        for index, (offset, y, length, color) in enumerate(
            zip(offsets_by_frame[frame], (10, 15, 21), (8, 10, 7), colors)
        ):
            x = 38 + offset
            height = 2 if index == 1 else 1
            if x + length <= 48:
                rect(draw, x, y, length, height, color)
            else:
                first = 48 - x
                if first > 0:
                    rect(draw, x, y, first, height, color)
                rect(draw, 33, y, length - first, height, color)

        if frame in (4, 6):
            rect(draw, 43, 6, 2, 2, YELLOW_LIGHT)
            rect(draw, 46, 8, 1, 1, WHITE)

    if frame == 1:
        rect(draw, 7, 26, 10, 3, FOOT_DARK)
        rect(draw, 20, 27, 9, 3, FOOT)
    elif frame in (3, 4, 5, 6):
        rect(draw, 9, 27, 8, 3, FOOT_DARK)
        rect(draw, 21, 26, 10, 4, FOOT)
    else:
        rect(draw, 7, 27, 9, 3, FOOT_DARK)
        rect(draw, 20, 27, 9, 3, FOOT)

    rect(draw, cx - rx - 3, cy - 2, 5, 7, PINK_DARK)
    rect(draw, cx - rx - 3, cy + 3, 4, 2, PINK_DEEP)

    ellipse(draw, (cx - rx, cy - ry, cx + rx, cy + ry), PINK_DARK)
    ellipse(draw, (cx - rx + 1, cy - ry, cx + rx - 1, cy + ry - 2), PINK)
    ellipse(draw, (cx - rx + 5, cy - ry + 3, cx - rx + 11, cy - ry + 7), PINK_LIGHT)
    rect(draw, cx - rx + 3, cy - ry + 7, 3, 5, PINK_LIGHT)

    eye_y = cy - 7
    eye_shift = 1 if frame >= 3 else 0
    draw_eye(draw, cx - 5 + eye_shift, eye_y, blink=blink)
    draw_eye(draw, cx + 2 + eye_shift, eye_y, blink=blink)

    mouth_x = cx + 6
    mouth_y = cy - mouth // 2 + 1
    rect(draw, mouth_x - 2, mouth_y + 1, 4, max(3, mouth - 1), PINK_DARK)
    ellipse(draw, (mouth_x - 1, mouth_y, mouth_x + mouth, mouth_y + mouth), INK)
    if mouth >= 4:
        ellipse(
            draw,
            (mouth_x + 2, mouth_y + 2, mouth_x + mouth - 1, mouth_y + mouth - 1),
            (119, 50, 86, 255),
        )
        rect(draw, mouth_x + mouth - 1, mouth_y + 2, 1, max(1, mouth - 3), PINK_LIGHT)

    rect(draw, cx - 8, cy + 3, 4, 2, (244, 95, 143, 255))
    if frame in (1, 2):
        rect(draw, cx - rx + 2, cy + 5, 3, 1, (238, 102, 159, 255))
    if frame in (5, 6, 7):
        rect(draw, cx - rx + 2, cy + 6, 4, 1, (238, 102, 159, 255))

    return img.resize((96, 64), Image.Resampling.NEAREST)


def make_inhale_sheet() -> Path:
    sheet = Image.new("RGBA", (96 * 8, 64), (0, 0, 0, 0))
    for frame in range(8):
        sheet.alpha_composite(draw_inhale_frame(frame), (frame * 96, 0))

    path = OUT / "mochi-sky-inhale-game-sheet.png"
    sheet.save(path, optimize=True)
    return path


def draw_cloud(draw: ImageDraw.ImageDraw, x: int, y: int, scale: int = 1) -> None:
    rect(draw, x - 3 * scale, y + 8 * scale, 31 * scale, 5 * scale, CLOUD_SHADE)
    rect(draw, x + 2 * scale, y + 4 * scale, 26 * scale, 7 * scale, CLOUD)
    ellipse(draw, (x + scale, y + 2 * scale, x + 12 * scale, y + 11 * scale), CLOUD)
    ellipse(draw, (x + 10 * scale, y - scale, x + 23 * scale, y + 11 * scale), CLOUD)
    ellipse(draw, (x + 19 * scale, y + 3 * scale, x + 30 * scale, y + 11 * scale), CLOUD)
    rect(draw, x + 3 * scale, y + 9 * scale, 24 * scale, 3 * scale, CLOUD)
    rect(draw, x + 5 * scale, y + 9 * scale, 15 * scale, 1, (255, 255, 255, 255))


def draw_hill_band(
    draw: ImageDraw.ImageDraw,
    *,
    base_y: int,
    amplitude: int,
    period: int,
    color,
    highlight,
    phase: int,
) -> None:
    points = [(0, 216), (0, base_y)]
    for x in range(0, 385, 4):
        height = (
            math.sin((x + phase) / period * math.tau) * 0.48
            + math.sin((x + phase) / (period * 0.47) * math.tau) * 0.14
            + 0.50
        )
        y = base_y - round(max(0.0, height) * amplitude / 2) * 2
        points.append((x, y))
    points.extend(((384, 216),))
    draw.polygon(points, fill=color)

    for x in range(18 + phase % 30, 384, 67):
        y = base_y - round(amplitude * (0.48 + 0.12 * math.sin(x * 0.11)))
        rect(draw, x, y, 9, 3, highlight)
        rect(draw, x + 3, y - 2, 5, 2, highlight)


def make_backdrop() -> Path:
    img = Image.new("RGBA", (384, 216), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    for y in range(0, 216, 2):
        t = min(1.0, y / 190)
        color = tuple(lerp(SKY_TOP[i], SKY_BOTTOM[i], t) for i in range(3)) + (255,)
        rect(draw, 0, y, 384, 2, color)

    for y, alpha in ((44, 22), (88, 16), (132, 10)):
        rect(draw, 0, y, 384, 2, (255, 255, 255, alpha))

    rng = random.Random(124)
    for index in range(34):
        x = rng.randrange(4, 380)
        y = rng.randrange(8, 92)
        if index % 5 == 0:
            rect(draw, x, y, 2, 2, (255, 248, 196, 220))
            rect(draw, x - 1, y + 1, 4, 1, (255, 248, 196, 160))
        else:
            rect(draw, x, y, 1, 1, (255, 255, 235, 190))

    draw_cloud(draw, 18, 26, 2)
    draw_cloud(draw, 176, 45, 1)
    draw_cloud(draw, 300, 24, 2)

    ellipse(draw, (286, 52, 323, 89), (255, 238, 169, 110))
    ellipse(draw, (293, 59, 316, 82), (255, 245, 190, 150))

    draw_hill_band(
        draw,
        base_y=149,
        amplitude=54,
        period=128,
        color=FAR_HILL,
        highlight=(255, 255, 255, 70),
        phase=11,
    )
    draw_hill_band(
        draw,
        base_y=174,
        amplitude=58,
        period=102,
        color=MID_HILL,
        highlight=(205, 244, 219, 115),
        phase=37,
    )

    for x in range(-8, 400, 26):
        height = 8 + ((x // 26 * 7) % 8)
        color = MID_HILL_DARK if (x // 26) % 2 else FAR_HILL_DARK
        rect(draw, x, 164 - height, 4, height, color)
        ellipse(draw, (x - 5, 154 - height, x + 9, 168 - height), color)
        ellipse(draw, (x - 1, 149 - height, x + 12, 164 - height), color)

    # Distant valley/mist only. Foreground grass and dirt live in the tile asset.
    for y in range(164, 216):
        t = (y - 164) / 52
        color = (
            lerp(MIST[0], MIST_DARK[0], t),
            lerp(MIST[1], MIST_DARK[1], t),
            lerp(MIST[2], MIST_DARK[2], t),
            255,
        )
        rect(draw, 0, y, 384, 1, color)

    for x in range(-40, 425, 52):
        y = 181 + round(5 * math.sin(x * 0.08))
        ellipse(draw, (x, y, x + 74, 223), (124, 203, 181, 130))
    for x in range(-20, 430, 70):
        y = 194 + round(4 * math.cos(x * 0.05))
        ellipse(draw, (x, y, x + 92, 229), (104, 184, 169, 105))
    for x in range(12, 384, 43):
        y = 184 + ((x * 17) % 22)
        rect(draw, x, y, 3, 1, (232, 255, 244, 100))

    path = OUT / "mochi-sky-backdrop.png"
    img.save(path, optimize=True)
    return path


def make_tiles() -> Path:
    # Author one half, mirror it, then copy the first edge to the last edge.
    # The result tiles exactly in the horizontal direction.
    half = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(half)

    rect(draw, 0, 0, 64, 64, DIRT)
    for x in range(64):
        top_height = 8 + int((x * 13) % 17 < 5) + int((x * 7) % 29 == 0)
        rect(draw, x, 0, 1, top_height, GRASS)
        rect(draw, x, 0, 1, 2, GRASS_LIGHT)
        if top_height < 10:
            rect(draw, x, top_height, 1, 10 - top_height, DIRT_LIGHT)

    for x in (2, 8, 15, 24, 34, 45, 55, 61):
        height = 2 + ((x * 5) % 4)
        rect(draw, x, 1, 1, height, GRASS_LIGHT)
        if x + 1 < 64:
            rect(draw, x + 1, 3, 1, max(1, height - 1), GRASS_DARK)

    for x in range(64):
        y = 8 + int((x * 11) % 5 == 0)
        rect(draw, x, y, 1, 2, GRASS_DARK)

    for grid_y in range(12, 64, 6):
        for grid_x in range(0, 64, 8):
            offset = 4 if (grid_y // 6) % 2 else 0
            x = (grid_x + offset) % 64
            color = DIRT_LIGHT if ((grid_x // 8 + grid_y // 6) % 3) else DIRT_DARK
            rect(draw, x, grid_y, 7, 5, color)
            rect(draw, x + 1, grid_y, 4, 1, (231, 172, 111, 255))
            rect(draw, x + 5, grid_y + 3, 2, 2, STONE)

    for x, y in ((5, 18), (19, 31), (39, 16), (51, 42), (9, 52), (31, 47), (56, 25)):
        rect(draw, x, y, 5, 2, DIRT_DARK)
        rect(draw, x + 2, y + 2, 2, 3, DIRT_DARK)
    for x, y in ((14, 22), (27, 14), (47, 29), (4, 38), (35, 57), (58, 51)):
        rect(draw, x, y, 3, 2, (236, 179, 117, 255))
        rect(draw, x + 1, y, 1, 1, (255, 204, 143, 255))

    tile = Image.new("RGBA", (128, 64), (0, 0, 0, 0))
    tile.alpha_composite(half, (0, 0))
    tile.alpha_composite(half.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (64, 0))

    pixels = tile.load()
    for y in range(tile.height):
        pixels[tile.width - 1, y] = pixels[0, y]

    path = OUT / "mochi-sky-tiles.png"
    tile.save(path, optimize=True)
    return path


def validate_assets(inhale_path: Path, backdrop_path: Path, tiles_path: Path) -> None:
    inhale = Image.open(inhale_path).convert("RGBA")
    backdrop = Image.open(backdrop_path).convert("RGBA")
    tiles = Image.open(tiles_path).convert("RGBA")

    if inhale.size != (768, 64):
        raise ValueError(f"unexpected inhale sheet size: {inhale.size}")
    if backdrop.size != (384, 216):
        raise ValueError(f"unexpected backdrop size: {backdrop.size}")
    if tiles.size != (128, 64):
        raise ValueError(f"unexpected tile size: {tiles.size}")

    for frame in range(8):
        cell = inhale.crop((frame * 96, 0, (frame + 1) * 96, 64))
        if cell.getchannel("A").getbbox() is None:
            raise ValueError(f"inhale frame {frame} is empty")

    left_edge = [tiles.getpixel((0, y)) for y in range(tiles.height)]
    right_edge = [tiles.getpixel((tiles.width - 1, y)) for y in range(tiles.height)]
    if left_edge != right_edge:
        raise ValueError("terrain tile is not horizontally seamless")


def main() -> None:
    inhale_path = make_inhale_sheet()
    backdrop_path = make_backdrop()
    tiles_path = make_tiles()
    validate_assets(inhale_path, backdrop_path, tiles_path)


if __name__ == "__main__":
    main()
