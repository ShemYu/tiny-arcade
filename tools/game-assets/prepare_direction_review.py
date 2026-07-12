#!/usr/bin/env python3
"""Normalize alternate direction concepts for an apples-to-apples art review."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw

from prepare_static_seed import (
    finalize_seed,
    load_clean_subject,
    normalized_raw,
    pixels_of,
    terrain,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_palette(path: Path) -> list[tuple[int, int, int]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [tuple(entry["rgb"]) for entry in data["colors"]]


def metrics(image: Image.Image) -> dict:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("Direction candidate is empty after normalization.")
    values = sorted(set(pixels_of(alpha)))
    transparent_rgb = sum(
        1
        for red, green, blue, value in pixels_of(image)
        if value == 0 and (red or green or blue)
    )
    return {
        "bbox": list(bbox),
        "height_px": bbox[3] - bbox[1],
        "top_clearance_px": bbox[1],
        "bottom_clearance_px": image.height - bbox[3],
        "side_clearance_px": [bbox[0], image.width - bbox[2]],
        "alpha_values": values,
        "transparent_rgb_pixels": transparent_rgb,
        "foreground_colors": len({pixel[:3] for pixel in pixels_of(image) if pixel[3]}),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--current", type=Path, required=True)
    parser.add_argument("--palette", type=Path, required=True)
    parser.add_argument("--balanced", type=Path, required=True)
    parser.add_argument("--tactical", type=Path, required=True)
    parser.add_argument("--envelope", type=int, default=70)
    parser.add_argument(
        "--review-status",
        choices=("pending", "approved", "rejected"),
        default="pending",
    )
    parser.add_argument("--reviewed-on")
    args = parser.parse_args()

    out_dir = args.out_dir.resolve()
    candidate_dir = out_dir / "candidate"
    qa_dir = out_dir / "qa"
    candidate_dir.mkdir(parents=True, exist_ok=True)
    qa_dir.mkdir(parents=True, exist_ok=True)
    palette = load_palette(args.palette.resolve())

    outputs: dict[str, Image.Image] = {}
    report_candidates: dict[str, dict] = {}
    for candidate_id, source_path in (
        ("balanced", args.balanced.resolve()),
        ("tactical", args.tactical.resolve()),
    ):
        subject, bbox, foreground_pixels = load_clean_subject(source_path)
        source_root = (round((bbox[0] + bbox[2]) / 2), bbox[3])
        raw = normalized_raw(subject, bbox, source_root, (48, 82), 96, args.envelope)
        # Keep the approved unit palette; the review is about direction only.
        output = finalize_seed(raw, palette)
        output_path = candidate_dir / f"se-{candidate_id}-70.png"
        output.save(output_path)
        observed = metrics(output)
        checks = {
            "binary_alpha": observed["alpha_values"] == [0, 255],
            "transparent_rgb_zero": observed["transparent_rgb_pixels"] == 0,
            "palette_locked": observed["foreground_colors"] <= len(palette),
            "height_locked": observed["height_px"] == args.envelope,
            "headroom": observed["top_clearance_px"] >= 8,
            "equipment_cell_clearance": min(observed["side_clearance_px"]) >= 2,
        }
        outputs[candidate_id] = output
        report_candidates[candidate_id] = {
            "source": {
                "path": f"../source/{source_path.name}",
                "sha256": sha256(source_path),
                "bbox": list(bbox),
                "foreground_pixels": foreground_pixels,
                "normalization_root_px": list(source_root),
            },
            "output": {
                "path": f"../candidate/{output_path.name}",
                "sha256": sha256(output_path),
                "metrics": observed,
            },
            "checks": checks,
            "auto_qa_status": "passed" if all(checks.values()) else "failed",
        }

    with Image.open(args.current.resolve()) as source:
        current = source.convert("RGBA")
    panels = (("CURRENT", current), ("A BALANCED", outputs["balanced"]), ("B TACTICAL", outputs["tactical"]))
    comparison = terrain(96 * len(panels), 112, "grass")
    draw = ImageDraw.Draw(comparison)
    for index, (label, image) in enumerate(panels):
        left = index * 96
        comparison.alpha_composite(image, (left, 12))
        draw.text((left + 4, 2), label, fill=(255, 247, 202, 255))
    comparison.resize((comparison.width * 4, comparison.height * 4), Image.Resampling.NEAREST).save(
        qa_dir / "direction-comparison-4x.png"
    )

    report = {
        "schema_version": 1,
        "review_id": "frontier-blade-r1-se-direction",
        "purpose": "identity-preserving semantic SE direction review",
        "canvas_px": [96, 96],
        "canonical_root_px": [48, 82],
        "golden_envelope_px": args.envelope,
        "palette_source": "../../candidate/palette.json",
        "review_status": args.review_status,
        "reviewed_on": args.reviewed_on,
        "reason_codes": (
            [
                "non_native_pixel_source",
                "detail_loss_from_downsampling",
                "blurry_at_game_scale",
            ]
            if args.review_status == "rejected"
            else []
        ),
        "runtime_usage": "none",
        "generation_seed_eligible": False,
        "candidates": report_candidates,
    }
    (qa_dir / "direction-report.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    failed = [
        candidate_id
        for candidate_id, candidate in report_candidates.items()
        if candidate["auto_qa_status"] != "passed"
    ]
    print("DIRECTION REVIEW QA: " + ("FAILED" if failed else "PASSED"))
    for candidate_id, candidate in report_candidates.items():
        print(candidate_id, candidate["output"]["metrics"], candidate["checks"])
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
