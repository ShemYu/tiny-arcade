# Crystal Vanguard Sprite Pipeline Handoff

## Purpose

This document is the implementation handoff for finishing Blade Rank 1 and
turning that work into a reusable sprite-production module. The target is not a
one-off sheet that happens to look acceptable. The target is a contract-driven
pipeline that can produce additional professions, ranks, monsters, actions,
and directions without reintroducing identity drift, scale popping, clipping,
or blurry pseudo-pixel art.

The pipeline must protect the game's actual product constraints:

- readable, detailed native pixel art at iPhone battle scale;
- one stable character identity across every direction and action;
- one shared unit scale and ground root across the complete set;
- deterministic artifacts, reports, hashes, and approval history;
- bounded generation retries instead of open-ended prompt roulette;
- no runtime or public-route promotion before explicit mobile approval.

## Current decision record

### Approved and reusable

- The clean-room **Frontier Blade / concept A** identity direction is the
  preferred visual lane: approachable novice, cream-and-brown equipment,
  compact shield, short sword, and a restrained teal faction accent.
- The selected upright body envelope is **70 px from top to root**. It is the
  approved cute/readable scale for the 96×96 cell and preserves 12 px of
  headroom above the canonical `(48,82)` root.
- The runtime contract, body/contact/equipment mask taxonomy, real mobile
  preview sizes, and staged human review workflow remain valid.
- The legacy audit and QA renderers are useful as regression fixtures.

### Rejected and forbidden as production input

- Every legacy Blade sheet remains a development-only diagnostic placeholder.
- The downsampled `frontier-blade-r1/candidate/seed-se.png` is structurally
  valid but manually rejected for insufficient detail and a blurry read.
- Both direction-review candidates, Balanced and Tactical, inherit the same
  raster-quality problem and are rejected.
- None of those PNGs may be promoted, traced, interpolated, or used as the
  pixel source for a new turnaround or animation strip.
- The high-resolution concept may remain an **identity reference only**. It
  must never be averaged down into a runtime sprite.

The manifest must therefore keep `generation_seed_eligible` and
`release_eligible` false until a newly authored native-pixel seed passes both
automated gates and explicit 1×/mobile art review.

## Why the last attempt failed

The source was a high-resolution pixel-style illustration rather than art
authored on the logical 96×96 pixel grid. Reducing it with a box filter and
quantizing the result produced technically hard edges, but the important face,
hair, fabric, and equipment clusters had already been averaged together. A
second non-integer browser/canvas scale then softened those weakened clusters
again on a phone viewport.

This is a source-authoring failure, not a palette-count tuning problem. More
post-processing cannot restore details that were never deliberately placed on
the final logical grid.

The replacement rule is simple:

> Production pixels are authored on the final logical grid. The pipeline may
> enlarge them with nearest-neighbor for review, but it never downsamples an
> illustration to invent the production sprite.

## Definition of done for Blade Rank 1

Blade Rank 1 is complete only when all of the following exist and are approved:

1. one native 96×96 SE neutral seed and semantic mask;
2. one hash-locked eight-direction neutral turnaround;
3. all six actions for SE as the golden-direction motion set;
4. an approved SE transition reel covering idle → action → idle;
5. one horizontal strip per direction and action, assembled without resampling;
6. final idle, walk, attack, cast, hurt, and death sheets in the runtime grid;
7. zero hard failures from structural, pixel, anchor, crop, scale, continuity,
   and approved-hash gates;
8. explicit art approval at native 1× and nearest-neighbor 4×;
9. explicit approval in real 390×844 and 430×932 battle captures;
10. manifest/backlog/runtime integration in one reviewed change.

Passing file dimensions alone is never completion.

## Architecture

```text
unit contract + identity lock + motion profile
                    |
                    v
       pluggable authoring/orchestration adapter
                    |
                    v
      canonical indexed-pixel source + masks
                    |
                    v
 deterministic render/measure/validate/review package
                    |
          pass -----+----- fail
           |                 |
           v                 v
     human approval     bounded repair loop
           |
           v
 hash-lock parent stage -> assemble -> mobile review -> integrate
```

The reusable core belongs under `tools/game-assets/`. Crystal Vanguard keeps
only its unit contracts, identity references, motion profiles, approval state,
and generated artifacts under `games/crystal-vanguard/`.

### Proposed reusable package

