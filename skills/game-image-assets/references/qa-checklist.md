# QA checklist

## Automated

Fail the build when any applicable rule fails:

- expected file missing,
- wrong dimensions,
- wrong frame count,
- empty frame,
- unexpected opaque background,
- pivot or contact line outside tolerance,
- tile edge mismatch,
- wrong output filename.

For a horizontal tile, the first and last pixel columns must be identical. For a vertical tile, the first and last rows must be identical.

## Required previews

- 1x runtime asset,
- 4x inspection view,
- animation at intended FPS,
- character in the real game scene,
- terrain repeated 3x3,
- short and long platforms,
- background with runtime terrain,
- alpha edges over light and dark backgrounds.

## Style

- same silhouette language,
- same face and eye treatment,
- same palette and lighting,
- same edge treatment and texture density,
- no flattening, vectorization, or unrelated visual noise.

## Geometry and animation

- exact size and padding,
- one family scale and pivot,
- unintended center drift <= 1 logical pixel,
- rigid-feature scale drift <= 2 percent,
- startup is not replayed during hold,
- final-to-first loop transition does not pop,
- feet move because of pose rather than crop alignment,
- effects do not clip at cell edges.

## Terrain and background

- tile edges match exactly,
- 3x3 repeat has no visible seam,
- no obvious repeated focal landmark,
- collision surface matches the visible top,
- terrain contains no sky or horizon,
- backdrop contains no playable floor,
- gameplay objects remain separate,
- pits and routes remain readable.

## Alpha

- no matte or checkerboard,
- no colored fringe,
- no background residue,
- no stray opaque pixels.

## Reject immediately

Reject when character identity changes, frames pulse in size, loops pop, cells overlap, guides are embedded, tile edges differ, layers are mixed, or the asset belongs to a different art style.
