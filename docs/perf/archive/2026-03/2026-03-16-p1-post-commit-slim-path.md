# 2026-03-16 · P1 post-commit slim path

## 结论

- 在 `diagnostics=off`、无 `commitHub` 订阅者、无 module/readQuery post-commit 观察者、且无额外 debug state:update 记录需求时，`runPostCommitPhases(...)` 现在会直接走最薄提交路径。
- 这条路径会跳过：
  - `commitHub` publish
  - `onCommit` -> `TickScheduler.onModuleCommit(...)`
  - 因此不再推进空观察者事务的 tick/store tick
- 这刀保留。原因是同口径 before/after 已拿到明确正收益。

## 实现

- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`
  - 给 `runPostCommitPhases(...)` 加公共壳。
  - 把 `diagnosticsLevel` 从事务外层传入，避免 post-commit 再取一次。
  - 在 `diagnostics=off` 且无 post-commit 需求时，先只探测一次 `Debug.currentDebugSinks`：
    - 若没有 state:update 记录需求，直接返回。
    - 若仍有 sink 需要 state:update，则只保留这部分。
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
  - 把“是否存在 post-commit 观察需求”下放为闭包：
    - `selectorGraph.hasAnyEntries()`
    - `runtimeStore.getModuleSubscriberCount(moduleInstanceKey) > 0`

## 验证

### 功能回归

- 文件：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.postCommitSlim.test.ts`
- 覆盖：
  - 无观察者时，dispatch 后 `tickSeq/storeTickSeq` 保持 `0`
  - 有 module topic subscriber 时，tick 仍正常推进

### Perf 证据

- 文件：`packages/logix-core/test/internal/Runtime/ModuleRuntime/ModuleRuntime.postCommitSlim.Perf.off.test.ts`
- 命令（before / after 同口径）：
  - `LOGIX_PERF_ITERS=240 LOGIX_PERF_WARMUP=40 vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.postCommitSlim.Perf.off.test.ts`
- before：
  - `dispatchOnly.avg=0.136ms`
  - `dispatchOnly.p50=0.109ms`
  - `dispatchOnly.p95=0.274ms`
  - `settle.avg=1.144ms`
  - `settle.p50=1.109ms`
  - `settle.p95=1.530ms`
  - `tickSeq=280`
- after：
  - `dispatchOnly.avg=0.070ms`
  - `dispatchOnly.p50=0.057ms`
  - `dispatchOnly.p95=0.101ms`
  - `settle.avg=1.007ms`
  - `settle.p50=0.984ms`
  - `settle.p95=1.090ms`
  - `tickSeq=0`

### 收益解读

- `dispatchOnly.avg` 下降约 `48.5%`
- `dispatchOnly.p50` 下降约 `47.7%`
- `dispatchOnly.p95` 下降约 `63.1%`
- `settle.avg` 下降约 `12.0%`
- `settle.p95` 下降约 `28.8%`
- 结构性收益：空观察者事务不再白白推进 `280` 次 tick

## 命令记录

- `pnpm typecheck:test` in `packages/logix-core`
- `vitest run test/internal/Runtime/ModuleRuntime/ModuleRuntime.postCommitSlim.test.ts test/internal/Runtime/ModuleRuntime/ModuleRuntime.postCommitSlim.Perf.off.test.ts`

## 备注

- 工作区级 `pnpm typecheck` 未通过，但失败来自仓库内现有的 `apps/speckit-kanban-fe` 缺失 React 类型，与本刀无关。
