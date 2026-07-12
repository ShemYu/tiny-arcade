# Frontier Blade r1 — rejected static-seed archive

This was the first clean-room replacement candidate for Blade Rank 1. It is
isolated from the runtime and does not reuse any pixel from the rejected legacy
sheets. Its normalized raster is now manually rejected and retained only as QA
evidence for the next native-pixel pipeline.

## Current state

- Concept lane A / Frontier Blade: approved as an identity direction only.
- Automated static-seed QA: passed.
- Golden scale approved: 70 px. It preserves the preferred cute novice
  silhouette and 12 px headroom.
- 74 px remains the max-safe comparison: it fits, but uses the entire 8 px
  minimum headroom and is not the animation scale.
- Normalized-art review: **rejected**. The reduction from a high-resolution
  pixel-style illustration lost deliberate face, hair, cloth, and equipment
  clusters and reads blurry/insufficiently detailed at game scale.
- Mobile-context review: **rejected** for the same raster-quality issue.
- Balanced and Tactical direction candidates: **rejected**; direction cannot be
  promoted on top of a failed source-raster process.
- Generation-seed and release eligibility: permanently false for r1.

The 96×96 candidate uses canonical root `(48,82)`, binary alpha, zero RGB in
transparent pixels, 28 foreground colors, a body/contact/equipment mask, and no
baked VFX. Those structural properties do not override the failed art review.
See [`qa/seed-report.json`](./qa/seed-report.json) for measurements.

## Reproduce

From `games/crystal-vanguard/v0.2`:

```bash
npm run qa:seed
```

This rebuilds the candidate family and captures 390×844 and 430×932 screenshots
inside the real v0.2 battlefield. The browser compositor replaces the Blade
texture only in test memory; it never edits `src/content.js` or the active
runtime sprite sheets.

## Review package

- `candidate/seed-se.png` — provisional 70 px normalized candidate.
- `candidate/seed-se-{64,70,74}.png` — golden-scale comparison family.
- `candidate/seed-se-mask.png` — labels 0–4; label 5 / VFX is empty.
- `qa/seed-guides-4x.png` — cell, safe-area, bbox, and root overlay.
- `qa/terrain-readability-4x.png` — grass, stone, and dark terrain.
- `qa/mobile-{390,430}.png` — real mobile game context.
- `qa/mobile-scale-lineup-{390,430}.png` — 64/70/74 comparison.

The rejected direction review is archived under
[`direction-review/`](./direction-review/). Do not use either candidate for a
turnaround or animation strip. The replacement must be a new r2 revision
authored directly on the logical 96×96 pixel grid. See the
[sprite pipeline handoff](../../../../v0.2/docs/SPRITE_PIPELINE_HANDOFF.md).
