# 2026-03-20 · spec/103 · r2-controlplane-synergy 收口

## 目标

在 `R2-A / R2-B / rollout-widening` 基线上，继续吸收 `R-2` 与 core control surface 的协同 widening，聚焦 `tier/resolvedBy/effective` 一致性。

## 改动范围

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

## 结果摘要

- resolver 新增 `resolvedBy.tier`，并将 tier 推导来源规则显式化。
- lane evidence 投影统一以 `effective/explain` 为来源，避免控制面口径漂移。
- 测试覆盖新增 legacy `txnLanes` 无显式 tier 推导场景，验证 `effective.tier` 与 `resolvedBy.tier` 一致。

## 验证与证据

- `2026-03-20-r2-controlplane-synergy.validation.typecheck.txt`
- `2026-03-20-r2-controlplane-synergy.validation.vitest.txt`
- `2026-03-20-r2-controlplane-synergy.probe-next-blocker.json`

关键结果：

- `pnpm -C packages/logix-core typecheck:test` 通过。
- 指定 4 文件 vitest：`17/17` 通过。
- `probe_next_blocker --json`：`status=clear`，`threshold_anomaly_count=0`。

## 分类

- `accepted_with_evidence`
- 无 public API 变更；后续若要改 public API，仅进入 proposal + docs/evidence 流程。
