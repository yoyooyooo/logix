# Data Model: 统一观测协议与聚合引擎

> 本文是面向实现与测试的“数据形状”备忘：明确实体、字段与约束，用于支撑跨宿主一致性与可回放。

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
- `payload: unknown`：类型对应的负载（可为 Debug/Event、LogEntry、TraceSpan、UiIntentPacket 等）。

约束：
- `seq` 必须是整数且 `>= 1`。
- `timestamp` 必须为有限数字。
- `payload` 在跨宿主传输/导出时必须可结构化克隆或可 JSON 化；否则需要降级表示（见 Edge Case 约束）。

## Entity: AggregatedSnapshot（宿主无关聚合快照）

用于驱动 Devtools 核心视图的数据快照（FR-011 的输出）。

- `run: { runId: string; protocolVersion: string }`
- `stats: { totalEvents: number; droppedEvents?: number }`
- `timeline: ReadonlyArray<{ seq: number; timestamp: number; type: string; ref?: { moduleId?: string; runtimeId?: string; txnId?: string } }>`
- `instances: ReadonlyMap<string, number>`：按 `runtimeLabel::moduleId` 维度的活跃实例计数（可复用现有 DevtoolsHub 语义）。
- `latestStates: ReadonlyMap<string, unknown>`：按 `runtimeLabel::moduleId::runtimeId` 的最新状态快照（可选/可配置）。
- `diagnostics: ReadonlyArray<unknown>`：错误/诊断事件的聚合索引（用于 Overview/列表）。
- `coverage?: { stories?: unknown; steps?: ReadonlyMap<string, "covered" | "pending"> }`：需求锚点覆盖（P2）。

约束：
- 对同一份输入（相同 runId + 相同 envelopes 列表），聚合输出必须确定且可复现（同输入同输出）。

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
- 不可序列化字段必须以可预测方式降级，且不导致导入失败。

## Entity: ControlCommand（最小命令面）

跨宿主一致的控制命令（FR-007）。

- `type: "clear" | "pause" | "resume"`
- `runId?: string`：若命令针对特定 run；否则表示当前会话。
- `seq?: number`：命令自身的顺序标识（可选，按需要引入）。

