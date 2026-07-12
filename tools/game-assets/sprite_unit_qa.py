#!/usr/bin/env python3
"""Deterministic, mask-aware-ready QA for directional sprite sets.

The current implementation uses a conservative central body band when a label
mask is unavailable. That proxy is sufficient to reject scale drift, but never
to grant visual approval. A future label mask can replace the proxy without
changing the report schema.
"""

from __future__ import annotations

import hashlib
import json
import statistics
from pathlib import Path
from typing import Any, Iterable

from PIL import Image


REPORT_SCHEMA_VERSION = 1
QA_PASS_STATES = {
    "auto_qa_passed",
    "art_approved",
    "runtime_mobile_approved",
    "integrated",
}


def _median(values: Iterable[float]) -> float:
    materialized = list(values)
    return float(statistics.median(materialized)) if materialized else 0.0


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _threshold_bbox(
    image: Image.Image,
    alpha_threshold: int,
    x_range: tuple[int, int] | None = None,
) -> tuple[int, int, int, int] | None:
    alpha = image.getchannel("A")
    if x_range is None:
        return alpha.point(lambda value: 255 if value >= alpha_threshold else 0).getbbox()

    left, right = x_range
    clipped = alpha.crop((left, 0, right, image.height))
    bbox = clipped.point(lambda value: 255 if value >= alpha_threshold else 0).getbbox()
    if bbox is None:
        return None
    return (bbox[0] + left, bbox[1], bbox[2] + left, bbox[3])


def _pixel_stats(image: Image.Image, alpha_threshold: int) -> dict[str, Any]:
    pixels = image.load()
    visible = 0
    alpha_pixels = 0
    partial = 0
    transparent_rgb = 0
    cyan_hint = 0
    centroid_x_total = 0.0
    centroid_y_total = 0.0

    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0 and (red or green or blue):
                transparent_rgb += 1
            if 0 < alpha < 255:
                partial += 1
            if alpha > 0:
                alpha_pixels += 1
            if alpha >= alpha_threshold:
                visible += 1
                centroid_x_total += x
                centroid_y_total += y
                if blue >= 170 and green >= 130 and red <= 120 and blue - red >= 80:
                    cyan_hint += 1

    return {
        "visible_pixels": visible,
        "alpha_pixels": alpha_pixels,
        "partial_alpha_pixels": partial,
        "partial_alpha_ratio": round(partial / max(1, alpha_pixels), 6),
        "transparent_rgb_pixels": transparent_rgb,
        "cyan_vfx_hint_pixels": cyan_hint,
        "centroid_px": [
            round(centroid_x_total / max(1, visible), 3),
            round(centroid_y_total / max(1, visible), 3),
        ],
    }


def _connected_components(image: Image.Image, alpha_threshold: int) -> list[dict[str, Any]]:
    pixels = image.load()
    width, height = image.size
    seen = bytearray(width * height)
    components: list[dict[str, Any]] = []

    for start_y in range(height):
        for start_x in range(width):
            index = start_y * width + start_x
            if seen[index] or pixels[start_x, start_y][3] < alpha_threshold:
                continue
            seen[index] = 1
            stack = [(start_x, start_y)]
            count = 0
            min_x = max_x = start_x
            min_y = max_y = start_y

            while stack:
                x, y = stack.pop()
                count += 1
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                for offset_y in (-1, 0, 1):
                    for offset_x in (-1, 0, 1):
                        if offset_x == 0 and offset_y == 0:
                            continue
                        next_x = x + offset_x
                        next_y = y + offset_y
                        if not (0 <= next_x < width and 0 <= next_y < height):
                            continue
                        next_index = next_y * width + next_x
                        if seen[next_index] or pixels[next_x, next_y][3] < alpha_threshold:
                            continue
                        seen[next_index] = 1
                        stack.append((next_x, next_y))

            components.append({
                "pixel_count": count,
                "bbox": [min_x, min_y, max_x + 1, max_y + 1],
            })

    components.sort(key=lambda component: (-component["pixel_count"], component["bbox"]))
    return components


