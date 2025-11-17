# Data Model: 并发护栏与预警（限制无上限并发）

**Date**: 2025-12-21  
**Spec**: `/Users/yoyo/Documents/code/personal/intent-flow/specs/021-limit-unbounded-concurrency/spec.md`

## Entities

### 1) ConcurrencyPolicy（运行时并发控制面）

表示“并行事件处理模式”的可配置策略集合（runtime_default）。

**Fields**:

- `concurrencyLimit`（number | "unbounded"）
  - 语义：并行事件处理的最大 in-flight 上限。
  - 默认：`16`
  - 约束：number 必须为正整数；"unbounded" 仅允许在显式 opt-in 场景出现。
- `losslessBackpressureCapacity`（number）
  - 语义：必达通道（业务 action / 关键 task）的背压上界：允许在内存中积压的最大条目数（达到上界后入口需通过背压等待而不是继续堆内存）。
  - 默认：`4096`
  - 约束：必须为正整数；该上界只约束“运行时内部队列/缓冲”的增长，不保证对非合作调用方产生的挂起 fiber 数有硬上界。
- `allowUnbounded`（boolean）
  - 语义：是否允许显式启用无上限并发（默认 false；当 true 时仍需产出高严重度提示）。
- `pressureWarningThreshold`
  - `backlogCount`（number，默认 1000）
  - `backlogDurationMs`（number，默认 5000）
  - 语义：达到任一阈值触发预警（count 或持续时间）。
- `warningCooldownMs`（number，默认建议 30000）
  - 语义：同一触发源的重复预警合并/降噪冷却窗口。
- `overridesByModuleId`（Record<string, ConcurrencyPolicyPatch>，可选）
  - 语义：按 moduleId 的局部止血/调参覆盖（runtime_module）。

**Relationships**:

- `ConcurrencyPolicy` 可被 `ConcurrencyPolicyOverride`（scope_override/provider）覆盖。

### 2) ConcurrencyPolicyPatch（差量覆盖）

用于 `runtime_module` 或 `scope_override` 的差量覆盖（与 013 控制面一致的覆盖语义）。

**Fields**（均为可选）:

- `concurrencyLimit`
- `losslessBackpressureCapacity`
- `allowUnbounded`
- `pressureWarningThreshold.backlogCount`
- `pressureWarningThreshold.backlogDurationMs`
- `warningCooldownMs`

**Validation Rules**:

- 任一数值字段必须为有限正数（或正整数，按字段语义）。
- 若 `concurrencyLimit="unbounded"`，则必须满足“显式 opt-in”：`allowUnbounded=true`（最终由实现层强制）。

### 3) ConfigScope（配置生效来源）

复用控制面口径，用于审计与解释：

- `builtin`（内置默认）
- `runtime_default`
- `runtime_module`
- `provider`（scope_override）

### 4) ConcurrencyDiagnosticSignal（并发压力诊断信号）

用于预警与解释链路的结构化诊断载荷（必须 slim、可序列化），建议以 `diagnostic` 事件 + `trigger.details` 承载。

**Fields**:

- `code`（string）
  - 候选：`concurrency::pressure` / `concurrency::unbounded_enabled`
- `severity`（"info" | "warning" | "error"）
- `configScope`（ConfigScope）
- `moduleId`（string，可选；来自运行时 identity）
- `instanceId`（string，可选）
- `trigger`
  - `kind`（string，例如 `"watcher"` / `"task"` / `"action"`）
  - `name`（string，可选，例如 actionTag/fieldPath）
  - `details`（object，见 contracts）
- `metrics`
  - `limit`（number | "unbounded"）
  - `inFlight`（number）
  - `backlogCount`（number，可选）
  - `saturatedDurationMs`（number，可选）
- `threshold`
  - `backlogCount`（number，可选）
  - `backlogDurationMs`（number，可选）
- `cooldownMs`（number，可选）
- `degradeStrategy`（"none" | "cooldown" | "sample" | "drop"，可选）
  - 语义：本次诊断信号在“避免刷屏/避免拖垮业务”的策略下采用的降级方式（例如冷却窗口合并、采样）。
- `suppressedCount`（number，可选）
  - 语义：在冷却窗口内被合并/压制的同类信号数量（用于可解释与后续调优）。
- `sampleRate`（number，可选）
  - 语义：若采用采样策略，表示本通道当前的采样率（0~1）。
- `droppedCount`（number，可选）
  - 语义：若采用丢弃策略（仅允许在非关键通道），表示被丢弃的信号数量。

**Notes**:

- `metrics.backlogCount` 允许为空：当实现层无法稳定读取 source backlog 时，退化为“持续饱和”信号。
- 不允许携带大型对象图、闭包、Effect 实例或不可序列化对象。
