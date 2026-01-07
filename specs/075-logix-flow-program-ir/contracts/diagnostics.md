# Contracts: Diagnostics（FlowProgram 与 tick 关联）

## 原则

- 复用既有边界事件：FlowProgram 不引入“巨型事件流”。
- diagnostics=off 近零成本：不得常态分配/扫全量 Program。
- 解释链以 tickSeq 为参考系：能回答“为何发生这次 dispatch/跳转/刷新”。

## 事件口径（最小）

- `trace:tick`：来自 073（start/settled/budgetExceeded）
- `EffectOp(kind='flow')`：FlowProgram watcher 的运行（meta 至少含 `programId/nodeId/tickSeq`）
- `EffectOp(kind='service')`：serviceCall 的边界（meta 至少含 `serviceId/programId/tickSeq`）

## 在途态 I_t（长期公式 Σ_t 的落点）

FlowProgram 的动态语义天然会引入 “in-flight 状态”：

- `delay` 的 timer schedule/cancel/fired
- `latest/exhaust` 的 run 替换/忽略/取消
- `serviceCall` 的 pending/timeout/retry/backoff
- （可选）背压队列/lanes 的水位与延迟

这些都属于长期公式里的 `I_t`（不是业务数据 `S_t`，但决定“下一步会发生什么”）。因此当 diagnostics 打开时，必须能用 Slim、可序列化字段解释：

- **run 锚点**：一次触发的 `flowRunId`（同一 `programId` 下单调递增或可去随机化），并能关联 `tickSeq/instanceId`。
- **timer 锚点**：`timerId` 以及 schedule/cancel/fired 的摘要（至少能回答“为何这个 delay 没发生/被谁取消/何时 fired”）。
- **取消语义**：被取消的 run 的 `reason`（例如 `latest.replaced` / `shutdown` / `timeout`），以及 `cancelledByRunId`（若存在）。
- **service 结果事件化**：success/failure/timeout/retry 的 outcome 必须能关联到对应 run（避免黑盒 Promise 链断因果）。

## 成本门控

- diagnostics=off：不额外记录 Program 级 trace；仅保留必要的错误 fail-fast 诊断。
- diagnostics=light/full：允许附带少量锚点字段（programId/nodeId），但不得附带 IR 全量内容。
