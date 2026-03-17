# 2026-03-15 · P1-2 第一刀：dispatch/reducer whole-state fallback 收紧

## 这刀做了什么

目标只做 `P1-2` 的第一小刀：

- 先只处理 `dispatch / reducer` 和 `action state writeback(kind:update)` 路径
- 当 `prevState -> nextState` 的变化可以被安全收敛到已知顶层 key 时
- 不再直接记录 `'*'`
- 改成记录顶层 key 级 dirty evidence
- 真正无法判定时，继续保留 `'*' + inferReplaceEvidence`

本刀没有做：

- 不改 `BoundApiRuntime.ts`
- 不改 `external-store.ts`
- 不改 watcher 其它写回路径
- 不碰 queue / deferred worker / React

## 实现

改动文件：

- `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts`
- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts`
- `packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts`

核心改动：

1. 在 `StateTransaction.ts` 增加 `recordKnownTopLevelDirtyEvidence(...)`
- 只在以下条件都成立时生效：
  - 有 active txn
  - 有 registry
  - `prevState / nextState` 都是 plain object
  - 变化的 key 都是可追踪的顶层 key
  - 变化 key 不是 list root
- 只要有一个 key 不满足条件，就整笔回退到旧路径

2. 在 `ModuleRuntime.dispatch.ts` 的两个分支接入：
- `applyPrimaryReducer(...)`
- `applyActionStateWritebacks(...)` 的 `pendingWholeStateWrite`

3. 旧路径仍保留
- 一旦无法安全判定，仍调用 `recordStatePatch('*', ...)`

## 证据

### 1. RED -> GREEN

测试文件：

- `packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts`

RED：
- plain reducer 仍然 `dirtyAll=true`

GREEN：
- plain reducer 收紧到：
  - `dirtyAll=false`
  - `rootCount=1`
  - `executedSteps=1`
- internal `actionStateWriteback(kind:update)` 同样收紧到：
  - `dirtyAll=false`
  - `rootCount=1`
  - `executedSteps=1`

### 2. dispatch shell 邻近守门

命令：

```bash
node <vitest> run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
```

结果：

- `dispatch.p50=0.105ms`
- `dispatch.p95=0.334ms`
- `residual.avg=0.089ms`

解释：
- 没有出现灾难性回退
- 这条只作为邻近守门，不直接证明本刀收益

### 3. whole-state fallback 贴边 micro-bench

命令：

```bash
node <vitest> run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts
```

结果：

- `single`
  - `legacy.p50=0.018ms`
  - `legacy.p95=0.020ms`
  - `legacy.avg=0.020ms`
  - `topLevel.p50=0.006ms`
  - `topLevel.p95=0.013ms`
  - `topLevel.avg=0.008ms`

- `eight`
  - `legacy.p50=0.019ms`
  - `legacy.p95=0.098ms`
  - `legacy.avg=0.038ms`
  - `topLevel.p50=0.004ms`
  - `topLevel.p95=0.021ms`
  - `topLevel.avg=0.008ms`

- `many`
  - `legacy.p50=0.011ms`
  - `legacy.p95=0.018ms`
  - `legacy.avg=0.013ms`
  - `topLevel.p50=0.005ms`
  - `topLevel.p95=0.018ms`
  - `topLevel.avg=0.011ms`

解释：

- `single` 明显更好
- `eight` 明显更好
- `many` 的 `p95` 持平，`p50/avg` 仍更好
- 当前证据满足“明确且稳定正收益”

## 验证

通过：

```bash
node <vitest> run packages/logix-core/test/StateTrait/StateTrait.ConvergeAuto.DirtySetFromMutate.test.ts
node <vitest> run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.dispatchShell.Phases.Perf.light.test.ts
node <vitest> run packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.reducerWholeStateFallback.Perf.off.test.ts
node <tsc> -p packages/logix-core/tsconfig.test.json --noEmit
```

## 裁决

- 结果分类：`accepted_with_evidence`

原因：

1. 语义收紧已经由高层测试锁住
2. 邻近 dispatch shell 没有明显回退
3. 贴边 micro-bench 在 `single / eight` 明显更好，`many` 至少不差

## 后续

若未来继续推进 `P1-2`，下一步建议：

1. 把同样的收紧逻辑扩到更多 `update` 写回入口
2. 再考虑是否和 `PatchAnchor` 或 externalStore 方向复用同一组 dirty evidence helper