```text
tools/game-assets/sprite_pipeline/
├── __init__.py
├── cli.py                 # stable command surface
├── contracts.py           # schema loading and cross-reference checks
├── lifecycle.py           # candidate/approved/rejected stage transitions
├── provenance.py          # run IDs, hashes, prompts, models, retry history
├── indexed_raster.py      # lossless palette-index source and PNG renderer
├── masks.py               # body/contact/equipment mask operations
├── assemble.py            # strip/sheet assembly; never resamples
├── promote.py             # atomic, approval-gated runtime integration
├── qa/
│   ├── pixel_grid.py       # alpha, palette, grid, cluster, hidden-RGB checks
│   ├── registration.py     # root, contact, crop, envelope, scale checks
│   ├── continuity.py       # endpoints, equipment, planted-foot, hash checks
│   └── reports.py          # machine JSON and review images
├── review/
│   ├── contact_sheet.py
│   ├── transition_reel.py
│   └── mobile_fixture.py
└── providers/
    ├── base.py             # provider-neutral structured interface
    ├── replay.py           # deterministic CI/eval provider
    └── openai_agent.py     # optional bounded Agent SDK orchestrator
```

The current `prepare_static_seed.py`, `prepare_direction_review.py`,
`sprite_unit_qa.py`, `render_sprite_qa.py`, and `validate_game_assets.py` should
be migrated behind that package incrementally. Their current commands remain
thin compatibility wrappers until repo callers and CI have moved to the stable
CLI.

### Game-specific package

```text
games/crystal-vanguard/art/blade-rank1/revisions/frontier-blade-r2/
├── contract/
│   ├── unit.json           # canvas, root, envelope, directions, actions
│   ├── identity.json       # immutable silhouette/equipment/style facts
│   ├── palette.json        # 18–22 indexed production colors
│   ├── motion.json         # action beats, frame counts, timing
│   └── approvals.json      # stage, parent hashes, reviewer decisions
├── reference/
│   └── concept-a-1254.png  # identity reference; never raster source
├── source/
│   ├── seed-se.px.json     # lossless indexed logical pixels
│   ├── turnaround.px.json
│   └── strips/<action>/<direction>.px.json
├── masks/
│   ├── seed-se-mask.png
│   └── strips/<action>/<direction>-mask.png
├── runtime/                # generated only after relevant approvals
│   ├── blade-rank1-idle.png
│   ├── blade-rank1-walk.png
│   └── ...
└── qa/
    ├── report.json
    ├── seed-1x.png
    ├── seed-4x.png
    ├── turnaround-4x.png
    ├── transition-reel.webp
    ├── mobile-390.png
    └── mobile-430.png
```

`*.px.json` is a lossless indexed-pixel document: canvas dimensions, palette
indexes, pixel runs or clusters, layer ownership, and parent hashes. It exists
so an authoring agent or local editor changes explicit logical pixels rather
than repeatedly compressing and re-reading a raster. The rendered indexed PNG
is deterministic for a given document.

Every authoring attempt also writes a run manifest. Its run ID is derived from
the unit/revision contract hash, prompt-template hash, reference hashes, and
provider settings. The manifest records the model/provider identifier, full
structured request, response/tool metadata, output hashes, failure codes,
repair count, and parent approval hashes. Accepted artifacts are reproducible;
failed attempts remain inspectable instead of being overwritten.

## Known gaps in the current repository

The existing foundation is valuable, but it is not yet the reusable pipeline:

- `prepare_static_seed.py` and `prepare_direction_review.py` are r1-specific
  diagnostic reducers with manual source roots and filtered downsampling;
- there is no provider-neutral generation CLI, run provenance, strip assembler,
  lifecycle state machine, or atomic promotion command;
- full legacy sheets have no semantic masks, and current body/equipment/contact
  measurements still fall back to a central-band proxy in several checks;
- the manifest's generic `58–66 px` body envelope is ambiguous beside Blade's
  approved 70 px target. r2 must define an exact per-revision top-to-root target
  and tolerance rather than reuse a generic class range;
- current source records contain PNG hashes but not the original model, prompt
  template, request settings, response metadata, or retry history;
- CI validates deterministic fixtures only and must remain API-free. Live
  provider generation is a local production step, never a CI dependency.

These are implementation gaps, not reasons to discard the existing validator,
report renderer, asset lab, mobile tests, or legacy regression evidence.

## Canonical contracts

### Native-pixel contract

