---
title: AUTH-REVIEW Companion Metadata Carrier
status: authority-writeback-consumed
version: 3
---

# AUTH-REVIEW Companion Metadata Carrier

## Goal

Decide whether exact `Form.Companion.field/byRowId` lower-result inference can continue as implementation work, or whether the current frozen shape needs concept admission or authority writeback.

This review consumes `CAP-PRESS-007-FU2` and `TASK-009`. It does not start `TASK-003`, does not admit `Form.Path`, and does not freeze exact callback spelling.

## Source

- [cap-press-007-fu1-selector-type-safety-ceiling.md](./cap-press-007-fu1-selector-type-safety-ceiling.md)
- [cap-press-007-fu2-typed-path-metadata-chain.md](./cap-press-007-fu2-typed-path-metadata-chain.md)
- [task-009-type-only-path-metadata-chain-scope.md](./task-009-type-only-path-metadata-chain-scope.md)
- [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [../../ssot/capability/02-api-projection-decision-policy.md](../../ssot/capability/02-api-projection-decision-policy.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/10-react-host-projection-boundary.md](../../ssot/runtime/10-react-host-projection-boundary.md)
- [../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md](../../ssot/runtime/13-selector-type-safety-ceiling-matrix.md)

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `AUTH-REVIEW-companion-metadata-carrier` |
| status | `authority-writeback-consumed` |
| target_scenarios | `SC-C`, `SC-E`, `SC-F` |
| target_caps | `CAP-10`, `CAP-13`, `CAP-19`, `CAP-21`, `CAP-23`, `CAP-25`, `CAP-26` |
| related_projections | `PROJ-03`, `PROJ-05`, `PROJ-06` |
| related_collisions | `COL-03`, `COL-04`, `COL-08` closed; reopen only on shape-level failure |
| required_proofs | `PF-03`, `PF-05`, `PF-07` |
| coverage_kernel | single declaration owner, single selector gate, no hidden metadata truth, no new surface without admission |
| decision_policy | P0 hard laws, concept-count, public-surface, generator efficiency, proof strength, type-safety ceiling |
| non_claims | no exact callback spelling freeze, no `TASK-003`, no public path noun, no public metadata object, no second hook family |
| generator_hypothesis | existing `field(path).companion(...)` remains the generator; exact result inference needs a type-only carrier through the same owner lane |

## Decision

Exact `Form.Companion.field/byRowId` lower-result inference cannot continue as a pure implementation task under the current imperative `Form.make(..., ($) => { ... })` callback shape.

Reason:

- `$.field(path).companion({ lower })` is a side-effecting declaration method.
- `Form.make(..., define)` currently accepts a callback that returns `void`.
- TypeScript cannot soundly collect exact `lower` return types from side-effecting calls inside that callback into `FormProgram -> handle -> selector`.
- Keeping `unknown` as the terminal answer would violate the selector type-safety ceiling rule.

Chosen route: `authority-writeback`.

No new public concept is admitted in this review. The preferred next shape is a type-only declaration metadata carrier owned by the existing Form authoring lane and consumed by the existing Form selector primitives through the single host gate.

Authority writeback landed in `13 / runtime/10 / runtime/13 / capability/03` and has been consumed by `TASK-009`. The accepted implementation route is returned-carrier exact typing; imperative `void` callback authoring remains runtime-valid / honest-unknown.

## Decision Policy Check

| gate | result |
| --- | --- |
| P0 single truth | preserved only if companion metadata is derived from the canonical Form declaration, not user-authored public metadata |
| P0 single owner | Form declaration remains the companion authoring owner; React host only consumes typed descriptors |
| P0 single authority | changes to `Form.make`, `FormProgram`, `Form.Companion.*`, or selector result typing require `13 / runtime/10 / runtime/13` writeback |
| P0 host boundary | React host must not reconstruct Form declaration semantics |
| concept-count | public concept delta must stay `+0` unless a later proof fails |
| public-surface | existing string slots and selector primitives may receive stronger type signatures only after authority writeback |
| generator efficiency | one existing authoring act continues to cover companion, row owner, and host selector pressure |
| proof strength | next implementation must close `PF-03`, `PF-05`, and `PF-07` compile contracts |
| type-safety ceiling | current `void` callback is a type-carrier blocker for exact lower-result inference |

## Counter-Shapes

| counter-shape | public delta | owner / truth placement | first-read impact | generator impact | implementation sketch | proof requirement | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| public metadata object on `FormProgram` | add public metadata map or user-authored type parameter | user becomes metadata truth owner | heavy; leaks internal declaration facts | agents must maintain second type truth | `FormProgram<Id,TValues,TDecoded,TCompanionMeta>` or `.metadata` object | single truth and authority proof | rejected |
| functional declaration builder returning metadata | change existing define callback into a return-carrying type channel | Form authoring remains owner if folded into `Form.make` | possible callback-shape cost | stable if inferred automatically | declaration accumulator returns phantom metadata while runtime payload stays unchanged | authority writeback plus compile proof | allowed only as authority-writeback candidate |
| public typed descriptor family | add `Form.Selector.*` or typed descriptor namespace | selector family owns result type | explicit but expands route choices | agents choose among more selector routes | generic descriptor brand consumed by host | no second interpreter proof | rejected for now |
| public `Form.Path` / schema path builder | add path value object or builder | path legality moves to public noun | explicit but adds lifecycle | agents learn builder and lowering | path object lowers to string / descriptor | concept admission and path proof | rejected for now |
| typed companion declaration helper | add helper outside `field(path).companion` | risks split authoring owner | local clarity but extra route | agents choose helper vs canonical field route | helper wraps companion declaration | route equivalence proof | rejected unless folded into existing owner |
| manual generic annotations | no new noun, user supplies result type | user becomes type truth owner | terse but unsound | invalid paths and stale types generate easily | `Form.Companion.field<T>(path)` | cannot prove path legality | rejected |
| second React/Form hook family | add `useCompanion` or `useFormSelector` | host read owner splits | locally convenient | import and route branching | hook wraps `useSelector` | wrapper equivalence proof | rejected |

## Status Quo Burden

| burden | result |
| --- | --- |
| readable combined proof | satisfied for runtime behavior |
| agent generation stability | partial; `unknown` result remains unstable for typed consumers |
| no hidden second read route | satisfied only if next implementation keeps `useSelector` as the sole host gate |
| no hidden metadata truth | not satisfied by public metadata object or manual generic route |
| proof coverage | partial at review time; fieldValue was green and companion exact result was red before `TASK-009`; `TASK-009` later closed the returned-carrier path while leaving imperative `void` callback honest-unknown |
| no public concept | satisfied for this review; all new public concepts remain not admitted |

Conclusion: status quo runtime shape stays usable, but status quo type precision is not proven. Exact companion inference needs authority writeback before implementation continues.

## Accepted

- Exact companion lower-result inference needs authority writeback before implementation continues.
- Preferred carrier is type-only and owner-local.
- Runtime descriptor payload may stay unchanged.
- `Form.Companion.field/byRowId` remain the public read primitives.
- `useSelector` remains the only host gate.
- `fieldValue` precedent holds: existing slots may receive stronger type signatures when no new public noun is introduced.

## Rejected

- public `Form.Path` / schema path builder
- public metadata object on `FormProgram`
- public typed descriptor family
- second React/Form hook family
- manual generic annotations as terminal type-safety answer
- React-side Form DSL interpreter
- public row owner token, nested remap coordinate, or cleanup token

## Authority Writeback Request

| target | required writeback |
| --- | --- |
| `docs/ssot/form/13-exact-surface-contract.md` | landed: exact companion lower-result inference may continue only through a sound Form-owned type-only metadata carrier; current `void` callback is not enough |
| `docs/ssot/runtime/10-react-host-projection-boundary.md` | landed: React host consumes companion result metadata only through typed descriptors and must not interpret Form declarations |
| `docs/ssot/runtime/13-selector-type-safety-ceiling-matrix.md` | landed and later consumed: companion exact result is green for returned-carrier declarations after `TASK-009`; terminal `unknown` is rejected only as a claim for that path |
| `docs/next/logix-api-planning/api-implementation-gap-ledger.md` | landed and later consumed: next route is optional docs/examples teaching follow-up or watch-only |
| `docs/next/logix-api-planning/surface-candidate-registry.md` | keep no new row; add review note that public path / metadata / descriptor concepts remain not admitted |

## Implementation Gate After Writeback

Implementation may resume only if the next implementation scope can satisfy all of these:

- no new runtime public noun
- no public metadata object
- no second host gate
- no React-side declaration interpreter
- no manual generic truth
- compile contracts for `Form.Companion.field(path)` and `Form.Companion.byRowId(listPath,rowId,fieldPath)` exact lower-result inference
- invalid literal paths reject where typed path information exists
- widened string degrades honestly
- `PF-03`, `PF-05`, and `PF-07` remain green

If these cannot be met, the next decision is `reopen-frozen-shape` or concept admission for the smallest failing concept.

## Control-Plane Delta

| target | delta |
| --- | --- |
| [run-state.md](./run-state.md) | consumed by `TASK-009` partial close; active phase is now paused with optional returned-carrier teaching follow-up |
| [api-implementation-gap-ledger.md](./api-implementation-gap-ledger.md) | `Form.Companion.*` records returned-carrier exact typing as green and imperative `void` callback as honest-unknown |
| [surface-candidate-registry.md](./surface-candidate-registry.md) | no new candidate; rejected/not-admitted selector concepts stay rejected |
| [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md) | `TASK-009` companion metadata carrier is done-partial-accepted |
| [shape-snapshot.md](./shape-snapshot.md) | companion runtime route remains frozen; returned-carrier exact companion result typing is green and `void` callback remains honest-unknown |

## Current Sentence

`AUTH-REVIEW-companion-metadata-carrier` concludes `authority-writeback-consumed`. `fieldValue` typed path remains closed; `TASK-009` later closed returned-carrier `Form.Companion.field/byRowId` lower-result inference. Exact inference still cannot soundly close from the current imperative `void` callback alone. No public path, metadata object, descriptor family, hook family, or row owner token is admitted. Next cursor is optional returned-carrier docs/examples teaching follow-up. `TASK-003` remains deferred.
