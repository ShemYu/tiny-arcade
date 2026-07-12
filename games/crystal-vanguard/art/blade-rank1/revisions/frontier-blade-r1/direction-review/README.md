# Frontier Blade SE direction review — rejected archive

This package compared two SE corrections at the approved 70 px golden scale.
Both use the same 28-color palette, 96×96 canvas, and canonical `(48,82)` root.
Neither is registered in the runtime, and both are now manually rejected.

The source process reduced high-resolution pixel-style illustrations into the
logical cell. Although structural QA passed, the result lost deliberate native
pixel clusters and reads blurry/insufficiently detailed. Direction A/B must not
be used as production seeds or animation references.

## Candidates

- **A / Balanced** — preserves the cutest face read and stays closest to the
  approved identity. The body turn is clearer than the current frame, but still
  somewhat frontal.
- **B / Tactical** — the staggered feet, weight line, and equipment read more
  clearly as SE. It is the stronger direction reference, with slightly more
  identity drift in the face/hair and apparent shield size.

The former internal preference for B's direction geometry is superseded by the
art rejection. A new native-pixel r2 seed must establish semantic SE direction
before any turnaround begins.

## Review files

- [`qa/direction-comparison-4x.png`](./qa/direction-comparison-4x.png) — current,
  A, and B at identical logical scale.
- [`../qa/mobile-direction-review-390.png`](../qa/mobile-direction-review-390.png)
  — A/B inside the actual 390×844 game surface.
- [`../qa/mobile-direction-review-430.png`](../qa/mobile-direction-review-430.png)
  — A/B inside the actual 430×932 game surface.
- [`qa/direction-report.json`](./qa/direction-report.json) — source hashes,
  output hashes, and deterministic normalization checks.

This review is resolved as rejected. No eight-direction turnaround may derive
from these files.
