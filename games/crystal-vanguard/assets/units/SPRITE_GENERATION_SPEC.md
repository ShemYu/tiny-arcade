# Crystal Vanguard unit sprite contract and generation prompts

This document defines one reusable contract for every humanoid unit, class, rank, and action. The runtime may compensate for small registration errors, but generated art should still satisfy this contract; auto-correction is a safety net, not an art pipeline.

## 1. Runtime contract

### Cell and sheet layout

- File format: PNG, RGBA, fully transparent background.
- Cell size: **96 × 96 px**.
- Direction count: **8 rows**.
- Frames run left to right in chronological order.
- No labels, grid lines, guide marks, drop shadows, floor circles, baked camera shake, or baked motion blur.
- Keep the character in place. World translation belongs to the game actor, not the sprite frames.

Rows are fixed and must never be reordered:

| Row | Direction | Camera-facing description |
| ---: | --- | --- |
| 0 | S | facing screen/down |
| 1 | SE | facing down-right |
| 2 | E | facing right |
| 3 | NE | facing up-right |
| 4 | N | facing screen/up |
| 5 | NW | facing up-left |
| 6 | W | facing left |
| 7 | SW | facing down-left |

Action sheets:

| Action | Frames/row | Sheet size | Target playback | Motion beats |
| --- | ---: | ---: | ---: | --- |
| idle | 6 | 576 × 768 | 7 fps loop | settle, breathe, secondary motion, seamless return |
| walk | 8 | 768 × 768 | 12 fps loop | contact, down, passing, up, mirrored second step |
| attack | 8 | 768 × 768 | 14 fps once | ready, anticipation, drive, pre-impact, **impact**, follow-through, recover, guard |
| cast | 8 | 768 × 768 | 12 fps once | ready, gather, charge, aim, **release**, recoil, dissipate, recover |
| hurt | 4 | 384 × 768 | 12 fps once | contact, recoil, peak reaction, recover |
| death | 8 | 768 × 768 | 10 fps once | hit, loss of balance, collapse, ground contact, settle; final frame holds |

### Registration and scale

Use one ground/root anchor for all actions and directions:

- canonical anchor: **(48, 82)** inside every 96 × 96 cell;
- a grounded foot or the midpoint between grounded feet lands at that anchor;
- grounded-frame anchor drift: **≤ 1 px preferred, ≤ 2 px maximum**;
- do not zoom, resize, or reframe the character between frames;
- body-height variance within an action: **≤ 3%**;
- body-height variance across action sheets for the same unit: **≤ 5%**;
- keep at least 4 px transparent padding around the body and at least 2 px around equipment;
- large weapons may enter the outer safe area but must never be cropped.

Choose one body envelope and keep it for the unit's full set:

| Envelope | Typical body height, top to anchor | Use cases |
| --- | ---: | --- |
| small | 46–54 px | scout, child-sized creature, compact summon |
| medium | 58–66 px | most humanoid units |
| large | 68–76 px | tank, brute, large summon |

The envelope describes the body, not spell particles, capes, or long weapons. Those may extend farther without changing body scale.

## 2. Preferred generation workflow

Generating an entire 8-direction sheet in one pass often causes identity, scale, and row-order drift. The safer production flow is:

1. Create an **identity turnaround**: one neutral frame for all eight directions, using the exact row order above.
2. Lock the character reference, palette, equipment geometry, seed/reference strength, camera, and body envelope.
3. Generate **one horizontal action strip per direction**.
4. Assemble the eight strips into the final sheet without resampling.
5. Remove accidental shadows/background pixels and validate dimensions, alpha, frame count, crop safety, scale, and anchor drift.
6. Generate weapon trails, impact flashes, projectiles, and spell circles as separate VFX assets or runtime effects.

Never resize a generated row independently to “make it fit.” Correct the source generation or apply one uniform scale to the entire unit set.

## 3. Reusable row prompt

Use this as the primary prompt. Replace every `{variable}` and append one action block and one class-motion block from later sections.

