# logix-core 借助 v4 的阶梯化优化分析（可局部重构）

## 1. 分析前提

- 以你已确认的执行口径为前提：`feat/perf-dynamic-capacity-maxlevel` 合入 `main` 后再启动 v4 实施。
- 目标是 `v4-only + forward-only`，不考虑兼容层。
- 允许局部乃至中等规模重构，但必须满足 runtime 宪法约束（统一最小 IR、稳定标识、事务窗口禁 IO、诊断可序列化）。

## 2. 现状热点（logix-core）

静态盘点（`packages/logix-core/src`）：

- `Effect.locally(`：27
- `FiberRef.(unsafeMake|get|set)`：72
- `catchAll/catchAllCause`：35
- `ManagedRuntime.make / makeRuntime`：6

高复杂度核心簇（合计约 6k LOC）：

- `internal/runtime/core/process/ProcessRuntime.make.ts`（1232）
- `internal/runtime/core/WorkflowRuntime.ts`（1115）
- `internal/runtime/core/ModuleRuntime.transaction.ts`（825）
- `internal/runtime/core/DebugSink.record.ts`（1721）
- `internal/runtime/AppRuntime.ts`（503）
- `internal/runtime/core/ModuleRuntime.txnQueue.ts`（324）
- `internal/runtime/core/TaskRunner.ts`（321）

这批文件是 v4 优化的主要收益区。

## 3. 阶梯化优化清单

## Tier-1（快收益，建议并入 S2）

### T1-1 模块 Runtime 解析去“动态 Tag 构造”

锚点：

- `ProcessRuntime.make` 动态构造 Tag：`Context.Tag(\`@logixjs/Module/${dep}\`)()`  
- `triggerStreams` 动态构造 Tag 与缓存：`Context.Tag(\`@logixjs/Module/${moduleId}\`)()`

建议：

- 引入 `ModuleRuntimeRegistry`（按 `moduleId`/`instanceId` 查 runtime），由 `ModuleRuntime` 生命周期维护注册/反注册。
- `ProcessRuntime/triggerStreams` 从 registry 取 runtime，避免运行时反复构造/解析 Tag。

收益：

- 降低触发链路的上下文解析成本。
- 依赖缺失报错更早、更可控。

### T1-2 Workflow 端口解析前移到 setup

锚点：

- `WorkflowRuntime.resolveServicePort` 使用 `Context.GenericTag(serviceId)` 动态取服务。
- `withRootEnvIfAvailable` 与 `ensurePortsResolved` 中多次 `Effect.context + Context.merge + Effect.provide`。

建议：

- 在 `registerPrograms/setup` 阶段完成 port 解析与编译缓存。
- `run` 路径仅执行已解析步骤，减少上下文合并/提供的动态成本。

收益：

- 高频 run 路径更短，性能更稳定。
- 端口缺失在 setup 阶段即显式失败，提升可诊断性。

### T1-3 txnQueue 上下文注入扁平化

锚点：

- `ModuleRuntime.txnQueue` 的 `captureDiagnosticContext/withDiagnosticContext`。
- 当前做法是多次 `serviceOption + provideService + Effect.locally` 叠加。

建议：

- 合并为单一 `TxnExecutionContext` 服务（聚合 diagnostics/runtimeStore/tickScheduler/linkId）。
- 队列执行体仅做一次提供，减少每任务注入链路长度。

收益：

- 降低每个入队事务的调度开销。
- 代码路径更线性，便于 perf 证据解释。

### T1-4 清理 `Context.GenericTag`（迁移到稳定 Tag class）

锚点：

- `Logic.ts` 的 `RuntimeTag`
- `LogicDiagnostics.ts` 的 `LogicPhaseServiceTag`
- `WorkflowRuntime.ts` 的 `Context.GenericTag(serviceId)`（此处建议配合 T1-2 一并消除）

建议：

- 统一成稳定 key 的 `class Xxx extends Context.Tag("...")<...>() {}`。

收益：

- 类型推导更稳，减少宽泛 `any` 边界。
- 与 v4 迁移方向一致，降低后续维护噪音。

