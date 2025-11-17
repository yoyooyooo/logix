# 7. ReplayLog 与回放模式（Replay Mode）

- **ReplayLog（回放日志）**
  - 用于时间旅行/故障复现的事件事实源；
  - 至少记录资源快照变化（`idle/loading/success/error`）以及显式失效请求（invalidate）。

- **Replay Mode（回放模式）**
  - Runtime 的一种运行模式：
    - live：正常执行真实逻辑，并记录回放事实；
    - replay：不触发真实网络/外部副作用，而是基于 ReplayLog 重赛结果。

- **re-emit vs re-fetch**
  - 回放语义的裁决规则：
    - re-emit：重赛 ReplayLog 中记录的成功/失败 payload 与快照序列（可复现）；
    - re-fetch：重新发起真实请求（不可复现且可能破坏外部系统）。
  - 规范层要求：Replay Mode 必须以 re-emit 为主。

- **InvalidateRequest（失效请求）**
  - 表达“使某个资源/查询结果失效并触发后续刷新”的意图；
  - 作为事件记录到 ReplayLog，供回放与诊断聚合使用。
