# 2026-03-20 · R-2 rollout/widening 下一刀（tier-first + diagnostics 扩入口）

> worktree: `agent/v4-perf-r2-rollout-widening`  
> branch: `agent/v4-perf-r2-rollout-widening`

## 0. 目标与边界

本刀只做 `R-2` 的 rollout/widening，聚焦两件事：

1. 把 tier-first surface 扩到更多入口，避免显式 tier 在 Runtime normalize 之后丢失。  
2. 把 diagnostics contract 继续收敛为可解释、可比对口径，补齐字段级归因。

约束遵守：
- 未回到设计起点。
- 未做 queue-side 微调。
- 未改 React / external-store。

## 1. 实现摘要

### 1.1 Runtime normalize 保留 tier 元信息（不改运行语义面）

文件：`packages/logix-core/src/Runtime.ts`

- 新增 canonical tier-policy 元信息注入：
  - `toCanonicalTxnLanePolicyInput`
  - `withTxnLanePolicyMetadata`
  - `normalizeTxnLanePolicyPatch`
- 在 `resolveRuntimeStateTransactionOptions` 与 `resolveStateTransactionOverrides` 中：
  - 仍以 `txnLanes*` 作为运行时消费面。
  - 对 tier-first 输入注入不可枚举 `txnLanePolicy` 元信息，供 resolver 还原显式 tier。
- 结果：保持 config 形态可控，同时让 diagnostics 能跨入口保留 tier 语义。

### 1.2 TxnLanePolicy resolver 扩 diagnostics contract

文件：`packages/logix-core/src/internal/runtime/core/ModuleRuntime.txnLanePolicy.ts`

- `readTxnLanesPatch` 新增对 raw patch 隐藏 policy 元信息的识别。
- `TxnLanePolicyEffective` 新增可序列化 `tier` 字段。
- 新增 `resolvedBy` 真实归因：
  - 从 builtin 初始化。
  - 覆盖层写入时更新字段级来源。
  - `queueMode` 根据 `overrideMode/enabled` 的最终来源归因。
- `effective` 输出包含 `tier`，并保持现有 `fingerprint(v1)` 口径稳定。

### 1.3 lane 测试扩入口与合同断言

文件：
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts`

新增/增强断言：
- 现有用例补 `effective.tier` 与 `explain.resolvedBy`。
- 新增 `runtime_module` tier-first 覆盖场景，验证显式 tier 在 diagnostics 中不丢失。
- 新增 `Runtime.stateTransactionOverridesLayer` 入口场景，验证 provider_default 口径与归因一致。

## 2. 验证与门禁

执行命令：

```bash
pnpm -C packages/logix-core typecheck:test
pnpm -C packages/logix-core exec vitest run \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.DefaultOn.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TxnLanes.Overrides.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnQueue.Lanes.test.ts \
  test/internal/Runtime/ModuleRuntime/ModuleRuntime.TimeSlicing.Lanes.test.ts
python3 fabfile.py probe_next_blocker --json
```

结果：
- `typecheck:test`：通过。
- lane 相关 4 文件：`14/14` 用例通过。
- `probe_next_blocker --json`：最终 `status=clear`，`threshold_anomaly_count=0`，未形成新增 blocker。

## 3. 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-rollout-widening.validation.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2-rollout-widening.probe-next-blocker.json`

## 4. 结论

本刀属于 `accepted_with_evidence`：
- tier-first surface 已在更多入口可解释落地（runtime_module + provider_default layer）。
- diagnostics contract 在事件层补齐 `effective.tier + explain.resolvedBy`，且测试与 probe 门禁收口为绿。
