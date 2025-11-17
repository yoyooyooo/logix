# 调试功能（LLM 薄入口）

本文件只保留最短链路与导航；细节分拆到同目录的分节文档中，按需加载。

## 最短链路

- 我要启用/接入 Devtools：先读 `09-debugging.03-effectop-bridge.md`
- 我要看时间线/状态树/逻辑流：读 `09-debugging.08-views.md`
- 我要理解诊断 code 与触发条件：读 `09-debugging.05-diagnostics.md`
- 我要对齐 `trait:converge` 证据字段与 `light/full` 裁剪：看 `packages/logix-core/src/internal/runtime/core/DebugSink.ts`（`trace:trait:converge` 投影）与 `specs/013-auto-converge-planner/contracts/schemas/trait-converge-*.schema.json`

## Process 诊断补充

- moduleAction 触发仅从 action 对象反射 `actionId`（优先 `_tag`，其次 `type`），payload 视为 unknown，不进入诊断事件载荷。
- payload 异常或不可序列化不会阻断 Process 链路，但可能导致 actionId 无法匹配（触发被忽略）。

## 分节索引

- `09-debugging.01-debugsink.md`
- `09-debugging.02-eventref.md`
- `09-debugging.03-effectop-bridge.md`
- `09-debugging.04-event-kinds.md`
- `09-debugging.05-diagnostics.md`
- `09-debugging.06-replay.md`
- `09-debugging.07-resolution-errors.md`
- `09-debugging.08-views.md`
- `09-debugging.09-tracing.md`
