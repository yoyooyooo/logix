# Phase 1 Data Model: Process（长效逻辑与跨模块协同收敛）

**Feature**: [spec.md](./spec.md) (`/Users/yoyo/Documents/code/personal/intent-flow/specs/012-program-api/spec.md`)  
**Research**: [research.md](./research.md) (`/Users/yoyo/Documents/code/personal/intent-flow/specs/012-program-api/research.md`)  
**Created**: 2025-12-16

本数据模型用于固化 Process 的最小可序列化事实源，为 Runtime / Devtools / Sandbox / React 集成提供共同语言。

## Entity: Process Definition

**Represents**: 对“长效逻辑与跨模块协作”的声明（What），包含触发、并发、错误与诊断策略，但不绑定具体运行时装配位置。

**Key fields**:

- `processId`: string（稳定标识；建议由作者显式提供）
- `name`: string | undefined（展示名）
- `description`: string | undefined（意图描述，便于诊断与 Devtools 展示）
- `requires`: string[] | undefined（依赖模块/能力的最小集合；仅用于装配校验与错误提示）
- `triggers`: Process Trigger Spec[]（触发源集合）
- `concurrency`: Process Concurrency Policy（并发语义）
- `errorPolicy`: Process Error Policy（错误策略）
- `diagnosticsLevel`: `"off" | "light" | "full"`（诊断分档）

**Validation rules**:

- `processId` 必须非空且稳定；不得默认使用随机/时间生成。
- `requires` 的校验必须以“安装点作用域可见性”为准：不可跨作用域兜底。

## Entity: Process Installation

**Represents**: Process 被安装到某个作用域的装配记录（生命周期边界由安装点决定）。

**Key fields**:

- `identity`: Process Identity（`processId + scope`）
- `enabled`: boolean（是否启用；默认 true）
- `installedAt`: string | undefined（元信息；不得用于稳定身份派生）

**Validation rules**:

- 同一作用域内 `processId` 必须唯一；重复安装应表现为幂等更新（避免隐式多份实例）。
- 缺失依赖必须稳定失败并给出可修复提示（缺失项 + 建议安装点/导入路径）。

## Entity: Process Instance

**Represents**: Process 在某个具体作用域内的运行实例（随作用域启停），可被监督与诊断。

**Key fields**:

- `identity`: Process Instance Identity（`processId + scope + runSeq`）
- `status`: `"starting" | "running" | "stopping" | "stopped" | "failed"`
- `lastError`: Serializable Error Summary | undefined
- `stoppedReason`: `"scopeDisposed" | "manualStop" | "failed" | "unknown"` | undefined

**Validation rules**:

- `runSeq` 必须在同一安装记录内单调递增（从 1 开始）；监督重启会递增。
- `failed` 状态必须伴随 `lastError`（可序列化摘要）。

## Entity: Process Trigger (Spec / Occurrence)

**Represents**: 触发源描述（Spec）及其一次触发发生时的可序列化上下文（Occurrence）。

**Key fields**:

- `kind`: `"moduleAction" | "moduleStateChange" | "platformEvent" | "timer"`
- `name`: string | undefined（可选的稳定名，用于诊断与过滤）
- `moduleId`: string | undefined（当 kind 属于模块触发时）
- `instanceId`: string | undefined（当触发来自某个模块实例时；实例由作用域决定，不得“猜”）
- `actionId`: string | undefined（当 kind 为 moduleAction）
- `path`: string | undefined（当 kind 为 moduleStateChange，可用于表达字段/范围）
- `platformEvent`: string | undefined（当 kind 为 platformEvent）
- `timerId`: string | undefined（当 kind 为 timer）
- `txnSeq`: number | undefined（Occurrence：当 kind 为 moduleAction/moduleStateChange 时必填；同一模块实例内单调递增；用于派生 `txnId = ${instanceId}::t${txnSeq}` 并对齐 Devtools 聚合）
- `triggerSeq`: number | undefined（Occurrence：同一 Process run 内单调递增）

**Validation rules**:

