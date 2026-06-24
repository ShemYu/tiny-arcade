#!/usr/bin/env python3
"""Normalize optional generated sheets without overwriting approved art by default."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

from generate_runtime_art import main as generate_runtime_art


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def chroma_to_alpha(image: Image.Image) -> Image.Image:
    source = image.convert("RGBA")
    key = source.getpixel((0, 0))[:3]
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    source_pixels = source.load()
    result_pixels = result.load()

    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = source_pixels[x, y]
            distance = abs(red - key[0]) + abs(green - key[1]) + abs(blue - key[2])
            if distance < 56:
                output_alpha = 0
            elif distance < 165:
                output_alpha = round((distance - 56) / 109 * 255)
            else:
                output_alpha = alpha

            if output_alpha:
                if green > red + 38 and green > blue + 38:
                    green = max(red, blue)
                result_pixels[x, y] = red, green, blue, output_alpha

    return result


def frame_cuts(source: Image.Image, frames: int) -> list[int]:
    """Find low-alpha gutters near expected frame boundaries."""
    alpha = source.getchannel("A")
    column_alpha = [
        sum(alpha.crop((x, 0, x + 1, source.height)).getdata())
        for x in range(source.width)
    ]
    expected_width = source.width / frames
    radius = max(2, round(expected_width * 0.18))
    cuts = [0]

    for frame in range(1, frames):
        expected = round(expected_width * frame)
        low = max(cuts[-1] + 1, expected - radius)
        high = min(source.width - (frames - frame), expected + radius)
        cuts.append(min(range(low, high + 1), key=lambda x: column_alpha[x]))

    cuts.append(source.width)
    return cuts


def equal_frame_sheet(
    source: Image.Image,
    frames: int,
    cell_width: int,
    cell_height: int,
) -> Image.Image:
    """Normalize a sheet with one shared scale and contact baseline."""
    source = source.convert("RGBA")
    result = Image.new(
        "RGBA",
        (frames * cell_width, cell_height),
        (0, 0, 0, 0),
    )
    cuts = frame_cuts(source, frames)
    crops: list[Image.Image | None] = []

    for frame in range(frames):
        column = source.crop((cuts[frame], 0, cuts[frame + 1], source.height))
        bbox = column.getchannel("A").getbbox()
        crops.append(column.crop(bbox) if bbox else None)

    populated = [crop for crop in crops if crop is not None]
    if not populated:
        return result

    scale = min(
        (cell_width - 6) / max(crop.width for crop in populated),
        (cell_height - 6) / max(crop.height for crop in populated),
    )

    for frame, crop in enumerate(crops):
        if crop is None:
            continue
        width = max(1, round(crop.width * scale))
        height = max(1, round(crop.height * scale))
        resized = crop.resize((width, height), Image.Resampling.LANCZOS)
        x = frame * cell_width + (cell_width - width) // 2
        y = cell_height - height - 3
        result.alpha_composite(resized, (x, y))

    return result


def normalize_secondary_sheets() -> None:
    """Explicitly rebuild non-inhale sheets when their source art changes."""
    specs = [
        (
            "mochi-sky-mochi-action-sheet-source.png",
            "mochi-sky-mochi-action-sheet.png",
            "mochi-sky-mochi-action-game-sheet.png",
            64,
            64,
        ),
        (
            "mochi-sky-enemy-sheet-source.png",
            "mochi-sky-enemy-sheet.png",
            "mochi-sky-enemy-game-sheet.png",
            48,
            48,
        ),
        (
            "mochi-sky-star-sheet-source.png",
            "mochi-sky-star-sheet.png",
            "mochi-sky-star-game-sheet.png",
            32,
            32,
        ),
    ]

    for source_name, transparent_name, game_name, cell_width, cell_height in specs:
        transparent = chroma_to_alpha(Image.open(ASSETS / source_name))
        transparent.save(ASSETS / transparent_name)
        equal_frame_sheet(
            transparent,
            frames=8,
            cell_width=cell_width,
            cell_height=cell_height,
        ).save(ASSETS / game_name)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--all-generated-sheets",
        action="store_true",
        help="also rebuild walking, enemy, and star sheets from their sources",
    )
    args = parser.parse_args()

    # Default behavior intentionally preserves the already-approved walking,
    # enemy, and star runtime sheets. Only scene layers and inhale are rebuilt.
    generate_runtime_art()
    if args.all_generated_sheets:
        normalize_secondary_sheets()


if __name__ == "__main__":
    main()