```text
Create a production-ready 2D pixel-art animation strip for Crystal Vanguard.

CHARACTER IDENTITY
- Character: {character_id}
- Class/archetype: {class_archetype}
- Rank/tier: {rank}
- Body envelope: {small|medium|large}; keep exactly the same apparent body scale as the supplied identity turnaround
- Silhouette and anatomy: {silhouette_description}
- Outfit and armor: {outfit_description}
- Main-hand equipment: {main_hand_description}
- Off-hand equipment: {off_hand_description}
- Palette: {palette_description}
- Identity lock: identical face, hair, body proportions, costume construction, equipment shape, handedness, palette, and pixel density in every frame

CAMERA AND STYLE
- Orthographic top-down 3/4 game camera, no perspective zoom, no camera rotation
- Facing direction: {S|SE|E|NE|N|NW|W|SW}; the direction must remain unchanged for the entire strip
- Crisp hand-authored pixel art, hard pixel edges, no antialiasing, no sub-pixel blur
- Match this art direction: {style_reference}
- Consistent upper-left key light and consistent shadow-side colors; no ground shadow

TECHNICAL OUTPUT
- One horizontal PNG strip, exactly {frame_count} columns × 1 row
- Every cell exactly 96 × 96 px; total image exactly {sheet_width} × 96 px
- RGBA with a fully transparent background
- Frames ordered chronologically from left to right; exactly {frame_count} distinct frames
- Root/ground anchor fixed at pixel (48,82) in every cell
- In-place animation: no world-space translation across cells
- Preserve body scale within 3%; preserve the same framing and pixel density
- Keep the body at least 4 px from every cell edge and equipment at least 2 px from every cell edge
- No text, labels, borders, guides, grid, floor, scenery, drop shadow, or baked VFX

ACTION
{action_block}

CLASS MOTION
{class_motion_block}

Output only the final transparent PNG strip. Do not include a preview board or explanatory text.
```

### Negative prompt

```text
background, scenery, floor, ground shadow, drop shadow, text, letters, numbers, labels, grid lines, borders, contact sheet decorations, UI, portrait, close-up, perspective camera, camera rotation, camera zoom, changing facing direction, mirrored handedness, changing costume, changing weapon design, weapon morphing, missing equipment, extra equipment, anatomy drift, body-scale drift, character recentering, root translation, foot sliding, cropped weapon, cropped limbs, duplicated frames, missing frames, reordered frames, empty frame, motion blur, gaussian blur, antialiasing, semi-transparent body pixels, glow covering the body, baked slash trail, baked projectile, baked spell circle
```

## 4. Action blocks

### Idle — 6 frames

```text
Six-frame seamless idle loop. Feet remain planted at (48,82). Use restrained breathing, a small weight shift, and subtle cloth/hair secondary motion. Head and pelvis bob no more than 1 px. Frame 6 flows cleanly back into frame 1. No weapon swing and no stance change.
```

### Walk — 8 frames

```text
Eight-frame in-place walk cycle with two balanced steps: contact, down, passing, up, opposite contact, down, passing, up. At least one foot is visually planted during each contact/down phase. Prevent skating: the planted foot stays on the same ground coordinate. Use readable arm-leg counter-swing appropriate to the equipment. Keep root vertical motion within 2 px and do not move the character across the cell.
```

### Attack — 8 frames

```text
Eight-frame single attack: ready, anticipation, drive, pre-impact, impact on frame 5, follow-through, recovery, return to guard. Build a clear silhouette and readable line of action. Keep the root anchored; permit at most a 2 px visual lean around the root. Do not draw slash trails, hit sparks, projectiles, or camera shake in the body sheet.
```

### Cast — 8 frames

```text
Eight-frame single cast: ready, gather, charge, aim, release on frame 5, recoil, dissipate, recover. Hands, focus, and body mechanics must clearly communicate the cast without a large opaque glow. Keep the root anchored. Put spell circles, projectiles, aura bursts, and particles in separate VFX assets.
```

### Hurt — 4 frames

```text
Four-frame hit reaction: contact, recoil, peak reaction, recovery. Preserve facing direction and equipment identity. Keep the feet/root registered; do not translate the whole character backward. No blood, hit spark, screen shake, or color-flash baked into the sprite.
```

### Death — 8 frames

```text
Eight-frame non-looping collapse: impact, destabilize, fall, first ground contact, collapse, secondary settle, final settle, held final pose. The first frames use the normal root anchor. Once the body reaches the ground, keep the same ground contact point and do not slide. Final frame must be a stable hold with no VFX.
```

