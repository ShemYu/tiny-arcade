# Prompt templates

## Generic production prompt

```text
PRODUCTION TASK - MODULAR 2D GAME ASSET, NOT CONCEPT ART

Create exactly one source asset.

Project: {project}
Asset id: {asset_id}
Asset family: {character_animation | terrain | background | prop | vfx | ui}
Purpose or frame: {description}
Camera and facing: {camera_and_direction}

STYLE AUTHORITY
Use the attached approved reference as immutable authority. Preserve:
- silhouette and proportions,
- facial and eye construction,
- palette and material shading,
- edge treatment and texture density,
- lighting direction and contrast.

CONTENT
{precise_content_description}
The pose or content may change, but the subject must not be redesigned.

OUTPUT CONTRACT
- one isolated asset only,
- transparent background unless this is an opaque sky layer,
- generous safe padding,
- full subject and effects visible,
- no cropping,
- no text, labels, guides, border, grid, mockup, floor, or unrelated scenery,
- no extra objects,
- no style change.

This is source art. Exact scaling, alignment, seamless tiling, and packing will be performed and validated by code.
```

## Character-frame prompt additions

Append:

```text
Keep body volume, head/body ratio, eye highlights, mouth construction, feet, accessories, and light direction consistent with the reference. Do not simplify detailed painted-pixel rendering into flat geometric shapes. Do not create a sprite-sheet layout; output one frame only.
```

## Terrain-source prompt additions

Append:

```text
Create only continuous terrain material. Do not include sky, horizon, character, gate, flower, sign, platform silhouette, or large prop. Use even local lighting and no perspective convergence. The exact repeat seam will be built by code.
```

## Background-layer prompt additions

Append:

```text
Create only the {sky | far | mid | near | foreground} layer. Do not include playable floor, platform edge, pit boundary, collision geometry, character, enemy, collectible, gate, checkpoint, UI, or text. Keep the composition safe for parallax movement.
```

## Mochi Sky inhale repair prompt

```text
Create one isolated Mochi inhale source frame for {frame_description}.

Use the approved standing/walking sheet as the absolute style authority and the high-detail inhale source as the pose authority.

Preserve from standing/walking:
- round body proportions and visual weight,
- large faceted purple eyes, highlights, and spacing,
- nuanced pink painted-pixel shading,
- feet design,
- soft detailed edges,
- top-left lighting.

Preserve from the inhale source:
- pose silhouette,
- mouth deformation,
- intentional squash and stretch,
- foot placement,
- wind streaks and particles.

Output one transparent frame with generous padding and the full body/effects visible. No scenery, floor, text, number, border, grid, or presentation sheet. Do not simplify Mochi into flat geometric pixel shapes. Code will handle scale, baseline, and packing.
```