- logical cell: exactly `96×96`;
- canonical root: `(48,82)`;
- selected upright envelope: `70 px` for Blade Rank 1;
- minimum upright headroom: `8 px`;
- body padding: `4 px`; equipment padding: `2 px`;
- production palette: target `18–22` colors, explicitly indexed and locked;
- body alpha values: only `0` or `255`;
- transparent pixels: RGB must be `(0,0,0)`;
- no antialiasing, gradients, subpixel transforms, or partial-alpha edges;
- no baked shadow, slash trail, glow, projectile, impact, or floor;
- only nearest-neighbor integer enlargement is allowed for previews;
- BOX, bilinear, bicubic, and Lanczos sampling are forbidden in production.

An adapter may return an integer-upscaled logical grid only when every source
block maps unambiguously to one palette index. Mixed or painted blocks are
rejected; they are never averaged into a color.

### Identity contract

The identity file locks:

- face construction, eye spacing, hair silhouette, and highlight clusters;
- head/body ratio, shoulder width, limb length, and stance family;
- costume seams, belt height, boots, gloves, and material ramps;
- sword hand, shield hand, grip, blade length/profile, and shield geometry;
- upper-left key light, outline indexes, and per-material ramps;
- approved seed hash and palette hash.

Every downstream artifact names the exact approved parent hashes it derives
from. A changed identity or palette creates a new revision; it never silently
overwrites an approved one.

### Motion contract

The action definitions remain:

| Action | Frames | Playback | Key requirement |
| --- | ---: | ---: | --- |
| idle | 6 | 7 fps loop | planted, seamless return |
| walk | 8 | 12 fps loop | two readable steps, no skating |
| attack | 8 | 14 fps once | impact on frame 5, return to guard |
| cast | 8 | 12 fps once | release on frame 5, VFX separate |
| hurt | 4 | 12 fps once | compact recoil and recovery |
| death | 8 | 10 fps once | fixed settled contact, held final frame |

Rows are always `S, SE, E, NE, N, NW, W, SW`. World translation belongs to the
actor, never the sprite cell.

## Production sequence and review gates

### Gate 1 — native SE seed

Author three deliberate native-pixel seed candidates from the locked identity
contract. Do not normalize the r1 PNGs. Render each at native 1× and nearest 4×
on grass, stone, and dark ground. Automated QA runs before review.

Stop for human review. The reviewer should be judging pixel placement, face and
equipment detail, silhouette, and semantic SE direction—not choosing the least
bad resample.

### Gate 2 — identity turnaround

Build all eight neutral directions as one identity task. Lock the approved SE
frame back into its slot byte-for-byte. Validate direction semantics,
handedness, equipment geometry, palette, root, and body envelope.

Stop for human review and hash-lock the approved turnaround.

### Gate 3 — golden-direction motion

Create the full strip for one action/direction at a time, beginning with SE.
Never create isolated animation frames independently. Each strip receives the
approved SE neutral frame, identity file, palette, mask, and complete motion
beats in one request. Where appropriate, frame 1 and the recovery frame are
locked back to the approved neutral pixels.

Finish idle, walk, attack, cast, hurt, and death for SE. Render one transition
reel that repeatedly shows neutral → action → neutral at game timing.

Stop for human acting/continuity review.

### Gate 4 — full direction set

Use the approved turnaround and golden-direction strips to author one complete
horizontal strip per remaining direction. The strip is the generation unit;
individual frames are not. Assemble rows without resizing, filtering, or
palette remapping.

Run full unit QA and stop for 1×/4× contact-sheet review.

### Gate 5 — in-engine mobile approval

Load candidate sheets through the isolated asset lab, not the production
registry. Capture the real 390×844 and 430×932 surfaces on multiple terrain
values and in a multi-unit fight. Pixel-perfect CSS/canvas scaling must be
checked separately from source quality.

Only after explicit approval may the pipeline update the runtime assets,
manifest status, and asset backlog.

## Deterministic QA gates

Every candidate is rejected before human review when any hard gate fails:

- wrong canvas, grid, row order, frame count, color mode, or alpha topology;
- palette outside the locked set or above the allowed production count;
- partial alpha, hidden RGB, gradient-like ramps, or non-native pixel blocks;
- root drift over 2 px, body contact drift, or planted-foot skating;
- body/equipment crop, insufficient headroom, or detached danger-band islands;
- body scale drift over 3% within an action or 5% across actions;
- changed handedness, missing equipment, or equipment-envelope discontinuity;
- transition endpoint drift over 3% scale or 2 px position;
- unauthorized edits to an approved parent hash;
- baked gameplay VFX in a body sheet.

Warnings expose palette-ramp drift, excessive isolated pixels, unusually dense
micro-clusters, near-duplicate frames, and motion-envelope anomalies. Warnings
remain human-review items and never become an automatic aesthetic approval.

## Agent SDK boundary