## 5. Class-motion blocks

### Blade / fighter

```text
Grounded athletic stance, decisive hip-and-shoulder rotation, readable weapon arcs, controlled follow-through, balanced recovery. The weapon has consistent length, grip position, blade profile, and handedness in every frame and direction.
```

### Guardian / tank

```text
Low center of mass, compact steps, heavy anticipation, small root amplitude, strong shield/armor inertia, deliberate recovery. Weight should feel heavy without changing body scale or letting the feet skate.
```

### Ranger / gunner

```text
Stable aiming line, economical footwork, consistent bow/gun dimensions and hand placement, clear recoil or draw mechanics. Keep muzzle flashes, arrows, bolts, shell ejection, and projectiles separate from the body sheet.
```

### Mage / support

```text
Calm planted base, clear hand/focus gestures, readable robe and hair follow-through, restrained secondary motion. Magical energy may be indicated by posture only; generate glows, runes, particles, beams, and projectiles separately.
```

### Assassin / rogue

```text
Low agile posture, compressed anticipation, fast extension, sharp recovery, minimal vertical bounce. Keep the silhouette readable and the root anchored; no teleport smear, afterimage, or baked motion trail.
```

### Summon / creature

```text
Use the lowest stable ground-contact point as the root equivalent. Preserve limb count, anatomy, mass, silhouette, and facing direction. Locomotion must show believable contact phases without changing body size or drifting across the cell.
```

## 6. Full-sheet fallback prompt

Use this only when the generator reliably obeys sprite-sheet topology.

```text
Using the locked character identity and the selected action instructions, create one transparent sprite sheet with {frame_count} columns and exactly 8 rows. Each cell is 96×96 px; total size is {sheet_width}×768 px. Row order must be exactly: S, SE, E, NE, N, NW, W, SW. Every row contains the same chronological action, facing only that row's direction. Use anchor (48,82), identical body scale, identical costume/equipment, and no world translation in every frame. No labels, grid, background, ground shadow, or baked VFX. Output only the PNG.
```

## 7. Example: Blade rank 1 attack row

```text
Create a production-ready 2D pixel-art animation strip for Crystal Vanguard.
Character: Blade rank 1, medium humanoid swordsman, teal-and-ivory light armor, short dark hair, single steel arming sword in the right hand, empty left hand, compact readable silhouette. Lock identity, costume seams, sword length, grip, handedness, palette, and body proportions to the supplied turnaround.
Orthographic top-down 3/4 game camera. Facing SE for the full strip. Crisp hard-edged pixel art, no antialiasing, consistent upper-left light.
Output one 8-frame horizontal RGBA PNG, exactly 768×96 px, eight 96×96 cells, transparent background. Root anchor fixed at (48,82), in-place motion, body-scale variance below 3%, body padding 4 px, equipment padding 2 px.
Eight-frame sword attack: ready, anticipation, drive, pre-impact, impact on frame 5, follow-through, recovery, guard. Grounded athletic stance with decisive hip-and-shoulder rotation. Keep sword geometry and right-handed grip identical. No slash trail, hit spark, motion blur, camera shake, text, grid, shadow, or scenery.
Output only the final transparent PNG strip.
```

## 8. Acceptance checklist

Before committing a generated set:

- exact PNG dimensions and RGBA transparency;
- exact row order and exact frame count;
- no empty, duplicated, missing, or visibly reordered frame;
- same identity, outfit, palette, equipment geometry, and handedness across all actions;
- root anchor within 1 px on grounded frames (2 px hard limit);
- no visible in-cell world translation or planted-foot skating;
- body scale within 3% per sheet and 5% across the unit set;
- no crop, background residue, labels, floor shadow, or baked gameplay VFX;
- animation loops cleanly where required and impact/release frames match the runtime timing;
- validate with:

```bash
python3 tools/game-assets/validate_game_assets.py games/crystal-vanguard/asset-manifest.json
```

The Phaser proof also performs runtime alpha-bounds, foot-anchor, and scale diagnostics. Open the browser console and toggle `0 Debug` to inspect the current frame's physical body, root, facing vector, and visible alpha bounds.
