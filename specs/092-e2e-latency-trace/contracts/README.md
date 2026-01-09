# Contracts: 092 E2E Latency Trace（端到端时间线）

本目录存放 092 的“契约层”产物（实现阶段对齐与验收依据），并遵守 **不引入并行真相源** 原则。

## Source of Truth（不复制、不分叉）

- 统一观测协议与 JsonValue 硬门槛：`specs/005-unify-observability-protocol/contracts/`
- 可序列化诊断与稳定身份：`specs/016-serializable-diagnostics-and-identity/contracts/`
- 事务锚点与 trace 贯穿：`docs/specs/drafts/topics/runtime-v3-core/01-transaction-identity-and-trace.md`
- 073 external store tick / no tearing：`specs/073-logix-external-store-tick/`
- 088/089/090：Action/Optimistic/Resource 事件链路（E2E trace 依赖它们的稳定锚点）

## 本特性新增/固化的契约点

- **E2ETraceSegmentEvent（Slim）**：端到端 segment 的最小可导出事件模型（以 action `linkId` 为锚点，包含 segmentKind/start/duration 与可解释 reason）。

schemas：

- `schemas/e2e-trace-segment-meta.schema.json`
- `schemas/e2e-trace-segment-event.schema.json`

