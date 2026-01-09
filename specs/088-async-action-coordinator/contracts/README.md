# Contracts: 088 Async Action Coordinator（统一异步 Action 协调面）

本目录存放 088 的“契约层”产物（实现阶段对齐与验收依据），并遵守 **不引入并行真相源** 原则。

## Source of Truth（不复制、不分叉）

- 统一观测协议与 JsonValue 硬门槛：`specs/005-unify-observability-protocol/contracts/`
- 可序列化诊断与稳定身份：`specs/016-serializable-diagnostics-and-identity/contracts/`
- 稳定锚点与 txn/op 贯穿：`docs/specs/drafts/topics/runtime-v3-core/01-transaction-identity-and-trace.md`

## 本特性新增/固化的契约点

- **AsyncActionEvent（Slim）**：Async Action 的最小可导出事件模型（pending/settle + 稳定标识贯穿），用于 Devtools/证据导出与回归断言。

schemas：

- `schemas/async-action-event-meta.schema.json`
- `schemas/async-action-event.schema.json`

