# Research: 067 core 纯赚/近纯赚性能优化（默认零成本诊断与单内核）

## 现状观察（与默认税来源）

### 1) DebugSink 的“no sinks fast-path”在生产默认不生效

- `Debug.layer({ mode: "prod" })` 默认安装 `errorOnlyLayer`（sinks=1），用于保证 `lifecycle:error` 与 `diagnostic(warn/error)` 不会静默丢失。
- 但 `DebugSink.record` 的 fast-path 只覆盖 `sinks.length === 0`；当 sinks=1（errorOnly）时，仍会对每次 `Debug.record(...)` 读取 FiberRef 并进入后续分支（即使事件最终被 errorOnly 丢弃）。

落点：

- `packages/logix-core/src/Debug.ts`
- `packages/logix-core/src/internal/runtime/core/DebugSink.ts`

### 2) Trait converge 在 diagnostics=off 下仍可能构造 decision/dirtySummary

- `convergeInTransaction` 里 `shouldCollectDecision` 当前基于 `Debug.currentDebugSinks.length > 0`。
- 生产默认 sinks=1（errorOnly），因此即使 `diagnosticsLevel=off`，仍可能构造 `dirtySummary`、decision 结构等纯观测 payload。
- 这些 payload 进一步影响 `ModuleRuntime.transaction.ts` 的 `traitSummary = outcome.decision ? { converge: outcome.decision } : undefined`，变成默认档的额外分配与对象图挂载。

落点：

- `packages/logix-core/src/internal/state-trait/converge-in-transaction.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts`

### 3) kernelId / FullCutoverGate 的成本边界已基本正确（装配期）

当前实现已把 “requested kernelId → 实际 bindings/是否 fallback” 的判定收敛到装配期：

- FullCutoverGate 仅在 runtime 装配（且 `kernelId != core` 且启用 `fullCutover`）时评估；
- per-txn/per-op 热路径不基于 kernelId 分支（服务选择走 overrides + registry）。

落点：

- `packages/logix-core/src/internal/runtime/core/KernelRef.ts`
- `packages/logix-core/src/internal/runtime/core/RuntimeKernel.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
- `packages/logix-core/src/internal/runtime/core/FullCutoverGate.ts`

## 关键决策（为满足“纯赚/近纯赚”）

### Decision 1：errorOnly 单 sink 视为“高频事件无 consumer”

当 sinks 明确为 “errorOnly-only” 时：

- 对 `state:update` / `trace:*` / `action:*` 等高频事件，等价于 `Effect.void`，不需要读取 diagnosticsLevel/runtimeLabel/linkId，也不需要调用 sink.record；
- 对 `lifecycle:error` 与 `diagnostic(warn/error)` 保持现有兜底；
- 对 `diagnostic(info)` 仍保持丢弃（避免把 prod 变成 info 噪音）。

这能把默认档的 Debug.record 成本从 “FiberRef+分支+调用链” 降为 “常数级早退”。

### Decision 2：Trait converge 的 decision/dirtySummary 只在可能被消费时生成；重字段再要求可导出

将 `shouldCollectDecision` 从 “sinks.length>0” 收紧为：

- sinks 非 errorOnly-only（存在明确 consumer）。

并将 heavy/exportable 细节（trace payload、topK/hotspots、静态 IR 导出等）进一步门控为：

- `diagnosticsLevel != off` 且 sinks 非 errorOnly-only。

这样可直接避免默认档（diagnostics=off + errorOnly-only）构造 decision/dirtySummary/topK/hotspots 等纯观测 payload，并同时避免 `traitSummary` 的对象分配。

### Decision 3：不把 Exec VM mode 当作默认纯赚点

已有 Node perf evidence 显示 `LOGIX_CORE_NG_EXEC_VM_MODE` 在默认档可能触发回退/负优化，因此本特性不尝试默认开启，仅保留显式 opt-in。

参考：

- `specs/046-core-ng-roadmap/perf/README.md`

## 替代方案与取舍

### A) 只在 DebugSink.record 内做 early-return（最小改动）

优点：实现简单、改动面小；对所有 call sites 自动生效。  
缺点：call site 仍会构造事件对象并调用 `Debug.record`（虽然会早退），对极端高频 `state:update` 仍可能留下少量可优化空间。

### B) 额外在 `state:update` commit 点做“构造前门控”（更接近 spec 的 FR-001）

优点：能避免 event 对象构造与 `Debug.record` 调用本身；更接近“不会被消费就不付费”。  
缺点：需要在 commit 点读取 sinks 并维持 conservative 策略（未知 sink 视为可能消费），以免误丢事件。

本 feature 的 plan 倾向：A 必做（纯赚），B 可选但推荐（更完美）。

## 风险

- **未知自定义 sink 的语义不可判定**：为避免丢事件，任何“消费判定”必须保守（未知 sink 一律视为可能消费）。
- **diagnosticsLevel 与 Debug sinks 的组合语义**：必须保持现有语义（off 近零成本；errorOnly 的 warn/error 兜底不变），避免把行为变化当成“纯赚”。
