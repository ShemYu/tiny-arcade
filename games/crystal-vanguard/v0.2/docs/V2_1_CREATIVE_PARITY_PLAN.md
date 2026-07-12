# Crystal Vanguard v2.1 Creative Parity

## Outcome

v2.1 is the first release candidate for the Phaser version of Crystal Vanguard.
It keeps the modular v0.2 runtime and restores the player-facing identity of the
original POC:

> Read the incoming threat, recruit and fuse an RO-inspired adventurer party,
> deploy by threatened lane, watch the formation fight, and use a non-interrupting
> rally order when a flank collapses.

The existing public route must continue to serve the original POC until every
release gate in this document passes. The Tiny Arcade catalog, preview image,
and public play link must not switch to v0.2/v2.1 early.

## Progress

- [x] Day 1 implementation: immersive mobile shell, floating HUD, collapsible
  bottom sheet, fixed primary command, a reviewable 9:16 portrait battlefield,
  touch sizing, and automated viewport checks.
- [ ] Day 1 final approval: real iPhone Safari/Chrome safe-area and dynamic
  toolbar review by the user.
- [x] Day 2 implementation: executable sprite contract, deterministic report,
  1×/4× overlays, scale lineup, action loops, transition reel, and a Phaser
  phone-scale asset lab.
- [ ] Day 2 replacement approval: concept A identity and 70 px scale are
  approved; the r1 normalized seed/directions were rejected as blurry. Author
  a new native-pixel r2 seed, its body/contact mask, and an eight-direction
  neutral turnaround before any animation strip is generated. Follow
  [`SPRITE_PIPELINE_HANDOFF.md`](./SPRITE_PIPELINE_HANDOFF.md).
- [ ] Day 3: planning domain and creative-parity UI.
- [ ] Day 4: forecast and exact deployment.
- [ ] Day 5: battle action lifecycle and queued rally.
- [ ] Day 6: approved visual slice and five-wave chapter.
- [ ] Day 7: release-candidate gates and explicit publish approval.

## Non-negotiable product rules

1. **Mobile is the primary surface.** Portrait iPhone Safari and Chrome are the
   first acceptance targets. Desktop is a supported expansion of the same UI.
2. **The core loop must not require document scrolling.** During planning and
   battle, the player can inspect the field, make the primary decision, and
   start or command the wave without moving the browser page.
3. **The canvas must never be distorted.** The prototype uses a 720×1280
   portrait world and always renders at its native 9:16 aspect ratio. Extra
   space belongs to UI, not stretched game pixels.
4. **Simulation state stays outside Phaser views.** Shop, roster, fusion,
   forecast, rally orders, and progression must be serializable and testable
   without a browser.
5. **Player units are roster instances, not infinitely purchasable placement
   tools.** Buildings remain a separate construction economy.
6. **Rally is queued, not destructive.** An attack or cast already in progress
   completes; launched projectiles remain valid; the unit rallies after its
   current committed action finishes.
7. **Art does not ship on dimensions alone.** Identity, apparent scale, anchor,
   silhouette, direction, animation continuity, crop safety, and in-engine
   readability are release gates.
8. **No silent placeholders in a release candidate.** A placeholder is visibly
   marked in development and tracked in the asset backlog.

## Release strategy

Development happens under `games/crystal-vanguard/v0.2/`. The directory keeps
its historical name until the new route passes review; the in-game version and
documentation identify the work as v2.1.

The public route changes only after:

- the mobile, creative-parity, art, gameplay, and regression gates pass;
- the user approves the representative gameplay screenshots and sprite
  previews;
- the catalog preview is regenerated from the approved build;
- the previous POC remains reachable through an explicit legacy link.

## One-week execution spine

The sequence below is dependency ordered. A later milestone does not begin by
adding production content until the preceding contract is reviewable.

### Day 1 — Mobile application shell and QA harness

Deliverables:

- full-height app shell based on dynamic viewport units and safe-area insets;
- correct 9:16 arena on every viewport;
- compact floating HUD and persistent primary command area;
- a collapsed-by-default deployment button and contextual bottom sheet;
- three upper ingress lanes across one continuous battlefield, a lower
  contextual deployment zone, and the player crystal at the rear;
- internal panels that scroll or switch tabs without scrolling the document;
- minimum 44×44 CSS-pixel touch targets for primary controls;
- automated screenshots and layout assertions for the supported viewports;
- desktop layout preserved.

Review gate:

