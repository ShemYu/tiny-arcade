#!/usr/bin/env python3
"""Validate modular 2D game image assets from a JSON manifest.

Dependency:
    python -m pip install pillow

Usage:
    python tools/game-assets/validate_game_assets.py games/mochi-sky/asset-manifest.json
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from pathlib import Path
from typing import Any

from PIL import Image


def fail(messages: list[str], asset: str, message: str) -> None:
    messages.append(f"{asset}: {message}")


def pixel_distance(a: tuple[int, ...], b: tuple[int, ...]) -> int:
    return max(abs(int(x) - int(y)) for x, y in zip(a, b))


def check_seam(image: Image.Image, axis: str, tolerance: int) -> tuple[bool, int]:
    pixels = image.load()
    differences: list[int] = []

    if axis == "x":
        for y in range(image.height):
            differences.append(pixel_distance(pixels[0, y], pixels[image.width - 1, y]))
    else:
        for x in range(image.width):
            differences.append(pixel_distance(pixels[x, 0], pixels[x, image.height - 1]))

    maximum = max(differences, default=0)
    return maximum <= tolerance, maximum


def frame_boxes(
    image: Image.Image,
    cell_width: int,
    cell_height: int,
    columns: int,
    rows: int,
) -> list[tuple[int, int, int, int] | None]:
    boxes: list[tuple[int, int, int, int] | None] = []
    alpha = image.getchannel("A") if "A" in image.getbands() else None

    for row in range(rows):
        for column in range(columns):
            left = column * cell_width
            top = row * cell_height
            cell_box = (left, top, left + cell_width, top + cell_height)
            cell = alpha.crop(cell_box) if alpha is not None else image.crop(cell_box).convert("L")
            boxes.append(cell.getbbox())

    return boxes


def validate_alpha(
    image: Image.Image,
    config: dict[str, Any],
    messages: list[str],
    asset_name: str,
) -> None:
    if not config.get("transparent"):
        return

    if "A" not in image.getbands():
        fail(messages, asset_name, "expected transparency but image has no alpha channel")
        return

    alpha = image.getchannel("A")
    extrema = alpha.getextrema()
    if extrema == (255, 255):
        fail(messages, asset_name, "expected transparency but alpha channel is fully opaque")
    if extrema == (0, 0) and not config.get("allow_empty_alpha"):
        fail(messages, asset_name, "alpha channel is fully transparent")


def validate_sprite_sheet(
    image: Image.Image,
    config: dict[str, Any],
    messages: list[str],
    asset_name: str,
) -> None:
    cell_width, cell_height = config["cell"]
    columns, rows = config["grid"]
    expected_size = (cell_width * columns, cell_height * rows)
    if image.size != expected_size:
        fail(messages, asset_name, f"grid implies {expected_size}, got {image.size}")
        return

    boxes = frame_boxes(image, cell_width, cell_height, columns, rows)
    for index, box in enumerate(boxes):
        if box is None:
            fail(messages, asset_name, f"frame {index} is empty")

    padding = int(config.get("edge_padding_px", 0))
    if padding > 0:
        for index, box in enumerate(boxes):
            if box is None:
                continue
            left, top, right, bottom = box
            if (
                left < padding
                or top < padding
                or right > cell_width - padding
                or bottom > cell_height - padding
            ):
                fail(
                    messages,
                    asset_name,
                    f"frame {index} violates {padding}px cell padding; bbox={box}",
                )

    bottom_padding = int(config.get("bottom_padding_px", 0))
    if bottom_padding > 0:
        for index, box in enumerate(boxes):
            if box is None:
                continue
            if box[3] > cell_height - bottom_padding:
                fail(
                    messages,
                    asset_name,
                    f"frame {index} violates {bottom_padding}px bottom padding; bbox={box}",
                )

    grounded_frames = [int(value) for value in config.get("grounded_frames", [])]
    if grounded_frames:
        bottoms = [boxes[index][3] for index in grounded_frames if boxes[index] is not None]
        tolerance = int(config.get("anchor_bottom_tolerance_px", 1))
        if bottoms and max(bottoms) - min(bottoms) > tolerance:
            fail(
                messages,
                asset_name,
                f"ground-contact drift is {max(bottoms) - min(bottoms)}px; allowed {tolerance}px",
            )

    scale_frames = [int(value) for value in config.get("comparable_scale_frames", [])]
    if scale_frames:
        heights = [
            boxes[index][3] - boxes[index][1]
            for index in scale_frames
            if boxes[index] is not None
        ]
        tolerance_ratio = float(config.get("bbox_height_tolerance_ratio", 0.05))
        if heights:
            median = statistics.median(heights)
            maximum_ratio = max(abs(height - median) / max(1.0, median) for height in heights)
            if maximum_ratio > tolerance_ratio:
                fail(
                    messages,
                    asset_name,
                    f"frame scale drift ratio is {maximum_ratio:.3f}; allowed {tolerance_ratio:.3f}",
                )


def validate_asset(root: Path, config: dict[str, Any], messages: list[str]) -> None:
    relative_path = Path(config["path"])
    path = root / relative_path
    asset_name = str(relative_path)

    if not path.exists():
        fail(messages, asset_name, "file does not exist")
        return

    try:
        image = Image.open(path)
        image.load()
    except Exception as error:
        fail(messages, asset_name, f"cannot be opened: {error}")
        return

    expected_size = tuple(int(value) for value in config.get("size", image.size))
    if image.size != expected_size:
        fail(messages, asset_name, f"expected size {expected_size}, got {image.size}")

    expected_mode = config.get("mode")
    if expected_mode and image.mode != expected_mode:
        fail(messages, asset_name, f"expected mode {expected_mode}, got {image.mode}")

    validate_alpha(image, config, messages, asset_name)

    asset_type = config.get("type", "image")
    rgba = image.convert("RGBA")

    if asset_type == "sprite_sheet":
        validate_sprite_sheet(rgba, config, messages, asset_name)
    elif asset_type not in {"image", "tile", "background"}:
        fail(messages, asset_name, f"unknown asset type {asset_type!r}")

    tolerance = int(config.get("seam_tolerance", 0))
    if config.get("seam_x"):
        passed, maximum = check_seam(rgba, "x", tolerance)
        if not passed:
            fail(messages, asset_name, f"horizontal seam delta {maximum}; allowed {tolerance}")

    if config.get("seam_y"):
        passed, maximum = check_seam(rgba, "y", tolerance)
        if not passed:
            fail(messages, asset_name, f"vertical seam delta {maximum}; allowed {tolerance}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()

    manifest_path = args.manifest.resolve()
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    root = manifest_path.parent
    messages: list[str] = []

    for asset in data.get("assets", []):
        validate_asset(root, asset, messages)

    if messages:
        print("GAME ASSET VALIDATION: FAILED", file=sys.stderr)
        for message in messages:
            print(f"- {message}", file=sys.stderr)
        return 1

    print("GAME ASSET VALIDATION: PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
