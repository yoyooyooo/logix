---
title: CAP-PRESS-003 Row Owner Nested Remap Pressure Packet
status: no-change-proven-current-matrix
version: 2
---

# CAP-PRESS-003 Row Owner Nested Remap Pressure Packet

## Meta

| field | value |
| --- | --- |
| pressure_id | `CAP-PRESS-003` |
| status | `no-change-proven-current-matrix` |
| owner | `coordination-main-agent` |
| target_atoms | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, overlay `CAP-13`, `CAP-25` |
| related_projections | `PROJ-03`, `PROJ-05`, `PROJ-06` |
| related_collisions | `COL-03`, `COL-04` remain closed for current matrix |
| source_reviews | `Epicurus planning slice`, `Carson adversarial review`, `Russell implementation proof evidence audit` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | primary `SC-E`; supporting pressure from existing `SC-C` and `SC-F` only |
| target_caps | `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, overlay `CAP-13`, `CAP-25` |
| related_projections | `PROJ-03 field-local soft fact lane`, `PROJ-05 row identity operation lane`, `PROJ-06 host selector gate lane` |
| related_collisions | `COL-03 row-heavy list/root companion pressure`, `COL-04 row owner selector read pressure` |
| required_proofs | `PF-05`, `PF-06`, `PF-07`; `PF-08` only if the follow-up claims report/feed evidence linkage |
| coverage_kernel | `one-owner-per-atom`, `projection-cannot-freeze-surface`, `adversarial-pressure-required`, `surface-candidate-ledger`, `artifact-local-until-promoted`, `verification-artifact-lifecycle-required` |
| decision_policy | P0 laws, concept-count, public-surface, generator efficiency, proof-strength, theoretical type-safety ceiling, future-headroom, first-read clarity, agent generation stability |
| non_claims | no exact spelling freeze, no helper placement freeze, no new scenario ids, no root compare productization, no public verification-artifact vocabulary |
| generator_hypothesis | existing `fieldArray(...).byRowId(rowId)` write route plus `Form.Companion.byRowId(listPath, rowId, fieldPath)` read primitive can cover row pressure through one host selector gate |

## Pressure Mode

| field | value |
| --- | --- |
| pressure_mode | `adversarial` |
| capability_bundle | row identity chain + structural edit continuity + byRowId owner route + active exit cleanup + nested owner remap + companion selector admissibility + selector read route |
| cross_pressure_axes | row identity, structural edit, cleanup/reason, nested owner, selector read route, host gate |
| current_shape_under_attack | `form.fieldArray(path).*`, `form.fieldArray(path).byRowId(rowId).*`, `Form.Companion.byRowId(listPath, rowId, fieldPath)`, single `useSelector` gate, frozen negative space around list/root companion and second host read family |

## Current Shape Under Attack

The attacked frozen shape is:

```ts
form.fieldArray(path).swap(indexA, indexB)
form.fieldArray(path).move(from, to)
form.fieldArray(path).replace(nextItems)
form.fieldArray(path).remove(index)
form.fieldArray(path).byRowId(rowId).update(value)
form.fieldArray(path).byRowId(rowId).remove()

useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))
useSelector(handle, Form.Error.field(path))
```

The pressure question is whether row identity, nested owner remap, cleanup exit, read/write symmetry, and host selector read can keep sharing the existing row owner chain without adding a public row owner primitive, list/root companion, or second host read family.

## Adversarial Scenarios

| proof sample | pressure | expected failure mode |
| --- | --- | --- |
| `W3 row-reorder-byRowId combined` | swap/move a roster, then update by `rowId`, then read the same row companion through `Form.Companion.byRowId` | write owner and read owner diverge, or selector reads by current index rather than canonical row owner |
| `W4 row-replace-active-exit combined` | replace/remove a row with live companion/error contribution, then read row companion and cleanup reason | old row bundle remains live, cleanup becomes hidden second row truth, or stale row id hits a replacement row |
| `W6 nested-outer-remap-read-write` | nested child rows exist under an outer row that reorders or gets replaced | nested owner loses outer row context, or duplicate child row ids collide across parents |
| `W7 host-gate-row-selector` | React reads `Form.Companion.byRowId` after row mutation using the real runtime owner chain | host selector route requires fake internals, raw landing path, or a second read family |

No new `SC-*` is introduced. These are local proof samples derived from `SC-E`, with `SC-C` supplying field-local companion baseline and `SC-F` supplying host selector pressure.

## Existing Evidence Inventory

| evidence | current state | limitation under this packet |
| --- | --- | --- |
| `Form.RowIdentityContinuity.contract.test.ts` | proves reorder/move/write continuity, store-mode row id, replace retirement, and nested error remap | retained as row runtime support proof |
| `Form.CleanupReceipt.contract.test.ts` | proves remove/replace cleanup receipt and live state cleanup | retained as cleanup support proof |
| `Form.Companion.RowScope.Authoring.test.ts` | proves companion row-scope writeback and nested concrete path write | retained as companion writeback support proof |
| `useSelector.formCompanionDescriptor.test.tsx` | proves descriptor consumption through host selector gate | retained as descriptor unit proof |
| `form-companion-host-gate.integration.test.tsx` | proves exact primitive through real `Form.make` and React host gate | retained as FU1 combined proof; no fake row store in closing assertion |
| `RowIdStore` internals | supports parent row namespace, descendant retirement, reverse row id index, and list reconciliation | retained as internal support proof; duplicate nested row id ambiguity exits instead of arbitrary hit |

## FU1 Evidence

| evidence | result |
| --- | --- |
| [cap-press-003-fu1-real-runtime-row-owner-proof.md](./cap-press-003-fu1-real-runtime-row-owner-proof.md) | closed `CAP-PRESS-003-FU1` as `retained-harness + generalized-internal` |
| `examples/logix-react/test/form-companion-host-gate.integration.test.tsx` | real `Form.make`, `RuntimeProvider`, `useModule`, `useSelector`, and `Form.Companion.byRowId` prove read/write/nested/cleanup/host symmetry without fake row store |
| `packages/logix-react/src/FormProjection.ts` | internal row companion resolver now aligns reads through current state plus declared list configs, with `rowIdStore` fallback |
| duplicate nested row id negative proof sample | ambiguous owner exits instead of choosing an arbitrary row |

FU1 does not claim `PF-08` because it does not assert report/feed linkage.

## Expected Failure Modes

| failure | consequence |
| --- | --- |
| read/write owner divergence | `COL-04` may reopen because `Form.Companion.byRowId` cannot consume row owner projection through the single host gate |
| nested row id collision across parent rows | row internal law or exact authority writeback may be required to clarify parent owner namespace |
| cleanup receipt acts like live row truth | `CAP-22` loses proof coverage and may require internal cleanup law or collision reopen |
| field-local companion cannot bind under row-heavy pressure | `COL-03` may reopen and list/root companion becomes a live counter-shape |
| real runtime proof requires fake internals | status quo cannot meet no-hidden-second-route burden |

## Forced Counter-Shapes

| counter-shape | public surface delta | owner/truth placement | first-read impact | generator impact | implementation sketch | proof requirement | concept-count delta | decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| public row owner primitive | add `Form.Row`, `rowOwner`, or `form.fieldArray(path).row(rowId)` style public noun | row identity becomes a public owner handle | improves visible read/write symmetry | may reduce hidden row-owner guessing, but adds a new noun | wrap canonical row owner resolver behind a public token | `PF-05 + PF-06 + PF-07` combined plus no second truth audit | `+1` public concept | rejected for now; keep latent only if `CAP-PRESS-003-FU1` proves current route cannot express the bundle or needs hidden second substrate |
| list/root companion | add `$.list(path).companion(...)`, `Form.Companion.list(...)`, or root companion read primitive | companion soft fact moves from field-local owner to roster/root owner | helps roster-level facts but weakens field-local clarity | encourages generators to use broad list/root facts for field-local soft facts | materialize roster companion bundle keyed by row chain | reopen `COL-03`; rerun `PF-03`, `PF-05`, `PF-06`, `PF-07` | `+1` or more public concepts | rejected unless an irreducible roster-owned soft fact appears |
| second host read family | add `useRowSelector`, `useCompanion`, or a Form-owned read hook branch | read ergonomics moves into a parallel host helper family | may look simpler locally | creates two read routes and weakens selector gate first | delegate wrapper to existing selector machinery | reopen `COL-04`; host law proof plus selector type audit | `+1` host family | rejected unless `useSelector(handle, Form.Companion.byRowId(...))` cannot stably consume row owner |
| public cleanup/read-exit primitive | add `Form.RowCleanup`, removed-row status, or a row read-exit descriptor | cleanup/read-exit becomes a public row lifecycle object | may make stale read status explicit | teaches a fourth row concept and encourages cleanup as live truth | expose removed-row terminal state beside companion/error read | rerun `PF-06` plus no-live-truth audit; add `PF-08` if report/feed is claimed | `+1` public concept | rejected for current matrix; stale row companion reads exit through existing selector route and cleanup remains subordinate evidence |

## Status Quo Burden

No public API change can be accepted only after all conditions hold:

- Combined authoring stays readable with `fieldArray(path).*`, `fieldArray(path).byRowId(rowId).*`, `Form.Companion.byRowId(listPath, rowId, fieldPath)`, and `useSelector`.
- Generator failure modes are explicit: it must not invent index-path writes, raw internal `ui` reads, `RowOwner`, list/root companion, or `useRowSelector`.
- Write owner, read owner, cleanup reason subject, and nested owner ref share one canonical row chain.
- Internal implementation does not need second row truth, second read route, second evidence envelope, or second report object.
- Proof composes `PF-05`, `PF-06`, and `PF-07` in one proof sample. `PF-08` joins only if the proof claims report/feed evidence linkage.
- Implementation experiment artifact names do not become final implementation vocabulary without lifecycle review.
- Surface registry, implementation gap ledger, and authority target remain coherent after the no-change decision.

Current status: satisfied for current matrix by `CAP-PRESS-003-FU1`.

## Implementation Proof Boundary

Decision: `CAP-PRESS-003-FU1` is closed as current-matrix implementation proof.

| field | value |
| --- | --- |
| proof_id | `CAP-PRESS-003-FU1` |
| status | `closed-implementation-proof` |
| proof_kind | internal/test-backed implementation friction check |
| target | combined real-runtime row owner proof sample |
| required_scope | real `Form.make`, real `RuntimeProvider / useModule / useSelector`, real `Form.Companion.byRowId`, no fake row store for the closing assertion |
| scenario_1 | trackBy roster swap, then `fieldArray("items").byRowId(rowId).update(...)`, then same React hook reads `Form.Companion.byRowId("items", rowId, "warehouseId")` |
| scenario_2 | nested `items -> allocations`, outer reorder, nested row companion read by nested row id, outer replace, old nested row read exits |
| scenario_3 | remove/replace row, `Form.Error.field(listPath)` observes cleanup if claimed, old row companion read exits and does not hit a replacement row |
| scenario_4 | duplicate nested row id under the same `listPath` exits as ambiguous owner, rather than arbitrarily reading one parent |
| lifecycle_state | `retained-harness + generalized-internal` |
| allowed_end_states | closed as retained harness and generalized internal implementation |
| cleanup_trigger | closed by FU1 proof |
| non_claims | no public row API, no new selector noun, no exact surface change, no artifact-local helper vocabulary promotion |

If the implementation proof checks only runtime state and host selector behavior, `PF-08` remains out of scope. If it asserts report/feed linkage for cleanup or owner evidence, `PF-08` must be added to the required proof set.

## Concept Admission Gate

No new public concept is admitted in this packet.

| gate | current result |
| --- | --- |
| frozen shape cannot express the claimed bundle | false for current matrix |
| authoring/read route is materially worse for first-read clarity or Agent generation | false for current matrix |
| internal route needs hidden second truth or persistent special substrate | false after FU1 generalized internal fix |
| same gap recurs across multiple pressure slices or collisions | row pressure touched `COL-03` and `COL-04`, but FU1 did not meet reopen bar |
| new concept replaces multiple local patches and lowers total concept count | not proven |

## Decision

Current decision: `no-change-proven-current-matrix`.

Do not reopen frozen public API.

Reason:

- FU1 proved one combined real-runtime proof sample across nested remap, read/write symmetry, cleanup exit, and host selector consumption.
- The implementation friction resolved as an internal host projection repair, not as public surface failure.
- Counter-shapes increase public concepts or split owner/read law while current matrix remains expressible through the frozen shape.
- Duplicate nested row id ambiguity is handled as an internal non-hit law, not a public parent-owner token.

## Surface Forcing Signal

Reopen public surface only if `CAP-PRESS-003-FU1` proves one of these:

- `fieldArray(...).byRowId(rowId)` and `Form.Companion.byRowId(...)` cannot target the same row owner in a real runtime proof sample.
- nested owner remap requires users to author parent row owner tokens or public nested row handles.
- row companion read can be expressed only by raw internal landing path or a second host read route.
- field-local companion cannot remain owner-stable and an irreducible roster-owned soft fact appears.
- cleanup exit cannot remain terminal evidence and needs a live public row cleanup object.

## Internal Boundary Signal

The following results should stay internal unless they fail the concept admission gate:

- row owner resolver needs a clearer internal law for parent row namespace and descendant retirement.
- `formRowCompanion` needs implementation repair to consume real `RowIdStore` consistently with write-side `byRowId`.
- duplicate nested row id disambiguation needs a canonical internal coordinate.
- fake store tests need replacement by retained harness tests.
- duplicate nested `trackBy` values under one `listPath` resolve to an ambiguous non-hit for `Form.Companion.byRowId`; do not arbitrarily pick a parent owner.

## Required Follow-up

| follow-up id | status | owner lane | target | output |
| --- | --- | --- | --- | --- |
| `CAP-PRESS-003-FU1` | `closed-implementation-proof` | row owner / host selector | combined real-runtime row owner read/write/nested/cleanup proof sample | [cap-press-003-fu1-real-runtime-row-owner-proof.md](./cap-press-003-fu1-real-runtime-row-owner-proof.md); no public API change |

## Close Predicate

`CAP-PRESS-003` can close without public API change only if all are true:

- Combined real-runtime proof covers `PF-05 + PF-06 + PF-07` in one row-owner proof sample.
- `fieldArray(...).byRowId(rowId)` write and `Form.Companion.byRowId(...)` read hit the same canonical row owner after reorder.
- nested row owner follows outer row remap and old nested owner exits after outer replacement.
- removed/replaced row companion read exits and does not hit a replacement row.
- cleanup remains terminal subordinate evidence, not second live row truth.
- host selector route consumes row companion through `useSelector` without fake internals in the closing assertion.
- no public row owner primitive, list/root companion, or second host read family passes concept admission.

Current result: all close predicates are satisfied for current matrix.

## Reopen Bar

Open a new `COL-*`, `PRIN-*`, surface candidate, or authority writeback only if one of these becomes true:

- current row owner route cannot express the capability bundle.
- current route can express it only through materially worse authoring or unstable generator patterns.
- internal implementation needs hidden second row truth, second read route, or persistent special substrate.
- a roster-level soft fact appears that cannot be decomposed into field-local companion bundles.
- `Form.Companion.byRowId` shape is theoretically unable to preserve the target selector type-safety chain.

## Non-claims

- no exact spelling freeze
- no helper placement freeze
- no new scenario ids
- no root compare productization
- no public row owner primitive
- no list/root companion baseline
- no second host read family
- no public verification-artifact vocabulary
- no claim that `Form.Companion.byRowId` declaration-driven exact inference is already solved

## Current Sentence

`CAP-PRESS-003` is closed as `no-change-proven-current-matrix`. Frozen public API shape remains unchanged; `CAP-PRESS-003-FU1` supplies the retained real-runtime row owner combined proof, while selector type inference remains with `CAP-PRESS-007-FU2` / `TASK-009`.