- portrait shell remains usable at 375×667, 390×844, 393×852, and 430×932;
- landscape sanity passes at 844×390;
- `scrollHeight <= clientHeight + 1` during the core flow;
- Start Wave and the active command are visible without document scrolling;
- no horizontal overflow, clipped safe-area content, or stretched canvas;
- desktop 1440×900 remains usable.

### Day 2 — Blade asset quality lab

Deliverables:

- quantitative sprite validator for anchor, comparable-frame scale, crop,
  transparent RGB, alpha residue, duplicate frames, and continuity;
- corrected manifest semantics: the global anchor and cross-action comparison
  rules must be executable, not documentation-only;
- 1× and 4× contact sheets with root and body-envelope overlays;
- an idle → walk → attack → idle → cast → hurt → death transition reel;
- an explicit source decision: the legacy revision is rejected and the next
  revision starts from a clean identity turnaround, not normalized old pixels;
- an in-engine phone-size review surface before any new profession is produced.

Review gate:

- Blade does not visibly shrink, grow, jump, or change identity between actions;
- grounded anchor drift is at most 2 px after normalization;
- body-scale variance is at most 3% within an action and 5% across actions;
- no per-frame, per-direction, or per-action resize is used to hide drift;
- no production frame is cropped or contains unintended background pixels;
- the user approves the transition reel at actual game scale.

### Day 3 — Serializable planning domain and mobile creative-parity UI

Deliverables:

- stable unit-instance IDs, roster capacity, and deployed/bench state;
- deterministic four-slot shop, paid reroll, and board-cap rule;
- same-family, same-rank three-of-a-kind fusion through rank four;
- preservation of one deployed anchor cell after fusion;
- pure Node tests for economy, inventory, selection, and recursive fusion;
- mobile recruit, roster, selected-unit, rank, and deployment panels;
- tap-select → placement preview → confirm interaction;
- explicit bench/remove action; no required right-click, hover, drag, or long press.

Review gate:

- the complete buy → fuse → deploy transition runs without Phaser;
- a new player can complete the same flow on an iPhone viewport without
  document scrolling;
- recursive fusion is deterministic and never corrupts unrelated units;
- a failed purchase or full roster cannot corrupt gold or inventory;
- a small target cannot cause an immediate accidental purchase or placement.

### Day 4 — Forecast and exact deployment

Deliverables:

- one serializable `WavePlan` generated during planning;
- forecast lanes, composition, timing bands, and threat;
- `WaveDirector` consumes the exact same plan rather than generating again;
- visible entrances, lane cues, and forecast UI;
- home cell, guard radius, return-to-post behavior, and ranged hold behavior;
- a planning camera/touch solution that gives deployable cells a practical hit
  target without changing battle simulation coordinates.

Review gate:

- forecast and actual spawn order match exactly in deterministic tests;
- changing lane coverage can change the outcome of a test wave;
- tap-to-world mapping is correct at the board corners and center;
- placement feedback clearly distinguishes preview, invalid, and committed;
- no touch flow depends on the current ~23 px raw grid presentation.

### Day 5 — Battle action lifecycle and non-interrupting rally

Deliverables:

- explicit actor action lifecycle/completion token instead of timer-only intent;
- queued rally order and rally destinations around the crystal;
- idle/walk units redirect on the next simulation tick;
- attack/cast units finish the committed impact, then rally without inserting
  an extra attack;
- launched projectiles remain valid;
- home/leash behavior and return-to-post after the wave;
- deterministic tests for melee, projectile, movement, hurt, and rally overlap.

Review gate:

- attack/cast animation and impact finish before rally movement starts;
- launched projectiles are not deleted by rally;
- walking units redirect smoothly;
- pending rally prevents another attack from starting;
- hurt/death priority cannot leave an actor in an invalid order or animation
  state.

### Day 6 — RO-inspired visual slice, five-wave chapter, and battle UX

Deliverables:

- one approved defender, one basic monster, central crystal, environment tiles,
  one attack VFX, and representative fantasy UI icons;
- a written style anchor covering proportions, palette, outline, lighting,
  density, and equipment detail;
- at least four mechanically distinct profession definitions, exposing only
  those whose art state is explicitly allowed for the current build;
- five authored waves ending in a boss encounter;
- battle HUD, pause, speed, rally availability, victory/defeat, and run summary;
- explicit unit recovery/death rules and mobile one-thumb controls.

Review gate:

