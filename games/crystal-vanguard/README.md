# Crystal Vanguard / 琉璃城：森林守望

Recovered and completed from the unfinished **Crystal Guard** prototype, using its original generated character atlas and environment art. The main `index.html` is the intended entry point. The previous single-page game is preserved at `legacy.html`; `v0.2/`, `v2/` and `v2-dawnwatch/` are unchanged.

## Three.js runtime

The main game now uses **Three.js 0.185.1 / WebGL 2**. The island, rocks, crystal, palisades, towers, frost runes, range indicators and combat effects are actual 3D scene objects. The original painted heroes, enemies and forest scenery are camera-facing textured cutouts, preserving the prototype’s art direction. No new character art replaces the recovered atlas.

The orthographic camera supports pan, zoom and 45-degree rotation. Ground commands and alpha-aware actor selection use Three.js raycasting. HP bars live in the scene; labels, menus, loot and the HUD remain accessible DOM elements. Fixed building parts are batched into vertex-colored geometry (two opaque draws per tower, including its moving turret). Shared geometry and materials are cached; expired actor materials, route buffers and effects are released. Device pixel ratio is capped at 2 (1.5 on narrow screens). Context loss pauses combat, and restoration waits for the player to resume.

`guard-core.mjs` remains a renderer-independent deterministic grid simulation. Existing version-1 run checkpoints remain compatible. The game has no physical 3D collision response, so navigation uses its existing grid rules.

The pinned, MIT-licensed Three.js browser modules are served from `vendor/three/`, without a runtime CDN dependency or a site-wide build change. If WebGL 2 cannot start, the original Canvas renderer supplies a compatible display; `?renderer=canvas` explicitly selects that mode. Camera rotation is hidden in that mode.

## Continuous motion update

Heroes now accept exact ground positions rather than snapping destinations to tile centers. Preparation commands animate instead of teleporting. Navigation searches the existing occupancy grid and removes intermediate waypoints with clear swept corridors; solid buildings retain grid placement. Destination and path clearance remain protected when constructing. Fractional destinations persist in version-1 checkpoints, while existing integer checkpoints remain readable.

The Three.js actors are now subdivided, camera-facing textured meshes. A time-based pose layer deforms the original artwork for alternating strides, weight shifts, breathing, attack anticipation/recovery, hit recoil, jelly squash and flight. Idle/attack art blends briefly rather than switching instantly. This is procedural cutout animation, **not a new multi-frame walk cycle or a fully rigged character asset**. Canvas compatibility shares the pose timing, without mesh deformation.

Projectiles travel between source and target, melee attacks use swept arcs, and camera rotation/zoom/pan ease toward their targets. The simulation runs fixed 1/60-second steps; pose timing follows battle speed. The tile seams and checkerboard contrast are reduced. No measured device FPS improvement is claimed.

Five additional tests cover fractional destination arrival and saves, wall clearance and replanning, continuous poses, reduced motion and 30/120 Hz pose consistency. The cloud browser's WebGL limitation still applies to GPU visual validation.

## The adventure

Command Arthur (knight), Lilu (ranger), Mira (mage) and Nora (acolyte) through twelve waves. Build palisades to reroute ground enemies, arrow towers for damage, and frost runes for slowing. Build, repair, upgrade and dismantle during combat. All three entrances must retain a route to the crystal, and construction cannot trap heroes or ground enemies.

Bats ignore walls; sappers attack buildings; armored enemies reward magic. Boss waves occur at 4, 8 and 12. The final boss enrages and summons reinforcements. Heroes recover between waves and the party gains a level every three waves.

Choose one of three pieces of gear after each nonfinal wave. Twenty-four items across weapons, armor and charms include lifesteal, piercing, cleave, chaining, slowing, burning, haste auras and reflected damage. Boss rewards guarantee legendary choices. Replaced equipment returns to the bag and can be reassigned or salvaged.

**Each new adventure starts fresh.** There is no permanent equipment progression. Optional local storage resumes only the latest preparation or reward checkpoint within the same adventure. A failed storage write is reported. Invalid saves are rejected; restored hero and building stats are reconstructed from canonical content.

## Controls

