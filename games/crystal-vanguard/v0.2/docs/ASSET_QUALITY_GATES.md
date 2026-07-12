# Crystal Vanguard v2.1 Asset Quality Gates

## Purpose

An asset is not production-ready merely because its PNG dimensions and frame
count are correct. Crystal Vanguard must preserve character identity, apparent
size, equipment, root position, direction, and animation continuity at the
actual mobile game scale.

These gates apply before an asset receives `integrated` status. New professions
must not be mass-produced until one complete representative unit passes the
full workflow.

## Current Blade assessment

The existing Blade sheets are structurally loadable but are now a **rejected
legacy revision**. They may remain visible as a development-only diagnostic
placeholder; they cannot be normalized or promoted into production.

The deterministic Day-2 audit records **64 grouped hard failures across 336
frames**. It identifies 157 frames below the new 8 px upright head-clearance
gate and five Hurt frames with detached head/hair pixel islands.
The report count is not a count of defective frames: many gates fail entire
actions or directions at once. The manifest, backlog, report, and mobile lab all
identify this revision as rejected production art.

Observed issues:

- the manifest/runtime root uses `(48,82)`, while visible feet commonly reach
  approximately `y=94`;
- some NW/W attack frames appear roughly 13–14% smaller than comparable idle
  frames;
- hurt frames show significant cross-direction scale drift;
- some cast frames appear larger than the identity reference;
- cast contains baked blue magical VFX;
- body size and padding disagree with the documented medium envelope;
- transparent pixels with non-zero RGB and extensive partial-alpha edges are
  present;
- the former validator did not execute the global anchor or cross-action
  comparison rules. This limitation is now fixed; the old sheets no longer
  receive a false green result.

The Phaser proof's dynamic correction is a diagnostic safety net. Runtime
per-action scaling must not be used to hide production asset inconsistency.

Day-2 source decision: **clean-room replacement**. No existing pixel is an
approved generation seed. `idle / SE / frame 0` remains only a diagnostic
comparison point, and the former `0.84 / 0.82 / 0.72` lineup is retained only to
demonstrate why uniform scaling cannot repair transition or anatomy drift.
The replacement identity contract is written in
[`BLADE_CLEAN_ROOM_BRIEF.md`](../../art/blade-rank1/BLADE_CLEAN_ROOM_BRIEF.md).

Status axes for this revision:

```text
auto_qa_status: failed
manual_art_status: rejected
runtime_usage: dev_legacy_placeholder
release_eligible: false
generation_seed_eligible: false
approved_seed: null
replacement_strategy: clean_room
```

## Approval states

```text
generated
→ normalized
→ auto_qa_passed
→ art_approved
→ runtime_mobile_approved
→ integrated
```

`needs_rework` may be assigned from any review stage. A failed state does not
silently fall back to `integrated` because an older validator passes.
`manual_art_status: rejected` is stronger: that revision can never be promoted
in place and a new clean revision must be created.

## Automated hard gates

### File and topology

- PNG and RGBA mode;
- exact sheet dimensions, cell dimensions, direction rows, and frame count;
- fixed row order `S, SE, E, NE, N, NW, W, SW`;
- no empty, missing, unauthorized duplicate, or visibly reordered frames;
- transparent background with `RGB=0` whenever `alpha=0`;
- no orphan pixels or unexplained small connected components.

### Crop safety

- all visible equipment remains at least 2 px from the cell edge;
- body pixels remain at least 4 px from the cell edge when a body mask is
  available;
- a crop or clipped weapon is always a hard failure.
- body/core top and bottom clearance below 4 px is a hard failure even when the
  PNG technically retains one or two transparent rows;
- detached head/hair islands in the edge danger band are a hard failure.

### Ground registration

- grounded root target: approved unit root, normally `(48,82)` only after the
  golden-scale decision confirms it;
- preferred drift: at most 1 px;
- hard maximum drift: 2 px;
- runtime registration correction greater than 2 px rejects the asset.

### Comparable-frame scale

Scale is measured from an approved body/core mask, not the full alpha box of a
weapon swing or collapsed body.

