---
title: CAP-PRESS-002 Final Truth Settlement Reason Pressure Packet
status: closed-current-matrix
version: 4
---

# CAP-PRESS-002 Final Truth Settlement Reason Pressure Packet

## Meta

| field | value |
| --- | --- |
| pressure_id | `CAP-PRESS-002` |
| status | `closed-current-matrix` |
| owner | `coordination-main-agent` |
| target_atoms | `CAP-03`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` |
| related_projections | `PROJ-04`, `PROJ-07` |
| related_collisions | `COL-02`, `COL-05`, `COL-07` remain closed unless follow-up proof fails the reopen bar |
| source_reviews | `Noether planning slice`, `Hegel adversarial review` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-B`, `SC-D`, `SC-F` |
| target_caps | `CAP-03`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` |
| related_projections | `PROJ-04 final constraint / settlement lane`, `PROJ-07 evidence lane` |
| related_collisions | `COL-02 final truth owner split`, `COL-05 diagnostics/report split`, `COL-07 compare correctness split` |
| required_proofs | `PF-04`, `PF-08`, plus follow-up `TASK-008` proof pack |
| coverage_kernel | `single truth`, `final truth explainability`, `evidence boundary`, `minimal-generator-first`, `artifact-local-until-promoted` |
| decision_policy | `P0 single truth`, `P1 small public surface`, `P1 composition over noun`, `P1 minimal generator first` |
| non_claims | exact new public noun, public settlement object, public reason object, public submit builder, scenario carrier implementation vocabulary |
| generator_hypothesis | existing `rule / submit / Form.Error.field / evidence envelope` lanes should cover this slice if internal settlement and submit generation laws are made executable |

## Current Shape Under Attack

The attacked frozen shape is:

```ts
$.field(path).rule(rule, options?)
$.root(rule)
$.list(path, spec)
$.submit(config?)

form.submit(options?)

