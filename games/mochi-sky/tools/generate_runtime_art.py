#!/usr/bin/env python3
"""Build source-aligned runtime art for Mochi Sky.

The high-detail generated sources remain the style authority. This script only
normalizes them for runtime use:
- the inhale sheet uses the reference-locked ImageGen strip, with stable framing and baseline;
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


def chroma_to_alpha(image: Image.Image) -> Image.Image:
    """Remove the flat green imagegen background while preserving soft edges."""
    source = image.convert("RGBA")
    key = source.getpixel((0, 0))[:3]
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    source_pixels = source.load()
    result_pixels = result.load()

    for y in range(source.height):
        for x in range(source.width):
            red, green, blue, alpha = source_pixels[x, y]
            distance = abs(red - key[0]) + abs(green - key[1]) + abs(blue - key[2])
            if distance < 70:
                output_alpha = 0
            elif distance < 205:
                output_alpha = round((distance - 70) / 135 * alpha)
            else:
                output_alpha = alpha

            if output_alpha:
                if green > red + 35 and green > blue + 35:
                    green = max(red, blue)
                result_pixels[x, y] = red, green, blue, output_alpha

    return result


def make_inhale_sheet() -> Path:
    """Normalize the imagegen inhale strip into fixed runtime cells."""
    transparent = chroma_to_alpha(Image.open(ASSETS / "mochi-sky-inhale-sheet-source.png"))
    transparent_path = ASSETS / "mochi-sky-inhale-sheet.png"
    transparent.save(transparent_path, optimize=True)

    cuts = frame_cuts(transparent, frames=8)
    crops: list[Image.Image] = []
    for index in range(8):
        segment = transparent.crop((cuts[index], 0, cuts[index + 1], transparent.height))
        box = segment.getchannel("A").getbbox()
        if box is None:
            raise ValueError(f"inhale source frame {index} is empty")
        crops.append(segment.crop(box))

    scale = min(
        86 / max(crop.width for crop in crops),
        56 / max(crop.height for crop in crops),
    )
    sheet = Image.new("RGBA", (8 * 96, 64), (0, 0, 0, 0))

    for index, crop in enumerate(crops):
        resized = crop.resize(
            (
                max(1, round(crop.width * scale)),
                max(1, round(crop.height * scale)),
            ),
            Image.Resampling.LANCZOS,
        )
        x = index * 96 + (96 - resized.width) // 2
        y = 62 - resized.height
        sheet.alpha_composite(resized, (x, y))

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
    scale = 4
    width, height = 384 * scale, 216 * scale
    sky_top = (87, 223, 252)
    sky_middle = (164, 245, 253)
    sky_bottom = (190, 244, 245)

    image = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image)
    for y in range(height):
        if y < 112 * scale:
            amount = y / (112 * scale)
            color = tuple(
                round(sky_top[channel] * (1 - amount) + sky_middle[channel] * amount)
                for channel in range(3)
            )
        else:
            amount = (y - 112 * scale) / (height - 112 * scale)
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
        (width, 116 * scale),
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
    image.alpha_composite(hills, (0, 100 * scale))

    mist = Image.new("RGBA", (width, 32 * scale), (105, 190, 178, 0))
    mist_pixels = mist.load()
    for y in range(mist.height):
        alpha = round(15 + 55 * y / (mist.height - 1))
        for x in range(mist.width):
            mist_pixels[x, y] = 105, 190, 178, alpha
    image.alpha_composite(mist, (0, 184 * scale))

    draw = ImageDraw.Draw(image)
    for x, y, color in [
        (17, 36, "#fff6bd"),
        (124, 24, "#ffffff"),
        (275, 35, "#fff4a8"),
        (353, 27, "#f6d9ff"),
        (242, 82, "#ffffff"),
        (73, 91, "#fff6bd"),
    ]:
        x *= scale
        y *= scale
        draw.rectangle((x, y, x + scale - 1, y + scale - 1), fill=color)
        if (x + y) % 2 == 0:
            for sparkle_x, sparkle_y in (
                (x - scale, y),
                (x + scale, y),
                (x, y - scale),
                (x, y + scale),
            ):
                draw.point((sparkle_x, sparkle_y), fill=color)

    path = ASSETS / "mochi-sky-backdrop.png"
    image.save(path, optimize=True)
    return path


def make_tiles() -> Path:
    """Build one exact horizontal repeat from clean source-art terrain crops."""
    source = Image.open(ASSETS / "mochi-sky-map-source.png").convert("RGBA")
    scale = 4
    grass = source.crop((200, 202, 456, 238)).resize(
        (64 * scale, 12 * scale),
        Image.Resampling.LANCZOS,
    )
    dirt_top = source.crop((900, 755, 1156, 835)).resize(
        (64 * scale, 26 * scale),
        Image.Resampling.LANCZOS,
    )
    dirt_bottom = source.crop((1040, 755, 1296, 835)).resize(
        (64 * scale, 26 * scale),
        Image.Resampling.LANCZOS,
    )

    half = Image.new("RGBA", (64 * scale, 64 * scale), (0, 0, 0, 0))
    half.alpha_composite(grass, (0, 0))
    half.alpha_composite(dirt_top, (0, 12 * scale))
    half.alpha_composite(dirt_bottom, (0, 38 * scale))

    tile = Image.new("RGBA", (128 * scale, 64 * scale), (0, 0, 0, 0))
    tile.alpha_composite(half, (0, 0))
    tile.alpha_composite(ImageOps.mirror(half), (64 * scale, 0))

    pixels = tile.load()
    for y in range(tile.height):
        pixels[tile.width - 1, y] = pixels[0, y]

    path = ASSETS / "mochi-sky-tiles.png"
    tile.save(path, optimize=True)
    return path


def draw_heart(draw: ImageDraw.ImageDraw, ox: int, oy: int, fill, highlight) -> None:
    """Draw a compact UI heart for the fallback atlas."""
    draw.rectangle((ox + 2, oy + 2, ox + 5, oy + 5), fill=fill)
    draw.rectangle((ox + 10, oy + 2, ox + 13, oy + 5), fill=fill)
    draw.rectangle((ox + 1, oy + 5, ox + 14, oy + 9), fill=fill)
    draw.rectangle((ox + 3, oy + 10, ox + 12, oy + 12), fill=fill)
    draw.rectangle((ox + 6, oy + 13, ox + 9, oy + 14), fill=fill)
    draw.rectangle((ox + 4, oy + 4, ox + 5, oy + 5), fill=highlight)


def make_atlas() -> Path:
    """Refresh the legacy fallback atlas from current runtime sheets."""
    atlas = Image.new("RGBA", (320, 128), (0, 0, 0, 0))
    mochi = Image.open(ASSETS / "mochi-sky-mochi-action-game-sheet.png").convert("RGBA")
    inhale = Image.open(ASSETS / "mochi-sky-inhale-game-sheet.png").convert("RGBA")
    enemy = Image.open(ASSETS / "mochi-sky-enemy-game-sheet.png").convert("RGBA")
    star = Image.open(ASSETS / "mochi-sky-star-game-sheet.png").convert("RGBA")

    for dst_x, frame in zip((0, 32, 64, 96, 128, 160), (0, 2, 3, 4, 5, 6)):
        cell = mochi.crop((frame * 64, 0, frame * 64 + 64, 64)).resize(
            (32, 32),
            Image.Resampling.LANCZOS,
        )
        atlas.alpha_composite(cell, (dst_x, 0))

    atlas.alpha_composite(
        inhale.crop((5 * 96, 0, 6 * 96, 64)).resize((48, 32), Image.Resampling.LANCZOS),
        (192, 0),
    )
    atlas.alpha_composite(enemy.crop((0, 0, 48, 48)).resize((24, 24), Image.Resampling.LANCZOS), (0, 36))
    star_cell = star.crop((0, 0, 32, 32)).resize((16, 16), Image.Resampling.LANCZOS)
    atlas.alpha_composite(star_cell, (32, 40))
    atlas.alpha_composite(star_cell, (92, 40))

    draw = ImageDraw.Draw(atlas)
    draw_heart(draw, 52, 40, (231, 86, 100, 255), (255, 188, 197, 255))
    draw_heart(draw, 72, 40, (107, 88, 116, 255), (152, 132, 163, 255))

    draw.rectangle((112, 40, 113, 67), fill=(255, 248, 232, 255))
    draw.rectangle((114, 41, 127, 49), fill=(255, 226, 109, 255))
    draw.rectangle((124, 50, 127, 54), fill=(229, 169, 71, 255))

    draw.rectangle((149, 44, 186, 95), fill=(255, 255, 255, 80))
    draw.rectangle((152, 46, 183, 93), fill=(116, 87, 165, 255))
    draw.rectangle((156, 50, 179, 89), fill=(179, 131, 231, 255))
    draw.rectangle((160, 54, 175, 85), fill=(138, 234, 255, 255))
    draw.rectangle((164, 60, 171, 79), fill=(255, 247, 207, 255))
    atlas.alpha_composite(star_cell, (160, 34))

    path = ASSETS / "mochi-sky-atlas.png"
    atlas.save(path, optimize=True)
    return path


def validate_assets(paths: tuple[Path, Path, Path, Path]) -> None:
    inhale, backdrop, tiles, atlas = [Image.open(path).convert("RGBA") for path in paths]

    if inhale.size != (768, 64):
        raise ValueError(f"unexpected inhale-sheet size: {inhale.size}")
    if backdrop.size != (1536, 864):
        raise ValueError(f"unexpected backdrop size: {backdrop.size}")
    if tiles.size != (512, 256):
        raise ValueError(f"unexpected tile size: {tiles.size}")
    if atlas.size != (320, 128):
        raise ValueError(f"unexpected atlas size: {atlas.size}")

    for frame in range(8):
        cell = inhale.crop((frame * 96, 0, (frame + 1) * 96, 64))
        if cell.getchannel("A").getbbox() is None:
            raise ValueError(f"inhale frame {frame} is empty")

    left_edge = [tiles.getpixel((0, y)) for y in range(tiles.height)]
    right_edge = [tiles.getpixel((tiles.width - 1, y)) for y in range(tiles.height)]
    if left_edge != right_edge:
        raise ValueError("terrain tile is not horizontally seamless")


def main() -> None:
    paths = make_inhale_sheet(), make_backdrop(), make_tiles(), make_atlas()
    validate_assets(paths)


if __name__ == "__main__":
    main()
