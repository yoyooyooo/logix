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
| `debug:event` | `@logix/core` 的 `RuntimeDebugEventRef`（推荐）或 `DebugSink.Event`（原始） | 承载 `state:update` / `diagnostic` / `trace:*` 等，便于按 `txnId` 聚合 |
| `log:entry` | `LogEntry`（sandbox/log） | console/effect/logix 等日志 |
| `trace:span` | `TraceSpan`（sandbox/trace） | Effect trace/span 的摘要表示 |
| `ui:intent` | `UiIntentPacket`（sandbox/ui intent） | 语义 UI 行为与 step/story meta |
| `run:complete` | `{ duration, stateSnapshot? }` | 一次 run 结束（可选） |
| `run:error` | `{ code, message, stack? }` | run 失败（可选） |

`debug:event` 补充约束（post-007 对齐）：

- **跨宿主/证据包优先**：推荐将 `DebugSink.Event` 先归一化为 `RuntimeDebugEventRef`（见 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 的 `toRuntimeDebugEventRef`），以获得稳定字段（`eventId/moduleId/runtimeId/runtimeLabel/txnId/timestamp/kind/label/meta`）与更好的聚合体验。
- **原始事件仅限同宿主**：允许在同进程实时链路中发送原始 `DebugSink.Event`，但在导出/跨宿主传输时必须对不可序列化字段做降级（例如 `state/cause` 的摘要化或占位）。
- **事务关联字段**：当事件属于某次 `StateTransaction`（Operation Window）时，payload 应携带 `txnId`；至少 `state:update` 与 `diagnostic` 必须携带，以支撑 Devtools 的窗口聚合与时间旅行对齐。

## 4. 控制命令（ControlCommand v1）

| Command | Payload | Notes |
|---------|---------|------|
| `clear` | `{ runId? }` | 清空当前时间线/聚合 |
| `pause` | `{ runId? }` | 暂停接收/处理（不要求停止运行时） |
| `resume` | `{ runId? }` | 恢复接收/处理 |

执行边界：
- 若运行环境不支持命令，必须返回明确反馈（accepted=false / reason），且不影响其他观测能力。

Devtools Recorder 约定（post-007 对齐）：

- UI 的 `Record`/`Stop` 交互应 **优先** 映射为 `resume`/`pause`，以降低不必要的观测开销（尤其在高频事件流下）。
- 若宿主对命令返回 `accepted=false`（或无命令通道），UI 必须退化为“本地缓冲开关”（local-only recording）：继续接收事件但仅在 Record 窗口内写入证据包缓冲，并明确提示当前处于 local-only 模式。
- `Record`/`Stop` 不得创建新的 `runId`：证据包可只包含同一 `runId` 内的录制窗口事件；`seq` 必须保留原值且接收端不得假设从 1 开始或连续（允许间隙）。

## 5. 不可序列化值的降级（跨宿主/导出导入）

- 运行时内存中可保留原始对象引用；
- 但当需要跨宿主传输或写入证据包时：
  - 若 `payload` 或其子字段不可结构化克隆/不可 JSON 化，必须降级为可预测表示（例如占位对象），并允许 UI 展示“不可序列化”提示信息（不涉及敏感风险提示）。
  - 若 `payload` 属于已知高成本字段或体积超阈值，允许强制摘要（或按需获取），并在降级表示中标记原因（例如 `oversized`）；deep 模式可选择包含原始值。

## 6. 执行拓扑（实现约束，非协议字段）

- 在浏览器宿主中，接收端应采用 Worker-first 执行：主线程只做轻量归一化/批量投递与渲染交互；高成本聚合/索引/布局在 Worker 内执行。
- 当 Worker 不可用或被终止时，接收端必须进入可预测的降级模式（例如强制摘要/丢弃/暂停实时渲染但继续录制），并对用户可见降级原因。
