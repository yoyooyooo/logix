# 1.5 回放与 ReplayLog（re-emit，不 re-fetch）

> 目标：让时间旅行与故障复现基于“事件事实源（Event Log）”，而不是“重新发真实请求”。  
> 口径：**Replay Mode 下必须 re-emit（重赛结果），而不是 re-fetch（重算网络请求）**。

### 1.5.1 ReplayLog：事件事实源（Phase 2）

Runtime 内置一个最小版 `ReplayLog`（Env Service）作为回放事实源，记录两类事件：

- `ResourceSnapshot`：`idle/loading/success/error` 的资源快照变化（由 StateTrait.source 产生）；
- `InvalidateRequest`：显式失效请求（Phase 2 仅固化记录入口，供 Query/Devtools 聚合）。

`ReplayLog` 是顺序消费模型（带 cursor）：

- live 模式下只追加记录；
- replay 模式下由运行时按匹配条件“消费下一条事件”，cursor 前进，保证重放顺序与当时一致；
- 可通过 `resetCursor` 回到起点以重复回放。

### 1.5.2 ReplayMode：资源刷新行为

- live 模式：
  - source-refresh 正常执行资源调用，并在写回快照时把 `ResourceSnapshot` 记录到 ReplayLog。
- replay 模式：
  - source-refresh 不发真实请求；而是从 ReplayLog 依次消费并写回快照（通常是先写入 loading，再重赛 success/error，以保持“异步资源”的时间线结构）。
  - 若缺失对应事件，则刷新流程会停在当前可见状态（用于暴露“回放事实不完整”的问题，而不是静默降级为真实请求）。

> 说明：`Debug.Event.state:update.replayEvent` 字段位用于将“本次事务关联的回放事件”挂到 Debug 事件上，便于 Devtools 在事务视图中解释回放来源；Phase 2 尚未强制填充该字段。
