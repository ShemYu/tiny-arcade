---
name: game-image-assets
description: Produce modular, style-consistent 2D game assets for sprites, animation, terrain, backgrounds, props, VFX, and UI. Use when assets must be cleanly layered, looped, tiled, packed, replaced, and validated.
---

# Game Image Assets

## Core principle

Generate appearance; engineer structure.

The image model owns style, shape, material, lighting, pose, and expression. Deterministic code owns exact dimensions, alpha cleanup, one global scale, anchors, baselines, frame packing, seamless edges, filenames, and validation.

A beautiful image is rejected when it cannot be used as a clean runtime module.

## Hard rules

1. Generate one asset family at a time.
2. Treat a complete scene as style reference, not reusable runtime art.
3. Prefer one transparent source image per animation frame; pack with code.
4. Preserve the approved silhouette, proportions, eyes, palette, lighting, texture, and edge treatment.
5. Never resize each animation frame independently. Use one family scale and one pivot/contact line.
6. Never bake playable terrain into a distant background.
7. Never call a raw scene crop a tile. Validate exact edge continuity.
8. Preserve source art and write runtime outputs separately.
9. Review at actual game size and sampling mode.
10. Reject style drift rather than repairing it with a different art style.

## Workflow

1. Lock one approved visual reference.
2. Record asset family, camera, target size, alpha mode, pivot, contact line, frame phases, and repeat requirements.
3. Generate one isolated object or frame with safe padding.
4. Normalize with code: alpha, global scale, shared pivot, exact size, packing, and seams.
5. Validate mechanically and visually.

Read and apply:

- `references/prompt-template.md`
- `references/asset-contracts.md`
- `references/qa-checklist.md`

## Animation minimum standard

- equal cell size,
- one pivot,
- one grounded contact line,
- one global source-to-runtime scale,
- unintended center drift no more than 1 logical pixel,
- rigid-feature scale drift no more than 2 percent,
- no accidental crop or cell overlap.

Use explicit phases. A held action must not replay startup.

```yaml
startup: [0, 1, 2, 3, 4]
hold: [5, 6, 7, 6]
```

Test the final-to-first transition of every loop.

## Terrain minimum standard

For horizontal repetition require exact equality:

```text
column(0) == column(width - 1)
```

For vertical repetition require:

```text
row(0) == row(height - 1)
```

A 3x3 repeat preview must also show no visible seam. Terrain contains no sky, horizon, character, gate, sign, or large prop.

## Background minimum standard

Separate sky, far, mid, near, and foreground layers. Distant layers contain no collision surfaces. Terrain, gates, enemies, collectibles, checkpoints, and props remain separate.

## Hard rejection

Reject when eyes change style, proportions drift, frames pulse in size, feet move because of crop alignment, loops pop, alpha has halos, tile edges differ, terrain contains sky, backdrop contains playable floor, or the asset belongs to a different visual style.
