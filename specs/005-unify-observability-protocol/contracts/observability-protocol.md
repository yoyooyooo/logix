# Observability Protocol（Draft v1）

> 目标：定义组件/插件/Worker 可共用的最小协议外壳（Envelope）与命令面，保证“同一输入 → 同一聚合输出”。

## 1. 版本与兼容

- 所有事件与命令都必须携带 `protocolVersion`。
- 接收端遇到不认识的 `type`：
  - 必须忽略该事件/字段并继续处理后续事件；
  - 必须在 UI 中以“缺失/不支持”方式可见（但不得崩溃）。

## 2. 事件信封（ObservationEnvelope）

| Field             | Type        | Required | Semantics                                            |
| ----------------- | ----------- | -------- | ---------------------------------------------------- |
| `protocolVersion` | `string`    | Yes      | 协议版本                                             |
| `runId`           | `string`    | Yes      | 运行会话 id                                          |
| `seq`             | `number`    | Yes      | 同一 `runId` 内单调递增主排序键                      |
| `timestamp`       | `number`    | Yes      | 事件发生时间（ms），用于展示/聚合                    |
| `type`            | `string`    | Yes      | 事件类型                                             |
| `payload`         | `JsonValue` | Yes      | 事件负载（跨宿主/证据包形态必须满足 JsonValue 硬门） |

排序语义：

- **唯一权威顺序**：同一 `runId` 内按 `seq` 升序排序。
- `timestamp` 仅用于 UI 展示与聚合统计，不作为主排序键。

## 3. 事件类型（v1 约定集合）

> v1 只约定最小集合；更多类型可按 `type` 扩展，但必须遵守兼容规则。

| `type`         | `payload`（示例来源）                                                       | 说明                                                                          |
| -------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `debug:event`  | `@logix/core` 的 `RuntimeDebugEventRef`（推荐）或 `DebugSink.Event`（原始） | 承载 `state:update` / `diagnostic` / `trace:*` 等，便于按 `txnSeq/txnId` 聚合 |
| `log:entry`    | `LogEntry`（sandbox/log）                                                   | console/effect/logix 等日志                                                   |
| `trace:span`   | `TraceSpan`（sandbox/trace）                                                | Effect trace/span 的摘要表示                                                  |
| `ui:intent`    | `UiIntentPacket`（sandbox/ui intent）                                       | 语义 UI 行为与 step/story meta                                                |
| `run:complete` | `{ duration, stateSnapshot? }`                                              | 一次 run 结束（可选）                                                         |
| `run:error`    | `{ code, message, stack? }`                                                 | run 失败（可选）                                                              |

`debug:event` 补充约束（post-007 对齐）：

- **跨宿主/证据包优先**：推荐将 `DebugSink.Event` 先归一化为 `RuntimeDebugEventRef`（见 `packages/logix-core/src/internal/runtime/core/DebugSink.ts` 的 `toRuntimeDebugEventRef`），以获得稳定字段（`eventId/eventSeq/moduleId/instanceId/runtimeLabel/txnSeq/txnId?/timestamp/kind/label/meta/errorSummary?/downgrade?`）与更好的聚合体验。
- **原始事件仅限同宿主**：允许在同进程实时链路中发送原始 `DebugSink.Event`，但在导出/跨宿主传输时必须对不可序列化字段做降级（例如 `state/cause` 的摘要化或占位）。
- **事务关联字段**：payload 必须携带 `txnSeq`（非事务事件可使用 `0`）；若携带 `txnId`，必须可由 `instanceId + txnSeq` 确定性重建，以支撑 Devtools 的窗口聚合与时间旅行对齐。
- **链路关联字段**：推荐携带 `linkId`（若可用），用于跨边界把一组相关事件串成可解释因果链（尤其是 `trace:effectop` 等边界事件）。

补充说明（锚点与可序列化）：