def _frame_metrics(
    frame: Image.Image,
    *,
    alpha_threshold: int,
    core_x: tuple[int, int],
    anchor: tuple[int, int],
) -> dict[str, Any]:
    bbox = _threshold_bbox(frame, alpha_threshold)
    core_bbox = _threshold_bbox(frame, alpha_threshold, core_x)
    stats = _pixel_stats(frame, alpha_threshold)
    components = _connected_components(frame, alpha_threshold)
    width, height = frame.size

    root_x = float(anchor[0])
    root_y = float(anchor[1])
    if core_bbox is not None:
        pixels = frame.load()
        foot_y = core_bbox[3] - 1
        foot_x_values: list[int] = []
        for y in range(max(core_bbox[1], foot_y - 3), foot_y + 1):
            for x in range(core_x[0], core_x[1]):
                if pixels[x, y][3] >= alpha_threshold:
                    foot_x_values.append(x)
        root_y = float(foot_y + 1)
        if foot_x_values:
            root_x = sum(foot_x_values) / len(foot_x_values)

    padding = None
    if bbox is not None:
        padding = [bbox[0], bbox[1], width - bbox[2], height - bbox[3]]

    return {
        "bbox": list(bbox) if bbox is not None else None,
        "core_bbox": list(core_bbox) if core_bbox is not None else None,
        "core_height_px": core_bbox[3] - core_bbox[1] if core_bbox is not None else 0,
        "measured_root_px": [round(root_x, 3), round(root_y, 3)],
        "root_delta_px": [round(root_x - anchor[0], 3), round(root_y - anchor[1], 3)],
        "padding_px": padding,
        "rgba_sha256": _sha256_bytes(frame.tobytes()),
        "connected_components": components,
        **stats,
    }


def _issue(
    issues: list[dict[str, Any]],
    severity: str,
    code: str,
    message: str,
    **context: Any,
) -> None:
    issues.append({
        "severity": severity,
        "code": code,
        "message": message,
        **context,
    })


