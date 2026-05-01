---
title: CAP-PRESS-001-FU4 Source Failure Lifecycle Proof
status: closed-implementation-proof
version: 1
---

# CAP-PRESS-001-FU4 Source Failure Lifecycle Proof

## 目标

证明 `field(path).source(...)` 在 `submitImpact: "block"` 与 `submitImpact: "observe"` 下都能解释 source failure lifecycle，并保持 submit truth、canonical error truth 与 read route 的 owner 边界。

本页只记录 pressure follow-up 结论，不冻结 exact public surface。exact Form source surface 继续看 [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)。

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-001-FU4` |
| target_scenarios | `SC-B`, supporting `SC-F` read/evidence pressure |
| target_atoms | `CAP-07`, `CAP-08`, `CAP-09`, `CAP-18` |
| related_projection | `PROJ-02`, partial `PROJ-07` |
| related_enabler | `IE-02` |
| required_proof | `PF-02`, `PF-07`, partial `PF-08` |
| decision_policy | keep source failure as lifecycle/read fact; do not let settled source failure own submit truth |
| non_claims | no `Form.Source`, no `useFieldSource`, no public source error helper, no public receipt identity API, no source-owned submit truth |

## Pressure Question

`S4-source-error-submit-impact` asked whether source failure under `submitImpact: "block"` and `"observe"` requires a new lifecycle read route, a new public source helper, or a different submit blocking basis.

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts` | added `block / observe` source failure proofs; settled source failure stays out of canonical errors and submit blocker truth |
| `packages/logix-react/src/FormProjection.ts` | `Form.Error.field(path)` now explains `SourceReceipt.status === "error"` through the existing selector primitive |
| `packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx` | source-backed descriptor proof now covers `pending / stale / error` |
| `packages/logix-form/src/Error.ts` | `FormFieldExplainError.subjectRef` now permits task subject refs for source failure explanations |

## Decision

`CAP-PRESS-001-FU4` closes without new public API.

Accepted:

- source failure remains a source lifecycle state on the source snapshot
- settled source failure does not write `errors[path]`
- settled source failure does not increment `$form.errorCount`
- settled source failure does not block the next submit under either `block` or `observe`
- `submitImpact: "block"` only blocks pending freshness, including submit-time flushed loading markers
- `submitImpact: "observe"` never turns source pending or failure into submit blocker truth
- `Form.Error.field(path)` is the accepted read route for source failure explanation
- source failure explanation uses the existing explain union with `kind: "error"`, `sourceRef: path`, and `subjectRef.kind: "task"`

Rejected:

- adding `Form.Source`
- adding `useFieldSource`
- adding public `sourceError` or `sourceStatus` helper
- adding a `source-error` submit blocking basis
- lowering raw source failure into `FormErrorLeaf`
- promoting `SourceReceipt` into public identity API

## Proof

| proof | result |
| --- | --- |
| `submitImpact: "observe"` source loading | submit passes while source is loading and does not count pending leaves |
| `submitImpact: "observe"` later failure | later source failure updates source snapshot but keeps the already-ok submitAttempt stable |
| `submitImpact: "block"` pending source | loading source blocks submit with `blockingBasis: "pending"` |
| `submitImpact: "block"` settled failure | settled source failure allows submit if canonical errors and decode errors are absent |
| canonical error boundary | source failure leaves `errors[path]` undefined and `$form.errorCount` unchanged |
| read route | `useSelector(handle, Form.Error.field(path))` explains source failure through the existing descriptor route |

## Validation

Ran:

```bash
pnpm exec vitest run packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
pnpm -C packages/logix-form typecheck:test
pnpm -C packages/logix-react typecheck
```

Result:

- targeted source failure / read route gate: `2` files, `8` tests passed
- `packages/logix-form` test typecheck passed
- `packages/logix-react` typecheck passed

## Does Not Prove

- complete `IE-02` coverage for every remote source variant

## Follow-up Routing

| follow-up | status | route |
| --- | --- | --- |
| receipt artifact-to-feed/report join | `closed-implementation-proof` | `CAP-PRESS-001-FU5` |
| row source disambiguation | `closed-implementation-proof` | `CAP-PRESS-001-FU6` |
| key canonicalization and same-key generation | `closed-implementation-proof` | `TASK-007` |

## 当前一句话结论

FU4 proves source failure lifecycle can stay inside the existing source snapshot, submitImpact, and `Form.Error.field(path)` read route. FU5 has since closed receipt artifact/feed/report join proof, FU6 has since closed row receipt disambiguation proof, and TASK-007 has since closed key canonicalization / same-key generation proof. Public source API stays unchanged.
