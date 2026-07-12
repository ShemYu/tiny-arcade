import hashlib
import json
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
REVISION = ROOT / "games/crystal-vanguard/art/blade-rank1/revisions/frontier-blade-r1"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class FrontierStaticSeedTests(unittest.TestCase):
    def setUp(self) -> None:
        self.seed_path = REVISION / "candidate/seed-se.png"
        self.mask_path = REVISION / "candidate/seed-se-mask.png"
        self.report_path = REVISION / "qa/seed-report.json"
        with Image.open(self.seed_path) as source:
            self.seed_mode = source.mode
            self.seed = source.convert("RGBA")
        with Image.open(self.mask_path) as source:
            self.mask = source.copy()
        self.report = json.loads(self.report_path.read_text(encoding="utf-8"))

    def test_candidate_has_hard_pixel_and_mask_contract(self) -> None:
        self.assertEqual(self.seed.size, (96, 96))
        self.assertEqual(self.seed_mode, "RGBA")
        self.assertEqual(self.mask.size, (96, 96))
        self.assertEqual(self.mask.mode, "L")

        alpha = list(self.seed.getchannel("A").get_flattened_data())
        labels = list(self.mask.get_flattened_data())
        self.assertEqual(set(alpha), {0, 255})
        self.assertTrue(set(labels).issubset({0, 1, 2, 3, 4, 5}))
        self.assertNotIn(5, labels)
        self.assertTrue(all((value > 0) == (alpha[index] > 0) for index, value in enumerate(labels)))
        self.assertTrue(
            all(
                pixel[3] > 0 or pixel[:3] == (0, 0, 0)
                for pixel in self.seed.get_flattened_data()
            )
        )

    def test_report_hashes_and_all_automated_gates_are_current(self) -> None:
        files = self.report["files"]
        self.assertEqual(digest(self.seed_path), files["seed"]["sha256"])
        self.assertEqual(digest(self.mask_path), files["mask"]["sha256"])
        self.assertEqual(
            digest(REVISION / "candidate/palette.json"),
            files["palette"]["sha256"],
        )
        self.assertEqual(self.report["auto_qa_status"], "passed")
        self.assertTrue(all(check["passed"] for check in self.report["checks"]))
        self.assertEqual(self.report["review"]["scale"], "approved")
        self.assertEqual(self.report["review"]["normalized_art"], "rejected")
        self.assertEqual(self.report["review"]["mobile"], "rejected")
        self.assertEqual(self.report["golden_scale"]["envelope_px"], 70)
        self.assertEqual(self.report["golden_scale"]["status"], "approved")
        self.assertEqual(self.report["metrics"]["measured_root_px"], [48, 82])
        self.assertEqual(self.report["metrics"]["root_delta_px"], [0, 0])
        self.assertGreaterEqual(self.report["metrics"]["top_clearance_px"], 8)
        self.assertLessEqual(self.report["metrics"]["foreground_colors"], 28)
        self.assertFalse(self.report["generation_seed_eligible"])
        self.assertFalse(self.report["release_eligible"])

    def test_manifest_tracks_candidate_without_promoting_legacy_runtime(self) -> None:
        manifest = json.loads(
            (ROOT / "games/crystal-vanguard/asset-manifest.json").read_text(encoding="utf-8")
        )
        candidate = next(
            item for item in manifest["seed_candidates"]
            if item["id"] == "blade-rank1-frontier-r1-se"
        )
        legacy = next(
            item for item in manifest["sprite_sets"]
            if item["id"] == "blade-rank1"
        )
        self.assertEqual(candidate["auto_qa_status"], "passed")
        self.assertEqual(candidate["review"]["normalized_art"], "rejected")
        self.assertFalse(candidate["generation_seed_eligible"])
        self.assertFalse(candidate["release_eligible"])
        self.assertEqual(legacy["manual_review"]["status"], "rejected")
        self.assertEqual(legacy["runtime_usage"], "dev_legacy_placeholder")
        self.assertIsNone(legacy["approved_seed"])

    def test_direction_review_candidates_are_same_scale_and_not_runtime_eligible(self) -> None:
        report_path = REVISION / "direction-review/qa/direction-report.json"
        report = json.loads(report_path.read_text(encoding="utf-8"))
        self.assertEqual(report["review_status"], "rejected")
        self.assertEqual(report["runtime_usage"], "none")
        self.assertFalse(report["generation_seed_eligible"])
        for candidate_id in ("balanced", "tactical"):
            candidate = report["candidates"][candidate_id]
            self.assertEqual(candidate["auto_qa_status"], "passed")
            self.assertTrue(all(candidate["checks"].values()))
            self.assertEqual(candidate["output"]["metrics"]["height_px"], 70)
            image_path = (report_path.parent / candidate["output"]["path"]).resolve()
            self.assertEqual(digest(image_path), candidate["output"]["sha256"])


if __name__ == "__main__":
    unittest.main()
