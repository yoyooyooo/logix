---
title: CAP-PRESS-005 Verification Scenario Report Pressure Packet
status: no-change-proven-current-matrix
version: 2
---

# CAP-PRESS-005 Verification Scenario Report Pressure Packet

## Meta

| field | value |
| --- | --- |
| pressure_id | `CAP-PRESS-005` |
| status | `no-change-proven-current-matrix` |
| owner | `coordination-main-agent` |
| target_atoms | `VOB-01`, `VOB-03`, `CAP-15`, `CAP-17`, `CAP-18`, `CAP-23`, overlay `CAP-25`, adjacent blocked `VOB-02` |
| related_projections | `PROJ-07`, supporting `PROJ-06`, `PROJ-05`, `PROJ-04` |
| related_collisions | `COL-05`, `COL-07` remain closed for current matrix |
| source_reviews | `Kant planning slice`, `Parfit adversarial review` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-D`, `SC-E`, `SC-F` as local proof samples only |
| target_caps | `VOB-01`, `VOB-03`, `CAP-15`, `CAP-17`, `CAP-18`, `CAP-23`, overlay `CAP-25`, adjacent blocked `VOB-02` |
| related_projections | `PROJ-07 verification control lane`, `PROJ-06 host selector gate lane`, `PROJ-05 row identity operation lane`, `PROJ-04 final constraint / settlement lane` |
| related_collisions | `COL-05 diagnostics/report split`, `COL-07 compare correctness split` |
| required_proofs | `PF-08`; `PF-09` only for compare admissibility boundary; supporting `PF-04`, `PF-06`, `PF-07` when final truth, row owner, or host route is touched |
| coverage_kernel | `single truth`, `verification boundary`, `evidence boundary`, `adversarial-pressure-required`, `surface-candidate-ledger`, `verification-artifact-lifecycle-required` |
| decision_policy | P0 laws, concept-count, public-surface, generator efficiency, proof-strength, type-safety ceiling, future-headroom, first-read clarity, Agent generation stability |
| non_claims | no `TASK-003`, no public scenario carrier productization, no full expectation language freeze, no second report object, no raw evidence default compare surface, no verification-artifact vocabulary promotion |
| generator_hypothesis | `fixtures/env + steps + expect`, `VerificationControlPlaneReport`, artifact-backed linking, and one evidence envelope cover scenario/report pressure without public scenario or report concept expansion |

## Pressure Mode

| field | value |
| --- | --- |
| pressure_mode | `adversarial` |
| capability_bundle | scenario trial carrier + report materializer + reason slot identity + evidence causal link + row owner overlay + selector/report read route |
| cross_pressure_axes | verification control plane, evidence envelope, report materializer, final truth/reason, row owner, host selector |
| current_shape_under_attack | `runtime.check / runtime.trial / runtime.compare`, `fixtures/env + steps + expect`, `VerificationControlPlaneReport`, artifact-backed linking, no public scenario carrier, no second report object, no raw evidence default compare surface, no root compare productization |

## Current Shape Under Attack

The attacked frozen shape is:

```ts
runtime.check
runtime.trial(mode: "startup")
runtime.trial(mode: "scenario")
runtime.compare

{
  fixtures: {
    env: ...
  },
  steps: [...],
  expect: [...],
}

