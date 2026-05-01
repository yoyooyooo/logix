---
title: TASK-008 Final Truth Settlement Reason Proof Scope
status: done
version: 4
---

# TASK-008 Final Truth Settlement Reason Proof Scope

## Meta

| field | value |
| --- | --- |
| task_id | `TASK-008` |
| status | `done-current-matrix` |
| owner_lane | final truth / settlement / reason |
| source_packet | [cap-press-002-final-truth-settlement-reason-pressure-packet.md](./cap-press-002-final-truth-settlement-reason-pressure-packet.md) |
| target_caps | `CAP-03`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` |
| proof_gates | `PF-04`, `PF-08` |

## Objective

Prove that the frozen public surface can survive adversarial final truth / settlement / reason pressure without adding public `Settlement`, public `Reason`, public `SubmitAttempt`, a second evidence envelope, or a second report object.

## First Proof Wave

| axis | implementation target | proof target |
| --- | --- | --- |
| submit generation | capture internal submit attempt seq at submit start and drop stale async completion | slow older invalid submit cannot overwrite newer valid submit |
| field rule stale drop | field-level effectful rule writes only if the input value is still current for the same attempt | stale async field rule cannot write old error after user changes the field |
| warning law | warning leaves are canonical advisory leaves but do not count as blocking errors | warning does not set `blockingBasis="error"` |
| source pending explain | loading source snapshot may carry submitImpact and `Form.Error.field(path)` reads it path-sensitively | observe source does not become block because another path is blocking |
| export boundary | root export remains free of value-level public settlement / reason / submit nouns | no `Settlement`, `Reason`, or `SubmitAttempt` root value export |

## First Proof Wave Result

| field | value |
| --- | --- |
| status | `landed-partial` |
| implementation | internal submit attempt seq is captured at submit start; stale submit completion is dropped before error / submitAttempt / hook / isSubmitting writeback; field-level effectful rule writes only if the input is still current; warning leaves are non-blocking; source loading snapshots may carry internal `submitImpact`; `Form.Error.field(path)` reads source `submitImpact` path-sensitively |
| tests | `Form.EffectfulRule.Submit.test.ts`, `Form.ErrorCarrier.Canonical.test.ts`, `useSelector.formErrorDescriptor.test.tsx` |
| typecheck | `packages/logix-form`, `packages/logix-react`, `packages/logix-core` passed |
| public_surface | unchanged |
| does_not_prove | list.item full return normalization, root/list stale settlement identity, CAP-15 multi-error causal backlink, rule fail channel, export boundary test |

## Deferred Within TASK-008

| axis | reason |
| --- | --- |
| none | all first-wave, second-wave, causal-link, and fail-channel axes closed for current matrix |

## Second Proof Wave Result

| field | value |
| --- | --- |
| status | `landed-partial` |
| implementation | list.item rule result normalization maps direct leaf to `$item`, field patch to field leaves, existing `$item` patch to row-level item leaf, and empty patch to no write; list-level stale completion checks current list identity before writeback; root-level stale completion is covered by field-level `$root` current-input guard; root export boundary rejects value-level `Settlement`, `Reason`, and `SubmitAttempt` |
| tests | `Form.EffectfulListItemRule.Submit.test.ts`, `Form.EffectfulListRule.Submit.test.ts`, `Form.EffectfulRootRule.Submit.test.ts`, `Form.Handle.ExactSurface.test.ts` |
| typecheck | `packages/logix-form`, `packages/logix-react`, `packages/logix-core` passed |
| public_surface | unchanged |
| does_not_prove | CAP-15 multi-error causal backlink, rule fail channel |

## Final Proof Result

| field | value |
| --- | --- |
| status | `closed-current-matrix` |
| CAP-15 causal backlink | multi-error scenario submit link fixture emits separate reason-link rows for distinct row / field owner refs under the same submit reasonSlotId, without writing report summary truth |
| rule fail channel | `Effect.fail` stays in the submit Effect error channel; it does not create canonical rule error truth, does not write submitAttempt verdict, and clears isSubmitting through the internal generation guard |
| tests | `Form.EffectfulRule.Submit.test.ts`, `VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts` |
| typecheck | `packages/logix-form`, `packages/logix-core` passed |
| public_surface | unchanged |

## Public Surface Budget

- No public `Settlement`.
- No public `Reason`.
- No public `SubmitAttempt`.
- No new public source read helper.
- No second evidence envelope.
- No second report object.

## Close Predicate For First Wave

- Targeted tests pass for submit generation, stale field rule drop, warning law, and path-sensitive source pending explanation.
- Form exact surface records warning as non-blocking advisory severity.
- `api-implementation-gap-ledger.md` moves the first-wave axes out of generic gap prose.
- `run-state.md` points to the remaining `TASK-008` second-wave axes before stopping.

Status: `met`.

## Current Sentence

`TASK-008` is closed for the current matrix. Final truth / settlement / reason pressure did not force a public settlement, reason, or submit noun.