- the player, monster, crystal, ground, VFX, and UI read as one visual world;
- the user approves planning, battle, boss, and defeat phone screenshots before
  the visual language is replicated;
- each exposed profession solves a distinct threat;
- wave five provides a clear climax and conclusion;
- mobile controls do not cover the central combat read;
- a complete chapter can run without a soft lock.

### Day 7 — Regression, performance, accessibility, and release candidate

Deliverables:

- full automated test suite and repeatable browser playtest path;
- iPhone-class performance and asset-transfer review;
- reduced-motion behavior, focus states, accessible labels, and contrast pass;
- app metadata and standalone/home-screen readiness where supported;
- updated documentation, asset backlog, catalog preview, and release checklist;
- final local diff and user review package; no push or route switch without
  explicit approval.

Review gate:

- all prior gates remain green;
- no uncaught browser errors or failed runtime asset requests;
- first actionable state appears promptly on a normal mobile connection;
- restart and repeated runs do not duplicate listeners or leak actors;
- user explicitly approves the release candidate.

## Mobile application contract

### Supported viewport matrix

| Target | CSS viewport | Required mode |
| --- | ---: | --- |
| Minimum supported portrait | 375×667 | Constrained |
| Browser chrome expanded | 390×650 | Constrained |
| Compact iPhone portrait | 390×844 | Primary |
| Current iPhone portrait | 393×852 | Primary |
| Large iPhone portrait | 430×932 | Primary |
| Compact landscape | 844×390 | Sanity |
| Tablet portrait | 768×1024 | Supported |
| Desktop | 1440×900 | Supported |

### Interaction budget

- The battlefield remains visible throughout planning and battle.
- One persistent area owns the current primary action: Start, Rally, Continue,
  or Restart.
- Secondary information is behind tabs, a bottom sheet, or a drawer.
- Primary controls are at least 44×44 CSS pixels and separated enough to avoid
  accidental taps.
- Text carrying gameplay state is at least 12 CSS pixels on the compact target.
- Long help text never occupies the live playfield.
- Safe-area padding uses `env(safe-area-inset-*)` with usable fallbacks.
- Layout uses `dvh`/`svh` behavior and must survive Safari toolbar expansion and
  collapse without hiding the primary action.
- The contextual 7×5 deployment grid is intentionally hidden until a tool is
  selected. Planning still requires preview and confirmation before final
  release; visual scaling alone is not considered an exact touch solution.

## Architecture increments

The existing module boundaries remain. New state is added through focused
domain modules rather than growing `BattleScene`:

| Module | v2.1 responsibility |
| --- | --- |
| `core.js` | run state, phases, snapshots, serializable commands |
| `roster.js` | unit instances, roster, shop, board cap, fusion |
| `content.js` | professions, ranks, waves, assets, stable IDs |
| `orders.js` | queued actor orders and action-completion policy |
| `systems.js` | placement, guard zones, combat, wave execution |
| `runtime.js` | sprites, pivots, animation playback, view objects |
| `ui.js` | DOM rendering and explicit input actions |
| `scenes.js` | thin Phaser orchestration only |

## Art review package

Every new character delivery must include:

1. source identity turnaround;
2. raw action strips;
3. normalized production sheets;
4. alpha-bounds and anchor report;
5. same-scale contact sheet containing all directions and actions;
6. in-engine idle, movement, attack, hurt, and death captures;
7. asset-manifest and backlog updates.

Automated checks reject structural failures. Visual approval remains required
for identity, acting quality, equipment continuity, silhouette, and whether the
asset belongs in the approved world.

## Scope protection

The following stay out of v2.1 unless required to fix a release blocker:

- full A* maze construction and arbitrary wall pathfinding;
- branching third/fourth-job trees;
- equipment inventory and roguelite blessing systems;
- network multiplayer or server authority;
- large biome campaign and meta-progression economy;
- production art for every planned profession before the representative slice
  is approved.
- buildings competing with the recruit/fusion economy in the primary v2.1
  chapter; existing building content remains available behind the development
  seam until the core auto-battler economy is proven.

These features can follow after the mobile core loop and visual language are
proven.

## Working agreement

- Each milestone ends in a small reviewable diff and evidence package.
- Tests, viewport screenshots, and asset previews are part of the deliverable,
  not optional cleanup.
- Failed quality gates are fixed before multiplying content built on them.
- Existing public behavior is preserved until the release candidate is
  explicitly approved.
- Git commits, pushes, pull requests, and public route changes require a clear
  handoff or explicit approval.
