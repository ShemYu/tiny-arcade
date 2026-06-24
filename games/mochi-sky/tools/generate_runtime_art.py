#!/usr/bin/env python3
"""Build source-aligned runtime art for Mochi Sky.

The high-detail generated sources remain the style authority. This script only
normalizes them for runtime use:
- the inhale sheet keeps the ImageGen poses, with stable framing and baseline;
- the backdrop contains distant scenery only;
- the terrain tile keeps the original grass/dirt rendering and tiles cleanly.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)


def frame_cuts(source: Image.Image, frames: int) -> list[int]:
    """Find transparent gutters near the expected frame boundaries."""
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


def body_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    """Find the pink/dark character body while ignoring pale wind particles."""
    pixels = image.load()
    left, top = image.width, image.height
    right = bottom = 0
    found = False

    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            belongs_to_body = alpha > 12 and (
                (red > 105 and red > green + 9)
                or (red < 140 and green < 105 and blue < 155)
            )
            if belongs_to_body:
                found = True
                left = min(left, x)
                top = min(top, y)
                right = max(right, x + 1)
                bottom = max(bottom, y + 1)

    if found:
        return left, top, right, bottom

    fallback = image.getchannel("A").getbbox()
    if fallback is None:
        raise ValueError("empty animation frame")
    return fallback


def extract_eye_sprite(
    walking_sheet: Image.Image,
    box: tuple[int, int, int, int],
) -> Image.Image:
    """Reuse the exact eye palette/detail from the approved idle sprite."""
    source = walking_sheet.crop(box).convert("RGBA")
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    source_pixels = source.load()
    result_pixels = result.load()

    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = source_pixels[x, y]
            is_eye = (
                blue > red + 3
                or (red < 125 and green < 95 and blue < 155)
                or (red > 225 and green > 218 and blue > 225)
            ) and alpha > 0
            if is_eye:
                result_pixels[x, y] = red, green, blue, alpha

    bbox = result.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("walking-sheet eye reference is empty")
    return result.crop(bbox).resize((4, 7), Image.Resampling.LANCZOS)


def repair_eye_region(
    frame: Image.Image,
    roi: tuple[int, int, int, int],
) -> Image.Image:
    """Remove only the old dark eye strokes and rebuild nearby skin locally."""
    image = frame.copy().convert("RGBA")
    pixels = image.load()
    x0, y0, x1, y1 = roi
    mask: set[tuple[int, int]] = set()

    for y in range(y0, y1):
        for x in range(x0, x1):
            red, green, blue, alpha = pixels[x, y]
            if alpha > 30 and red < 120 and green < 95 and blue < 150:
                for offset_y in (-1, 0, 1):
                    for offset_x in (-1, 0, 1):
                        next_x = x + offset_x
                        next_y = y + offset_y
                        if x0 <= next_x < x1 and y0 <= next_y < y1:
                            mask.add((next_x, next_y))

    replacements: dict[tuple[int, int], tuple[int, int, int]] = {}
    for x, y in mask:
        samples: list[tuple[int, int, int]] = []
        for radius in (2, 3, 4, 5):
            for sample_y in range(max(0, y - radius), min(image.height, y + radius + 1)):
                for sample_x in range(max(0, x - radius), min(image.width, x + radius + 1)):
                    if (sample_x, sample_y) in mask:
                        continue
                    red, green, blue, alpha = pixels[sample_x, sample_y]
                    if alpha > 80 and red > 140 and red > green + 5 and blue > 90:
                        samples.append((red, green, blue))
            if len(samples) >= 5:
                break

        if samples:
            replacements[(x, y)] = tuple(
                round(sum(sample[channel] for sample in samples) / len(samples))
                for channel in range(3)
            )

    for (x, y), color in replacements.items():
        pixels[x, y] = (*color, pixels[x, y][3])

    return image


def make_inhale_sheet() -> Path:
    """Normalize the ImageGen inhale poses without redrawing their silhouettes."""
    source = Image.open(ASSETS / "mochi-sky-inhale-sheet.png").convert("RGBA")
    walking_sheet = Image.open(
        ASSETS / "mochi-sky-mochi-action-game-sheet.png"
    ).convert("RGBA")

    cuts = frame_cuts(source, frames=8)
    frames = [
        source.crop((cuts[index], 0, cuts[index + 1], source.height))
        for index in range(8)
    ]
    body_boxes = [body_bbox(frame) for frame in frames]

    # One scale and one contact line prevent the generated poses from pulsing.
    scale = 54 / max(box[3] - box[1] for box in body_boxes[:5])
    sheet = Image.new("RGBA", (8 * 96, 64), (0, 0, 0, 0))

    for index, (frame, box) in enumerate(zip(frames, body_boxes)):
        resized = frame.resize(
            (round(frame.width * scale), round(frame.height * scale)),
            Image.Resampling.LANCZOS,
        )
        scaled_box = tuple(round(value * scale) for value in box)
        x = index * 96 + 42 - (scaled_box[0] + scaled_box[2]) // 2
        y = 61 - scaled_box[3]
        sheet.alpha_composite(resized, (x, y))

    # The two anticipation frames retain the approved idle/walk eye treatment.
    left_eye = extract_eye_sprite(walking_sheet, (27, 27, 36, 40))
    right_eye = extract_eye_sprite(walking_sheet, (45, 27, 55, 40))
    anticipation_specs = [
        ((41, 23, 61, 39), (45, 25), (52, 25)),
        ((42, 27, 62, 44), (45, 30), (52, 30)),
    ]

    for index, (roi, left_position, right_position) in enumerate(anticipation_specs):
        frame = sheet.crop((index * 96, 0, (index + 1) * 96, 64))
        frame = repair_eye_region(frame, roi)
        frame.alpha_composite(left_eye, left_position)
        frame.alpha_composite(right_eye, right_position)
        sheet.paste((0, 0, 0, 0), (index * 96, 0, (index + 1) * 96, 64))
        sheet.alpha_composite(frame, (index * 96, 0))

    path = ASSETS / "mochi-sky-inhale-game-sheet.png"
    sheet.save(path, optimize=True)
    return path


def cloud_sprite(
    source: Image.Image,
    box: tuple[int, int, int, int],
) -> Image.Image:
    """Extract cream cloud pixels while discarding the surrounding cyan sky."""
    crop = source.crop(box).convert("RGBA")
    result = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    source_pixels = crop.load()
    result_pixels = result.load()

    for y in range(crop.height):
        for x in range(crop.width):
            red, green, blue, alpha = source_pixels[x, y]
            minimum = min(red, green, blue)
            if minimum <= 165 or red <= 180 or alpha == 0:
                continue

            strength = max(0.0, min(1.0, (minimum - 165) / 45))
            strength *= max(0.0, min(1.0, (red - 180) / 45))
            extracted_alpha = round(alpha * strength)
            if extracted_alpha:
                result_pixels[x, y] = red, green, blue, extracted_alpha

    return result


def make_backdrop() -> Path:
    """Build a distant-only scene from clean regions of the original map art."""
    source = Image.open(ASSETS / "mochi-sky-map-source.png").convert("RGBA")
    width, height = 384, 216
    sky_top = (87, 223, 252)
    sky_middle = (164, 245, 253)
    sky_bottom = (190, 244, 245)

    image = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        if y < 112:
            amount = y / 112
            color = tuple(
                round(sky_top[channel] * (1 - amount) + sky_middle[channel] * amount)
                for channel in range(3)
            )
        else:
            amount = (y - 112) / (height - 112)
            color = tuple(
                round(sky_middle[channel] * (1 - amount) + sky_bottom[channel] * amount)
                for channel in range(3)
            )
        draw.line((0, y, width, y), fill=(*color, 255))

    cloud_boxes = [
        (35, 15, 230, 120),
        (350, 8, 575, 125),
        (850, 35, 1090, 175),
        (1390, 15, 1635, 125),
        (790, 165, 945, 280),
        (1115, 150, 1335, 280),
    ]
    source_scale = width / source.width
    for box in cloud_boxes:
        cloud = cloud_sprite(source, box)
        cloud = cloud.resize(
            (
                max(1, round(cloud.width * source_scale)),
                max(1, round(cloud.height * source_scale)),
            ),
            Image.Resampling.LANCZOS,
        )
        image.alpha_composite(
            cloud,
            (round(box[0] * source_scale), round(box[1] * source_scale)),
        )

    # This crop contains only cloud banks and layered hills—no platforms/gate.
    hills = source.crop((440, 470, 1036, 650)).resize(
        (width, 116),
        Image.Resampling.LANCZOS,
    ).convert("RGBA")
    hill_pixels = hills.load()
    for y in range(hills.height):
        if y < 20:
            opacity = y / 20
        elif y >= hills.height - 12:
            opacity = 1 - ((y - (hills.height - 12)) / 11) * 0.14
        else:
            opacity = 1.0
        opacity = max(0.0, min(1.0, opacity))
        for x in range(hills.width):
            red, green, blue, alpha = hill_pixels[x, y]
            hill_pixels[x, y] = red, green, blue, round(alpha * opacity)
    image.alpha_composite(hills, (0, 100))

    mist = Image.new("RGBA", (width, 32), (105, 190, 178, 0))
    mist_pixels = mist.load()
    for y in range(mist.height):
        alpha = round(15 + 55 * y / (mist.height - 1))
        for x in range(mist.width):
            mist_pixels[x, y] = 105, 190, 178, alpha
    image.alpha_composite(mist, (0, 184))

    draw = ImageDraw.Draw(image)
    for x, y, color in [
        (17, 36, "#fff6bd"),
        (124, 24, "#ffffff"),
        (275, 35, "#fff4a8"),
        (353, 27, "#f6d9ff"),
        (242, 82, "#ffffff"),
        (73, 91, "#fff6bd"),
    ]:
        draw.point((x, y), fill=color)
        if (x + y) % 2 == 0:
            for sparkle_x, sparkle_y in (
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
            ):
                draw.point((sparkle_x, sparkle_y), fill=color)

    path = ASSETS / "mochi-sky-backdrop.png"
    image.save(path, optimize=True)
    return path


def make_tiles() -> Path:
    """Build one exact horizontal repeat from clean source-art terrain crops."""
    source = Image.open(ASSETS / "mochi-sky-map-source.png").convert("RGBA")
    grass = source.crop((200, 202, 456, 238)).resize(
        (64, 12),
        Image.Resampling.LANCZOS,
    )
    dirt_top = source.crop((900, 755, 1156, 835)).resize(
        (64, 26),
        Image.Resampling.LANCZOS,
    )
    dirt_bottom = source.crop((1040, 755, 1296, 835)).resize(
        (64, 26),
        Image.Resampling.LANCZOS,
    )

    half = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    half.alpha_composite(grass, (0, 0))
    half.alpha_composite(dirt_top, (0, 12))
    half.alpha_composite(dirt_bottom, (0, 38))

    tile = Image.new("RGBA", (128, 64), (0, 0, 0, 0))
    tile.alpha_composite(half, (0, 0))
    tile.alpha_composite(ImageOps.mirror(half), (64, 0))

    pixels = tile.load()
    for y in range(tile.height):
        pixels[tile.width - 1, y] = pixels[0, y]

    path = ASSETS / "mochi-sky-tiles.png"
    tile.save(path, optimize=True)
    return path


def validate_assets(paths: tuple[Path, Path, Path]) -> None:
    inhale, backdrop, tiles = [Image.open(path).convert("RGBA") for path in paths]

    if inhale.size != (768, 64):
        raise ValueError(f"unexpected inhale-sheet size: {inhale.size}")
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
    paths = make_inhale_sheet(), make_backdrop(), make_tiles()
    validate_assets(paths)


if __name__ == "__main__":
    main()
