---
title: CAP-PRESS-004 Companion Soft Fact Boundary Pressure Packet
status: no-change-proven-current-matrix
version: 2
---

# CAP-PRESS-004 Companion Soft Fact Boundary Pressure Packet

## Meta

| field | value |
| --- | --- |
| pressure_id | `CAP-PRESS-004` |
| status | `no-change-proven-current-matrix` |
| owner | `coordination-main-agent` |
| target_atoms | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13`, overlay `CAP-14`, `CAP-19`, `CAP-20`, `CAP-21`, `CAP-22`, `CAP-23`, `CAP-25` |
| related_projections | `PROJ-03`, `PROJ-04`, `PROJ-05`, `PROJ-06` |
| related_collisions | `COL-01`, `COL-02`, `COL-03`, `COL-04`, `COL-06`, `COL-08` remain closed for current matrix |
| source_reviews | `Boyle planning slice`, `Beauvoir adversarial review` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-D`, `SC-E`, `SC-F` as local proof samples only |
| target_caps | `CAP-10`, `CAP-11`, `CAP-12`, `CAP-13`, overlay `CAP-14`, `CAP-19..CAP-23`, `CAP-25` |
| related_projections | `PROJ-03 field-local soft fact lane`, `PROJ-04 final constraint / settlement lane`, `PROJ-05 row identity operation lane`, `PROJ-06 host selector gate lane` |
| related_collisions | `COL-01 source/local split`, `COL-02 companion/final truth split`, `COL-03 list/root companion pressure`, `COL-04 row-owner selector pressure`, `COL-06 candidates/source options split`, `COL-08 spelling challenger split` |
| required_proofs | `PF-03`, `PF-04`, `PF-05`, `PF-06`, `PF-07`; `PF-08` only if a later packet claims report/feed linkage |
| coverage_kernel | `one-owner-per-atom`, `minimal-generator-first`, `adversarial-pressure-required`, `surface-candidate-ledger`, `artifact-local-until-promoted`, `verification-artifact-lifecycle-required` |
| decision_policy | P0 laws, concept-count, public-surface, generator efficiency, proof-strength, type-safety ceiling, future-headroom, first-read clarity, Agent generation stability |
| non_claims | no exact spelling freeze, no helper placement freeze, no new scenario id, no root compare productization, no public verification-artifact vocabulary |
| generator_hypothesis | one field-local soft fact act plus sanctioned `Form.Companion.*` selector primitives cover local derivation, availability, candidates, row owner read and host gate pressure without adding a generic fact lane |

## Pressure Mode

| field | value |
| --- | --- |
| pressure_mode | `adversarial` |
| capability_bundle | local companion derivation + availability soft fact + candidate set soft fact + selector admissibility + final truth overlay + row owner overlay + selector host route |
| cross_pressure_axes | companion soft fact owner, source boundary, rule/submit final truth, row active-shape owner, host selector read route |
| current_shape_under_attack | `field(path).companion({ deps, lower })`, `Form.Companion.field(path)`, `Form.Companion.byRowId(listPath, rowId, fieldPath)`, no list/root companion, no companion final truth owner, no second companion read family |

## Current Shape Under Attack

The attacked frozen shape is:

```ts
$.field(path).source({
  resource,
  deps,
  key,
  submitImpact,
})

$.field(path).companion({
  deps,
  lower(ctx) {
    return {
      availability,
      candidates,
    }
  },
})

$.field(path).rule(rule)
$.list(path, spec)
$.submit(config?)

useSelector(handle, Form.Companion.field(path))
useSelector(handle, Form.Companion.byRowId(listPath, rowId, fieldPath))
```

The pressure question is whether companion can stay a field-owned local soft fact generator while source owns remote fact ingress, rule/submit own final truth, active-shape owns row identity, and React host reads stay behind the single selector gate.

## Adversarial Proof Samples

| proof sample | local scenario | pressure | expected failure mode |
| --- | --- | --- | --- |
| `CP4-W1 source-backed candidates` | `SC-C` | source receipt plus local deps shape candidates | companion becomes remote options API, or source absorbs local candidate shaping |
| `CP4-W2 availability under submit perception` | `SC-D` | availability marks a field hidden or disabled while submit still needs final rule truth | companion becomes final validity or submit blocking owner |
| `CP4-W3 row reorder companion read` | `SC-E` | reorder a roster and read the same row field companion by row id | field-local owner binding fails and list/root companion becomes necessary |
| `CP4-W4 nested row ambiguity` | `SC-E` | nested rows contain duplicate row ids under the same list path | selector chooses an arbitrary parent owner or requires a public parent-row token |
| `CP4-W5 host read composition` | `SC-F` | `Form.Error.field` and `Form.Companion.*` are read in the same React host | host grows `useCompanion`, a Form-owned hook family, or a second read law |
| `CP4-W6 rule observes soft fact pressure` | `SC-D` | final rule logic is tempted to read companion output | rule depends on raw companion landing path or companion evidence becomes final truth |

No new `SC-*` is introduced. These are local proof samples derived from the existing scenario matrix.

