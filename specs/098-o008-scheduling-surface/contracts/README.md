# Contracts: 098 O-008 Scheduling Surface

本目录定义 O-008 的最小协议契约：

- `scheduling-policy-surface.schema.json`
  - 统一调度策略快照（queue/tick/concurrency 同源）
- `scheduling-diagnostic-event.schema.json`
  - backlog/degrade/recover 诊断事件语义

约束：

- payload 必须 slim、可序列化
- 使用稳定标识（instanceId/txnSeq/opSeq）
- 与 `spec.md` / `data-model.md` 保持同一字段语义