| Input | Action |
| --- | --- |
| Hero portrait / hero on field / 1–4 | Select hero |
| Tap clear ground / arrow keys + Enter | Command selected hero to move |
| Tap enemy | Focus fire |
| E / skill button | Cast selected skill; ranger and mage then choose a target point |
| B / T / F | Palisade / arrow tower / frost rune |
| R / U / X | Repair / upgrade / dismantle, then choose a building |
| Space / main action button | Start wave; during combat switch 1× / 2× |
| P | Pause / resume |
| I | Equipment bag |
| Drag / pinch / wheel / + / − | Pan / zoom |
| [ / ] / curved-arrow buttons | Rotate the camera 45 degrees |
| Fit / 全景 | Reset zoom, pan and camera angle |
| ↻ | Confirm a fresh adventure |

The game pauses when its tab becomes hidden or its window loses focus. Dialogs pause simulation. Equipment changes are restricted to preparation. Touch and keyboard commands share the same gameplay functions.

## Run

From the repository root:

```sh
python3 -m http.server 8080
# Open http://localhost:8080/games/crystal-vanguard/?lang=zh
node --test games/crystal-vanguard/tests/guard-core.test.mjs
# Scene tests additionally use @napi-rs/canvas (QA only):
node --test games/crystal-vanguard/tests/three-scene.test.mjs
```

No build step or runtime dependencies are required. Serve through HTTP; ES modules are not intended to run directly from `file://`.

## Validation and remaining boundary

- 12 gameplay tests pass, including five complete twelve-wave campaigns, path safety, combat effects, loot, checkpoint compatibility and terminal states.
- Six scene tests cover all 165 tiles at desktop, portrait and landscape dimensions across five camera angles and four zoom levels; original texture crops; actor alpha picking; simulation immutability; finite combat transforms; actor/effect resource cleanup, and tower draw-call batching.
- The compatible Canvas renderer is still exercised offline at 1280×720 and 390×550.
- The 2026-09-05 deployment loads successfully in live Chrome, resumes the existing pre-refactor checkpoint and permits combat construction, skill use, pause/resume 2× speed, second-wave completion and three-choice rewards. This cloud browser returns no WebGL 2 context, so those live interaction and screenshot checks exercise the automatic Canvas fallback. **Actual WebGL rendering, context loss/restoration, physical touch hardware and Safari have not been device-tested.** The CPU scene/raycast tests do not replace GPU visual validation.

Optional fallback renderer check, with `@napi-rs/canvas` available:

```sh
node games/crystal-vanguard/tests/render-guard.cjs /tmp/crystal-guard-proof
```

## Files

`guard-content.mjs` owns content; `guard-core.mjs` owns combat and serializable state; `guard-render.mjs` adapts simulation state to the Three.js scene; `three/` contains camera, assets, object factories, effects and world labels; `guard-view.mjs` selects the renderer; `guard-render-canvas.mjs` provides the compatible display; `guard-app.mjs` owns DOM, input, audio and storage; `guard-style.css` owns layout. Original recovered imagery and source notes live in `guard-assets/`.

Older implementation notes are preserved in [LEGACY_NOTES.md](./LEGACY_NOTES.md).

### Professional motion pass (professional1)

The Forest Watch entry uses four independently posed cutout rigs, preserving the
original atlas for portraits and the original environment. `hero-parts.png` is an
original-atlas-referenced supplementary art export, normalized with a chroma key
at load time. Shared joint poses drive both Three and Canvas: head, torso, cape,
shoulder/weapon transforms, two-link leg IK, and two-link ranger draw/bow arms.
This is a 2D cutout rig in a 3D scene, not a replacement with full 3D character models.

`guard-combat.mjs` owns windup/release/recovery and projectile arrival, including
healing, towers, enemy strikes and active skills. Unreleased actions cancel on
movement/death; released projectiles remain valid but cannot hit a dead target
twice or revive a dead lifesteal source. Combat sounds consume those events.
Rendering samples previous/current simulation positions at the fixed-step
accumulator fraction; stride advances with distance, planted feet retain ground
anchors, and facing is relative to the camera. Defeated enemies settle and fade;
heroes walk home after loot instead of teleporting at wave completion.

Validation: `node --test games/crystal-vanguard/tests/*.test.mjs` covers 33 tests,
including five complete 12-wave campaigns, 30/60/120 Hz and double-speed schedules,
release cancellation, projectile impact, checkpoint compatibility, joint/raycast
scene reconciliation and resource disposal. `tests/render-guard.cjs` generates
native Canvas desktop/mobile visual proofs. The cloud browser lacks WebGL2, so
browser interaction checks use Canvas; actual device GPU frame pacing still needs
measurement on the player's device. No hardware FPS guarantee is inferred from
CPU scene tests. Three diagnostics report the motion revision and rig count.
