---
title: CAP-PRESS-001-FU3 Exhaust Trailing Debounce Submit Impact Proof
status: closed-implementation-proof
version: 1
---

# CAP-PRESS-001-FU3 Exhaust Trailing Debounce Submit Impact Proof

## 目标

证明 `field(path).source(...)` 在 `triggers: ["onKeyChange"]`、`concurrency: "exhaust-trailing"`、`debounceMs`、`submitImpact: "block"` 组合下，不需要新增 public source API，也能在 submit gate 前让已排队 freshness 对 submit truth 可见。

本页只记录 pressure follow-up 结论，不冻结 exact public surface。exact Form source surface 继续看 [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)。

## Slice Manifest

| field | value |
| --- | --- |
| slice_id | `CAP-PRESS-001-FU3` |
| target_scenarios | `SC-B`, supporting `SC-F` evidence pressure |
| target_atoms | `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09` |
| related_projection | `PROJ-02` |
| related_enabler | `IE-02` |
| required_proof | `PF-02` |
| decision_policy | keep source scheduling internal; only reopen public source API if scheduled freshness cannot reach submit gate |
| non_claims | no `Form.Source`, no `useFieldSource`, no public source refresh helper, no public receipt identity API, no source-owned submit truth |

## Failure Found

| area | finding |
| --- | --- |
| debounce scheduling | `onKeyChange` source refresh with `debounceMs` only scheduled an internal timer before source refresh started |
| submit gate | submit pending count only scanned current value tree for `status: "loading"` snapshots |
| failure mode | immediate submit after key change could see the source snapshot as `idle`, call `onValid`, and skip `submitImpact: "block"` |
| surface implication | failure was internal freshness visibility, not public API insufficiency |

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-core/src/internal/field-runtime/index.ts` | source wiring now keeps per-runtime pending debounce state, exposes internal `flushForSubmit`, writes a loading marker for block sources before submit, and forks source refresh through runtime internals |
| `packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts` | added internal `fields.forkSourceRefresh` hook for runtime-scoped source refresh |
| `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts` | captures the module runtime scope and uses it for source refresh fibers started by submit flush |
| `packages/logix-core/src/internal/field-kernel/source.impl.ts` | same-key loading snapshots no longer suppress the real refresh when no in-flight source task exists |
| `packages/logix-form/src/internal/form/commands.ts` | `handle.submit()` calls internal source flush before validation and pending aggregation |
| `packages/logix-form/src/internal/form/impl.ts` | Form handle receives the same internal source wiring route used by Form install |
| `packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts` | added executable proof for debounced block source freshness being visible to submit |

## Decision

`CAP-PRESS-001-FU3` closes without public API change.

Accepted:

- submit gate must flush scheduled block source freshness before counting pending leaves
- ordinary debounce behavior stays intact outside submit
- `submitImpact: "observe"` is not flushed as blocking freshness
- source remains a lifecycle contributor, not submit truth owner
- runtime-scoped internal refresh is an implementation detail

Rejected:

- adding `Form.Source`
- adding `useFieldSource`
- adding public `refreshSource` from FU3
- promoting `SourceReceipt` into public identity API
- treating scheduled source freshness as a second submit truth

## Proof

| proof | result |
| --- | --- |
| target test | `Form.Source.StaleSubmitSnapshot.test.ts` includes `flushes debounced block source before submit so scheduled freshness is visible` |
| behavior before submit | debounce window keeps source snapshot `idle`, preserving ordinary debounce semantics |
| first submit | internal flush writes current key loading marker; submit blocks with `blockingBasis: "pending"` |
| later settle | source refresh resolves to success for the submitted key |
| second submit | submit passes after source settles |

## Validation

Ran:

```bash
pnpm exec vitest run packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
pnpm -C packages/logix-form typecheck:test
pnpm -C packages/logix-core typecheck
pnpm exec vitest run packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts packages/logix-form/test/Form/Form.Source.Authoring.test.ts packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Result:

- targeted stale submit source gate: `5` tests passed
- `packages/logix-form` test typecheck passed
- `packages/logix-core` typecheck passed
- source / reason targeted gate: `3` files, `11` tests passed

## Does Not Prove

- complete `IE-02` coverage for every remote source variant

## Follow-up Routing

| follow-up | status | route |
| --- | --- | --- |
| source failure under `block / observe` | `closed-implementation-proof` | `CAP-PRESS-001-FU4` |
| receipt artifact-to-feed/report join | `closed-implementation-proof` | `CAP-PRESS-001-FU5` |
| row source disambiguation | `closed-implementation-proof` | `CAP-PRESS-001-FU6` |
| key canonicalization and same-key generation | `closed-implementation-proof` | `TASK-007` |

## 当前一句话结论

FU3 proves the current frozen source API can cover `exhaust-trailing + debounceMs + submitImpact:block` through internal submit-time freshness flush. FU4 has since closed source failure lifecycle proof, FU5 has since closed receipt artifact/feed/report join proof, FU6 has since closed row receipt disambiguation proof, and TASK-007 has since closed key canonicalization / same-key generation proof. Public source API stays unchanged.
