# Contracts: 089 Optimistic Protocol（乐观更新协议）

本目录存放 089 的“契约层”产物（实现阶段对齐与验收依据），并遵守 **不引入并行真相源** 原则。

## Source of Truth（不复制、不分叉）

- 统一观测协议与 JsonValue 硬门槛：`specs/005-unify-observability-protocol/contracts/`
- 可序列化诊断与稳定身份：`specs/016-serializable-diagnostics-and-identity/contracts/`
- 事务锚点与 trace 贯穿：`docs/specs/drafts/topics/runtime-v3-core/01-transaction-identity-and-trace.md`
- 088 Async Action Coordinator（ActionRun 锚点）：`specs/088-async-action-coordinator/`

## 本特性新增/固化的契约点

- **OptimisticEvent（Slim）**：optimistic 的 apply/confirm/rollback 最小可导出事件模型（含 optimisticId、原因分类与稳定锚点关联）。

schemas：

- `schemas/optimistic-event-meta.schema.json`
- `schemas/optimistic-event.schema.json`

