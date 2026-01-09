# Contracts: 090 Suspense Resource/Query（资源/查询层契约）

本目录存放 090 的“契约层”产物（实现阶段对齐与验收依据），并遵守 **不引入并行真相源** 原则。

## Source of Truth（不复制、不分叉）

- 统一观测协议与 JsonValue 硬门槛：`specs/005-unify-observability-protocol/contracts/`
- 可序列化诊断与稳定身份：`specs/016-serializable-diagnostics-and-identity/contracts/`
- 事务锚点与 trace 贯穿：`docs/specs/drafts/topics/runtime-v3-core/01-transaction-identity-and-trace.md`
- 088 Async Action Coordinator（ActionRun 关联规则）：`specs/088-async-action-coordinator/`

## 本特性新增/固化的契约点

- **ResourceEvent（Slim）**：资源生命周期事件的最小可导出模型（start/resolve/reject/cancel/invalidate），用于 Devtools/证据导出与回归断言（去重命中、取消原因、失效原因等）。

schemas：

- `schemas/resource-event-meta.schema.json`
- `schemas/resource-event.schema.json`