def _analyze_action(
    root: Path,
    asset: dict[str, Any],
    action_id: str,
    action_config: dict[str, Any],
    contract: dict[str, Any],
    directions: list[str],
    anchor: tuple[int, int],
    issues: list[dict[str, Any]],
) -> dict[str, Any]:
    path = root / asset["path"]
    image = Image.open(path).convert("RGBA")
    cell_width, cell_height = (int(value) for value in contract["cell"])
    columns, rows = (int(value) for value in asset["grid"])
    alpha_threshold = int(contract.get("alpha_threshold", 24))
    core_x_values = contract.get("body_core_x_px", [cell_width // 4, cell_width * 3 // 4])
    core_x = (int(core_x_values[0]), int(core_x_values[1]))
    grounded_columns = {int(value) for value in action_config.get("grounded_columns", [])}
    settled_columns = {int(value) for value in action_config.get("settled_columns", [])}
    equipment_padding = int(contract.get("equipment_padding_px", 0))
    body_padding = int(contract.get("body_padding_px", 0))
    body_top_padding = int(contract.get("body_top_padding_px", body_padding))
    anchor_tolerance = float(contract.get("anchor_tolerance_px", 2))

    frames: list[dict[str, Any]] = []
    frame_by_position: dict[tuple[int, int], dict[str, Any]] = {}
    exact_duplicates: list[dict[str, Any]] = []
    continuity_steps: list[dict[str, Any]] = []

    for row in range(rows):
        row_hashes: dict[str, int] = {}
        previous: dict[str, Any] | None = None
        for column in range(columns):
            frame = image.crop((
                column * cell_width,
                row * cell_height,
                (column + 1) * cell_width,
                (row + 1) * cell_height,
            ))
            metrics = _frame_metrics(
                frame,
                alpha_threshold=alpha_threshold,
                core_x=core_x,
                anchor=anchor,
            )
            metrics.update({
                "direction": directions[row] if row < len(directions) else str(row),
                "row": row,
                "column": column,
            })
            frames.append(metrics)
            frame_by_position[(row, column)] = metrics

            prior_column = row_hashes.get(metrics["rgba_sha256"])
            if prior_column is not None:
                exact_duplicates.append({
                    "direction": metrics["direction"],
                    "columns": [prior_column, column],
                })
            else:
                row_hashes[metrics["rgba_sha256"]] = column

            if previous is not None:
                dx = metrics["centroid_px"][0] - previous["centroid_px"][0]
                dy = metrics["centroid_px"][1] - previous["centroid_px"][1]
                continuity_steps.append({
                    "direction": metrics["direction"],
                    "columns": [column - 1, column],
                    "centroid_delta_px": round((dx * dx + dy * dy) ** 0.5, 3),
                })
            previous = metrics

    empty_frames = [frame for frame in frames if frame["bbox"] is None]
    if empty_frames:
        _issue(
            issues,
            "hard",
            "empty_frames",
            f"{action_id} contains {len(empty_frames)} empty frames.",
            action=action_id,
        )

    crop_failures = [
        frame for frame in frames
        if frame["padding_px"] is not None and min(frame["padding_px"]) < equipment_padding
    ]
    if crop_failures:
        _issue(
            issues,
            "hard",
            "equipment_padding",
            f"{action_id} has {len(crop_failures)} frames below {equipment_padding}px equipment padding.",
            action=action_id,
            examples=[
                {"direction": frame["direction"], "column": frame["column"], "padding_px": frame["padding_px"]}
                for frame in crop_failures[:8]
            ],
        )

    body_headroom_failures = [
        frame for frame in frames
        if frame["core_bbox"] is not None and frame["core_bbox"][1] < body_top_padding
    ]
    if body_headroom_failures:
        minimum = min(frame["core_bbox"][1] for frame in body_headroom_failures)
        _issue(
            issues,
            "hard",
            "body_headroom",
            f"{action_id} has {len(body_headroom_failures)} frames with only {minimum}px top body-proxy clearance; required {body_top_padding}px.",
            action=action_id,
            required_px=body_top_padding,
            examples=[
                {
                    "direction": frame["direction"],
                    "column": frame["column"],
                    "top_clearance_px": frame["core_bbox"][1],
                }
                for frame in body_headroom_failures[:8]
            ],
        )

    body_footroom_failures = [
        frame for frame in frames
        if frame["core_bbox"] is not None and cell_height - frame["core_bbox"][3] < body_padding
    ]
    if body_footroom_failures:
        minimum = min(cell_height - frame["core_bbox"][3] for frame in body_footroom_failures)
        _issue(
            issues,
            "hard",
            "body_footroom",
            f"{action_id} has {len(body_footroom_failures)} frames with only {minimum}px bottom body-proxy clearance; required {body_padding}px.",
            action=action_id,
            required_px=body_padding,
            examples=[
                {
                    "direction": frame["direction"],
                    "column": frame["column"],
                    "bottom_clearance_px": cell_height - frame["core_bbox"][3],
                }
                for frame in body_footroom_failures[:8]
            ],
        )

    detached_top_failures: list[dict[str, Any]] = []
    for frame in frames:
        detached = [
            component
            for component in frame["connected_components"][1:]
            if component["pixel_count"] >= 8 and component["bbox"][1] < body_top_padding
        ]
        if detached:
            detached_top_failures.append({
                "direction": frame["direction"],
                "column": frame["column"],
                "components": detached,
            })
    if detached_top_failures:
        _issue(
            issues,
            "hard",
            "detached_top_component",
            f"{action_id} has {len(detached_top_failures)} frames with detached sprite islands in the top danger band.",
            action=action_id,
            frames=detached_top_failures,
        )

    grounded = [
        frame_by_position[(row, column)]
        for row in range(rows)
        for column in grounded_columns
        if (row, column) in frame_by_position
    ]
    anchor_failures = [
        frame for frame in grounded
        if abs(frame["root_delta_px"][1]) > anchor_tolerance
    ]
    if anchor_failures:
        maximum = max(abs(frame["root_delta_px"][1]) for frame in anchor_failures)
        _issue(
            issues,
            "hard",
            "root_anchor_y",
            f"{action_id} root Y misses the canonical anchor by up to {maximum:g}px.",
            action=action_id,
            target_y=anchor[1],
            allowed_px=anchor_tolerance,
            affected_frames=len(anchor_failures),
        )

    settled = [
        frame_by_position[(row, column)]
        for row in range(rows)
        for column in settled_columns
        if (row, column) in frame_by_position
    ]
    if settled:
        by_direction: dict[str, list[float]] = {}
        for frame in settled:
            by_direction.setdefault(frame["direction"], []).append(frame["measured_root_px"][1])
        maximum_drift = max((max(values) - min(values) for values in by_direction.values()), default=0)
        if maximum_drift > anchor_tolerance:
            _issue(
                issues,
                "hard",
                "settled_contact_slide",
                f"{action_id} settled contact slides by up to {maximum_drift:g}px.",
                action=action_id,
                allowed_px=anchor_tolerance,
            )

    transparent_rgb_pixels = sum(frame["transparent_rgb_pixels"] for frame in frames)
    transparent_rgb_limit = int(contract.get("transparent_rgb_max_pixels", 0))
    if transparent_rgb_pixels > transparent_rgb_limit:
        _issue(
            issues,
            "hard",
            "transparent_rgb_residue",
            f"{action_id} contains {transparent_rgb_pixels} transparent pixels with non-zero RGB.",
            action=action_id,
            allowed_pixels=transparent_rgb_limit,
        )

    visible_pixels = sum(frame["visible_pixels"] for frame in frames)
    alpha_pixels = sum(frame["alpha_pixels"] for frame in frames)
    partial_alpha_pixels = sum(frame["partial_alpha_pixels"] for frame in frames)
    partial_alpha_ratio = partial_alpha_pixels / max(1, alpha_pixels)
    partial_alpha_limit = float(contract.get("partial_alpha_max_ratio", 1))
    if partial_alpha_ratio > partial_alpha_limit:
        _issue(
            issues,
            "hard",
            "partial_alpha_ratio",
            f"{action_id} partial-alpha ratio is {partial_alpha_ratio:.1%}; allowed {partial_alpha_limit:.1%}.",
            action=action_id,
            actual_ratio=round(partial_alpha_ratio, 6),
            allowed_ratio=partial_alpha_limit,
        )

    if exact_duplicates:
        _issue(
            issues,
            "hard",
            "exact_duplicate_frames",
            f"{action_id} contains {len(exact_duplicates)} undeclared exact duplicate frame pairs.",
            action=action_id,
            pairs=exact_duplicates,
        )

    cyan_frames = [
        frame for frame in frames
        if frame["cyan_vfx_hint_pixels"] >= 20
    ]
    if cyan_frames:
        _issue(
            issues,
            "warning",
            "possible_baked_vfx",
            f"{action_id} has {len(cyan_frames)} frames with detached-cyan VFX-like pixels; manual review required.",
            action=action_id,
            frames=[
                {"direction": frame["direction"], "column": frame["column"], "pixels": frame["cyan_vfx_hint_pixels"]}
                for frame in cyan_frames
            ],
        )

    known_baked_vfx_columns = [int(value) for value in action_config.get("known_baked_vfx_columns", [])]
    if known_baked_vfx_columns:
        _issue(
            issues,
            "hard",
            "baked_vfx_in_body_sheet",
            f"{action_id} declares baked VFX in body-sheet columns {known_baked_vfx_columns}.",
            action=action_id,
            columns=known_baked_vfx_columns,
        )

    comparable_columns = [int(value) for value in action_config.get("comparable_columns", [])]
    comparable_heights: dict[str, list[int]] = {}
    within_action: dict[str, dict[str, float]] = {}
    within_tolerance = float(contract.get("within_action_scale_tolerance_ratio", 0.03))
    for row, direction in enumerate(directions[:rows]):
        heights = [
            int(frame_by_position[(row, column)]["core_height_px"])
            for column in comparable_columns
            if (row, column) in frame_by_position and frame_by_position[(row, column)]["core_height_px"] > 0
        ]
        comparable_heights[direction] = heights
        median_height = _median(heights)
        maximum_ratio = max(
            (abs(height - median_height) / max(1.0, median_height) for height in heights),
            default=0.0,
        )
        within_action[direction] = {
            "median_core_height_px": round(median_height, 3),
            "max_deviation_ratio": round(maximum_ratio, 6),
        }
        if maximum_ratio > within_tolerance:
            _issue(
                issues,
                "hard",
                "within_action_scale",
                f"{action_id}/{direction} comparable body proxy drifts {maximum_ratio:.1%}; allowed {within_tolerance:.1%}.",
                action=action_id,
                direction=direction,
                heights_px=heights,
                actual_ratio=round(maximum_ratio, 6),
                allowed_ratio=within_tolerance,
            )

    return {
        "asset_id": asset["id"],
        "path": asset["path"],
        "source_sha256": _sha256_bytes(path.read_bytes()),
        "size_px": list(image.size),
        "grid": [columns, rows],
        "comparable_columns": comparable_columns,
        "grounded_columns": sorted(grounded_columns),
        "settled_columns": sorted(settled_columns),
        "transition_columns": {
            key: int(value)
            for key, value in action_config.get("transition_columns", {}).items()
        },
        "known_baked_vfx_columns": known_baked_vfx_columns,
        "visible_pixels": visible_pixels,
        "alpha_pixels": alpha_pixels,
        "partial_alpha_pixels": partial_alpha_pixels,
        "partial_alpha_ratio": round(partial_alpha_ratio, 6),
        "transparent_rgb_pixels": transparent_rgb_pixels,
        "minimum_visible_padding_px": min(
            (min(frame["padding_px"]) for frame in frames if frame["padding_px"] is not None),
            default=0,
        ),
        "exact_duplicate_pairs": exact_duplicates,
        "maximum_centroid_step_px": max(
            (step["centroid_delta_px"] for step in continuity_steps),
            default=0,
        ),
        "continuity_steps": continuity_steps,
        "comparable_core_heights_px": comparable_heights,
        "within_action_scale": within_action,
        "frames": frames,
    }


def analyze_sprite_set(
    manifest_path: Path,
    manifest: dict[str, Any],
    sprite_set: dict[str, Any],
) -> dict[str, Any]:
    root = manifest_path.parent
    contract = dict(manifest.get("sprite_contract", {}))
    directions = [str(value) for value in contract.get("direction_rows", [])]
    anchor_values = contract.get("anchor_px", [0, 0])
    anchor = (int(anchor_values[0]), int(anchor_values[1]))
    assets_by_id = {
        str(asset.get("id")): asset
        for asset in manifest.get("assets", [])
        if asset.get("id")
    }
    issues: list[dict[str, Any]] = []
    actions: dict[str, dict[str, Any]] = {}

    for action_id, action_config in sprite_set.get("actions", {}).items():
        asset_id = str(action_config.get("asset_id", ""))
        asset = assets_by_id.get(asset_id)
        if asset is None:
            _issue(
                issues,
                "hard",
                "missing_action_asset",
                f"{action_id} references missing asset id {asset_id!r}.",
                action=action_id,
                asset_id=asset_id,
            )
            continue
        try:
            actions[action_id] = _analyze_action(
                root,
                asset,
                action_id,
                action_config,
                contract,
                directions,
                anchor,
                issues,
            )
        except (OSError, KeyError, ValueError) as error:
            _issue(
                issues,
                "hard",
                "action_analysis_error",
                f"{action_id} could not be analyzed: {error}",
                action=action_id,
            )

    diagnostic_reference = (
        sprite_set.get("diagnostic_reference")
        or sprite_set.get("identity_reference")
        or {}
    )
    reference_action_id = str(diagnostic_reference.get("action", "idle"))
    reference_action = actions.get(reference_action_id)
    cross_action: list[dict[str, Any]] = []
    transition_scale: list[dict[str, Any]] = []
    cross_tolerance = float(contract.get("cross_action_scale_tolerance_ratio", 0.05))
    envelope_values = contract.get("body_envelope_px", [0, 10_000])
    envelope_min, envelope_max = float(envelope_values[0]), float(envelope_values[1])

    if reference_action is not None:
        reference_heights = {
            direction: values["median_core_height_px"]
            for direction, values in reference_action["within_action_scale"].items()
        }
        envelope_failures = {
            direction: height
            for direction, height in reference_heights.items()
            if not envelope_min <= height <= envelope_max
        }
        if envelope_failures:
            _issue(
                issues,
                "hard",
                "body_envelope",
                f"{reference_action_id} body proxy falls outside the {envelope_min:g}–{envelope_max:g}px envelope.",
                action=reference_action_id,
                directions=envelope_failures,
            )

        for action_id, action in actions.items():
            for direction, values in action["within_action_scale"].items():
                actual_height = float(values["median_core_height_px"])
                reference_height = float(reference_heights.get(direction, 0))
                if reference_height <= 0 or actual_height <= 0:
                    continue
                ratio = (actual_height - reference_height) / reference_height
                comparison = {
                    "action": action_id,
                    "direction": direction,
                    "reference_height_px": round(reference_height, 3),
                    "actual_height_px": round(actual_height, 3),
                    "delta_ratio": round(ratio, 6),
                }
                cross_action.append(comparison)
                if action_id != reference_action_id and abs(ratio) > cross_tolerance:
                    _issue(
                        issues,
                        "hard",
                        "cross_action_scale",
                        f"{action_id}/{direction} differs from {reference_action_id} by {ratio:+.1%}; allowed ±{cross_tolerance:.1%}.",
                        **comparison,
                        allowed_ratio=cross_tolerance,
                    )

        reference_column = int(diagnostic_reference.get("column", 0))
        reference_frame_heights = {
            direction: next(
                (
                    int(frame["core_height_px"])
                    for frame in reference_action["frames"]
                    if frame["direction"] == direction and frame["column"] == reference_column
                ),
                0,
            )
            for direction in directions
        }
        for action_id, action in actions.items():
            if action_id == reference_action_id:
                continue
            for phase, column in action.get("transition_columns", {}).items():
                failures: list[dict[str, Any]] = []
                for direction in directions:
                    actual_height = next(
                        (
                            int(frame["core_height_px"])
                            for frame in action["frames"]
                            if frame["direction"] == direction and frame["column"] == column
                        ),
                        0,
                    )
                    reference_height = int(reference_frame_heights.get(direction, 0))
                    if actual_height <= 0 or reference_height <= 0:
                        continue
                    ratio = (actual_height - reference_height) / reference_height
                    comparison = {
                        "action": action_id,
                        "phase": phase,
                        "column": column,
                        "direction": direction,
                        "reference_height_px": reference_height,
                        "actual_height_px": actual_height,
                        "delta_ratio": round(ratio, 6),
                    }
                    transition_scale.append(comparison)
                    if abs(ratio) > cross_tolerance:
                        failures.append(comparison)

                if failures:
                    worst = max(failures, key=lambda comparison: abs(comparison["delta_ratio"]))
                    _issue(
                        issues,
                        "hard",
                        f"transition_{phase}_scale",
                        (
                            f"{action_id} {phase} frame changes apparent body scale in "
                            f"{len(failures)} directions; worst is {worst['direction']} "
                            f"at {worst['delta_ratio']:+.1%}."
                        ),
                        action=action_id,
                        phase=phase,
                        reference_action=reference_action_id,
                        reference_column=reference_column,
                        allowed_ratio=cross_tolerance,
                        failures=failures,
                    )
    else:
        _issue(
            issues,
            "hard",
            "missing_diagnostic_reference",
            f"Diagnostic reference action {reference_action_id!r} is unavailable.",
        )

    qa_mask = sprite_set.get("qa_mask")
    if qa_mask is None:
        _issue(
            issues,
            "hard",
            "body_mask_missing",
            "No label mask is supplied; body padding, root contact, and true scale cannot be approved.",
        )
    elif not (root / str(qa_mask)).exists():
        _issue(
            issues,
            "hard",
            "body_mask_file_missing",
            f"Declared label mask {qa_mask!r} does not exist.",
        )

    manual_review = dict(sprite_set.get("manual_review", {}))
    if manual_review.get("status") == "rejected":
        _issue(
            issues,
            "hard",
            "manual_source_rejection",
            "The reviewer rejected this source set for production; no existing frame is an approved generation seed.",
            reason_codes=list(manual_review.get("reason_codes", [])),
        )

    issues.sort(key=lambda item: (
        0 if item["severity"] == "hard" else 1,
        item["code"],
        item.get("action", ""),
        item.get("direction", ""),
    ))
    hard_failures = sum(issue["severity"] == "hard" for issue in issues)
    warnings = sum(issue["severity"] == "warning" for issue in issues)
    declared_status = str(sprite_set.get("qa_status", "generated"))
    computed_status = "needs_rework" if hard_failures else "auto_qa_passed"
    computed_auto_qa_status = "failed" if hard_failures else "passed"
    production_eligible = (
        hard_failures == 0
        and manual_review.get("status") != "rejected"
        and sprite_set.get("approved_seed") is not None
    )
    qa_declaration_matches = (
        declared_status == "needs_rework" if hard_failures else declared_status in QA_PASS_STATES
    )
    declared_auto_qa_status = sprite_set.get("auto_qa_status")
    auto_declaration_matches = (
        declared_auto_qa_status is None
        or declared_auto_qa_status == computed_auto_qa_status
    )
    declared_release_eligible = sprite_set.get("release_eligible")
    release_declaration_matches = (
        declared_release_eligible is None
        or bool(declared_release_eligible) == production_eligible
    )

    return {
        "report_schema_version": REPORT_SCHEMA_VERSION,
        "sprite_set_id": sprite_set["id"],
        "declared_qa_status": declared_status,
        "computed_qa_status": computed_status,
        "declared_auto_qa_status": declared_auto_qa_status,
        "computed_auto_qa_status": computed_auto_qa_status,
        "runtime_usage": sprite_set.get("runtime_usage"),
        "declared_release_eligible": declared_release_eligible,
        "generation_seed_eligible": sprite_set.get("generation_seed_eligible"),
        "replacement_strategy": sprite_set.get("replacement_strategy"),
        "normalization_decision": (
            sprite_set.get("source_decision")
            or ("repair_source" if hard_failures else "shared_unit_scale_only")
        ),
        "manual_review": manual_review,
        "diagnostic_reference": diagnostic_reference,
        "approved_seed": sprite_set.get("approved_seed"),
        "contract": contract,
        "summary": {
            "action_count": len(actions),
            "frame_count": sum(len(action["frames"]) for action in actions.values()),
            "hard_failure_count": hard_failures,
            "warning_count": warnings,
            "declaration_matches_audit": (
                qa_declaration_matches
                and auto_declaration_matches
                and release_declaration_matches
            ),
            "auto_declaration_matches_audit": auto_declaration_matches,
            "release_declaration_matches_audit": release_declaration_matches,
            "production_eligible": production_eligible,
        },
        "source_hashes": {
            action_id: action["source_sha256"]
            for action_id, action in actions.items()
        },
        "actions": actions,
        "cross_action_scale": cross_action,
        "transition_scale": transition_scale,
        "issues": issues,
    }


def analyze_manifest(manifest_path: Path) -> list[dict[str, Any]]:
    manifest_path = manifest_path.resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    return [
        analyze_sprite_set(manifest_path, manifest, sprite_set)
        for sprite_set in manifest.get("sprite_sets", [])
    ]


def write_report(path: Path, reports: list[dict[str, Any]]) -> None:
    payload: dict[str, Any]
    if len(reports) == 1:
        payload = reports[0]
    else:
        payload = {
            "report_schema_version": REPORT_SCHEMA_VERSION,
            "sprite_sets": reports,
        }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