The optional Agent SDK layer is an orchestrator, not the source of truth and
not an unrestricted loop around image generation.

Start with one agent and structured outputs. Give it narrow deterministic
tools such as:

- `render_indexed_sprite`;
- `validate_candidate`;
- `render_review_package`;
- `apply_pixel_patch`;
- `record_candidate_state`.

The agent may propose palette-index clusters, request a render, read redacted QA
findings, and make a bounded repair. It may not bypass a hard gate, alter a
locked parent, approve its own art, modify the runtime registry, or retry
forever. Use at most three repair attempts for one failure class and at most
five total candidates per human review gate. Preserve every attempt, prompt,
structured output, tool result, model identifier, and parent hash.

Image generation can still help with high-level identity concepts, but a
generated illustration is reference material. It is never the canonical
runtime raster. Live API access is optional; CI and local deterministic QA must
work with the replay provider and without a credential. No API key or secret is
ever committed to this repository.

## Stable CLI target

The implementation should converge on these commands:

```bash
python3 tools/game-assets/sprite_pipeline/cli.py init \
  --game crystal-vanguard --unit blade-rank1 --revision frontier-blade-r2

python3 tools/game-assets/sprite_pipeline/cli.py seed \
  --unit games/crystal-vanguard/art/blade-rank1/revisions/frontier-blade-r2

python3 tools/game-assets/sprite_pipeline/cli.py turnaround --unit <revision-dir>
python3 tools/game-assets/sprite_pipeline/cli.py strip --unit <revision-dir> --action attack --direction SE
python3 tools/game-assets/sprite_pipeline/cli.py qa --unit <revision-dir>
python3 tools/game-assets/sprite_pipeline/cli.py review --unit <revision-dir> --mobile 390 430
python3 tools/game-assets/sprite_pipeline/cli.py assemble --unit <revision-dir>
```

`assemble` writes only to the revision's isolated `runtime/` directory. A
separate `integrate` command should require an approval record and verify all
parent hashes before changing game assets or manifests.

## Test and eval strategy

CI must remain deterministic and must not spend API quota. Add:

- unit fixtures for sharp native pixels and each hard failure class;
- a regression fixture proving the blurry r1 reduction is rejected;
- exact-hash tests for indexed rendering, masks, and sheet assembly;
- property tests for root/scale/crop measurements;
- lifecycle tests preventing skipped approval gates or locked-parent edits;
- a replay-provider end-to-end test from contract to review package;
- focused Agent SDK evals for bounded retries, tool selection, refusal to
  integrate unapproved art, and correct routing of QA feedback;
- browser captures validating nearest-neighbor presentation and real mobile
  layout after source QA passes.

The existing Node, Python, and Playwright suites remain mandatory. The strict
legacy gate is expected to fail while the rejected sheets are declared as the
runtime placeholder; the declared-status audit must pass honestly.

## Expansion recipe

Once Blade Rank 1 passes all five gates:

- a **new rank or profession** supplies a new identity, palette, equipment, and
  motion profile while reusing the core lifecycle and QA;
- a **new action** supplies frame count, timing, comparable/grounded columns,
  and motion beats while reusing strip generation and assembly;
- a **monster or summon** swaps the humanoid root/contact rules through a
  contract adapter while keeping native-pixel and approval gates;
- a **new provider or editor** implements `providers/base.py`; it cannot change
  artifact format, QA thresholds, or lifecycle rules;
- batch expansion begins only after one representative unit for that content
  family passes the full mobile workflow.

## Implementation order

1. Extract the reusable contracts, indexed renderer, lifecycle, and current QA
   functions behind `sprite_pipeline/`; keep compatibility wrappers.
2. Add native-grid, palette, crispness, approval-state, and exact-hash fixtures.
3. Create `frontier-blade-r2` with locked identity/palette/motion contracts.
4. Produce three genuinely native SE seed candidates and the 1×/4× review
   package. **This is the next user review point.**
5. After seed approval, complete the turnaround and stop again for review.
6. Complete all SE strips and the transition reel; stop for motion review.
7. Expand remaining directions, run full QA, and review in the asset lab.
8. Integrate only after explicit final mobile approval.

## Handoff invariants

- Do not restore or silently approve r1 because its structural tests pass.
- Do not regenerate frames independently.
- Do not use per-frame, per-row, or per-action resizing to repair scale.
- Do not use filtered downsampling for production pixels.
- Do not merge body sprites and gameplay VFX.
- Do not let an agent or validator substitute for art review.
- Do not replace the public POC before the v2.1 release gate is approved.
