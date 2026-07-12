# Blade Rank 1 — clean-room identity brief

## Decision

The legacy Blade sheets are diagnostic placeholders only. They failed automated
QA and were manually rejected. Do not reuse, trace, edit, upscale, normalize, or
feed any legacy frame into image generation.

The replacement is a new revision with a new identity seed, source hash, body
mask, contact mask, and approval history.

## Player-facing goal

Blade Rank 1 should read instantly as the player's dependable first melee
adventurer at actual iPhone battle scale:

- original classic Korean-MMO-inspired chibi fantasy, not copied game art;
- warm, approachable novice hero rather than a miniature armored knight;
- clear sword side, shield side, face, feet, and facing direction at 1×;
- grounded and energetic, with enough silhouette asymmetry to read in a crowd;
- visually compatible with Crystal Vanguard's teal crystal, forest field, and
  warm ivory/gold interface accents.

## Locked technical frame

- final cell: `96×96` RGBA;
- camera: orthographic top-down 3/4, fixed for every frame;
- canonical root: `(48,82)`;
- upright body must remain inside the body-safe area;
- minimum upright head clearance candidate: `8px`;
- minimum body side/bottom clearance: `4px`;
- minimum equipment clearance: `2px`;
- no antialiasing or partial-alpha body edges;
- no shadow, floor, slash, glow, hit spark, spell star, or other baked VFX;
- scale is chosen once for the unit revision, never per frame, row, or action.

Golden scale is intentionally unapproved. The clean concepts must be previewed
with approximately `64px`, `70px`, and `74px` top-to-root body envelopes in the
real 390px and 430px battle surfaces. Legacy scale measurements are invalid.

## Identity invariants

Once a seed is selected, every direction and action must preserve:

- one face construction and eye spacing;
- one head-to-body ratio and shoulder width;
- one hairstyle silhouette and highlight clusters;
- one right-handed sword grip and one left-hand shield grip;
- identical sword length, guard, blade width, and tip;
- identical shield diameter, rim, boss, and strap orientation;
- identical armor seams, belt height, boots, gloves, and palette indexes;
- identical upper-left key light and shadow-side ramp;
- identical pixel density and outline thickness.

## Three clean concept lanes

All three concepts use the same SE neutral stance and technical frame. They are
alternatives, not animation frames.

### A — Frontier Blade

- cream padded cuirass, warm brown leather, restrained bronze hardware;
- compact round buckler;
- short steel arming sword;
- small teal scarf or belt accent tying the hero to the crystal faction;
- light, optimistic, readable novice silhouette.

### B — Crystal Guard

- ivory and deep desaturated navy armor panels;
- slightly broader shoulder silhouette and reinforced round shield;
- one small cyan crystal insignia, without glow;
- dependable defender feeling, but still Rank 1 rather than heavy tank.

### C — Guild Swordsman

- warm tan and charcoal adventurer layers with a muted red guild sash;
- narrower shield and slightly longer sword silhouette;
- nostalgic field-adventurer character, more agile than armored;
- strongest visual separation from the teal environment.

## Required concept delivery

Each concept must be delivered independently at final source resolution:

1. one SE neutral frame on transparent `96×96` canvas;
2. body/contact label mask using:
   - `0` background;
   - `1` head and torso core;
   - `2` limbs, hair, clothing;
   - `3` sword and shield;
   - `4` grounded/contact pixels;
   - `5` VFX, which must be empty for the seed;
3. 1× and nearest-neighbor 4× previews;
4. actual-size 390px and 430px battlefield previews;
5. palette swatches and source hash.

No animation or second direction begins until one seed passes automated checks
and explicit art/mobile approval.

## Seed acceptance gate

- face and equipment read at actual mobile size without zoom;
- root/contact mask lands at `(48,82)` within 1px preferred, 2px maximum;
- selected body envelope and head clearance are approved in-engine;
- body and equipment remain inside their respective safe areas;
- no detached pixel islands, partial-alpha residue, crop, or hidden RGB;
- silhouette remains clear on grass, stone, and dark ground;
- the user approves one concept as the new identity—not merely the least-bad
  option.

After approval, create the eight-direction neutral turnaround and hash-lock it.
Only then may the SE golden-direction idle/walk/attack/cast/hurt/death strips be
generated.

## Archived r1 result — 2026-07-11

Concept lane A, Frontier Blade, established the preferred identity direction,
and the 70 px golden scale was approved after comparison with 64 px and 74 px
in the real 390 px and 430 px battle surfaces. The 74 px version remains a
max-safe reference only because it consumes the entire 8 px minimum headroom.

The normalized r1 raster and both SE direction revisions were subsequently
rejected because downsampling a high-resolution pixel-style illustration lost
detail and read as blurry at native/mobile scale. Automated structural success
does not grant art approval. The r1 package is archived under
[`revisions/frontier-blade-r1/`](./revisions/frontier-blade-r1/) and is never a
generation seed.

The next revision must preserve the approved concept identity and 70 px scale
while authoring production pixels directly on the logical 96×96 grid. See the
[sprite pipeline handoff](../../v0.2/docs/SPRITE_PIPELINE_HANDOFF.md).