- Trigger 必须可序列化，且上下文字段必须是稳定标识或可推导等价集合。
- 当 Trigger 来自模块事务（moduleAction/moduleStateChange）时，必须携带 `txnSeq`（禁止用随机/时间替代）；以满足“moduleId + instanceId + txnId/等价集合”的稳定锚点硬约束。

## Entity: Process Concurrency Policy

**Represents**: Process 处理触发时的并发语义。

**Key fields**:

- `mode`: `"latest" | "serial" | "drop" | "parallel"`
- `maxParallel`: number | undefined（对 parallel）
- `maxQueue`: number | undefined（对 serial）

**Validation rules**:

- 任何背压/丢弃行为都必须产生可诊断证据（至少在 light/full 下）。
- `serial` 未配置 `maxQueue` 时视为 `unlimited`，但仍受运行时护栏约束；默认超限策略为 failStop，并产出 `process:error`（`error.code=process::serial_queue_overflow`）与可修复 `hint`（建议配置 `maxQueue` 或改用 `latest/drop`）。

## Entity: Process Error Policy

**Represents**: Process 失败时的策略（可运维）。

**Key fields**:

- `mode`: `"failStop" | "supervise"`
- `maxRestarts`: number | undefined（对 supervise；必须有明确上限）
- `windowMs`: number | undefined（对 supervise；可选的时间窗口）

**Validation rules**:

- 禁止隐式无限重试；当达到上限必须停止并进入可解释状态。

## Entity: Process Identity Model (Stable Anchors)

**Represents**: Process 的稳定锚点集合，用于因果关联与回放对齐。

**Key fields**:

- `processId`: string
- `scope`: `{ type, ... }`（应用级/模块实例级/UI 子树级）
- `runSeq`: number（实例运行序列）
- `triggerSeq`: number（实例触发序列，事件级别）

**Derived identifiers** (string, optional):

- `processInstanceId`: string（可由 `processId + scope` 派生；不得使用随机/时间）

## Entity: Process Diagnostic Event

**Represents**: 面向 Devtools/Sandbox 的 Process 结构化事件（Slim、可裁剪、可回放）。

**Key fields**:

- `type`: `"process:start" | "process:stop" | "process:restart" | "process:trigger" | "process:dispatch" | "process:error"`
- `identity`: Process Instance Identity
- `trigger`: Process Trigger | undefined
- `dispatch`: `{ moduleId: string; instanceId: string; actionId: string }` | undefined（跨模块驱动摘要）
- `error`: Serializable Error Summary | undefined
- `severity`: `"info" | "warning" | "error"`
- `eventSeq`: number（同一 Process Instance 内单调递增；用于稳定排序与去重）
- `timestampMs`: number（事件发生时间；仅用于展示/聚合，不作为主排序键）

**Validation rules**:

- `process:trigger` 必须携带 `trigger`；当 `trigger.kind` 为模块触发时，`trigger.txnSeq` 作为源事务锚点（满足 `moduleId + instanceId + txnId/等价集合`）。
- `process:dispatch` 必须同时携带 `trigger` 与 `dispatch`，以便回答“哪个触发（含事务锚点）最终驱动了哪个模块动作”。
- `process:error` 必须携带 `error`（可序列化摘要）。

**Budgets**:

- 单个 Process run 内，Process 相关事件总数 ≤ 50（包含 trigger/dispatch；超限必须裁剪并产出摘要）
- 单条事件序列化后体积 ≤ 4 KB

## Entity: Serializable Error Summary

**Represents**: 可序列化的错误摘要（不携带对象图）。

**Key fields**:

- `name`: string | undefined
- `message`: string（必填）
- `code`: string | undefined
- `hint`: string | undefined（可行动建议）

## State Transitions

### Process Instance status

- `starting` → `running`（启动成功）
- `starting` → `failed`（启动失败；错误策略决定是否进入监督重启）
- `running` → `stopping`（作用域卸载/显式停止/策略触发）
- `stopping` → `stopped`（停止完成；释放资源）
- `running` → `failed`（运行中失败；默认失败即停，或受控监督重启）
