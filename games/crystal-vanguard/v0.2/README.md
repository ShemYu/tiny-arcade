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

Blade art can be inspected in the Phaser phone-scale quality lab without
changing the active game route:

```text
http://localhost:8000/games/crystal-vanguard/v0.2/asset-lab/
```

## Validate the content layer

```bash
cd games/crystal-vanguard/v0.2
npm test
```

The tests run without Phaser. They validate content IDs, duplicate detection, cross references, and immutability before the browser starts.

## Rebuild and gate Blade QA

```bash
npm run test:asset-tools
npm run qa:assets:report
npm run qa:assets:gate
```

`qa:assets:report` is status-aware and reproduces the review package while the
existing sheets are truthfully declared auto-QA failed and manually rejected.
`qa:assets:gate` is the strict release check; it intentionally remains red until
a clean-room replacement revision passes.

The isolated Frontier Blade static candidate has a separate reproducible gate:

```bash
npm run qa:seed
```

It rebuilds the 96×96 seed/mask and captures the 64/70/74 px comparison at
390×844 and 430×932 in the real game surface. It does not replace any runtime
texture. The candidate may pass automated checks while art, mobile scale, and
semantic direction remain pending manual approval.

## Included vertical slice

- Phaser 3.90 boot and battle scenes
- existing Blade Rank 1 idle / walk / attack / cast / hurt / death sheets
- planning and battle phases
- portrait 720×1280 battlefield with three continuous ingress lanes, a lower
  deployment zone, and a rear crystal sanctuary
- contextual grid placement and right-click refunds on desktop
- one profession with two data-defined skills
- melee and projectile attack resolvers
- three placeholder monsters
- barricade and bolt-tower defensive buildings
- lane-routed wave scheduling, round scaling, rewards, crystal defeat, and reset
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

## v2.1 Creative Parity

The mobile-first restoration plan for the original recruit / fuse / forecast /
rally loop is documented in
[`docs/V2_1_CREATIVE_PARITY_PLAN.md`](./docs/V2_1_CREATIVE_PARITY_PLAN.md).
Sprite continuity and mobile art approval are governed by
[`docs/ASSET_QUALITY_GATES.md`](./docs/ASSET_QUALITY_GATES.md).
The reusable native-pixel production architecture, current r1 rejection, and
step-by-step Blade completion handoff are documented in
[`docs/SPRITE_PIPELINE_HANDOFF.md`](./docs/SPRITE_PIPELINE_HANDOFF.md).
The existing public route remains on the original POC until every v2.1 release
gate passes and the release candidate is explicitly approved.

## Main extension point

Game content lives in [`src/content.js`](./src/content.js). Most additions should be data-only:

1. register the visual contract;
2. register the skill, profession, monster, or building;
3. reference it from a placement tool or wave;
4. run `npm test`;
5. add missing art to [`docs/ASSET_BACKLOG.md`](./docs/ASSET_BACKLOG.md).

New attack or skill **effect types** require one resolver entry in `CombatSystem`; ordinary balance/content additions do not.
