# 2026-03-13 · G-1：TickScheduler flush-before-commit fast path 试探失败

## 目标

针对 `externalStore.ingest.tickNotify` 当前剩余的 `tickFlushLag`，尝试压缩
`TickScheduler.flushTick()` 里 `acceptedDrain` 构造阶段的临时分配和重复扫描。

## 试探

文件：

- `packages/logix-core/src/internal/runtime/core/TickScheduler.ts`

试探内容：

- 在 `canAcceptAllTopics` 分支下，为 module-topic-only 场景增加一个更窄的 fast path
- 目标是避免对 `dirtyTopics` 的重复扫描与新 `Map` 分配

## 证据

node-only lag 补证给出的关键样本：

- worker 样本：
  - `phaseFlushBeforeCommitMs≈1.08ms`
- 主会话复跑：
  - `phaseFlushBeforeCommitMs≈1.92ms`
  - `phaseTickFlushLagMs≈1.92ms`

其余条件未漂：

- `phaseYieldMicrotaskMs=0`
- `tickDelta=1`

## 裁决

- 这把 `TickScheduler` lag 小刀收益不稳
- `1.08ms -> 1.92ms` 的漂移已经超过当前可背书范围
- 不保留该 runtime patch

## 当前结论

- `yieldMicrotask` 本身可先排除
- `tickFlushLag` 仍存在，但这条 `acceptedDrain` fast path 不是稳定保留刀
- 当前应先停在 docs/evidence-only，等待新的 node-only 信号或 browser perf 环境恢复
