# 2026-03-19 · P1-2.1 whole-state fallback 收紧扩面

## 结果分类

- `partial_pending`

## 目标与边界

- 目标：把 `P1-2` 第一刀的 whole-state fallback 收紧扩到剩余 state write 入口。
- 本次优先：`BoundApiRuntime state.update`。
- 禁区遵守：未触碰 `process/**`、`SelectorGraph.ts`、`logix-react`、draft primitive / large-batch-only / dual-path。

## 本次代码改动

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `collectKnownTopLevelDirtyChanges` 放宽为“只看顶层 key 变化”，不再因为顶层值是 `Array` 直接放弃 top-level dirty 收敛。
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - `$.state.update` 的 top-level dirty 入口新增 top-level list root 守门：
    - 若变更触及 top-level list root，回退旧路径（`runtime.setState -> inferReplaceEvidence`）。
    - 其它可判定变更继续走 key 级 dirty evidence。
  - 新增 list root key set 缓存，避免每次 update 重建集合。

## external-store 入口状态

- `packages/logix-core/src/internal/state-trait/external-store.ts` 最终无代码变更。
- 原因：尝试扩面后触发 `StateTrait.ExternalStoreTrait.Runtime` / `ModuleAsSource.tick` 红线，已全部回退，不保留风险改动。

## 验证摘要

### 1) 最小语义门

通过：

```bash
pnpm -C packages/logix-core exec vitest run test/StateTrait/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts
```

说明：

- 用户给的第一条路径 `test/internal/StateTrait/...` 在当前仓库不存在，已按真实路径 `test/StateTrait/...` 重跑并通过。

### 2) BoundApi 贴边 perf

通过：

```bash
pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts
```

结果（legacy vs current）：

- `single`
  - `p95: 0.107ms -> 0.108ms`
  - `avg: 0.089ms -> 0.113ms`
- `eight`
  - `p95: 0.090ms -> 0.066ms`
  - `avg: 0.066ms -> 0.052ms`
- `many`
  - `p95: 0.099ms -> 0.079ms`
  - `avg: 0.069ms -> 0.063ms`

解读：

- `eight/many` 明确更好。
- `single` 有噪声级回摆，需后续复测确认稳定性。

### 3) probe 队列

通过：

```bash
python3 fabfile.py probe_next_blocker --json
```

结果：

- `status=clear`
- `externalStore.ingest.tickNotify` / `runtimeStore.noTearing.tickNotify` / `form.listScopeCheck` 全部 passed。

### 4) external-store 邻近守门（试探记录）

命令：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
  test/internal/Runtime/ModuleAsSource.tick.test.ts
```

结果：

- 当前 worktree 下该组合为红（`waitUntil timed out`、`Expected >=1 ticks, got 0`）。
- 因此不保留 external-store 扩面代码，防止把风险带入本刀。

## 裁决

- 本刀已落地 `BoundApiRuntime state.update` 扩面，且有贴边正证据。
- external-store 扩面本轮不保留代码，等待单独隔离与复核。
- 当前建议：`不回母线`，先把 external-store 邻近守门稳定性与口径厘清后再收口为 `accepted_with_evidence`。
