# Data Model: 009 事务 IR + Patch/Dirty-set 最小 IR

> 本文定义本特性的“统一最小 IR”数据模型，供 runtime / devtools / sandbox / 平台侧共同消费与对齐。

## 1) 基础概念

### 1.1 FieldPath

- **FieldPath**：canonical 表示为“段数组”（例如 `["profile","name"]`、列表字段 `["items","name"]`、以及列表结构根 `["items"]`）。文档中的 `profile.name` / `items.name` 仅作为展示形态（便于阅读）。
- **约束**：
  - 不允许使用 `*` 作为路径值（未知写入用 `dirtyAll` 表达）。
  - 列表索引不得进入 FieldPath（`items.3.name`/`items[].name` 必须归一化为 `["items","name"]`；插入/删除/重排等结构变更归一化为 `["items"]` 根）。

### 1.2 Identity（稳定标识）

稳定标识的目标是“在同一份 Static IR 与同一条回放链路中可确定重建”，不要求跨进程全局唯一。

- **ModuleId**：模块静态标识（稳定）。
- **InstanceId**：模块实例标识（稳定、外部注入）。
- **TxnSeq**：同一实例内单调递增序号（稳定）。
- **TxnId**：派生标识（建议 `${instanceId}::${txnSeq}`，可重建、可比较）。
- **OpSeq**：同一事务内单调递增序号（稳定；用于 patch/trace 排序与冲突证据）。
- **OpId**：派生标识（建议 `${txnId}::${opSeq}`）。
- **EventSeq**：同一实例内单调递增序号（稳定；用于 trace 事件排序与去重）。
- **EventId**：派生标识（建议 `${instanceId}::e${eventSeq}`；可重建、可比较）。
- **StepId / NodeId**：执行步骤与静态节点锚点；`stepId` 用于运行期 trace/诊断，`nodeId` 必须可映射到 Static IR 节点（平台对齐用）。

## 2) Transaction（事务）

### 2.1 TxnOrigin

- `kind: string`：触发源类别（例如 `action`、`watcher:update`、`trait-source`、`devtools`）。
- `name?: string`：可选显示名。
- `details?: unknown`：可选细节，必须可序列化（禁止闭包/大型对象图）；默认软上限 2KB（按 JSON 字符串长度估算），超限必须截断/丢字段或省略。

### 2.2 DirtySet

用于增量调度的最小集合：

- `dirtyAll: boolean`：是否未知写入或显式全量收敛。
- `roots: ReadonlyArray<FieldPath>`：归一化根集合（排序去重，空数组表示“无写入”；排序规则为按段数组逐段字典序的稳定排序）。

### 2.3 Patch

用于诊断/回放/合并的结构化变更记录：

- `opSeq: number`（事务内单调递增）
- `path: FieldPath`
- `affectedKeys?: ReadonlyArray<string>`（可选；Row-Scoped 二级过滤证据，推荐使用稳定 rowId/key）
- `affectedIndices?: ReadonlyArray<number>`（可选；best-effort 索引证据，不稳定，仅用于缺少 key 的过渡场景）
- `from?: unknown`（可选；full 模式；必须可序列化，不可 `JSON.stringify` 时必须省略）
- `to?: unknown`（可选；full 模式；必须可序列化，不可 `JSON.stringify` 时必须省略）
- `reason: string`（例如 `reducer`、`trait-computed`、`trait-link`、`source-refresh`）
- `stepId?: string`：若来自 trait/program 的 step
- `nodeId?: string`：若来自 Static IR 的节点锚点（平台对齐用）

**合并/冲突语义（最小裁决）**：

- 同一事务内允许同一 `stepId` 对同一 `path` 重复写入（最终值以 `opSeq` 最后一笔为准；full 模式保留完整写入序列）。
- 跨 `stepId` 对同一 `path` 的写入视为冲突：必须稳定失败并输出冲突证据（`path` + 涉及 step/node 标识）。

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
- `outcome: "committed" | "aborted"`（稳定失败必须为 `aborted`，且不提交任何写入）
- `dirty: DirtySet`
- `patchSummary: { patchCount: number }`
- `error?: { code: string; message: string; details?: unknown }`（可选；aborted 时建议填写；`details` 必须可序列化）
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

- `eventSeq: number`（同一实例内单调递增；用于事件排序与去重）
- `eventId: string`（稳定且唯一；建议派生自 `${instanceId}::e${eventSeq}`）
- `at: number`
- `level: "light" | "full"`
- `moduleId: ModuleId`
- `instanceId: InstanceId`
- `txnId?: TxnId`
- `nodeId?: string`
- `kind: string`（例如 `txn.commit` / `step.run` / `diagnostic` / `react.render`）
- `data?: unknown`（必须可序列化、Slim；默认软上限 4KB（按 JSON 字符串长度估算），超限必须截断/丢字段或省略）

### 4.2 DynamicTrace

- `meta: { moduleId: ModuleId; instanceId: InstanceId }`
- `txns: ReadonlyArray<TxnMeta>`
- `events: ReadonlyArray<TraceEvent>`
