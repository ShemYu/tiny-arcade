# Game Asset Extension

Shared production checks for image assets used by games in this repo.

The extension is intentionally split into two layers:

- common tooling in `tools/game-assets/`
- game-specific asset contracts beside each game, such as `games/mochi-sky/asset-manifest.json`

The validator reads a JSON manifest whose paths are relative to the manifest file. This keeps each game portable and avoids central manifests that need to know every game folder layout.

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

Install Pillow if your local Python does not already provide it:

```bash
python3 -m pip install pillow
```
