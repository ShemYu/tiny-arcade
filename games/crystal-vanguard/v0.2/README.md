# Crystal Vanguard v0.2 — Phaser backbone

v0.2 is a deliberately small but complete vertical slice for the next Crystal Vanguard architecture.

It keeps the existing **Blade Rank 1** eight-direction sprite sheets, replaces missing monster/building/VFX art with deterministic Phaser-generated placeholders, and establishes extension seams for professions, skills, attack styles, monsters, waves, and defensive buildings.

## Run locally

ES modules and game assets require an HTTP server. From the repository root:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/games/crystal-vanguard/v0.2/
```

## Validate the content layer

```bash
cd games/crystal-vanguard/v0.2
npm test
```

The tests run without Phaser. They validate content IDs, duplicate detection, cross references, and immutability before the browser starts.

## Included vertical slice

- Phaser 3.90 boot and battle scenes
- existing Blade Rank 1 idle / walk / attack / cast / hurt / death sheets
- planning and battle phases
- grid placement and right-click refunds
- one profession with two data-defined skills
- melee and projectile attack resolvers
- three placeholder monsters
- barricade and bolt-tower defensive buildings
- wave scheduling, round scaling, rewards, crystal defeat, and reset
- DOM HUD isolated from scene implementation
- Markdown and JSON asset backlog for the art pipeline

## Explicit non-goals for v0.2

These are intentionally deferred rather than half-built:

- shop and roster UX
- three-of-a-kind merging and class advancement
- save data and meta progression
- A* navigation and hard wall collision
- status-effect stacking framework
- general-purpose ECS or dependency-injection container
- multiplayer and server authority

The backbone is ready for those features, but none is required to prove the current contracts.

## Main extension point

Game content lives in [`src/content.js`](./src/content.js). Most additions should be data-only:

1. register the visual contract;
2. register the skill, profession, monster, or building;
3. reference it from a placement tool or wave;
4. run `npm test`;
5. add missing art to [`docs/ASSET_BACKLOG.md`](./docs/ASSET_BACKLOG.md).

New attack or skill **effect types** require one resolver entry in `CombatSystem`; ordinary balance/content additions do not.
