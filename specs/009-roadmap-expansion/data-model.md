# Data Model: 009 事务 Patch/Dirty-set 最小 IR

> 本文定义本特性的“统一最小 IR”数据模型，供 runtime / devtools / sandbox / 平台侧共同消费与对齐。

## 1) 基础概念

### 1.1 FieldPath

- **FieldPath**：以 `.` 分隔的字段路径（例如 `profile.name`、`items[]` 的归一化根 `items`）。
- **约束**：
  - 不允许使用 `*` 作为路径值（未知写入用 `dirtyAll` 表达）。
  - 列表索引不得进入 FieldPath（`items.3.name` 必须归一化）。

### 1.2 Identity（稳定标识）

稳定标识的目标是“在同一份 Static IR 与同一条回放链路中可确定重建”，不要求跨进程全局唯一。

- **ModuleId**：模块静态标识（稳定）。
- **InstanceId**：模块实例标识（稳定、外部注入）。
- **TxnSeq**：同一实例内单调递增序号（稳定）。
- **TxnId**：派生标识（建议 `${instanceId}::${txnSeq}`）。

## 2) Transaction（事务）

### 2.1 TxnOrigin

- `kind: string`：触发源类别（例如 `action`、`watcher:update`、`trait-source`、`devtools`）。
- `name?: string`：可选显示名。
- `details?: unknown`：可选细节，必须可序列化（禁止闭包/大型对象图）。

### 2.2 DirtySet

用于增量调度的最小集合：

- `dirtyAll: boolean`：是否未知写入或显式全量收敛。
- `roots: ReadonlyArray<FieldPath>`：归一化根集合（排序去重，空数组表示“无写入”）。

### 2.3 Patch

用于诊断/回放/合并的结构化变更记录：

- `path: FieldPath`
- `from?: unknown`（可选；full 模式）
- `to?: unknown`（可选；full 模式）
- `reason: string`（例如 `reducer`、`trait-computed`、`trait-link`、`source-refresh`）
- `stepId?: string`：若来自 trait/program 的 step
- `nodeId?: string`：若来自 Static IR 的节点锚点（平台对齐用）

### 2.4 TxnMeta

事务元信息（用于 trace 与 Devtools 展示）：

- `moduleId: ModuleId`
- `instanceId: InstanceId`
- `txnSeq: TxnSeq`
- `txnId: TxnId`
- `origin: TxnOrigin`
- `startedAt: number`
- `endedAt: number`
- `durationMs: number`
- `dirty: DirtySet`
- `patchSummary: { patchCount: number }`
- `degrade?: { kind: "dirtyAll" | "budget_exceeded" | "runtime_error"; message?: string }`
- `snapshots?: { initial?: unknown; final?: unknown }`（可选；full 模式）
- `patches?: ReadonlyArray<Patch>`（可选；full 模式）

## 3) Static IR（可合并、可冲突检测）

### 3.1 IRNode

静态节点描述一个“声明性行为单元”（例如 reducer、trait-computed、trait-source、task 等）：

- `nodeId: string`（稳定）
- `kind: string`（例如 `reducer` / `trait.computed` / `trait.link` / `trait.source` / `check` / `task`）
- `reads: ReadonlyArray<FieldPath>`
- `writes: ReadonlyArray<FieldPath>`（若无法静态确定，必须显式标记为 `writesUnknown=true` 并触发更严格的运行期约束/诊断）
- `policy?: Record<string, unknown>`（预算、并发语义、降级策略、观测级别等）
- `meta?: { label?: string; tags?: ReadonlyArray<string> }`

### 3.2 IREdge

- `edgeId: string`
- `from: string`（nodeId）
- `to: string`（nodeId）
- `kind: string`（例如 `dep` / `trigger` / `imports`）

### 3.3 IRConflict

IR 层的冲突裁决对象：

- `code: "MULTIPLE_WRITERS" | "CYCLE_DETECTED" | "TAG_COLLISION" | (string & {})`
- `message: string`
- `fields?: ReadonlyArray<FieldPath>`
- `nodes?: ReadonlyArray<string>`（nodeId）
- `resolution?: { kind: "error" | "override"; details?: unknown }`

### 3.4 StaticIR

- `version: string`
- `moduleId: ModuleId`
- `nodes: ReadonlyArray<IRNode>`
- `edges: ReadonlyArray<IREdge>`
- `conflicts?: ReadonlyArray<IRConflict>`
- `indexes?: Record<string, unknown>`（build 阶段预编译索引的摘要信息）

## 4) Dynamic Trace（Slim & 可序列化）

### 4.1 TraceEvent（最小形态）

- `eventId: string`（稳定或至少实例内单调；用于排序与去重）
- `at: number`
- `level: "light" | "full"`
- `moduleId: ModuleId`
- `instanceId: InstanceId`
- `txnId?: TxnId`
- `nodeId?: string`
- `kind: string`（例如 `txn.commit` / `step.run` / `diagnostic` / `react.render`）
- `data?: unknown`（必须可序列化、Slim）

### 4.2 DynamicTrace

- `meta: { moduleId: ModuleId; instanceId: InstanceId }`
- `txns: ReadonlyArray<TxnMeta>`
- `events: ReadonlyArray<TraceEvent>`