Form.Error.field(path)
runtime.trial(mode: "scenario")
runtime.compare
```

The pressure question is whether final truth, async settlement, submit snapshot and reason backlink can keep sharing the existing rule / submit / evidence lanes.

## Adversarial Scenarios

| proof sample | pressure | expected failure mode |
| --- | --- | --- |
| `W2-1 concurrent submit stale overwrite` | two submit attempts race while effectful rules await | older attempt overwrites newer `$form.submitAttempt` or reuses the wrong `submit:<seq>` |
| `W2-2 path-sensitive source pending` | block and observe sources are loading at the same time | `Form.Error.field(observePath)` reports `submitImpact: "block"` from global pending state |
| `W2-3 effectful rule settlement identity` | field / list.item / list / root async rules settle after state changes | stale rule result writes errors or submitAttempt without generation guard |
| `W2-4 warning advisory semantics` | rule/manual leaf has `severity: "warning"` | warning counts as blocking error without explicit authority law |
| `W2-5 final submit causal backlink` | one submit contains multiple row/field rule errors | scenario feed proves only co-presence, not causal binding to owner / source / attempt generation |
| `W2-6 list.item rule result shape` | list.item rule returns leaf, field patch, `$item`, or empty patch | leaf shape is misread as child-field patch or empty patch writes noisy state |

## Decision

Current decision: `no-public-api-reopen-yet`.

The pressure reviews did not produce enough evidence to add public `Settlement`, public `Reason`, public `SubmitAttempt`, a second evidence envelope, or a second report object.

The current failure surface is implementation and proof law:

- submit attempts need internal generation / attempt identity that prevents stale async completion from overwriting newer attempts.
- async rule settlement needs a stale/drop law comparable to source generation law.
- `Form.Error.field(path)` pending explanation needs path-sensitive source submitImpact evidence.
- warning / advisory leaves need an explicit blocking law or a deleted public severity branch.
- CAP-15 needs a harder causal backlink proof, not a broader public explain object.
- list.item rule return normalization needs an exact internal lowering law.

## Surface Forcing Signal

Reopen public API only if one of these is proven:

- existing `Form.Error.field(path)` cannot express pending / stale / cleanup / source failure without a second read family.
- `$form.submitAttempt` cannot remain a state coordinate and requires user-authored submit object composition.
- scenario evidence feed cannot carry causal links without exposing domain receipt fields as public API.
- rule return contract cannot be made exact with internal normalization and type contract alone.
- warning/advisory must be globally readable and actionable outside existing error / submit summary lanes.

None of these signals is proven in this packet.

## Internal Boundary Signal

The following signals are already strong enough to require follow-up proof / implementation work:

- concurrent submit has a plausible stale overwrite path.
- effectful rule completion lacks explicit generation/drop identity.
- source pending read explanation currently derives block/observe from global submitAttempt state.
- warning severity is public carrier surface, while submit blocking law is ambiguous.
- final submit linkage proof is too weakly causal for adversarial multi-error cases.
- list.item rule result lowering can confuse leaf and patch shapes.

## Proof Plan

`TASK-008` owns the next executable proof pack.

Required tests:

- concurrent submit: a slow invalid attempt must not overwrite a later fast valid attempt.
- stale effectful rule drop: rule based on old state must not write error or submitAttempt after a newer generation wins.
- rule fail channel: `Effect.fail` path must be classified as submit failure, rule error, or internal defect.
- warning blocking law: warning leaf must either not block submit or the public warning branch must be removed by authority update.
- path-sensitive source pending: observe source cannot be reported as `block` merely because another source blocks submit.
- CAP-15 multi-error backlink: multiple row / field rule errors in one submit must be separately linkable to owner / source / attempt evidence.
- list.item return normalization: leaf, field patch, `$item`, and empty patch each lower deterministically.
- export boundary: no value-level `Settlement`, `Reason`, or `SubmitAttempt` public noun leaks from root exports.

## Decision Outputs

| output | result |
| --- | --- |
| public API change | `no-change-current-packet` |
| implementation task | `TASK-008`; closed current matrix |
| collision | no new `COL-*` opened yet |
| principle candidate | candidate internal law: `settlement-generation-before-public-noun` |
| authority writeback | required only if `warning` is deleted or redefined, or if rule return exact contract changes |
| reopen frozen shape | no |

## Close Predicate

`CAP-PRESS-002` close predicate is satisfied for current matrix:

- CAP-15 causal backlink has multi-error evidence stronger than co-presence.
- rule `Effect.fail` channel is classified as submit Effect error channel, not canonical rule error truth.

Already satisfied by first wave:

- stale submit completion cannot overwrite newer submit truth.
- field-level stale rule completion cannot write old field error.
- `Form.Error.field(path)` explains source pending with path-sensitive submitImpact.
- warning severity is advisory and non-blocking.
- list.item rule return shapes have deterministic normalization tests.
- root/list stale settlement identity is proven for current implementation scope.
- root export boundary rejects public `Settlement`, `Reason`, and `SubmitAttempt` nouns.

## Progress

| proof axis | status | evidence |
| --- | --- | --- |
| concurrent submit stale overwrite | `landed-first-wave` | slow older invalid submit cannot overwrite later valid submit |
| field rule stale drop | `landed-first-wave` | field-level effectful rule checks current input before writeback |
| warning blocking law | `landed-first-wave` | warning leaf is advisory and non-blocking |
| path-sensitive source pending | `landed-first-wave` | loading source snapshot carries internal `submitImpact`; selector reads it before global fallback |
| root/list stale settlement identity | `landed-second-wave` | list/root stale completion cannot overwrite newer truth in current proof scope |
| CAP-15 multi-error causal backlink | `landed-final-wave` | multi-error submit link fixture emits distinct ownerRef rows under same submit reasonSlotId |
| rule fail channel | `landed-final-wave` | `Effect.fail` stays in submit Effect error channel and does not write canonical rule truth |
| list.item return normalization | `landed-second-wave` | direct leaf / field patch / `$item` / empty patch normalize deterministically |
| export boundary | `landed-second-wave` | no value-level `Settlement`, `Reason`, or `SubmitAttempt` root export |

## Non-claims

- This packet does not freeze new public spelling.
- This packet does not authorize a public settlement object.
- This packet does not promote scenario verification artifact vocabulary.
- This packet does not start `TASK-003`.

## Current Sentence

`CAP-PRESS-002` is closed for the current matrix. Frozen public API shape stays unchanged; no public `Settlement`, `Reason`, or `SubmitAttempt` noun is admitted.
