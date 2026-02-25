# Data Model: 098 O-008 Scheduling Surface

## Identity Rules（稳定标识）

- `instanceId`: 模块实例稳定标识（主链路锚点）。
- `txnSeq`: 事务序列号（事务窗口级锚点）。
- `opSeq`: 操作序列号（细粒度执行锚点）。
- `moduleId`: 模块标识（策略覆盖与诊断定位维度）。
- 以上字段必须可复现，禁止 random/time 默认值。

## Entities

### SchedulingPolicySurfaceSnapshot

描述“某次调度决策窗口”使用的统一策略快照。

- `concurrencyLimit: number | "unbounded"`
- `allowUnbounded: boolean`
- `losslessBackpressureCapacity: number`
- `pressureWarningThreshold.backlogCount: number`
- `pressureWarningThreshold.backlogDurationMs: number`
- `warningCooldownMs: number`
- `configScope: "builtin" | "runtime_default" | "runtime_module" | "provider"`
- `resolvedAtTxnSeq?: number`

**Invariant**:

- 同一 `SchedulingDecisionWindow` 内只能关联一份快照。
- 快照一旦绑定窗口，不可在窗口中途变更。

### SchedulingDecisionWindow

定义一次可解释调度过程（从入口排队到 tick flush 完结）。

- `windowId: string`（可由 instanceId + txnSeq 派生）
- `instanceId: string`
- `txnSeq: number`
- `lane: "urgent" | "nonUrgent"`
- `policySnapshotRef: string`
- `startedAtOpSeq: number`
- `endedAtOpSeq?: number`

### SchedulingDiagnosticEvent

用于 backlog/degrade/recover 统一诊断。

- `kind: "backlog" | "degrade" | "recover"`
- `reason: "capacity" | "duration" | "budget_steps" | "cycle_detected" | "starvation_guard" | "manual_force" | "unknown"`
- `instanceId: string`
- `moduleId?: string`
- `txnSeq?: number`
- `opSeq?: number`
- `configScope: SchedulingPolicySurfaceSnapshot["configScope"]`
- `observed.backlogCount?: number`
- `observed.saturatedDurationMs?: number`
- `observed.boundary?: "microtask" | "macrotask"`
- `threshold.backlogCount?: number`
- `threshold.backlogDurationMs?: number`
- `cooldownMs?: number`
- `suppressedCount?: number`

**Invariant**:

- 每条事件必须可映射到一个真实调度事实。
- 事件 payload 必须 slim 且可序列化。

## Relationships

- `SchedulingDecisionWindow` `1 -> 1` `SchedulingPolicySurfaceSnapshot`
- `SchedulingDecisionWindow` `1 -> N` `SchedulingDiagnosticEvent`
- `SchedulingDiagnosticEvent` 通过 `instanceId/txnSeq/opSeq` 回链到运行轨迹。

## State Transition Rules

- `backlog` 触发条件：达到容量阈值或持续时长阈值。
- `degrade` 触发条件：tick 调度选择退化边界（如 microtask → macrotask）。
- `recover` 触发条件：系统回到稳态并退出 backlog/degrade。
- `recover` 之后若再次触发 `backlog/degrade`，必须作为新事件发出，且可区分 cooldown 抑制周期。
