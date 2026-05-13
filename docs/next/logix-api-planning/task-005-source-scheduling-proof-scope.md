---
title: TASK-005 Source Scheduling Proof Scope
status: frozen
version: 2
---

# TASK-005 Source Scheduling Proof Scope

## 目标

关闭 `RISK-02 / R02-S2` 的最小实现缺口：`field(path).source(...)` 已公开 `debounceMs` 与 `concurrency`，实现必须在不新增 public source API 的前提下按同一 source lane 调度。

本页不承担 authority，不冻结 exact surface，不把 `IE-02` 宣称为 complete。

## Source

- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [risk-02-source-freshness-pressure-packet.md](./risk-02-source-freshness-pressure-packet.md)
- [task-001-source-receipt-freshness-scope.md](./task-001-source-receipt-freshness-scope.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)

## Scope

| field | value |
| --- | --- |
| task_id | `TASK-005` |
| status | `done` |
| execution_topology | `multi-agent-assisted` |
| owner_lane | source / scheduling |
| target_caps | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-09` |
| target_enabler | `IE-02` |
| source_packet | `RISK-02` |
| proof_gate | `PF-02` |
| public_surface_budget | no new public concept |

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-core/src/internal/field-runtime/index.ts` | `makeSourceWiring.refreshOnKeyChange` now honors per-source `debounceMs` before triggering `bound.fields.source.refresh(fieldPath)` |
| `packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts` | added public `field(path).source(...)` proof for `concurrency: "switch"` plus `debounceMs` under rapid key changes |
| `examples/logix-react/test/frozen-api-shape.contract.test.ts` | added cross-package frozen API shape conformance gate for currently implemented public surface and rejected wrapper routes |

## Result

| item | result |
| --- | --- |
| `R02-S2` | `passed-for-switch-debounce` |
| `CAP-PRESS-001-FU3` | `passed-for-exhaust-trailing-debounce-block-submit` |
| public source API | unchanged |
| source final truth ownership | unchanged, still not owner |
| `IE-02` | remains `partial` because full remote source variant completion is still not claimed |

## Validation

Ran:

```bash
pnpm vitest run examples/logix-react/test/frozen-api-shape.contract.test.ts
pnpm vitest run examples/logix-react/test/frozen-api-shape.contract.test.ts packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-form typecheck
pnpm -C examples/logix-react typecheck
```

Result:

- frozen shape conformance gate: `4` tests passed
- source scheduling targeted gate: `3` files, `9` tests passed at original close; later `CAP-PRESS-001-FU3` refreshed `Form.Source.StaleSubmitSnapshot.test.ts` to `5` passing tests for exhaust-trailing / debounce / block submit |
- full source lane gate: `7` files, `14` tests passed
- `packages/logix-core` typecheck passed
- `packages/logix-form` typecheck passed
- `examples/logix-react` typecheck passed

## Non-claims

- no `Form.Source`
- no `useFieldSource`
- no manual refresh helper
- no public `SourceReceipt` promotion
- no source-owned final truth
- no second evidence envelope
- no root compare productization
- no complete claim for every remote source variant

## Reopen Bar

Reopen source scheduling only if:

- `exhaust-trailing` with debounced rapid key change fails current matrix scenarios
- source scheduling requires a public helper beyond `field(path).source(...)`
- source receipt linkage cannot be preserved under debounced refresh
- implementation proves `deps / key` cannot remain the sole scheduling basis

## 当前一句话结论

`TASK-005` closes the current `R02-S2` switch/debounce scheduling gap, and `CAP-PRESS-001-FU3` later closes the exhaust-trailing / debounce / block-submit proof without changing public API. `IE-02` remains partial for broader remote source variants.
