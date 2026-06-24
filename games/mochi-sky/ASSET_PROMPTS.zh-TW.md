# Mochi Sky Asset Prompt Contract

這份是 `mochi-sky` 專用的 Image Asset 擴充契約。共用規則與驗證器放在 `../../tools/game-assets/`；本檔只描述 Mochi Sky 的風格鎖定、角色分層與生成 prompt。

## 風格鎖定

- Rendering family: painted pixel / soft raster hybrid, high-detail source art normalized into pixel-friendly runtime PNGs.
- Camera: orthographic side-view platformer camera.
- Palette: candy sky cyan, cream highlights, pink mochi body, mint enemies, yellow stars, lavender shadows.
- Lighting: soft top-left with warm highlights.
- Outline: soft dark purple body accents, no heavy black vector outline.
- Shape language: round, plush, buoyant, toy-like.
- Immutable marks: round pink Mochi body, mosaic purple eyes, small feet, cream sparkle/star projectile language.

Approved runtime references:

- `assets/mochi-sky-mochi-action-game-sheet.png`
- `assets/mochi-sky-inhale-game-sheet.png`
- `assets/mochi-sky-enemy-game-sheet.png`
- `assets/mochi-sky-star-game-sheet.png`
- `assets/mochi-sky-backdrop.png`
- `assets/mochi-sky-tiles.png`

## 分層規則

- Mochi body animation, inhale VFX, projectile, enemy, foreground terrain, and distant backdrop stay separate.
- Do not bake foreground collision terrain into `mochi-sky-backdrop.png`.
- Do not bake projectiles, stars, wind, dust, or enemy sprites into Mochi body frames.
- Runtime sprite sheets use fixed cells and transparent backgrounds.
- `mochi-sky-tiles.png` must remain horizontally seamless.

## 角色單一 frame prompt

```text
ASSET ROLE
Create exactly one isolated animation keyframe for Mochi, action: [ACTION], phase: [STARTUP / ACTIVE / HOLD / RECOVERY].

REFERENCE LOCK
Match assets/mochi-sky-mochi-action-game-sheet.png and assets/mochi-sky-inhale-game-sheet.png exactly in identity and rendering style. Preserve Mochi's round pink body, mosaic purple eyes, tiny feet, cream highlights, soft purple shadow palette, and plush painted-pixel detail.

CANVAS AND CAMERA CONTRACT
Orthographic side view, facing right. Same camera, zoom, and body scale as the approved runtime sheets. Full body visible. Feet share the same intended ground-contact line. Leave transparent clearance around the complete silhouette.

POSE CONTRACT
[PRECISE POSE DESCRIPTION]. The pose may change, but Mochi's design may not. Keep the feet anchor stable unless the pose explicitly requires displacement.

SEPARATION CONTRACT
Character body only. No wind, trail, glow, projectile, dust, shadow, background, terrain, labels, grid, or frame border. Transparent background.

FORBIDDEN
No style drift, scale drift, camera drift, palette drift, facial redesign, changed eye size, changed costume, extra limbs, missing limbs, cropped silhouette, opaque background, colored matte, watermark, or text.

OUTPUT
One clean isolated source image only, suitable for deterministic alignment and packing into a runtime cell.
```

## Inhale VFX prompt

```text
Create an isolated inhale wind VFX source for Mochi Sky.
The effect is anchored at Mochi's mouth and synchronized to 8 character frames.
Use the same cream/yellow sparkle family and soft top-left lighting as the approved Mochi Sky runtime sheets, but do not include Mochi.
Transparent background. No text, grid, border, terrain, projectile, enemy, or opaque rectangle.
Leave enough padding so wind streaks and sparkles are never cropped.
The runtime may use ping-pong or hold timing through metadata instead of duplicate art.
```

## Terrain prompt

```text
Create a modular foreground grass-and-dirt tile source for Mochi Sky.
Match assets/mochi-sky-tiles.png in painted-pixel texture density, mint grass, warm dirt, soft purple shadow detail, and candy meadow lighting.
Show only the platform material. No hills, sky, clouds, characters, enemies, stars, flowers, large stones, signs, shadows, or unique landmarks.
The texture must remain visually neutral when repeated many times and must support deterministic horizontal seam construction.
No border, labels, grid, checkerboard, or UI.
```

## Backdrop prompt

```text
Create only a distant parallax backdrop layer for Mochi Sky.
Match assets/mochi-sky-backdrop.png in cyan sky, cream clouds, pastel hills, atmospheric mist, soft top-left lighting, and plush painted-pixel detail.
Use the same fixed side-view camera and horizon as the approved scene.
Do not include foreground collision ground, platforms, Mochi, enemies, collectibles, gate, UI, labels, or gameplay markers.
The layer may be opaque, but it must remain distant scenery only.
```
