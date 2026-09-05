# Crystal Vanguard / 琉璃城：森林守望

Recovered and completed from the unfinished **Crystal Guard** prototype, using its original generated character atlas and environment art. The main `index.html` is the intended entry point. The previous single-page game is preserved at `legacy.html`; `v0.2/`, `v2/` and `v2-dawnwatch/` are unchanged.

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
| Fit / 全景 | Reset the full-map view |
| ↻ | Confirm a fresh adventure |

The game pauses when its tab becomes hidden or its window loses focus. Dialogs pause simulation. Equipment changes are restricted to preparation. Touch and keyboard commands share the same gameplay functions.

## Run

From the repository root:

```sh
python3 -m http.server 8080
# Open http://localhost:8080/games/crystal-vanguard/?lang=zh
node --test games/crystal-vanguard/tests/guard-core.test.mjs
```

No build step or runtime dependencies are required. Serve through HTTP; ES modules are not intended to run directly from `file://`.

## Validation and remaining boundary

- 12 Node tests pass, including five complete twelve-wave campaigns using ordinary construction, upgrade, repair, skill, loot and equipment commands.
- Tests cover rerouting, sealed-path rejection, hero escape routes, flying enemies, siege damage, lifesteal/overkill, piercing, frost, cooldowns, corrupt saves, checkpoint recovery, defeat and immutable end states.
- The production renderer was exercised offline at 1280×720 and 390×550 using `@napi-rs/canvas` (QA dependency only). All 16 actor/structure frames and six scenery frames load; all 165 tile centers project and unproject correctly; hero picking is checked. Preparation and battle renders were visually inspected.
- This environment blocked local browser navigation and data-URL previews. **The revised DOM UI, native dialogs, live loading, touch hardware and Safari have not been browser-tested.** Offline renderer checks do not prove browser layout or interaction. Public deployment remains pending user approval; the existing live URL still serves the previous game.

Optional offline renderer check, with `@napi-rs/canvas` available:

```sh
node games/crystal-vanguard/tests/render-guard.cjs /tmp/crystal-guard-proof
```

## Files

`guard-content.mjs` owns content; `guard-core.mjs` owns combat and serializable state; `guard-render.mjs` owns the isometric canvas; `guard-app.mjs` owns DOM, input, audio and storage; `guard-style.css` owns layout. Original recovered imagery and source notes live in `guard-assets/`.

Older implementation notes are preserved in [LEGACY_NOTES.md](./LEGACY_NOTES.md).
