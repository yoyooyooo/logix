---
title: Tick / Flush（从输入到稳定快照）
description: 用 tick/flush 的心智理解 Logix 的渲染一致性、性能边界与 DevTools 中的 trace:tick。
---

在 Logix 里，你可以把“状态变化 → UI 观察到变化”理解成两层：

- **事务（transaction）**：一次 `dispatch` / 一次外部输入写回，在模块内部完成 reducer/trait/converge/validate，产出一次“提交意图”（pending）。
- **Tick / Flush**：Runtime 把一段时间内积累的 pending 变更合并并稳定化，然后一次性提交成对外可读的快照，并通知订阅者。

一个最小时间线可以想成：

`输入（click / external store）` → `state:update（事务提交）` → `trace:tick（flush settled）` → `React 订阅通知` → `render`

> 重要：`flush` 不是 “render 次数” 的严格同义词；更准确地说，flush 是“对 React 发出更新信号并让新快照可被读取”的边界。

## 1) 为什么要有 Tick / Flush？

把 “模块内的同步事务” 与 “对外可观察的快照发布” 分离，有三个直接收益：

- **合并**：同一段同步代码里多次更新，尽量合并成一次 flush（减少通知风暴与中间态抖动）。
- **一致性**：组件同时读多个模块时，尽量保证读到的是同一个 tick 的快照（避免 tearing）。
- **可解释与可治理**：当系统超预算/出现 backlog 时，Runtime 能在 flush 维度给出证据（为什么延后、延后了什么、是否稳定化）。

## 2) DevTools 里怎么看（`trace:tick` 速查）

当你启用 DevTools 后，优先看 `trace:tick`（tick 的三段事件）：

- `phase="start"`：一次 tick 开始（通常由 dispatch / external input 触发）。
- `phase="settled"`：tick 完成并 flush（本次对外快照已经稳定发布）。
- `phase="budgetExceeded"`：本次 tick 发生软降级（常见是 nonUrgent backlog 被推迟），需要结合 `result/backlog` 看原因与被推迟对象。

常用字段（按需出现）：

- `tickSeq`：本次 tick 的稳定序号（你可以用它把一次输入、一次 flush、以及后续的 React render 关联起来）。
- `result.stable / result.degradeReason`：是否达成 fixpoint；若不稳定，原因是什么（budget/cycle 等）。
- `backlog.deferredPrimary`：若有推迟，优先看它指向哪个 externalStore / 哪个字段（回答“为什么看起来在等”）。

配合 `action:dispatch` 与 `state:update`：

- `state:update.commitMode="batch"`：来自 `dispatchBatch([...])`，多次同步派发只形成一次可观察提交。
- `state:update.commitMode="lowPriority"`：来自 `dispatchLowPriority(action)`，只改变通知节奏（更温和合并），不改变事务正确性。

## 3) 常见症状 → 处理建议

### 3.1 同一业务意图里连续多次派发

优先用 `dispatchBatch([...])` 把它变成“一次可观察提交”，减少中间态与通知次数；不要依赖每一步中间派生结果。

### 3.2 宿主事件会同步触发多个外部输入变化

用 `Runtime.batch(() => { ... })` 包一层“更强的 tick 边界”，让 tick scheduler 在 batch 结束后再 flush。

约束：

- `Runtime.batch` 只提供**同步边界**；不要在 callback 里 `await` 指望“中途 flush”。
- `Runtime.batch` 不是事务：不会 rollback；callback 抛错也可能产生 partial commit。

### 3.3 你看到 `budgetExceeded` / `priority-inversion`

先把问题“证据化”，再动旋钮：

1. 先确认是否把“有 UI 订阅者的链路”错误标成 nonUrgent（或把关键链路塞进了非关键补算）。
2. 再收敛 churn：减少不必要的订阅唤醒（selector 粒度、`select/equals/coalesceWindowMs`、避免返回新对象导致 equality 失效）。
3. 最后才考虑调参/拆分：Lane、预算、以及把过长的依赖链拆开（避免长期 backlog）。

## 延伸阅读

- [调试与 DevTools](../advanced/debugging-and-devtools)
- [性能与优化](../advanced/performance-and-optimization)
- [事务车道（Txn Lanes）](../advanced/txn-lanes)
