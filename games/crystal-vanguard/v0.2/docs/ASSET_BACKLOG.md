# Crystal Vanguard v0.2 asset backlog

This is the source of truth for temporary art used by v0.2. The machine-readable mirror is [`../asset-backlog.json`](../asset-backlog.json).

Art-QA status vocabulary:

- **Needs rework** — the file failed automated QA. Manual art review is tracked
  separately; the legacy Blade revision is explicitly **rejected** and cannot
  be promoted in place.
- **Generated → normalized → auto QA passed → art approved → runtime mobile
  approved → integrated** — the production approval chain.
- **Placeholder in game** — gameplay is complete enough to use; art remains missing.
- **Backlog** — specified for a later content release and not enabled in v0.2.

Runtime loadability and art approval are deliberately separate. `ready` in
`src/content.js` means that a file can be loaded by the development runtime; it
does not imply `integrated` art approval.

## Current integration and missing production assets

| ID | Asset / use | Current fallback | Required delivery | Technical specification | Status | Priority | Acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ART-UNIT-001 | Blade Rank 1 / playable profession | Rejected legacy sheets remain a development-only diagnostic placeholder | Frontier Blade r2 native 96×96 seed → eight-direction neutral turnaround → golden-direction actions → full sheets | 96×96 cells; 70 px approved body envelope; 8 direction rows `S,SE,E,NE,N,NW,W,SW`; idle 6, walk 8, attack 8, cast 8, hurt 4, death 8; anchor `(48,82)` | **Legacy rejected; r1 normalized seed/directions rejected as blurry; r2 not started** | P0 | Native logical pixels only; approved seed hash; body/contact mask; transition endpoints ≤3% and ≤2px; mobile review approved |
| ART-MON-001 | 苔芽獸 / basic melee monster | Generated green slime silhouette | Full idle, walk, attack, hurt, death set | Prefer same 96×96 / 8-row contract; medium body envelope; transparent PNG; no baked shadow/VFX | **Placeholder in game** | P0 | Silhouette readable at 1×; all actions loop/finish correctly; anchor drift ≤2 px |
| ART-MON-002 | 針翅蟲 / fast monster | Generated moth silhouette | Full idle, fly/walk, attack, hurt, death set | 96×96 cells; 8 directions; airborne root still fixed at `(48,82)`; wing cycle must not change body scale | **Placeholder in game** | P1 | Direction and wing phase readable; no cell-edge crop |
| ART-MON-003 | 頁岩巨像 / armored monster | Generated block golem | Full idle, walk, attack, hurt, death set | 96×96 cells; large envelope 68–76 px; heavy motion; transparent PNG | **Placeholder in game** | P1 | Mass reads clearly; contact frames remain grounded |
| ART-BLD-001 | 木製路障 / blocker | Generated crossed planks | One production static sprite; optional damaged variants | 96×96 RGBA; anchor `(48,82)`; 4 px safe padding; no floor shadow | **Placeholder in game** | P0 | Footprint matches one 60 px grid cell; readable intact / damaged states |
| ART-BLD-002 | 弩箭塔 / ranged defense | Generated tower silhouette | Idle/static base plus attack recoil | 96×96 RGBA; anchor `(48,82)`; optional 6-frame attack; weapon direction may use 8 rows | **Placeholder in game** | P0 | Base remains registered while launcher rotates/recoils |
| ART-CORE-001 | Central crystal | Generated polygon crystal | Idle pulse and damaged state | 128×128 preferred; transparent PNG; anchor centered at base; idle 6 frames; damaged 2–4 frames | **Placeholder in game** | P1 | Shape readable against teal map; glow does not hide silhouette |
| ART-VFX-001 | Blade cleave | Phaser expanding ring | Slash arc and impact spark | Separate 96×96 VFX; 6–8 frames; transparent; do not bake into body sheet | **Placeholder in game** | P1 | Impact frame aligns with Blade attack frame 5 |
| ART-VFX-002 | Bolt projectile + impact | Generated 16×8 bolt and ring | Projectile, impact, optional trail | Projectile 32×16; impact 64×64, 6 frames; transparent PNG | **Placeholder in game** | P1 | Projectile remains readable over dark and light ground |
| ART-UI-001 | Placement tool icons | Unicode symbols | Blade, barricade, tower icons | 32×32 PNG or atlas cells; hard-edged pixel art; transparent | **Placeholder in game** | P2 | Recognizable without text at 1× |
| ART-UNIT-002 | Archer Rank 1 / future profession | Not enabled | Six action sheets matching runtime contract | Same contract as ART-UNIT-001; bow/string geometry consistent; projectile separate | **Backlog** | P2 | Identity and handedness stable in all directions |
| ART-UNIT-003 | Mage Rank 1 / future profession | Not enabled | Six action sheets matching runtime contract | Same contract; cast release on frame 5; spell VFX separate | **Backlog** | P2 | Hands/focus readable without opaque body-covering glow |
| ART-UNIT-004 | Acolyte Rank 1 / future profession | Not enabled | Six action sheets matching runtime contract | Same contract; healing VFX separate | **Backlog** | P2 | Support silhouette distinct from Mage |
| ART-UNIT-005 | Thief Rank 1 / future profession | Not enabled | Six action sheets matching runtime contract | Same contract; no baked afterimage | **Backlog** | P3 | Fast actions remain registered and readable |
| ART-UNIT-006 | Gel companion / future profession | Not enabled | Creature action set | Same 8-row ordering; may use creature-specific body envelope | **Backlog** | P3 | Limb/body count and scale consistent |

## Handoff rules for the art team

1. File names and row order are contracts. Do not rename or reorder without updating `src/content.js`.
2. Character world translation belongs to Phaser; keep actions in-place.
3. Weapon trails, projectiles, hit sparks, spell circles, and floor shadows are separate assets.
4. Export RGBA PNG with fully transparent background and no labels or grid.
5. Rebuild the review report while known failures are explicitly declared:

```bash
cd games/crystal-vanguard/v0.2
npm run qa:assets:report
```

6. Run the strict release gate. This intentionally exits non-zero for the
   current Blade source and must become green before integration:

```bash
npm run qa:assets:gate
```

7. Update the manifest, report, this table, and `asset-backlog.json` in the same
   reviewed change as delivered art.

The rejected r1 diagnostic package can be rebuilt independently without
changing runtime art:

```bash
npm run qa:seed
```

Do not promote its output. The native-pixel r2 implementation and expansion
contract are defined in
[`SPRITE_PIPELINE_HANDOFF.md`](./SPRITE_PIPELINE_HANDOFF.md).
