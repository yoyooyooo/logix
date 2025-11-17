# Data Model: Devtools Session‑First（会话/锚点/处方）

**Feature**: `specs/038-devtools-session-ui/spec.md`  
**Contracts**: `specs/038-devtools-session-ui/contracts/*`  
**Created**: 2025-12-27

> 目标：为“因果锚点驱动的会话聚合、树状导航、Advisor 处方与离线确定性”提供统一数据模型（不含实现细节）。

## Entity: CausalAnchor

表示可用于关联与归因的稳定锚点（优先级从强到弱）。

**Fields**

- `linkId?: string`：跨事务/跨模块的链路锚点（trace id）；首选会话身份来源。
- `txnId?: string`：事务锚点（例如 `${instanceId}::t${txnSeq}`）；当 `linkId` 缺失时退化使用。
- `txnSeq?: number`：instance 内单调递增事务序列（辅助排序/对齐）。
- `eventId: string`：事件锚点（例如 `${instanceId}::e${eventSeq}`）。
- `eventSeq: number`：instance 内单调递增事件序列（排序/去重，不依赖时间戳）。
- `opSeq?: number`：边界操作序列（若可用；用于把 service/source/trait 等步骤归并为子作用域）。

**Invariants**

- 锚点字段必须稳定可复现（禁止随机/时间作为身份来源）。
- 当锚点缺失导致关联不确定时，必须在聚合结果中显式标注退化（`confidence/degradedReason`）。

## Entity: InteractionSession

一次入口触发到系统稳定（Settled）的聚合单元，是 Devtools 默认导航与诊断入口。

**Fields**

- `sessionId: string`：确定性派生 id；首选 `linkId`，退化到 `txnId`/`windowId`。
- `title: string`：入口标签（如 action tag / effectop name / fallback label）。
- `status: "running" | "settled"`：会话是否仍在增长（live 模式）。
- `confidence: "high" | "medium" | "low"`：聚合可信度。
- `degradedReason?: string`：退化原因枚举（例如 `missing_linkId`、`window_fallback`）。
- `startedAtMs: number`：会话开始时间（元信息，不作为身份来源）。
- `endedAtMs: number`：会话结束时间（元信息；running 时可等于最新事件时间）。
- `durationMs: number`：`endedAtMs - startedAtMs`。
- `anchors: { linkId?: string; txnIds: ReadonlyArray<string> }`：会话覆盖的主要锚点集合。
- `metrics: SessionMetrics`：会话成本与结果摘要。
- `health: SessionHealth`：健康等级与触发原因摘要（可下钻到证据）。
- `pulses?: PulseBuckets`：可选：会话内的脉冲时间序列（用于 Overview 与会话卡片的 MicroSparkline）。

**Relations**

- 1 InteractionSession → 0..N `SessionNode`（树状导航节点）
- 1 InteractionSession → 0..N `AdvisorFinding`（处方）

## Entity: SessionNode

会话内部的“因果作用域节点”，用于左侧树状导航与右侧明细聚合。

**Fields**

- `nodeId: string`：确定性派生 id（例如 `${sessionId}::txn:${txnId}`）。
- `kind: "session" | "txn" | "effectop" | "trait" | "react" | "diagnostic" | "custom"`：节点类别。
- `label: string`：人类可读标签（例如 txn origin / effectop name / component label）。
- `primaryParentId?: string`：主父节点（用于树）。
- `relatedNodeIds?: ReadonlyArray<string>`：非树边关联（用于 DAG 保真）。
- `anchor: CausalAnchor`：该节点的关键锚点。
- `startedAtMs: number` / `endedAtMs: number`：节点时间范围（元信息）。
- `metrics?: SessionMetrics`：可选：节点级成本摘要。
- `health?: SessionHealth`：可选：节点级健康摘要。

**Notes**

- 内部模型允许 DAG；UI 默认选择 `primaryParentId` 形成主树，其余边通过 `relatedNodeIds` 展示为引用。

## Entity: SessionMetrics

会话/节点的成本与影响面摘要（用于对比与健康信号）。

**Fields**

- `eventCount: number`
- `txnCount: number`
- `patchCount?: number`：可选：来自 `state:update.meta.patchCount` 的聚合统计。
- `renderCount: number`：react 影响统计（`trace:react-render` 等）。
- `effectOpCount?: number`：可选：边界操作数量（`trace:effectop`）。

**Invariants**

- 指标必须可由事件切片完全重建（不依赖外部状态）。

## Entity: PulseBuckets

用于 “Pulse（脉冲）/MicroSparkline” 的时间桶序列。表达目标是：在不阅读全量 timeline 的前提下，让用户一眼看出“密度/爆发/抖动”。

**Fields**

- `bucketMs: number`：时间桶大小（毫秒）。
- `buckets: ReadonlyArray<PulseBucket>`：按时间顺序排列的 buckets（长度通常固定，例如 24）。

## Entity: PulseBucket

**Fields**

- `bucketId: number`：桶 id（可用 `Math.floor(timestamp / bucketMs)` 的口径）。
- `txnCount: number`：该桶内的 txn 密度（优先用 `txnId` 去重；缺失时必须可解释退化）。
- `renderCount: number`：该桶内的 render 密度（`react-render`/`react-selector` 的计数或聚合）。
- `level: "ok" | "warn" | "danger"`：该桶的健康等级（按阈值换算为每秒口径）。

## Entity: SessionHealth

会话健康信号（ok/warn/danger）与可解释触发原因。

**Fields**

- `level: "ok" | "warn" | "danger"`
- `reasons: ReadonlyArray<{ code: string; message: string; evidence?: EvidenceRef }>`

## Entity: AdvisorFinding

Advisor 输出的处方卡片：结论 + 证据 + 建议（可执行）。

**Fields**

- `findingId: string`：确定性派生 id（建议基于 `sessionId + code + evidenceDigest`）。
- `sessionId: string`
- `severity: "info" | "warning" | "error"`
- `code: string`：模式识别码（如 `waterfall` / `degraded` / `unknown_write`）。
- `title: string`
- `summary: string`：给用户的短结论（不超过一屏）。
- `evidence: ReadonlyArray<EvidenceRef>`：证据引用（事件/节点/指标阈值命中）。
- `recommendations: ReadonlyArray<{ title: string; steps: ReadonlyArray<string> }>`
- `confidence: "high" | "medium" | "low"`

## Entity: EvidenceRef

用于把聚合/处方回链到“可自证”的事实源。

**Fields**

- `kind: "event" | "node" | "metric" | "snapshot"`
- `ref: string`：例如 `eventId` / `nodeId` / `metricKey`
- `note?: string`