- within one action: at most 3% drift between comparable frames;
- across actions for the same direction: at most 5% from the approved identity
  reference;
- attack/cast compare ready and recovery frames;
- hurt compares entry and recovery frames;
- death compares the initial upright frames, then checks the final ground
  contact for sliding;
- runtime scale correction greater than 3% rejects the asset;
- per-frame, per-row, and per-action rescaling is prohibited.
- every action entry and recovery frame is compared directly with the locked
  same-direction neutral frame; the endpoint gate is ≤3% and ≤2 px;
- death checks entry only, then switches to settled-contact sliding checks.

### Approved-file stability

- approved production files receive a content hash;
- later replacements must produce a new QA report and approval;
- manifest and art-backlog status change in the same reviewed change.

## Automated warnings

Warnings require review but should not be used alone to accept or reject art:

- palette or edge-softness drift from the approved seed;
- high partial-alpha ratio or inconsistent pixel density;
- direction-reference similarity anomalies;
- likely identity or equipment silhouette drift;
- detached saturated components suggesting baked VFX;
- near-duplicate frames;
- unusually large alpha bounds or movement envelope.

## Manual hard review

The reviewer must approve:

- face, hair, body proportions, clothing seams, armor, palette, and material;
- sword length, shield size, handedness, grip, and equipment construction;
- semantic direction and row order;
- no direction changes inside a strip;
- grounded weight, planted feet, foot skating, and action force;
- idle → action → idle transitions without scale or identity popping;
- hurt/death acting that remains readable and in character;
- clarity at 1× game scale on an iPhone-sized viewport;
- readability on representative grass, stone, dark ground, and a multi-unit
  battle;
- whether the asset belongs to the same world as the map, monsters, crystal,
  VFX, and UI.

## Production workflow

1. **Identity/style brief** — lock proportions, silhouette, palette, costume,
   sword/shield geometry, camera, lighting, and pixel density in writing.
2. **Clean static concepts** — create 2–3 new SE concepts without reusing
   legacy pixels.
3. **Golden scale and seed** — compare those concepts at native size in the
   actual phone battle view; approve one final-resolution seed with
   body/contact mask.
4. **Identity turnaround** — approve all eight neutral directions, palette,
   equipment, root, and envelope.
5. **Golden direction** — produce every action for one representative
   direction and approve the transition reel.
6. **Whole set** — generate full strips from the approved identity; normalize
   with one shared unit-level scale and shared root.
7. **Automated QA** — reject structural, anchor, scale, crop, and alpha failures.
8. **Art review** — approve identity, direction, equipment, and acting.
9. **In-engine mobile review** — approve the real game view before integration.

The sprite pipeline must generate an entire strip from an approved seed rather
than independently generating individual frames. Independent frames drift too
easily in identity and scale.

## Required review package

```text
unit-id/
├── source/
│   ├── identity-turnaround.png
│   └── action-id/
│       ├── S-raw.png
│       ├── SE-raw.png
│       └── ...
├── runtime/
│   ├── unit-id-idle.png
│   ├── unit-id-walk.png
│   └── ...
└── qa/
    ├── report.json
    ├── contact-sheet-1x.png
    ├── contact-sheet-4x.png
    ├── transition-strips-1x.png
    ├── headroom-failures-4x.png
    ├── scale-lineup.png
    ├── action-loops.webp
    ├── transition-reel.webp
    ├── mobile-390.mp4
    └── mobile-430.mp4
```

Contact sheets include root, body-envelope, and alpha-bound overlays without
baking those guides into production sprites. Mobile captures include at least
two representative terrains and one multi-unit battle.

The current reproducible package is stored in
`games/crystal-vanguard/art/blade-rank1/qa/`. Rebuild it with
`npm run qa:assets:report` from `v0.2`; inspect the live Phaser surface at
`asset-lab/`; run `npm run qa:assets:gate` for the strict release result.

## Replication rule

No second profession or large animation batch begins until the first unit's
golden scale, identity turnaround, transition reel, and in-engine mobile review
are explicitly approved. Quality issues are corrected at the source before
content volume increases.
