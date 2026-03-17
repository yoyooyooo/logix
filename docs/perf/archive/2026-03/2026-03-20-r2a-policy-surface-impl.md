# 2026-03-20 · R2-A · Policy Surface 最小实现收口

> worktree: `agent/v4-perf-r2a-policy-surface-impl`  
> branch: `agent/v4-perf-r2a-policy-surface-impl`

## 0. 目标与边界

本次只实现 `R2-A` 的最小可工作包，范围严格限定为：
- public surface 增加 tier-first 输入
- normalize/mapping 层把 tier 输入归一到既有 `txnLanes` 旋钮
- lane 基础诊断补齐 `policy.tier`
- lane 相关测试覆盖与验证闭环

本次没有回到 queue-side 小常数调参，没有改 React controlplane/external-store。

## 1. 实现摘要

### 1.1 Tier-first surface

在 `Runtime.stateTransaction` 与 provider overrides 增加 tier-first 字段：
- `txnLanePolicy`
- `txnLanePolicyOverridesByModuleId`

并保留原有 `txnLanes` / `txnLanesOverridesByModuleId` 作为低层输入。

### 1.2 Normalize + Mapping

新增统一映射函数（`env.ts`）：
- `normalizeTxnLanePolicyInput`

映射规则（最小版）：
- `tier=off` -> `overrideMode=forced_off`, `enabled=false`
- `tier=sync` -> `overrideMode=forced_sync`, `enabled=false`
- `tier=interactive` -> 默认 `{ enabled=true, budgetMs=1, debounceMs=0, maxLagMs=50, allowCoalesce=true, yieldStrategy='baseline' }`
- `tier=throughput` -> 默认 `{ enabled=true, budgetMs=4, debounceMs=0, maxLagMs=100, allowCoalesce=true, yieldStrategy='baseline' }`
- `tuning` 仅覆盖上述可调字段

`Runtime.make` 与 `Runtime.stateTransactionOverridesLayer` 先做 normalize，再进入既有 runtime 配置与校验链路。

`ModuleRuntime.txnLanePolicy` resolver 现在同时识别：
- tier-first 输入（`txnLanePolicy*`）
- legacy 输入（`txnLanes*`）

并输出统一 `ResolvedTxnLanePolicy`（含 `tier`，保留 `configScope` 口径）。

### 1.3 基础诊断

`trace:txn-lane` 的 `policy` 增加 `tier` 字段（Slim、可序列化）。

## 2. 测试与验证

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
- `typecheck:test`：通过
- lane 相关 4 个测试文件：`12/12` 通过
- `probe_next_blocker`：`status=clear`，未新增 blocker

证据文件：
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2a-policy-surface-impl.probe-next-blocker.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-20-r2a-policy-surface-impl.validation.json`

## 3. 结论

本线以最小实现达成 `tier + mapping + 基础验证`，可作为 `R2-A policy surface impl` 的可回母线实现包。
