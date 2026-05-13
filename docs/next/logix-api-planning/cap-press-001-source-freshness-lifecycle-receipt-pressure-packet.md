---
title: CAP-PRESS-001 Source Freshness Lifecycle Receipt Pressure Packet
status: closed
version: 9
---

# CAP-PRESS-001 Source Freshness Lifecycle Receipt Pressure Packet

## 目标

用 adversarial 视角挑战当前 frozen source API：

```ts
$.field(path).source({
  resource,
  deps,
  key,
  triggers?,
  debounceMs?,
  concurrency?,
  submitImpact?,
})
```

本 packet 目标是逼出必要的新 API、exact surface adjustment、internal source identity law、evidence coordinate law 或 proof task。

本页不承担 authority，不冻结 exact spelling，不新增 public source API。

## Source

- [capability-atom-pressure-map.md](./capability-atom-pressure-map.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [risk-02-source-freshness-pressure-packet.md](./risk-02-source-freshness-pressure-packet.md)
- [task-005-source-scheduling-proof-scope.md](./task-005-source-scheduling-proof-scope.md)

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-001` |
| status | `closed-current-matrix` |
| target_scenarios | `SC-B`, `SC-C`, supporting `SC-F` evidence pressure |
| target_atoms | `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`, `CAP-18` |
| related_projection | `PROJ-02`, partial `PROJ-07` |
| related_enablers | `IE-02`, `IE-04` |
| required_proofs | `PF-02`, `PF-08` |
| related_collisions | `COL-01`, `COL-06`, `COL-07` closed; may open new source lifecycle/read collision if this packet fails |
| current_shape_under_attack | `field(path).source(...)` plus exact `triggers / debounceMs / concurrency / submitImpact / key` contract |
| decision_policy | preserve minimal generator unless proof shows source task identity cannot stay internal |
| non_claims | no `Form.Source`, no `useFieldSource`, no public receipt identity API, no source-owned final truth, no second evidence envelope |

## Subagent Inputs

| lane | result |
| --- | --- |
| public surface adversary | found strongest public pressure around `manual` trigger reachability, `key: unknown`, source lifecycle read naming, and `exhaust-trailing` proof depth |
| challenger | argued current shape hides a common `source task identity / freshness contract`; recommended internal law plus proof refresh before any public API reopening |
| evidence/control-plane | found CAP-09/CAP-18 are still narrow partial because receipt identity is artifact-backed and not directly carried as production evidence event; recommended join proof, not public API |
| implementation proof | confirmed stale key isolation, split coverage for `exhaust-trailing + submitImpact` and `switch + debounce`, source error non-pollution of canonical errors, and row-scoped artifact coordinates; flagged `manual`, combined `exhaust-trailing + debounce + submitImpact`, key rejection, source error evidence link, and row runtime disambiguation as weak |
| `CAP-PRESS-001-FU1` | closed by exact surface deletion; day-one triggers are now only `onMount / onKeyChange`; controlled manual refresh stays deferred as `handle.field(path).refreshSource()` reopen candidate |
| `CAP-PRESS-001-FU2` | closed at planning law and implementation proof level; source task identity and key canonicalization stay internal |
| `CAP-PRESS-001-FU3` | closed by implementation proof; debounced block source freshness is flushed before submit without public API change |
| `CAP-PRESS-001-FU4` | closed by implementation proof; source failure stays lifecycle/read fact and does not reopen public source API |
| `CAP-PRESS-001-FU5` | closed by implementation proof; receipt artifact can join scenario feed and report through existing artifact-backed linking law without public receipt API |
| `CAP-PRESS-001-FU6` | closed by implementation proof; row-scoped source writeback is rowId-gated under reorder/remove without public row receipt API |
| `TASK-007` | closed by implementation proof; strict source key canonicalization / deterministic rejection and generation-safe same-key writeback land without public source API |

## Adversarial Scenarios

| id | adversarial scenario | pressure target |
| --- | --- | --- |
| `S1-manual-trigger-reachability` | exact surface accepts `triggers: ["manual"]`, but frozen handle has no sanctioned source refresh action | exact surface adjustment or new controlled trigger route |
| `S2-exhaust-trailing-debounce-submit` | K1 in-flight, K2/K3 rapid changes, debounce delays trailing refresh, user submits before trailing run starts or while it is pending | source task identity, submitImpact, pending reason coordinate |
| `S3-key-canonicalization` | `key` returns object with unstable property order, Date, Map, function, cyclic object, or non-serializable value | key canonicalization law or type/runtime rejection |
| `S4-source-error-submit-impact` | source fails under `submitImpact: "block"` and `"observe"` | lifecycle read route, Form error contract, submit blocking reason |
| `S5-observe-causal-link` | submit passes while source is pending/stale under `observe`; later settle must not rewrite verdict but should remain explainable | evidence causal link and old submitAttempt stability |
| `S6-row-source-disambiguation` | two rows share same source field pattern and resource while row ids and keys differ; one row reorders/removes while source is in flight | ownerRef, canonicalRowIdChainDigest, source receipt non-crossing |
| `S7-source-receipt-feed-join` | Form artifact has `sourceReceiptRef / keyHashRef / bundlePatchPath`, scenario feed has `bundlePatchRef / reasonSlotId / ownerRef`; proof must join them mechanically | CAP-09/CAP-18 evidence boundary |
| `S8-combined-exhaust-debounce-block` | `triggers: ["onKeyChange"]`, `concurrency: "exhaust-trailing"`, `debounceMs`, `submitImpact: "block"` under rapid key changes and mid-flight submit | combined source scheduling and submitImpact proof |

## Expected Failure Modes

| failure | consequence |
| --- | --- |
| `manual` trigger has no sanctioned trigger path | exact contract must delete `manual` from day-one source triggers or open authority request for a controlled source refresh route |
| key values cannot be canonicalized or rejected deterministically | source receipt identity cannot be stable; exact key type or Query resource key law must be tightened |
| `exhaust-trailing + debounce + submitImpact` cannot produce one current pending coordinate | `submitImpact` may need stronger policy shape or internal `sourceTaskId / sourceScheduleRef` law |
| source error cannot be read or explained through existing routes | may open source lifecycle read collision: `Form.Error.field` vs reason/source selector primitive |
| row-scoped source receipts cross after reorder/remove | current canonical path + owner resolver is insufficient; row owner law or API must change |
| receipt identity cannot be joined from artifact to feed/report | CAP-09/CAP-18 remain partial and may need evidence coordinate writeback |

## Surface Forcing Signals

The following signals are strong enough to request exact surface adjustment, collision, or authority writeback:

- `triggers: "manual"` cannot be executed through any frozen runtime handle, host route, or control-plane route.
- `key` accepts values that cannot produce stable `keyHashRef`, and this cannot be solved by Query resource key law or runtime rejection.
- `submitImpact: "block" | "observe"` cannot distinguish current pending, trailing pending, stale receipt, and failed receipt while preserving submit truth ownership.
- source lifecycle must be exposed to users but cannot be expressed by `Form.Error.field(path)` or an existing selector primitive.
- nested or row-scoped source cannot derive stable receipt coordinates from canonical field path plus row owner chain.
- source receipt identity requires user-authored receipt names or public receipt identity API.

## Internal Boundary Signals

The following signals should stay internal and must not trigger new public API by themselves:

- A stable internal identity such as `sourceTaskId = formId + ownerRef + fieldPath + resourceId + keyHash + opSeq` can explain scheduling and receipt.
- A `sourceScheduleRef` can represent pending-before-receipt without surfacing a public trigger object.
- `exhaust-trailing` can be implemented as an internal state machine while keeping public `concurrency` unchanged.
- row-scoped source can be resolved by owner resolver and `canonicalRowIdChainDigest`.
- source receipt joins can be proven by artifact-backed evidence link without adding a second evidence envelope.

## Decision

Current result: `implementation-task + source internal law + proof refresh`.

Do not reopen frozen public source API yet.

Reason:

- The strongest confirmed public-surface issue is `triggers: "manual"` reachability, which may be solvable by exact surface deletion or deferred authority writeback without creating `Form.Source`.
- The strongest design issue is hidden source task identity. That should first become an internal law and proof target.
- CAP-09/CAP-18 evidence pressure was closed by FU5: artifact-backed join uses `bundlePatchPath -> bundlePatchRef`, `reasonSlotId`, `ownerRef`, and report artifact links without public receipt identity API.
- Row receipt disambiguation pressure was closed by FU6: in-flight row source settle writes back by row id after reorder and drops removed-row writes.
- Existing `RISK-02` and `TASK-005` prove current matrix path for switch/debounce and stale key isolation.
- `CAP-PRESS-001-FU3` now proves `exhaust-trailing + debounceMs + submitImpact:block` can be covered by internal submit-time freshness flush without adding public source API.

## Required Follow-up Tasks

| follow-up id | status | owner lane | target | output |
| --- | --- | --- | --- | --- |
| `CAP-PRESS-001-FU1` | `closed-delete-defer` | exact surface | `triggers: "manual"` | deleted from day-one exact/type surface; deferred controlled manual refresh route only as reopen candidate |
| `CAP-PRESS-001-FU2` | `closed-implementation-proof` | source internal law | source task identity and key canonicalization | [cap-press-001-fu2-source-task-identity-key-law.md](./cap-press-001-fu2-source-task-identity-key-law.md), [task-007-source-key-generation-proof-scope.md](./task-007-source-key-generation-proof-scope.md) |
| `CAP-PRESS-001-FU3` | `closed-implementation-proof` | source proof | `exhaust-trailing + debounce + submitImpact` | [cap-press-001-fu3-exhaust-trailing-debounce-submit-impact-proof.md](./cap-press-001-fu3-exhaust-trailing-debounce-submit-impact-proof.md) |
| `CAP-PRESS-001-FU4` | `closed-implementation-proof` | source lifecycle proof | source failure under `block / observe` | [cap-press-001-fu4-source-failure-lifecycle-proof.md](./cap-press-001-fu4-source-failure-lifecycle-proof.md) |
| `CAP-PRESS-001-FU5` | `closed-implementation-proof` | evidence proof | receipt artifact-to-feed/report join | [cap-press-001-fu5-receipt-artifact-feed-report-join-proof.md](./cap-press-001-fu5-receipt-artifact-feed-report-join-proof.md) |
| `CAP-PRESS-001-FU6` | `closed-implementation-proof` | row source proof | two-row receipt disambiguation under reorder/remove | [cap-press-001-fu6-row-receipt-disambiguation-proof.md](./cap-press-001-fu6-row-receipt-disambiguation-proof.md) |
| `TASK-007` | `done` | source identity implementation | key canonicalization and same-key generation safety | [task-007-source-key-generation-proof-scope.md](./task-007-source-key-generation-proof-scope.md) |

## Close Predicate

`CAP-PRESS-001` can close without public API change only if all are true:

- `manual` trigger is removed from exact source triggers; any future controlled source refresh route must reopen through authority writeback and must not create a second source family.
- key values are canonically hashable or rejected with deterministic diagnostics.
- `exhaust-trailing + debounce + submitImpact:block` has executable proof for scheduled pending and settled source states; failed source states continue to `FU4`.
- source failure does not create source-owned final truth and remains explainable through `Form.Error.field(path)`.
- row-scoped receipt identity cannot cross rows under reorder/remove.
- evidence can mechanically join `sourceReceiptRef / keyHashRef / bundlePatchPath` to `bundlePatchRef / reasonSlotId / ownerRef` without a second envelope.
- verification report links receipt-related evidence through `artifacts[]`, `repairHints[].focusRef`, and `relatedArtifactOutputKeys`, without leaking receipt coordinates into report shell fields.
- `IE-02` remains marked partial only for broader remote variant productization outside current matrix proof scope.

## Reopen Bar

Open a new `COL-*`, `PRIN-*`, or authority writeback if any close predicate fails.

Open frozen shape only if:

- a new public source concept is required to cover current `CAP-06..09 / CAP-18`
- source receipt identity must become a public authoring noun
- source lifecycle cannot be read or diagnosed through existing host/evidence routes
- source submit impact must own final submit truth

## Non-claims

- no `Form.Source`
- no `useFieldSource`
- no public manual refresh helper yet
- no public receipt identity API
- no source-owned final truth
- no second evidence envelope
- no root compare productization
- no complete claim for every remote source variant

## 当前一句话结论

`CAP-PRESS-001` 没有打穿 frozen source API。`FU1 / FU2 / FU3 / FU4 / FU5 / FU6` 与 `TASK-007` 已关闭；source lane 当前转为 current matrix 范围内的 `watch-only`。
