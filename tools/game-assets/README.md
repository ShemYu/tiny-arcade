# Game Asset Extension

Shared production checks for image assets used by games in this repo.

The extension is intentionally split into two layers:

- common tooling in `tools/game-assets/`
- game-specific asset contracts beside each game, such as `games/mochi-sky/asset-manifest.json`

The validator reads a JSON manifest whose paths are relative to the manifest file. This keeps each game portable and avoids central manifests that need to know every game folder layout.

Directional character sets can also declare an executable `sprite_contract`
and `sprite_sets`. That layer evaluates the same root across actions, comparable
body-proxy scale, alpha hygiene, crop safety, exact duplicates, and continuity.
Runtime loadability and art approval remain separate states.

## Manifest shape

```json
{
  "assets": [
    {
      "path": "assets/player_walk.png",
      "type": "sprite_sheet",
      "size": [512, 64],
      "mode": "RGBA",
      "transparent": true,
      "cell": [64, 64],
      "grid": [8, 1],
      "edge_padding_px": 2,
      "bottom_padding_px": 1,
      "grounded_frames": [0, 1, 2, 3],
      "anchor_bottom_tolerance_px": 1,
      "comparable_scale_frames": [0, 1, 2, 3],
      "bbox_height_tolerance_ratio": 0.08
    }
  ]
}
```

Supported `type` values:

- `image`: existence, dimensions, color mode, and optional alpha checks
- `sprite_sheet`: all `image` checks plus grid, frame emptiness, padding, baseline, and scale checks
- `tile`: all `image` checks plus optional edge seam checks
- `background`: all `image` checks plus optional edge seam checks

## Usage

```bash
python3 tools/game-assets/validate_game_assets.py games/mochi-sky/asset-manifest.json
```

Strict mode is the release gate and is the default. A development branch may
keep known-rejected art active only by declaring `qa_status: needs_rework` and
using declared-status audit mode:

```bash
python3 tools/game-assets/validate_game_assets.py \
  games/crystal-vanguard/asset-manifest.json \
  --qa-mode declared \
  --report games/crystal-vanguard/art/blade-rank1/qa/report.json
```

Render the report without mutating production sprite sheets:

```bash
python3 tools/game-assets/render_sprite_qa.py \
  games/crystal-vanguard/asset-manifest.json \
  games/crystal-vanguard/art/blade-rank1/qa/report.json \
  games/crystal-vanguard/art/blade-rank1/qa
```

Clean-room concept art can be normalized into an isolated diagnostic review
package:

```bash
python3 tools/game-assets/prepare_static_seed.py \
  games/crystal-vanguard/art/blade-rank1/revisions/frontier-blade-r1/source/concept-a-1254.png \
  games/crystal-vanguard/art/blade-rank1/revisions/frontier-blade-r1 \
  --source-root 598 1071 --canvas-root 48 82 \
  --envelopes 64 70 74 --selected-envelope 70 --palette-colors 28
```

The command performs tolerant chroma segmentation, edge decontamination,
single-scale box reduction, limited-palette quantization, binary-alpha cleanup,
semantic-mask generation, and static QA. It is useful for measurements and
scale comparisons, but it does **not** create production-native pixel art. A
passing static report does not grant manual art/mobile approval or
animation-seed eligibility. Crystal Vanguard's blurry r1 reduction is retained
as a rejected regression fixture; production r2 pixels must be authored on the
logical 96×96 grid as specified in
`games/crystal-vanguard/v0.2/docs/SPRITE_PIPELINE_HANDOFF.md`.

`--qa-mode off` retains the original file/topology-only behavior. `--qa-mode
declared` still fails structural errors or a dishonest status declaration; it
does not turn a rejected set into an approved one.

Install Pillow if your local Python does not already provide it:

```bash
python3 -m pip install pillow
```
