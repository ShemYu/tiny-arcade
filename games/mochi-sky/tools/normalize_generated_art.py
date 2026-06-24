#!/usr/bin/env python3
"""Normalize generated art sources into stable Mochi Sky runtime sheets."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from generate_runtime_art import main as generate_runtime_art


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"


def chroma_to_alpha(img: Image.Image) -> Image.Image:
    src = img.convert("RGBA")
    key = src.getpixel((0, 0))[:3]
    out = Image.new("RGBA", src.size, (0, 0, 0, 0))
    pixels = src.load()
    out_pixels = out.load()

    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = pixels[x, y]
            distance = abs(r - key[0]) + abs(g - key[1]) + abs(b - key[2])
            if distance < 56:
                alpha = 0
            elif distance < 165:
                alpha = round((distance - 56) / 109 * 255)
            else:
                alpha = a

            if alpha:
                # Mild despill for generated green-key edges.
                if g > r + 38 and g > b + 38:
                    g = max(r, b)
                out_pixels[x, y] = (r, g, b, alpha)

    return out


def frame_cuts(src: Image.Image, frames: int) -> list[int]:
    """Find low-alpha gutters near the expected equal-width frame boundaries."""
    alpha = src.getchannel("A")
    column_alpha = [
        sum(alpha.crop((x, 0, x + 1, src.height)).getdata())
        for x in range(src.width)
    ]
    expected_width = src.width / frames
    radius = max(2, round(expected_width * 0.18))
    cuts = [0]

    for frame in range(1, frames):
        expected = round(expected_width * frame)
        low = max(cuts[-1] + 1, expected - radius)
        high = min(src.width - (frames - frame), expected + radius)
        cut = min(range(low, high + 1), key=lambda x: column_alpha[x])
        cuts.append(cut)

    cuts.append(src.width)
    return cuts


def equal_frame_sheet(source: Image.Image, frames: int, cell_w: int, cell_h: int) -> Image.Image:
    """Normalize every frame with one scale and one shared foot/contact baseline."""
    src = source.convert("RGBA")
    out = Image.new("RGBA", (frames * cell_w, cell_h), (0, 0, 0, 0))
    cuts = frame_cuts(src, frames)
    crops: list[Image.Image | None] = []

    for frame in range(frames):
        x0, x1 = cuts[frame], cuts[frame + 1]
        column = src.crop((x0, 0, x1, src.height))
        bbox = column.getchannel("A").getbbox()
        crops.append(column.crop(bbox) if bbox else None)

    populated = [crop for crop in crops if crop is not None]
    if not populated:
        return out

    max_source_w = max(crop.width for crop in populated)
    max_source_h = max(crop.height for crop in populated)
    scale = min(
        (cell_w - 6) / max_source_w,
        (cell_h - 6) / max_source_h,
    )

    for frame, crop in enumerate(crops):
        if crop is None:
            continue

        new_w = max(1, round(crop.width * scale))
        new_h = max(1, round(crop.height * scale))
        resized = crop.resize((new_w, new_h), Image.Resampling.LANCZOS)
        x = frame * cell_w + (cell_w - new_w) // 2
        y = cell_h - new_h - 3
        out.alpha_composite(resized, (x, y))

    return out


def main() -> None:
    # These deterministic assets are authored independently. They are not
    # cropped from the single map image, so terrain remains tileable and the
    # inhale pose keeps a stable silhouette/baseline.
    generate_runtime_art()

    mochi_source = chroma_to_alpha(
        Image.open(ASSETS / "mochi-sky-mochi-action-sheet-source.png")
    )
    mochi_source.save(ASSETS / "mochi-sky-mochi-action-sheet.png")
    equal_frame_sheet(mochi_source, frames=8, cell_w=64, cell_h=64).save(
        ASSETS / "mochi-sky-mochi-action-game-sheet.png"
    )

    enemy_source = chroma_to_alpha(
        Image.open(ASSETS / "mochi-sky-enemy-sheet-source.png")
    )
    enemy_source.save(ASSETS / "mochi-sky-enemy-sheet.png")
    equal_frame_sheet(enemy_source, frames=8, cell_w=48, cell_h=48).save(
        ASSETS / "mochi-sky-enemy-game-sheet.png"
    )

    star_source = chroma_to_alpha(
        Image.open(ASSETS / "mochi-sky-star-sheet-source.png")
    )
    star_source.save(ASSETS / "mochi-sky-star-sheet.png")
    equal_frame_sheet(star_source, frames=8, cell_w=32, cell_h=32).save(
        ASSETS / "mochi-sky-star-game-sheet.png"
    )


if __name__ == "__main__":
    main()