- `RuntimeDebugEventRef` 的实例锚点以 `instanceId` 为主。
- `RuntimeDebugEventRef.meta` 必须满足 JsonValue（禁止把不可序列化对象图塞进 meta）。

## 4. 控制命令（ControlCommand v1）

### 4.1 ControlCommand 形状

`ControlCommand` 是跨宿主一致的控制命令消息（命令面与事件面分离）。

| Field             | Type                         | Required | Semantics                           |
| ----------------- | ---------------------------- | -------- | ----------------------------------- |
| `protocolVersion` | `string`                     | Yes      | 协议版本                            |
| `commandSeq`      | `number`                     | Yes      | 命令序号（用于幂等/ack 关联/去重）  |
| `type`            | `"clear" \| "pause" \| "resume"` | Yes  | 命令类型                            |
| `runId`           | `string`                     | No       | 指定目标 run（缺省表示当前 run）    |

### 4.2 ControlAck 形状

接收端必须对每条命令给出 `ControlAck`（即使不支持该命令，也必须明确拒绝）。

| Field             | Type      | Required | Semantics                           |
| ----------------- | --------- | -------- | ----------------------------------- |
| `protocolVersion` | `string`  | Yes      | 协议版本                            |
| `commandSeq`      | `number`  | Yes      | 对应的命令序号                      |
| `accepted`        | `boolean` | Yes      | 是否接受并生效                      |
| `runId`           | `string`  | No       | 实际作用的 runId（若可判定）        |
| `reason`          | `string`  | No       | 拒绝原因/降级原因（面向 UI 展示）   |

执行边界：

- 若运行环境不支持命令，必须返回 `accepted=false` 的 `ControlAck`（并给出 `reason`），且不影响其他观测能力。

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

## 7. 传输层（Transport Profile v1：Chrome 插件/跨宿主实时）

> 说明：本节定义的是“跨宿主实时传输”的消息形状与最小语义，用于 Chrome 插件（MV3）等场景；
> 其目标是让组件形态与插件形态共享同一套输入（ObservationEnvelope 流）与控制面（ControlCommand），从而满足 “同一输入 → 同一聚合输出”。

### 7.1 设计原则

- **事件面与命令面分离**：观测事件仍以 `ObservationEnvelope` 为唯一事件单元；控制命令使用 `ControlCommand` + `ControlAck`。
- **append-only + 可重连**：生产者发送 append-only 的事件流；消费端必须允许断线重连，并以 `runId + afterSeq` 做增量恢复。
- **批量优先**：高频场景必须支持批量发送（batch），避免 per-event message 造成过高的跨线程/跨进程开销。
- **允许间隙**：`seq` 允许出现间隙（录制窗口、背压丢弃、采样等）；消费端不得假设连续。

### 7.2 TransportMessage（统一传输消息）

跨宿主实时传输的消息集合以 `TransportMessage` 为裁决源（schema）：

- `schemas/transport-message.schema.json`

目前 v1 约定以下消息：

- `HELLO`：生产者 → 消费者。发布当前 `runId` 与 capabilities（用于降级）。
- `SUBSCRIBE`：消费者 → 生产者。声明希望订阅的 `runId` 与 `afterSeq`（用于重连恢复）。
- `OBSERVATION_BATCH`：生产者 → 消费者。批量发送 `ObservationEnvelope[]`。
- `CONTROL`：消费者 → 生产者。发送 `ControlCommand`。
- `CONTROL_ACK`：生产者 → 消费者。回执 `ControlAck`（accepted/reason）。

### 7.3 Capabilities（能力协商）

- 若生产者不支持某类能力（例如 pause/resume），必须通过 `HELLO.payload.capabilities` 明确声明，并在收到对应命令时返回 `accepted=false` 的 `CONTROL_ACK`。
- UI 的 recorder 必须遵循降级规则：当 `pause/resume` 不可用时，退化为 local-only recording（仍可导出 EvidencePackage）。
