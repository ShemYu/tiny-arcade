# Mochi Sky / 麻糬星野

A tiny pastel pixel-art side-scroller POC inside **Shem's Tiny Arcade**.

Play it from the arcade:

```text
https://shemyu.github.io/single-page-games/games/mochi-sky/
```

## What is implemented

- horizontal side-scrolling camera
- jump and platform collision
- inhale mechanic
- star projectile attack
- simple enemies
- collectibles
- health UI
- checkpoint
- finish gate
- keyboard controls
- touch controls for mobile browsers
- lightweight procedural audio
- local PNG player, inhale, enemy, star, backdrop, and terrain assets

## Controls

| Input | Action |
| --- | --- |
| `←` `→` / `A` `D` | Move |
| `Space` / `W` | Jump |
| Hold `X` | Inhale |
| `C` | Shoot star |
| `R` | Restart |
| `P` | Pause |

## POC notes

This is intentionally compact: one HTML page with embedded CSS, JavaScript, canvas rendering, and a few local PNG textures. The goal is to validate feel and interaction before introducing a framework.

## Asset pipeline

Runtime scene art is deliberately split by responsibility:

- `mochi-sky-backdrop.png` contains only distant sky, clouds, layered hills, and valley mist.
- `mochi-sky-tiles.png` contains the foreground grass/dirt tile and is horizontally seamless.
- `mochi-sky-inhale-game-sheet.png` keeps the original high-detail ImageGen poses in eight fixed `96×64` cells with one shared body scale and contact baseline.

The source art remains the visual authority. The runtime generator selects clean regions from `mochi-sky-map-source.png` instead of redrawing the scene in a flatter style, and it separates the inhale frames on their real transparent gutters instead of slicing the source into equal arithmetic columns.

Regenerate the backdrop, terrain, and inhale sheet with:

```bash
python3 tools/generate_runtime_art.py
```

The compatibility command does the same while preserving the already-approved walking, enemy, and star runtime sheets:

```bash
python3 tools/normalize_generated_art.py
```

Only rebuild those secondary generated sheets when their source files intentionally change:

```bash
python3 tools/normalize_generated_art.py --all-generated-sheets
```

This opt-in behavior prevents routine scene or inhale edits from accidentally changing the character style and walking animation.