type VerificationControlPlaneReport = {
  kind: "VerificationControlPlaneReport"
  stage: unknown
  mode: "static" | "startup" | "scenario" | "compare"
  verdict: "PASS" | "FAIL" | "INCONCLUSIVE"
  summary: unknown
  artifacts: ReadonlyArray<unknown>
  repairHints: ReadonlyArray<unknown>
  nextRecommendedStage?: unknown
}
```

The pressure question is whether scenario trial, report materialization, final reason linkage, row owner linkage, and compare admissibility can stay on the verification control plane without adding public scenario vocabulary, a second report object, a second evidence envelope, public receipt coordinates, or root compare productization.

## Adversarial Proof Samples

| proof sample | local scenario | pressure | expected failure mode |
| --- | --- | --- | --- |
| `CP5-W1 source-companion-trial-link` | `SC-C` | source receipt drives companion candidates, then scenario trial exports report artifacts | report needs public `sourceReceiptRef / keyHashRef / bundlePatchPath` to explain the chain |
| `CP5-W2 rule-submit-report-focus` | `SC-D` | companion soft fact participates in cross-row final rule, submit fails, report localizes reason | `focusRef.reasonSlotId` plus `artifacts[]` is insufficient, forcing second report object or public reason object |
| `CP5-W3 row-reorder-reason-retention` | `SC-E` | row reorder leaves cleanup / stale reason visible to trial feed and host selector | report needs public row owner truth or second host read route |
| `CP5-W4 nested-owner-report-link` | `SC-E` | nested owner remap after outer row change needs report explanation | scenario carrier exposes parent-row proof protocol or report expands owner coordinates |
| `CP5-W5 host-selector-report-parity` | `SC-F` | `Form.Error.field`, `Form.Companion.*`, trial report and repair hints explain the same reason/evidence | UI, Agent, trial and report require different reason objects, reopening `COL-05` |
| `CP5-W6 expectation-summary-temptation` | `SC-F` | `expect` tries to summarize evidence events into compare-ready PASS/FAIL output | expectation evaluator writes `EvidencePackage.summary` or owns compare truth |
| `CP5-W7 compare-admissibility-backflow` | `SC-F` | `PF-09` digest is treated as correctness or perf authority | raw evidence, artifact digest or benchmark result enters the default compare surface, reopening `COL-07` or implying `TASK-003` |

No new `SC-*` is introduced. These proof samples derive from the existing matrix and only combine existing proof lanes.

## Existing Evidence Inventory

| evidence | current state | implication |
| --- | --- | --- |
| `runtime/09` verification authority | `living authority` | scenario carrier feed writes internal producer feed only; `expect` reads events and does not write summary; report shell stays canonical |
| `RISK-06` verification pressure | `proof-refreshed` | retained harness stays proof substrate; no public scenario carrier, second report object, raw evidence compare, or root compare productization |
| `PF-08` evidence exactness packet | `executed-partial` then consumed by later closure | one report shell, report artifacts, reason links, row cleanup and companion selector proof cover current evidence floor |
| `SURF-002` promotion readiness | `authority-linked` | scenario carrier evidence boundary is owned by `runtime/09`, with verification artifact vocabulary below authority |
| `PF-09` promotion readiness | `closed-for-admissibility-scope` | compare/perf can consume scenario evidence digests while `correctnessVerdict="not-owned"` |
| `TASK-006` verification fixture demotion | `done` | artifact-local helpers were moved out of production internals and retained as test fixtures/support |
| `CAP-PRESS-003-FU1` | `closed-implementation-proof` | row owner and nested owner report pressure can reuse the real-runtime row owner proof sample without adding public row owner |

## Expected Failure Modes

| failure | consequence |
| --- | --- |
| public scenario carrier required | `VOB-01` would require a new public proof protocol or scenario asset lifecycle |
| second report object required | `COL-05` reopens because `VerificationControlPlaneReport` cannot materialize current matrix evidence |
| raw evidence default compare required | `COL-07` reopens because compare starts owning correctness truth or unstable trace shape |
| public receipt coordinate expansion required | `runtime/09` focus boundary reopens because domain receipt ids leak into public report focus |
| expectation evaluator owns summary | verification and compare truth split because `expect` writes evidence summary or compare verdict |
| root compare productization implied | `TASK-003` would be started without explicit authority intake, which this packet forbids |

## Forced Counter-Shapes

| counter-shape | public surface delta | owner/truth placement | first-read impact | Agent generation impact | implementation sketch | proof requirement | concept-count delta | decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| public scenario carrier / proof protocol | add public `ScenarioPlan` or scenario asset protocol | scenario proof owner moves from runtime internal compiled plan to public protocol | scenario writing becomes more explicit while control-plane / authoring boundary blurs | Agent must learn a second scenario asset lifecycle and know when it becomes business logic | promote `ScenarioCompiledPlan + ScenarioRunSession` or fixture adapter facade | `PF-08`, verification artifact lifecycle review, `runtime/09` authority writeback | `+1` to `+2` | rejected for current matrix; `fixtures/env + steps + expect` plus retained harness is enough |
| second report object / materializer | add `ScenarioReport`, stage-specific report, rows/issues/materializations, or second explain object | report truth splits from `VerificationControlPlaneReport` | local report looks direct while global report model fragments | Agent must choose report family and merge repair hints | materialize domain payload beside canonical report shell | `PF-08`, reopen `COL-05`, report contract proof | `+1` | rejected; artifact-backed linking covers current proof samples |
| raw evidence / default compare surface | make raw evidence or trace the default compare protocol | compare reads evidence internals as truth | debug data is richer but default read surface becomes heavy and unstable | Agent may compare non-stable trace fields and infer false diffs | feed raw events or traces into compare main axis | `PF-09`, compare stability proof, raw evidence law | `+1` protocol role | rejected; `runtime/09` keeps raw evidence as drilldown material |
| public reason/evidence receipt coordinate expansion | expose `sourceReceiptRef`, `keyHashRef`, `bundlePatchRef`, `ownerRef`, or row chain ids in public `focusRef` or selectors | domain receipt coordinates become public explanation surface | more precise local pointers, but public coordinate taxonomy expands | Agent must generate and preserve domain-specific opaque refs | extend `focusRef`, selector descriptors, or report payload | `PF-08`; `PF-04 / PF-06` when final or row truth is touched | `+1` to many keys | rejected; `focusRef + artifacts[] + relatedArtifactOutputKeys` is the accepted linking law |
| expectation language / compare truth owner | promote `expect` evaluator to summary, diff, or verdict owner | expectation owns compare-ready truth | scenario tests look declarative while truth ownership splits | Agent confuses scenario assertion with correctness authority | evaluator writes `EvidencePackage.summary` or compare verdict | `PF-08`, `PF-09`, reopen `COL-07` | `+1` language role | rejected; violates evidence and compare boundaries |
| root compare productization | productize root `Runtime.compare` beyond frozen control-plane stage | compare becomes public product route and possible authority owner | product story becomes clearer while current scope expands | Agent starts treating compare as default correctness/perf owner | implement public compare route, benchmark policy and digest owner | explicit `TASK-003` authority intake only | unknown, likely `+1` | blocked; this packet cannot start `TASK-003` |

## Status Quo Burden

Status: satisfied for current matrix.

- Readability burden is met: verification authoring stays `fixtures/env + steps + expect`, execution stays `runtime.trial(mode="scenario")`, report stays `VerificationControlPlaneReport`.
- Agent generation burden is met: the stable route is one structured scenario input, one report shell, one artifact-backed linking law, and existing host selectors.
- No hidden second truth burden is met: scenario carrier feed records events only, expectation evaluator does not write summary, compare admissibility says `correctnessVerdict="not-owned"`.
- Combined proof burden is met by `PF-08` and `PF-09`, with `PF-04`, `PF-06`, `PF-07` supporting final truth, row owner, and host selector overlays when touched.
- Verification artifact lifecycle burden is met: `TASK-006` demoted artifact-local helpers to test fixtures and kept retained harness vocabulary below public authority.
- Registry and authority burden is met: `SURF-002` remains authority-linked to `runtime/09`; no new public concept passes concept admission.

## Implementation Proof Boundary

Decision: no new implementation proof is required for this packet.

| field | value |
| --- | --- |
| proof_status | `not-required` |
| basis | `runtime/09`, `RISK-06`, `PF-08`, `SURF-002`, `PF-09`, `TASK-006`, and global closure records decide the pressure without new executable work |
| trigger_if_reopened | report cannot link through `artifacts[] + focusRef`, expectation evaluator must write evidence summary, nested row report needs public owner coordinates, or compare cannot remain admissibility-only |
| allowed_scope_if_triggered | internal/test-backed/artifact-local only |
| lifecycle_requirement | keep, generalize, demote, or delete before any proof uses the artifact |

## Concept Admission Gate

No new public concept is admitted.

| gate | result |
| --- | --- |
| frozen shape cannot express the capability bundle | false for current matrix |
| authoring/report route is materially worse for first-read clarity or Agent generation | false for current matrix |
| internal route needs hidden second truth or persistent special substrate | false after `TASK-006` demotion and retained harness cleanup |
| same gap recurs across pressure slices without closure | false; `RISK-06`, `SURF-002`, `PF-09`, and `TASK-006` close the current evidence chain |
| new concept replaces multiple local patches and lowers total concept count | not proven |

## Decision

Current decision: `no-change-proven-current-matrix`.

Frozen public API shape remains unchanged.

Reason:

- `fixtures/env + steps + expect` and `runtime.trial(mode="scenario")` cover scenario trial carrier pressure for current matrix scope.
- `VerificationControlPlaneReport` plus artifact-backed linking covers report materialization without a second report object.
- The canonical evidence envelope carries reason and report linkage without exposing domain receipt coordinates in public focus fields.
- `PF-09` is limited to compare/perf admissibility and cannot productize root compare or own correctness truth.
- `TASK-006` already prevents artifact-local verification helpers from silently becoming production vocabulary.

## Surface Forcing Signal

Reopen public surface only if one of these becomes true:

- a current scenario cannot be expressed through `fixtures/env + steps + expect`.
- report localization cannot work through `focusRef + artifacts[] + relatedArtifactOutputKeys`.
- the report shell needs rows, issues, materializations, or a second explain object.
- expectation evaluation must write `EvidencePackage.summary` or compare verdict.
- raw evidence or raw trace becomes necessary as the default compare protocol.
- root `Runtime.compare` productization is explicitly requested through `TASK-003` authority intake.

## Internal Boundary Signal

The following signals should stay internal unless they pass concept admission:

- retained harness names need renaming or generalization.
- scenario carrier feed event shape needs compaction.
- artifact materializer payload exactness needs domain-specific tightening.
- report repair hints need more stable artifact output keys.
- compare/perf admissibility digest inputs need implementation cleanup.

## Required Follow-up

| follow-up | status | owner lane | target | output |
| --- | --- | --- | --- | --- |
| `CAP-PRESS-006` | `blocked-authority` | runtime compare | root compare productization | do not start without explicit `TASK-003` authority intake |
| `CAP-PRESS-007-FU1` | `closed-implementation-task` | host selector / type ceiling | selector type-safety ceiling, typed path, companion inference | closed host gate pressure; FU2 / TASK-009 closed `fieldValue` typed path and returned-carrier companion exact typing |
| `CAP-PRESS-007-FU2` | `closed-partial-implemented` | host selector / type chain | typed path carrier and declaration metadata type chain | `fieldValue` typed path implemented; returned-carrier companion exact typing implemented; imperative `void` callback remains honest-unknown |

## Close Predicate

`CAP-PRESS-005` closes without public API change because all are true:

- `fixtures/env + steps + expect` remains a verification input protocol and does not enter authoring surface.
- `VerificationControlPlaneReport` remains the only report shell.
- report linking stays artifact-backed and coordinate-bounded.
- scenario carrier feed does not write summary truth.
- expectation evaluator does not own compare truth.
- raw evidence remains drilldown material.
- `PF-09` remains admissibility-only.
- no forced counter-shape passes concept admission.
- `TASK-003` stays deferred.

## Non-claims

- no public scenario carrier / proof protocol
- no full step language freeze
- no full expectation language freeze
- no second report object
- no public receipt coordinate expansion
- no raw evidence default compare surface
- no root compare productization
- no `TASK-003` authority intake
- no final scenario compiler vocabulary
- no new verification artifact lifecycle item

## Current Sentence

`CAP-PRESS-005` is closed as `no-change-proven-current-matrix`. Frozen public API shape remains unchanged; verification/report pressure stays on `fixtures/env + steps + expect`, `VerificationControlPlaneReport`, artifact-backed linking, and one evidence envelope. `CAP-PRESS-007-FU1` and `CAP-PRESS-007-FU2` have since closed as implementation/type tasks; `TASK-009` closed `fieldValue` typed path and returned-carrier companion exact typing, while imperative `void` callback remains honest-unknown. `TASK-003` remains deferred and the next default cursor is paused / optional returned-carrier teaching follow-up.