## Existing Evidence Inventory

| evidence | current state | implication |
| --- | --- | --- |
| `RISK-01` companion pressure | `proof-refreshed` | hidden availability and empty candidates do not block submit, write canonical error, or create companion final truth |
| `PROP-001` and `PROJ-03` freeze | `implementation-ready / frozen` | field-local soft fact lane remains the minimal generator for `CAP-10..CAP-13` |
| `COL-03` row-heavy follow-up | `completed` | list/root companion remains rejected unless an irreducible roster-owned soft fact appears |
| `CAP-PRESS-003-FU1` | `closed-implementation-proof` | row companion read/write/nested/cleanup/host symmetry works through real runtime and host gate |
| `13` exact contract | `living authority` | `Form.Companion` is a data-support selector primitive family, not a truth owner or third route |
| `runtime/10` host law | `living authority` | companion reads are consumed only through `useSelector(handle, Form.Companion.*)` |
| `CAP-PRESS-007-FU1/FU2` | `closed type-ceiling follow-up` | `fieldValue` typed path and returned-carrier companion selector exact inference closed through `TASK-009`; imperative `void` callback remains honest-unknown and does not reopen this boundary packet |

## Expected Failure Modes

| failure | consequence |
| --- | --- |
| source/options merge | `COL-01` or `COL-06` reopens because candidates need remote IO or source-owned option shaping |
| companion final truth | `COL-02` reopens because availability/candidates become blocking validity or submit verdict |
| irreducible roster soft fact | `COL-03` reopens and list/root companion becomes a live counter-shape |
| selector gate escape | `COL-04` or host law reopens because `Form.Companion.*` needs raw internal path or a second host read family |
| generic fact namespace | `COL-08` reopens because companion spelling becomes too narrow for the same local soft fact bundle |
| type-ceiling blocker | stays with `CAP-PRESS-007-FU2` / `TASK-009`; only reopens this packet if type safety requires a second descriptor interpreter or second authority page |

## Forced Counter-Shapes

| counter-shape | public surface delta | owner/truth placement | first-read impact | Agent generation impact | implementation sketch | proof requirement | concept-count delta | decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| list/root companion | add `$.list(path).companion(...)`, `$.root(...).companion(...)`, or `Form.Companion.list(...)` | soft fact owner moves from field to list/root | may make roster facts look direct, but weakens field-local owner clarity | generators must choose field/list/root companion placement and avoid duplicating facts | add roster/root companion store keyed by row owner chain | `PF-03`, `PF-05`, `PF-06`, `PF-07`; reopen `COL-03` | `+1` to `+2` | rejected for current matrix; no irreducible roster-owned soft fact appeared |
| companion final truth owner | allow companion bundle to output blocking or final verdict | final truth splits between companion and rule/submit | conflates availability with validity | generators may put business validity into `availability` | lower companion output into submit summary or canonical errors | `PF-03`, `PF-04`, `PF-07`; reopen `COL-02` | `+1` semantic role | rejected; violates final truth explainability and rule/submit ownership |
| source/options merge | let source output remote options and local candidates in one route | source absorbs local soft fact owner | shorter for remote selects, but source becomes local coordination sink | generators put local filtering and retention into source, weakening no-IO companion law | extend source receipt with option shaping and retention slots | `PF-02`, `PF-03`, `PF-07`; reopen `COL-01`, `COL-06` | `0` or `+1` | rejected; remote options remain source-owned and local candidates remain companion-owned |
| generic `Fact` or `SoftFact` namespace | add `field(path).fact(...)`, `Form.Fact.*`, or rename companion to fact | local soft fact becomes a generic fact owner | broader name looks reusable but hides boundary | generators must infer which facts are soft, final, remote, meta, or reason facts | rename companion bundle or add a generic fact descriptor family | `PF-03`, `COL-08`, spelling dominance review | `+1` or rename churn | rejected; no capability gain and weaker owner semantics |
| second companion read family | add `useCompanion`, `form.companion(path).get`, or `Form.Companion.read(...)` | host read truth forks from `useSelector` | local reads get shorter while host law fragments | generators learn an exception path for companion reads | implement Form/React subscription wrapper over the same projection | `PF-03`, `PF-07`; reopen host selector law | `+1` to `+2` | rejected; `Form.Companion.*` descriptors already satisfy sanctioned read through the single host gate |

## Status Quo Burden

Status: satisfied for current matrix.

- Readability burden is met: authoring stays `field(path).companion({ deps, lower })`; read side stays `useSelector(handle, Form.Companion.*)`.
- Agent generation burden is met: the stable rule is one write-side act, two companion read primitives, and one host gate.
- Owner honesty burden is met: source owns remote ingress, companion owns local soft facts, rule/submit own final truth, active-shape owns row identity, host owns selector consumption.
- No hidden second truth burden is met: current evidence does not require a second submit truth, second row truth, second evidence envelope, second report object, or second read route.
- Combined proof burden is met through `PF-03`, `PF-04`, `PF-05`, `PF-06`, `PF-07`, with `RISK-01` and `CAP-PRESS-003-FU1` supplying the executable pressure refreshes.
- `PF-08` is not claimed by this packet because no report/feed linkage is asserted.
- Registry and authority burden is met: `SURF-001` remains authority-linked; no new public concept passes concept admission.

