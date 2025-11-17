# Phase 1 Data Model: Lifecycle 全面升级

**Feature**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)  
**Created**: 2025-12-16  

本数据模型用于固化“生命周期/诊断/标识”的最小可序列化事实源，为 Runtime / Devtools / Sandbox 对齐提供共同语言。

## Entity: Module Instance

**Represents**: 一个模块实例的运行单元，包含独立的初始化门禁、后台运行、终止清理与平台信号响应。

**Key fields**:

- `moduleId`: string（模块定义标识）
- `instanceId`: string（实例稳定标识；同一进程内确定性产生）
- `runtimeLabel`: string | undefined（可选的展示标签）
- `status`: `"creating" | "initializing" | "ready" | "failed" | "terminating" | "terminated"`
- `initOutcome`: Lifecycle Outcome | undefined
- `terminatedReason`: `"gc" | "fatalError" | "explicitDispose" | "unknown"`

**Relationships**:

- 1..N Lifecycle Task（按注册顺序与阶段分类）
- 0..N Lifecycle Diagnostic Event（按时间线聚合）
- 0..N Transaction（同一实例内的事务序列）

## Entity: Lifecycle Task

**Represents**: 运行时可调度的生命周期任务单元。

**Key fields**:

- `taskId`: string（实例内唯一；推荐以阶段 + 递增序列表达）
- `kind`: `"initRequired" | "start" | "destroy" | "platformSuspend" | "platformResume" | "platformReset"`
- `name`: string | undefined（用于诊断与 Devtools 展示）
- `order`: number（同一 `kind` 下的注册序号，0-based）
- `fatalOnFailure`: boolean（仅对 `start` / 平台信号类任务有意义；默认 `false`）

**Validation rules**:

- `order` 必须从 0 开始递增且无缺口（保证可对比与可重放）
- `fatalOnFailure` 对 `initRequired/destroy` 无意义：`initRequired` 永远影响可用性，`destroy` 永远 best-effort 但必须记录失败

## Entity: Lifecycle Outcome

**Represents**: 初始化或终止阶段的结果表达，供消费方与诊断系统统一理解。

**Key fields**:

- `status`: `"success" | "failure"`
- `error`: Serializable Error Summary | undefined

**Validation rules**:

- `status === "success"` 时 `error` 必须为空
- `status === "failure"` 时 `error` 必须存在且可序列化

## Entity: Stable Identity (per instance)

**Represents**: 用于因果关联与回放对齐的稳定锚点集合。

**Key fields**:

- `instanceId`: string（见 Module Instance）
- `txnSeq`: number（实例内事务递增序列，从 1 开始）
- `opSeq`: number（实例内操作递增序列，从 1 开始）

**Derived identifiers** (string, optional):

- `txnId`: string（可由 `instanceId + txnSeq` 派生；禁止随机/时间默认）
- `opId`: string（可由 `instanceId + opSeq` 派生）

## Entity: Lifecycle Error Context

**Represents**: 错误兜底与诊断事件所需的最小上下文（可序列化）。

**Key fields**:

- `phase`: `"init" | "run" | "destroy" | "platform"`
- `hook`: `"initRequired" | "start" | "destroy" | "suspend" | "resume" | "reset" | "unknown"`
- `moduleId`: string
- `instanceId`: string
- `taskId`: string | undefined
- `txnSeq`: number | undefined（若与事务相关）
- `opSeq`: number | undefined（若与操作相关）

**Validation rules**:

- `moduleId` 与 `instanceId` 必须同时存在（避免“孤立事件”）
- `taskId` 仅在任务相关错误中出现

## Entity: Lifecycle Diagnostic Event

**Represents**: 面向 Devtools/Sandbox 的生命周期结构化事件（可裁剪、可回放）。

**Key fields**:

- `type`: `"lifecycle:phase" | "lifecycle:error" | "diagnostic"`
- `moduleId`: string
- `instanceId`: string
- `phase`: `"init" | "run" | "destroy" | "platform"`
- `name`: string（例如 `init:start` / `init:success` / `destroy:start`）
- `payload`: object | undefined（必须可序列化且体积受控）
- `severity`: `"info" | "warning" | "error"`（仅对 `diagnostic`）

**Budgets**:

- 单实例一次完整生命周期内，生命周期相关事件总数 ≤ 20
- 单条事件序列化后体积 ≤ 4 KB

## State Transitions

### Instance status

- `creating` → `initializing`（开始执行必需初始化）
- `initializing` → `ready`（必需初始化全部成功）
- `initializing` → `failed`（必需初始化任一失败）
- `ready` → `terminating`（显式终止 / GC / fatal 策略触发）
- `terminating` → `terminated`（销毁任务完成；best-effort）

### Platform behavior (orthogonal)

平台信号（挂起/恢复/软重置）不改变实例存在性状态（不引起 `ready → terminating` 的隐式转换），除非显式配置为 `fatalOnFailure` 且发生未处理失败。
