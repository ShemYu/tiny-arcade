from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image


TOOLS_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS_DIR))

from sprite_unit_qa import analyze_manifest, write_report  # noqa: E402


class SpriteUnitQaTests(unittest.TestCase):
    def make_sheet(
        self,
        path: Path,
        boxes: list[tuple[int, int, int, int]],
        *,
        residue: bool = False,
        partial: bool = False,
    ) -> None:
        image = Image.new("RGBA", (16 * len(boxes), 16), (0, 0, 0, 0))
        for column, box in enumerate(boxes):
            left, top, right, bottom = box
            for y in range(top, bottom):
                for x in range(left, right):
                    image.putpixel((column * 16 + x, y), (210, 170, 90, 255))
            image.putpixel((column * 16 + left, top), (211 + column, 170, 90, 255))
        if residue:
            image.putpixel((0, 0), (255, 0, 0, 0))
        if partial:
            image.putpixel((1, 1), (255, 255, 255, 128))
        image.save(path)

    def write_fixture(
        self,
        root: Path,
        *,
        attack_boxes: list[tuple[int, int, int, int]],
        attack_residue: bool = False,
        attack_partial: bool = False,
        declared_status: str = "auto_qa_passed",
    ) -> Path:
        idle_path = root / "idle.png"
        attack_path = root / "attack.png"
        self.make_sheet(idle_path, [(6, 6, 10, 14), (6, 6, 10, 14)])
        self.make_sheet(
            attack_path,
            attack_boxes,
            residue=attack_residue,
            partial=attack_partial,
        )
        Image.new("L", (32, 16), 0).save(root / "mask.png")
        manifest = {
            "sprite_contract": {
                "cell": [16, 16],
                "direction_rows": ["S"],
                "anchor_px": [8, 14],
                "alpha_threshold": 24,
                "anchor_tolerance_px": 1,
                "body_core_x_px": [4, 12],
                "body_envelope_px": [6, 10],
                "body_padding_px": 2,
                "equipment_padding_px": 2,
                "partial_alpha_max_ratio": 0.05,
                "transparent_rgb_max_pixels": 0,
                "within_action_scale_tolerance_ratio": 0.03,
                "cross_action_scale_tolerance_ratio": 0.05,
            },
            "sprite_sets": [{
                "id": "unit",
                "qa_status": declared_status,
                "diagnostic_reference": {"action": "idle", "direction": "S", "column": 0},
                "approved_seed": None,
                "qa_mask": "mask.png",
                "actions": {
                    "idle": {
                        "asset_id": "idle",
                        "comparable_columns": [0, 1],
                        "grounded_columns": [0, 1],
                    },
                    "attack": {
                        "asset_id": "attack",
                        "comparable_columns": [0, 1],
                        "grounded_columns": [0, 1],
                        "transition_columns": {"entry": 0, "exit": 1},
                    },
                },
            }],
            "assets": [
                {"id": "idle", "path": "idle.png", "grid": [2, 1]},
                {"id": "attack", "path": "attack.png", "grid": [2, 1]},
            ],
        }
        manifest_path = root / "manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        return manifest_path

    def test_clean_set_reaches_auto_qa_passed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            manifest = self.write_fixture(
                Path(temporary),
                attack_boxes=[(6, 6, 10, 14), (6, 6, 10, 14)],
            )
            report = analyze_manifest(manifest)[0]
            self.assertEqual(report["computed_qa_status"], "auto_qa_passed")
            self.assertEqual(report["summary"]["hard_failure_count"], 0)
            self.assertTrue(report["summary"]["declaration_matches_audit"])

    def test_anchor_scale_alpha_and_crop_failures_are_coded(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            manifest = self.write_fixture(
                Path(temporary),
                attack_boxes=[(0, 10, 10, 16), (0, 10, 10, 16)],
                attack_residue=True,
                attack_partial=True,
                declared_status="needs_rework",
            )
            data = json.loads(manifest.read_text(encoding="utf-8"))
            data["sprite_contract"]["partial_alpha_max_ratio"] = 0.005
            manifest.write_text(json.dumps(data), encoding="utf-8")
            attack_path = Path(temporary) / "attack.png"
            attack = Image.open(attack_path).convert("RGBA")
            attack.paste(attack.crop((0, 0, 16, 16)), (16, 0))
            attack.save(attack_path)
            report = analyze_manifest(manifest)[0]
            codes = {issue["code"] for issue in report["issues"] if issue["severity"] == "hard"}
            self.assertEqual(report["computed_qa_status"], "needs_rework")
            self.assertTrue(report["summary"]["declaration_matches_audit"])
            self.assertTrue({
                "cross_action_scale",
                "body_footroom",
                "equipment_padding",
                "exact_duplicate_frames",
                "partial_alpha_ratio",
                "root_anchor_y",
                "transparent_rgb_residue",
                "transition_entry_scale",
                "transition_exit_scale",
            }.issubset(codes))

    def test_report_is_deterministic_and_timestamp_free(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            manifest = self.write_fixture(
                root,
                attack_boxes=[(6, 6, 10, 14), (6, 6, 10, 14)],
            )
            first = analyze_manifest(manifest)
            second = analyze_manifest(manifest)
            self.assertEqual(first, second)

            first_path = root / "first.json"
            second_path = root / "second.json"
            write_report(first_path, first)
            write_report(second_path, second)
            self.assertEqual(first_path.read_bytes(), second_path.read_bytes())
            self.assertNotIn(b"timestamp", first_path.read_bytes())


if __name__ == "__main__":
    unittest.main()
