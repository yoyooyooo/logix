---
description: "Data model for 016-serializable-diagnostics-and-identity (export boundary + stable identity)"
---

# Data Model: 016 可序列化诊断与稳定身份（Observability Hardening）

> 本文是面向实现与测试的“数据形状”备忘：明确导出边界、稳定锚点与降级策略，避免 005/011/013 各自演化导致漂移。

## References（SSoT）

- JsonValue 硬门：`specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json`
- ObservationEnvelope / EvidencePackage：`specs/005-unify-observability-protocol/contracts/schemas/*.schema.json`
- SerializableErrorSummary：`specs/011-upgrade-lifecycle/contracts/schemas/error-summary.schema.json`
- ModuleRuntimeIdentity：`specs/011-upgrade-lifecycle/contracts/schemas/module-runtime-identity.schema.json`
- RuntimeDebugEventRef（协议裁决）：`specs/005-unify-observability-protocol/contracts/schemas/runtime-debug-event-ref.schema.json`
- 稳定标识模型：`specs/009-txn-patch-dirtyset/spec.md`

## Type: JsonValue（导出/跨宿主硬门）

`JsonValue` 是跨宿主/证据包的硬门：只允许 `null | boolean | number | string | object | array`（递归）。

约束：

- 禁止 `bigint/symbol/function/class instance/DOM/Cause/Effect/闭包/循环引用` 等写入 `JsonValue`。
- 允许“降级表示”：通过 `downgrade.reason` 指示非序列化/超大/未知。

## Entity: SerializableErrorSummary

用于把 `Cause | Error | unknown` 归一化为可序列化摘要（用于导出/跨宿主）。

字段（以 011 schema 为准）：

- `message: string`（必填）
- `name?: string`
- `code?: string`
- `hint?: string`

约束：

- 不携带 `stack`（避免体积与敏感信息扩散）；如需展示，仅在宿主内使用裁剪字符串（不进入 evidence/hub）。

## Entity: ModuleRuntimeIdentity

实例锚点的最小集合。

字段（以 011 schema 为准）：

- `moduleId: string`（必填）
- `instanceId: string`（必填，唯一实例锚点）
- `runtimeLabel?: string`（可选，仅用于分组与展示）

约束：

- 不存在“第二锚点字段”，且不提供兼容读取。

## Entity: ExportableRuntimeDebugEventRef

用于导出/跨宿主的 Debug 事件引用形态（016 约束）。

字段（以 005 schema 为裁决源）：

- `eventSeq: number`（必填，instance 内单调递增；用于排序与去重）
- `eventId: string`（必填，确定性派生；建议 `${instanceId}::e${eventSeq}`）
- `timestamp: number`（必填）
- `kind: string`（必填）
- `label: string`（必填）
- `moduleId: string`（必填）
- `instanceId: string`（必填）
- `runtimeLabel?: string`
- `txnSeq: number`（必填；非事务事件可使用 `0` 作为约定值）
- `txnId?: string`（可选，确定性派生；建议 `${instanceId}::t${txnSeq}`）
- `meta?: JsonValue`（可选；必须是 JsonValue；默认预算 ≤ 4KB）
- `errorSummary?: SerializableErrorSummary`（可选）
- `downgrade?: { reason?: "non_serializable" | "oversized" | "unknown" }`

约束：

- `meta` 禁止包含原始 `cause/state` 对象图；只允许 slim 投影（必要时裁剪/省略并标记 downgrade）。

## Entity: DevtoolsSnapshot（core 侧快照语义）

本实体是“core 暴露给 Devtools 的宿主内快照”，但必须可 `JSON.stringify`（便于证据包导出与跨宿主桥接）。

最小要求：

- `events: ReadonlyArray<ExportableRuntimeDebugEventRef>`
- `instances: ReadonlyMap<string, number>`（key 为 `runtimeLabel::moduleId`；value 为活跃实例计数）
- `latestStates` / `latestTraitSummaries`：若保留，key 必须包含 `instanceId`（例如 `runtimeLabel::moduleId::instanceId`），且 value 必须是 `JsonValue`（或在 `off/light` 下直接省略）

## Entity: ObservationEnvelope

来自 005：用于在 run 内提供稳定排序与可重放。

字段（以 005 schema 为准）：

- `protocolVersion: string`
- `runId: string`
- `seq: number`（run 内主排序键，允许间隙）
- `timestamp: number`
- `type: string`（例如 `debug:event`）
- `payload: JsonValue`（当 `type=debug:event` 时为 RuntimeDebugEventRef）

## Entity: EvidencePackage

来自 005：用于导出/导入证据包（默认粒度：单 `runId`）。

字段（以 005 schema 为准）：

- `protocolVersion: string`
- `runId: string`
- `createdAt: number`
- `source: { host: string; label?: string }`
- `events: ReadonlyArray<ObservationEnvelope>`
- `summary?: JsonValue`（可选）

约束：

- EvidencePackage 必须可 `JSON.stringify`；任何超限/不可序列化负载必须在进入 `events` 前被降级。

## Invariants（必须可验收）

- 任意 EvidencePackage：`JSON.stringify` 必须成功（US1 / SC-001）。
- 任意可导出事件：`moduleId + instanceId` 必填（US2 / SC-002）。
- 任意可导出事件：满足事务关联字段要求（至少携带可重建的 `txnSeq/txnId`；US2 / SC-004）。
- off 档位：不得引入递归 JsonValue 扫描或深拷贝（US3 / SC-003）。