## Tier-2（中收益，建议 S2 后段到 S3）

### T2-1 Debug 事件管线上下文读取收敛

锚点：

- `DebugSink.record` 在 `record` 中按事件反复读取 `FiberRef`（`diagnosticsLevel/runtimeLabel/txnId/linkId`）。

建议：

- 引入 `DebugRuntimeContext` 聚合服务或 Reference 包装，统一读取入口。
- 保留现有 fast-path（errorOnly/no-sink），在普通路径减少分散读取。

收益：

- 高频 `state:update` / `trace:*` 路径可进一步降本。
- 诊断注入语义更清晰，可减少“字段何时补齐”的边缘歧义。

### T2-2 事务窗口守卫去全局深度变量

锚点：

- `TaskRunner` 里的 `inSyncTransactionGlobalDepth`（进程级可变状态）。
- `ModuleRuntime.transaction` 的 enter/exit 配对。

建议：

- 改为 runtime 作用域内的服务/Reference（每 runtime 隔离）。
- 保留“非 Effect 入口可读”的能力，但去掉跨 runtime 共享可变全局状态。

收益：

- 多 runtime 并行测试与隔离性更好。
- 降低潜在竞态与误判风险。

### T2-3 ExternalStore 去 `Effect.runSync/runFork` 直连

锚点：

- `ExternalStore.fromSubscriptionRef/fromStream` 中直接 `Effect.runSync`、`Effect.runFork`。

建议：

- 通过 runtime/Scope 绑定订阅生命周期，减少模块外裸跑 Effect。

收益：

- 生命周期管理更一致。
- 降低边界纤程泄漏风险。

## Tier-3（深重构，建议 G1 后评估再做）

### T3-1 AppRuntime 装配链去 `diffFiberRefs/patchFiberRefs`

锚点：

- `AppRuntime` 装配过程依赖 `Effect.diffFiberRefs` + `Effect.patchFiberRefs` 保留 Debug/FiberRef 变更。

建议：

- 将关键运行态（诊断/标签/调度上下文）显式建模为服务层，而非依赖 FiberRef patch 传递。
- 逐步缩小 FiberRef patch 面，最终简化装配阶段。

收益：

- boot 链路更可解释，隐式耦合更少。
- 组装阶段错误定位更直观。

### T3-2 StateTransaction 主流程拆段 + 同步窗口 DSL 化

锚点：

- `ModuleRuntime.transaction` 单文件承担事务开始、body 执行、trait converge/validate/source、提交与后处理。

建议：

- 拆成分层执行器（prepare/runSyncBody/traitPhases/commit/postCommit）。
- 把“事务窗口必须同步”做成显式 DSL/边界 API，弱化 runtime 内部的异常检测分支复杂度。

收益：

- 事务语义更可维护。
- 与后续 STM 局部引入边界更清晰。

### T3-3 STM 局部落点（按既定策略）

建议落点（已裁决）：

- `WorkflowRuntime.ProgramState`
- `ProcessRuntime` 控制面状态

禁区继续保持：

- `ModuleRuntime.transaction`
- `TaskRunner`
- 含外部 IO 的 workflow step 执行体

## 4. 建议并入 103 的执行顺序

1. S2 前半：先做 T1-1/T1-2/T1-4（收益高且边界清晰）。
2. S2 后半：做 T1-3 + T2-1（配合 perf 与诊断证据）。
3. S3：按 go/no-go 策略评估 T2-2 与 STM 局部化。
4. G1 通过后再评估 T3-1/T3-2 是否纳入本轮，否则作为 1.0 后首个性能/架构迭代。

## 5. 对性能证据链的补充建议

在既有 perf workflow（含 dynamic capacity）之上，建议新增 3 类观测点：

- `debug.record` 热路径开销（off/light/full 分档）。
- `WorkflowRuntime` 单次 run 的端口解析与执行占比（验证 T1-2 收益）。
- `txnQueue` 入队执行开销（验证 T1-3 收益）。

这些指标可直接用于 G1/G2 的“优化是否成立”判定，避免只看总体 p95 而无法解释原因。
