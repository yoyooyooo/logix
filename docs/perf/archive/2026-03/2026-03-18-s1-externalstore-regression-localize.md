# 2026-03-18 · S-1：externalStore regression localization（U-1/A-2 仍失败的定位结论）

## 任务边界

- 仅做 read-only 定位与 docs/evidence 回写。
- 不修改 `packages/logix-core/**`、`packages/logix-react/**`、perf suite、budget 定义。
- 目标：解释为何 `U-1` 与 `A-2` 都已在 current-head 存在，`externalStore.ingest.tickNotify` 仍稳定触发 `full/off<=1.25`。

## 只读核对结果

1. `U-1` 代码锚点仍在：
- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts:492`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts:592`
- 两处都使用 `Effect.forkDetach({ startImmediately: true })`。

2. `A-2` 代码锚点仍在：
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts:380-392`
- 逻辑仍是 `traceMode=off` 时把 `onCommit` 提前到 `Debug.record(state:update)` 之前。

3. 历史与当前证据一致：
- `docs/perf/archive/2026-03/2026-03-14-u1-tickscheduler-start-immediately.md` 记录过 `U-1` 在当时样本下可收口。
- `docs/perf/02-externalstore-bottleneck-map.md` 已标注 full 诊断链是相对开销放大点。
- `docs/perf/archive/2026-03/2026-03-18-s1-externalstore-threshold-audit.md` 三轮都在同一预算触发阈值异常，`first_fail_level=128`。

## 定位结论：U-1/A-2 为何不足

`U-1` 与 `A-2` 都属于“启动时序层”优化，覆盖的是 `onCommit -> scheduleTick -> flush` 的启动壳延迟。  
当前稳定失败发生在 `full/off` 相对预算，主矛盾位于“诊断成本建模层”：

1. `A-2` 只改变 `traceMode=off` 下的 commit 顺序，不减少 `full` 路径里 `state:update` 事件构造与投影成本。  
2. `U-1` 让 detached fiber 更早启动，改善绝对时延；相对预算仍会受到 full 诊断固定成本影响。  
3. `S-1` 三轮样本在 `watchers=128/256/512` 的 ratio 呈非单调，符合“低毫秒区间相对比值易放大”的门禁特征，难以归因为单一 runtime 热路径回退。

## 唯一下一刀建议（只给一刀）

下一刀打在 **perf gate / 阈值建模层**，不打 runtime 层。  
具体方向：为 `externalStore.ingest.tickNotify` 的 `full/off<=1.25` 引入与低毫秒区间匹配的相对预算保护条件（如 `minDeltaMs` 或同等双门策略），先消除阈值表达对低基线样本的系统性放大，再决定是否需要重开实现线。

## 路由影响

- 当前 routing 应从“泛 residual 复核”收敛到“阈值建模层优先”。
- 在阈值建模层收口前，继续禁止重开 externalStore runtime cut。
