# Data Model: 统一观测协议与聚合引擎

> 本文是面向实现与测试的“数据形状”备忘：明确实体、字段与约束，用于支撑跨宿主一致性与可回放。

约定：

- `JsonValue`：以 `specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json` 为准（跨宿主/证据包 JSON 硬门）。

## Entity: RunSession

一次运行会话的元信息（对应 `runId` 的生命周期）。

- `runId: string`：运行会话唯一标识（非空）。
- `protocolVersion: string`：协议版本（用于兼容与降级）。
- `source: { host: "component" | "extension" | "sandbox" | "playground"; label?: string }`
- `startedAt: number`：毫秒时间戳。
- `endedAt?: number`：毫秒时间戳（可选）。

约束：

- 同一 `runId` 内 `seq` 必须全局单调递增且不重复。

## Entity: ObservationEnvelope

跨宿主传输与持久化的最小事件单元（统一外壳）。

- `protocolVersion: string`
- `runId: string`
- `seq: number`：主排序键（同一 runId 内单调递增）。
- `timestamp: number`：事件发生时间（展示/聚合用，非主排序键）。
- `type: string`：事件类型（如 `debug:event` / `log:entry` / `trace:span` / `ui:intent` / `run:complete`）。
- `payload: JsonValue`：类型对应的负载（跨宿主/证据包形态必须满足 JsonValue 硬门）。

约束：

- `seq` 必须是整数且 `>= 1`。
- `timestamp` 必须为有限数字。
- `payload` 在跨宿主传输/导出时必须满足 `specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`；否则需要降级表示（见 Edge Case 约束）。
- 对已知高成本字段/超大 payload，允许在跨宿主传输/导出时强制摘要（或按需获取），并用可预测表示标记降级原因（例如 `oversized`）。

备注：

- 宿主内可以先产生原始对象，但写入 `EvidencePackage` 或跨宿主传输前必须先归一化/摘要化为 JsonValue（见 contracts）。

## Entity: RuntimeDebugEventRef（规范化 Debug 事件引用）

用于在跨宿主/证据包场景中承载 `@logixjs/core` 的 Debug 事件，保证字段稳定、易聚合。

来源：`packages/logix-core/src/internal/runtime/core/DebugSink.ts` 的 `RuntimeDebugEventRef`（由 `toRuntimeDebugEventRef` 生成）。

- `eventSeq: number`：instance 内单调递增序号（排序与去重）。
- `eventId: string`：事件 id（确定性派生；推荐 `${instanceId}::e${eventSeq}`）。
- `moduleId: string`
- `instanceId: string`：稳定模块实例锚点（对外主锚点）。
- `runtimeLabel?: string`
- `txnSeq: number`：instance 内事务序号（非事务事件可使用 `0`）。
- `txnId?: string`：关联的 `StateTransaction`（Operation Window）标识（可选；确定性派生；推荐 `${instanceId}::t${txnSeq}`）。
- `linkId?: string`：可选链路锚点（用于把跨边界的一组相关事件串成因果链）。
- `timestamp: number`
- `kind: string`：粗粒度类别（如 `action/state/service/trait-*/react-render/diagnostic/devtools`）。
- `label: string`：用于 UI 展示的短标签。
- `meta?: JsonValue`：可选结构化信息（必须可 JSON 序列化；例如 patchCount/originKind/originName/diagnostic 字段等）。
- `errorSummary?: SerializableErrorSummary`：可选错误摘要（用于 error/diagnostic 事件）。
- `downgrade?: { reason?: "non_serializable" | "oversized" | "unknown" }`：可选降级标记（解释哪些字段被省略/裁剪）。

## Entity: OperationWindowSpan（Time-Span Timeline 的顶层 Span）

用于驱动“时序跨度时间线（Time-Span Timeline）”的顶层窗口跨度（通常以一次 `StateTransaction` 为单位）。

- `txnId: string`
- `moduleId: string`
- `instanceId: string`
- `startedAt: number`
- `endedAt: number`
- `outcome?: "Converged" | "Noop" | "Degraded"`：可选，来自 trait 收敛摘要。
- `degradedReason?: string`：可选，来自降级原因（如 budget_exceeded/runtime_error）。

约束：

- `startedAt/endedAt` 必须来自运行时权威时间（例如 `StateTransaction.startedAt/endedAt`）；查看器不得“补造”窗口边界。

## Entity: AggregatedSnapshot（宿主无关聚合快照）

