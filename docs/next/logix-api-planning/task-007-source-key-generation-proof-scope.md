---
title: TASK-007 Source Key Generation Proof Scope
status: frozen
version: 1
---

# TASK-007 Source Key Generation Proof Scope

## 目标

关闭 `CAP-PRESS-001-FU2` 留下的 source identity implementation residual：source key 必须可稳定 canonicalize 或被确定性拒绝，同 `keyHash` 的 forced refresh 不能让旧任务覆盖新任务。

本页不承担 authority，不冻结 exact public surface，不新增 public source API。

## Source

- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [cap-press-001-fu2-source-task-identity-key-law.md](./cap-press-001-fu2-source-task-identity-key-law.md)
- [cap-press-001-source-freshness-lifecycle-receipt-pressure-packet.md](./cap-press-001-source-freshness-lifecycle-receipt-pressure-packet.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)

## Scope

| field | value |
| --- | --- |
| task_id | `TASK-007` |
| status | `done` |
| execution_topology | `multi-agent-assisted` |
| owner_lane | source / identity |
| target_caps | `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`, `CAP-18` |
| target_enabler | `IE-02` |
| source_packets | `CAP-PRESS-001-FU2`, `CAP-PRESS-001-FU3`, `CAP-PRESS-001-FU4`, `CAP-PRESS-001-FU5`, `CAP-PRESS-001-FU6` |
| proof_gates | `PF-02`, `PF-08` |
| public_surface_budget | no new public concept |

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-core/src/internal/resource.ts` | `Resource.keyHash` now uses strict canonical key encoding; non-canonical keys throw deterministic rejection instead of weak encoding |
| `packages/logix-core/src/internal/field-kernel/source.impl.ts` | source refresh rejects non-canonical keys before IO, emits `field_kernel::source_key_rejected`, resets the source snapshot to idle, and gates settle writeback by internal generation plus `keyHash` |
| `packages/logix-core/src/internal/field-runtime/index.ts` | submit-time source flush uses the same canonical key path before prewriting loading |
| `packages/logix-core/test/Resource.test.ts` | added canonical key determinism and rejected-domain tests |
| `packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts` | added rejected-key no-IO diagnostic proof and non-row same-key generation proof |
| `packages/logix-core/test/internal/FieldKernel/FieldKernel.RowIdMatrix.test.ts` | added row-scoped same-key generation proof |

## Result

| item | result |
| --- | --- |
| `FU2-P1` key canonicalization | `proven-for-current-source-substrate` |
| `FU2-P2` key collision pressure | `proven-for-rejected-domain` |
| `FU2-P3` same-key generation | `proven-for-non-row-and-row-source` |
| public source API | unchanged |
| source receipt identity | remains internal and artifact-backed |
| source final truth ownership | unchanged, still not owner |

## Validation

Ran:

```bash
pnpm exec vitest run packages/logix-core/test/Resource.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.RowIdMatrix.test.ts --silent=passed-only --reporter=dot --hideSkippedTests
```

Result:

- targeted source identity gate: `3` files passed, `15` tests passed

## Non-claims

- no `Form.Source`
- no `useFieldSource`
- no public source refresh helper
- no public source receipt identity API
- no source-owned final truth
- no second evidence envelope
- no root compare productization
- no complete remote source variant productization beyond current source substrate law

## Reopen Bar

Reopen `TASK-007` only if:

- a rejected-domain key starts remote IO
- invalid key fails to emit deterministic diagnostics
- old same-key source tasks can overwrite newer tasks
- submit-time source flush computes a different key law than source refresh
- row-scoped same-key refresh breaks row id ownership
- a future Query resource owner adopts an explicit canonical encoding for currently rejected object families

## 当前一句话结论

`TASK-007` closes the current source key canonicalization and same-key generation implementation residual without changing the public `field(path).source(...)` shape. The source lane no longer needs a public source identity noun for the current matrix pressure.
