# Observability Protocol（Draft v1）

> 目标：定义组件/插件/Worker 可共用的最小协议外壳（Envelope）与命令面，保证“同一输入 → 同一聚合输出”。

## 1. 版本与兼容

- 所有事件与命令都必须携带 `protocolVersion`。
- 接收端遇到不认识的 `type`：
  - 必须忽略该事件/字段并继续处理后续事件；
  - 必须在 UI 中以“缺失/不支持”方式可见（但不得崩溃）。

## 2. 事件信封（ObservationEnvelope）

| Field | Type | Required | Semantics |
|-------|------|----------|-----------|
| `protocolVersion` | `string` | Yes | 协议版本 |
| `runId` | `string` | Yes | 运行会话 id |
| `seq` | `number` | Yes | 同一 `runId` 内单调递增主排序键 |
| `timestamp` | `number` | Yes | 事件发生时间（ms），用于展示/聚合 |
| `type` | `string` | Yes | 事件类型 |
| `payload` | `unknown` | Yes | 事件负载 |

排序语义：
- **唯一权威顺序**：同一 `runId` 内按 `seq` 升序排序。
- `timestamp` 仅用于 UI 展示与聚合统计，不作为主排序键。

## 3. 事件类型（v1 约定集合）

> v1 只约定最小集合；更多类型可按 `type` 扩展，但必须遵守兼容规则。

| `type` | `payload`（示例来源） | 说明 |
|--------|------------------------|------|
| `debug:event` | `@logix/core` 的 Debug.Event | module/action/state/error/diagnostic/trace:* 等 |
| `log:entry` | `LogEntry`（sandbox/log） | console/effect/logix 等日志 |
| `trace:span` | `TraceSpan`（sandbox/trace） | Effect trace/span 的摘要表示 |
| `ui:intent` | `UiIntentPacket`（sandbox/ui intent） | 语义 UI 行为与 step/story meta |
| `run:complete` | `{ duration, stateSnapshot? }` | 一次 run 结束（可选） |
| `run:error` | `{ code, message, stack? }` | run 失败（可选） |

## 4. 控制命令（ControlCommand v1）

| Command | Payload | Notes |
|---------|---------|------|
| `clear` | `{ runId? }` | 清空当前时间线/聚合 |
| `pause` | `{ runId? }` | 暂停接收/处理（不要求停止运行时） |
| `resume` | `{ runId? }` | 恢复接收/处理 |

执行边界：
- 若运行环境不支持命令，必须返回明确反馈（accepted=false / reason），且不影响其他观测能力。

## 5. 不可序列化值的降级（跨宿主/导出导入）

- 运行时内存中可保留原始对象引用；
- 但当需要跨宿主传输或写入证据包时：
  - 若 `payload` 或其子字段不可结构化克隆/不可 JSON 化，必须降级为可预测表示（例如占位对象），并允许 UI 展示“不可序列化”提示信息（不涉及敏感风险提示）。