## Implementation Proof Boundary

Decision: no new implementation proof is required for this packet.

| field | value |
| --- | --- |
| proof_status | `not-required` |
| basis | existing executable evidence from `RISK-01`, `PF-03`, `PF-04`, `PF-05`, `PF-06`, `PF-07`, and `CAP-PRESS-003-FU1` is sufficient for current matrix |
| trigger_if_reopened | raw companion landing path leakage, hidden second read route, repeated owner coordinate duplication, test-only bridge becoming implementation substrate, or companion selector requiring a second descriptor interpreter |
| allowed_scope_if_triggered | internal/test-backed/artifact-local only |
| lifecycle_requirement | keep, generalize, demote, or delete before any conclusion uses the artifact |

## Concept Admission Gate

No new public concept is admitted.

| gate | result |
| --- | --- |
| frozen shape cannot express the capability bundle | false for current matrix |
| authoring/read route is materially worse for first-read clarity or Agent generation | false for current matrix |
| internal route needs hidden second truth or persistent special substrate | false with current evidence |
| same gap recurs across pressure slices without closure | false; related pressure was closed by `RISK-01` and `CAP-PRESS-003-FU1`, while type ceiling remains separately routed |
| new concept replaces multiple local patches and lowers total concept count | not proven |

## Decision

Current decision: `no-change-proven-current-matrix`.

Frozen public API shape remains unchanged.

Reason:

- The current field-local companion lane covers `CAP-10..CAP-13` under source, final truth, row owner and host selector overlays.
- All forced counter-shapes increase public concepts, split owner lanes, or weaken selector gate first without satisfying concept admission.
- Existing proof refreshes cover the combined interaction without adding public row owner, list/root companion, companion-final truth, source/options merge, generic fact namespace, or second companion read route.
- Remaining selector result type inference pressure is already isolated under `CAP-PRESS-007-FU2` / `TASK-009`.

## Surface Forcing Signal

Reopen public surface only if one of these becomes true:

- field-local companion cannot express a current matrix scenario without raw internal landing path reads.
- final rules cannot stay explainable unless they directly read companion internal state.
- a truly roster-owned soft fact appears and cannot decompose into field-local companion bundles.
- source candidates need remote IO or option resource identity that cannot stay in source.
- companion reads cannot stay inside `useSelector(handle, Form.Companion.*)`.
- selector type-safety work proves the current descriptor shape needs a second descriptor interpreter or second authority page.

## Internal Boundary Signal

The following signals should stay internal unless they pass the concept admission gate:

- companion lowering needs stricter no-IO or sync-budget diagnostics.
- candidate bundle materialization needs performance budgeting.
- companion row read resolution needs owner-coordinate cleanup.
- examples need clearer teaching around soft fact versus final truth.
- future exact inference for imperative `void` callback authoring needs exact authoring-shape review before it can change the current guarantee.

## Required Follow-up

| follow-up | status | owner lane | target | output |
| --- | --- | --- | --- | --- |
| `CAP-PRESS-007-FU2` | `closed-partial-implemented` | host selector / type ceiling | declaration-driven selector result inference for `fieldValue` and `Form.Companion.*` | `fieldValue` and returned-carrier companion exact typing closed; do not reopen CAP-PRESS-004 unless a future authoring-shape goal proves a shape-level theoretical blocker |
| `CAP-PRESS-005` | `closed-current-matrix` | verification / report | scenario trial carrier and report materializer pressure | closed without public scenario/report expansion |

## Close Predicate

`CAP-PRESS-004` closes without public API change because all are true:

- `field(path).companion({ deps, lower })` remains the only companion authoring act and truth origin.
- `availability` and `candidates` remain soft facts and do not own final validity.
- remote options and source lifecycle remain in source.
- row owner pressure remains covered through field-local companion plus `Form.Companion.byRowId`.
- host reads remain behind `useSelector(handle, Form.Companion.*)`.
- no forced counter-shape passes concept admission.
- no new implementation friction experiment is required for the current matrix.

## Non-claims

- no exact spelling freeze beyond owner authority
- no helper placement freeze
- no new scenario id
- no list/root companion
- no companion final truth owner
- no source/options merge
- no generic `Fact` or `SoftFact` public namespace
- no second companion read family
- no `PF-08` report/feed linkage claim
- no `TASK-003` root compare productization
- no claim that imperative `void` callback authoring auto-collects exact `Form.Companion.*` metadata

## Current Sentence

`CAP-PRESS-004` is closed as `no-change-proven-current-matrix`. Frozen public API shape remains unchanged; companion stays a field-local soft fact lane with sanctioned selector primitives. `CAP-PRESS-007-FU2` / `TASK-009` closed `fieldValue` typed path and returned-carrier companion exact typing; imperative `void` callback remains honest-unknown. The pressure queue has no remaining non blocked slice after FU2.
