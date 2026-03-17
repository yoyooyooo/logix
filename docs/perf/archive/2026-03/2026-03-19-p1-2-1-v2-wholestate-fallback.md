# 2026-03-19 · P1-2.1 v2 whole-state fallback 收紧扩面

## 结果分类

- `partial_pending`

## 目标与边界

- 目标：继续 `P1-2.1`，优先尝试把 whole-state fallback 收紧扩到 external-store 邻近入口。
- 本轮最低保留：`BoundApiRuntime state.update` 的安全收紧与证据收口。
- 禁区遵守：未触碰 `logix-react/src/internal/**`、`process/**`、`SelectorGraph.ts`、draft primitive / large-batch-only / dual path。

## 代码改动（本轮保留）

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
  - `collectKnownTopLevelDirtyChanges` 放宽为仅按顶层 key 变化收集，不再因顶层值为 `Array` 直接放弃。
- `packages/logix-core/src/internal/runtime/core/BoundApiRuntime.ts`
  - `$.state.update` 的 known top-level dirty 路径新增 top-level list root 守门。
  - 命中 list root key 时回退 `runtime.setState`，由 txn 走 `inferReplaceEvidence` 兜底，避免 list 结构语义风险。
  - 新增 list root key 缓存，避免每次 update 重新构建集合。

## external-store 扩面裁决

- `packages/logix-core/src/internal/state-trait/external-store.ts` 本轮无改动。
- 原因：
  - external-store 邻近语义门在当前分支已存在存量红线，且与本刀修改无关。
  - 复核命令仍稳定复现 3 条失败：
    - `StateTrait.ExternalStoreTrait.Runtime.test.ts`：`waitUntil timed out`
    - `ModuleAsSource.tick.test.ts`：`A->B writeback` 未在同 tick 收敛
    - `ModuleAsSource.tick.test.ts`：`Expected >=1 ticks, got 0`
- 结论：本轮不保留 external-store 扩面代码，避免语义风险硬推。

## 验证摘要

### 1) 最小验证命令

通过：

```bash
pnpm -C packages/logix-core exec vitest run test/StateTrait/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts
pnpm -C packages/logix-core exec vitest run test/internal/Bound/BoundApiRuntime.stateUpdateWholeStateFallback.Perf.off.test.ts
```

贴边 perf 观察（BoundApi，legacy vs current）：

- `single`: `p95 0.105ms -> 0.123ms`（噪声级回摆）
- `eight`: `p95 0.125ms -> 0.074ms`（正向）
- `many`: `p95 0.096ms -> 0.089ms`（正向）

### 2) external-store 邻近语义门（阻塞证据）

失败（与本轮改动无关的存量红线）：

```bash
pnpm -C packages/logix-core exec vitest run \
  test/internal/StateTrait/StateTrait.ExternalStoreTrait.Runtime.test.ts \
  test/internal/Runtime/ModuleAsSource.tick.test.ts
```

### 3) probe 队列

通过：

```bash
python3 fabfile.py probe_next_blocker --json
```

结果：`status=clear`，三条 gate 全部 passed。

## 证据文件

- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-2-1-v2-wholestate-fallback.evidence.json`
- `specs/103-effect-v4-forward-cutover/perf/2026-03-19-p1-2-1-v2-wholestate-fallback.probe.json`

## 裁决

- 本轮接受：`BoundApiRuntime state.update` + `StateTransaction` 的收紧扩面与证据。
- 本轮不接受：external-store 入口扩面代码。
- 建议状态：可作为 `P1-2.1 v2` 的安全子收口推进，external-store 另开隔离线处理语义红线后再合并。
