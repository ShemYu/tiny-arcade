# Crystal Vanguard / 琉璃城：八方守晶

A pixel tactics tower-defense experiment inside **Shem's Tiny Arcade**.

## Play

Current single-page POC:

```text
https://shemyu.github.io/tiny-arcade/games/crystal-vanguard/
```

Phaser v0.2 backbone after the branch is merged:

```text
https://shemyu.github.io/tiny-arcade/games/crystal-vanguard/v0.2/
```

The v0.2 implementation is intentionally isolated under [`v0.2/`](./v0.2/) so the original POC remains available for comparison and rollback.

## What is implemented in the original POC

- eight-direction enemy wave forecasting
- recruitable tactics roster
- pre-battle deployment on a grid
- auto-battler movement and combat
- unit merging from first through fourth rank
- crystal health and round progression
- shop rerolls
- rally command during battle
- keyboard, mouse, and touch controls
- lightweight procedural audio

## What v0.2 establishes

- Phaser 3.90 boot and battle scenes
- a validated content registry for professions, skills, attack styles, monsters, waves, buildings, tools, and visual contracts
- the existing Blade Rank 1 six-action, eight-direction sprite set
- automatic procedural fallbacks when production art is absent or fails to load
- planning and battle phases, placement, refunds, melee and projectile combat, skills, waves, rewards, defeat, and reset
- two defensive buildings: a barricade and a bolt tower
- an art-team backlog in both Markdown and JSON
- Node tests for IDs, cross references, immutability, session state, wave scheduling, grid rules, and art-backlog parity

Run the v0.2 content tests with:

```bash
cd games/crystal-vanguard/v0.2
npm test
```

Architecture and deliberate non-goals are documented in [`v0.2/docs/ARCHITECTURE.md`](./v0.2/docs/ARCHITECTURE.md). Missing and integrated assets are tracked in [`v0.2/docs/ASSET_BACKLOG.md`](./v0.2/docs/ASSET_BACKLOG.md).

## Controls in the original POC

| Input | Action |
| --- | --- |
| Mouse / touch | Select units, buy recruits, deploy on the battlefield |
| `Space` | Start the next battle |
| `R` | Reroll the shop |
| `Q` | Rally deployed units to the crystal during battle |
| Right click | Bench the selected deployed unit |

## Phaser action proof

The isolated eight-direction action and movement proof lives at:

```text
games/crystal-vanguard/proofs/phaser-actions/index.html
```

It includes keyboard and click-to-move control, one-shot action locking, animation-phase-preserving direction changes, separate physics and visual actors, runtime sprite registration, asset diagnostics, and a debug overlay (`0`).

The reusable sprite contract and generation prompts are documented in [`assets/units/SPRITE_GENERATION_SPEC.md`](./assets/units/SPRITE_GENERATION_SPEC.md). Validate the current unit sheets with:

```bash
python3 tools/game-assets/validate_game_assets.py games/crystal-vanguard/asset-manifest.json
```

## POC notes

The original game remains a self-contained Canvas POC. v0.2 extracts the next architecture into Phaser modules without replacing the original route until the new vertical slice has been reviewed.

## Future ideas

- Add a core building phase where players spend materials each round to build defensive walls and barricades.
- Let walls shape enemy pathfinding, forcing monsters to reroute around player-built defenses instead of always walking directly toward the crystal.
- Make construction materials a strategic resource alongside recruits and rerolls, so each round asks whether to invest in stronger units, better positioning, or terrain control.
- Add clear build rules that prevent fully blocking all paths while still rewarding clever chokepoints, delay lanes, and emergency repairs.

## Known issues from original POC playtest

### P1

- Mobile core flow requires too much vertical scrolling. The battlefield, shop, roster, and start button are stacked far apart, so buying a unit, selecting it from the roster, and deploying it on the battlefield requires repeated scrolling.

### P2

- The mobile intro modal is slightly wider than a 390px viewport. It does not create horizontal scrolling, but the right edge is visually clipped.
- The crystal's blocked deployment area is not obvious enough. Players can tap a nearby grid cell and receive "crystal position cannot be deployed" even when the intended target feels like an adjacent valid tile.

### P3

- Shop reroll feedback is too subtle. Pressing `R` spends gold and changes the shop, but the toast can still show the previous round message, so players may not immediately know the reroll succeeded.
- On mobile, the first playable viewport hides the start button below the shop and roster. The action is still reachable by scrolling, but the next step is easy to miss.