用于驱动 Devtools 核心视图的数据快照（FR-011 的输出）。

- `run: { runId: string; protocolVersion: string }`
- `stats: { totalEvents: number; droppedEvents?: number }`
- `timeline: ReadonlyArray<{ seq: number; timestamp: number; type: string; kind?: string; label?: string; ref?: { moduleId?: string; instanceId?: string; txnId?: string } }>`
- `windows?: ReadonlyArray<OperationWindowSpan>`：可选的窗口跨度索引（用于 Time-Span Overview 泳道）。
- `instances: ReadonlyMap<string, number>`：按 `runtimeLabel::moduleId` 维度的活跃实例计数（可复用现有 DevtoolsHub 语义）。
- `latestStates: ReadonlyMap<string, JsonValue>`：按 `runtimeLabel::moduleId::instanceId` 的最新状态快照（可选/可配置；默认允许摘要化/按需获取）。
- `diagnostics: ReadonlyArray<unknown>`：错误/诊断事件的聚合索引（用于 Overview/列表）。
- `coverage?: { stories?: unknown; steps?: ReadonlyMap<string, "covered" | "pending"> }`：需求锚点覆盖（P2）。

约束：

- 对同一份输入（相同 runId + 相同 envelopes 列表），聚合输出必须确定且可复现（同输入同输出）。

## Entity: AggregationWorkerBoundary（Worker-first 边界）

用于约束“聚合引擎应如何落在 Worker 内”，避免高频事件处理逻辑挤占 UI 主线程。

- `input`: 批量的 `ObservationEnvelope` 追加流（append-only），以及可选的 `ControlCommand`（如 `clear/pause/resume`）。
- `output`: `AggregatedSnapshot`（全量或增量），并携带丢弃/降级统计（例如 droppedEvents、oversizedCount 等）。

约束：

- 主线程不得承担事件索引、窗口聚合、视口裁剪、布局计算等高成本逻辑；这些必须在 Worker 内完成。
- Worker → UI 的推送频率必须受控（参考 spec 的 FR-013 节流策略），避免“观测者效应”。

## Entity: EvidencePackage

用于导出/导入的证据包（默认粒度：单 `runId`）。

- `protocolVersion: string`
- `runId: string`
- `createdAt: number`
- `source: { host: string; label?: string }`
- `events: ReadonlyArray<ObservationEnvelope>`
- `summary?: unknown`：可选摘要（例如聚合快照的精简版，用于快速打开）。

约束：

- 导入后必须能还原核心计数与事件顺序（基于 `seq`）。
- 证据包允许只包含录制窗口内事件：`events[*].runId` 必须一致，但 `seq` 允许不从 1 开始且可存在间隙；接收端不得假设 `seq` 连续。
- 不可序列化字段必须以可预测方式降级，且不导致导入失败。

## Entity: ControlCommand（最小命令面）

跨宿主一致的控制命令（FR-007）。

- `protocolVersion: string`
- `commandSeq: number`：命令序号（用于幂等/ack 关联/去重）。
- `type: "clear" | "pause" | "resume"`
- `runId?: string`：若命令针对特定 run；否则表示当前会话（或宿主定义的“当前 run”）。

## Entity: ControlAck（命令回执）

用于跨宿主命令回路的回执消息。

- `protocolVersion: string`
- `commandSeq: number`：对应命令序号。
- `accepted: boolean`
- `runId?: string`
- `reason?: string`

## Entity: TransportMessage（跨宿主实时传输）

用于 Chrome 插件（MV3）等跨宿主实时链路的统一消息集合。

- 裁决源：`specs/005-unify-observability-protocol/contracts/schemas/transport-message.schema.json`
- 目标：在不引入第二套“并行真相源”的前提下，将 `ObservationEnvelope`（事件面）与 `ControlCommand`（命令面）跨进程传输。

### TransportHello

- `type: "HELLO"`
- `payload`: `{ protocolVersion, runId, lastSeq?, capabilities }`

### TransportSubscribe

- `type: "SUBSCRIBE"`
- `payload`: `{ protocolVersion, runId?, afterSeq? }`

### TransportObservationBatch

- `type: "OBSERVATION_BATCH"`
- `payload`: `{ protocolVersion, runId, events: ObservationEnvelope[], droppedCount?, droppedReason? }`

### TransportControl / TransportControlAck

- `type: "CONTROL"` + `payload: ControlCommand`
- `type: "CONTROL_ACK"` + `payload: ControlAck`
