# Data Model: Runtime Internals Contracts（实体与作用域）

**Feature**: `specs/020-runtime-internals-contracts/spec.md`  
**Contracts**: `specs/020-runtime-internals-contracts/contracts/*`  
**Created**: 2025-12-21

> 目标：为“RuntimeKernel + Runtime Services/RuntimeInternals + 按实例覆写 + 可解释证据链路”提供统一数据模型（不绑定具体实现细节）。

## Entity: ModuleRuntime

表示一个模块实例对应的运行时节点（PublicModuleRuntime + 内部 Kernel 的组合抽象）。

**Fields**
- `moduleId: string`：模块标识（对外可见）。
- `instanceId: string`：稳定实例标识（确定性锚点）。
- `runtimeLabel?: string`：可选运行时标签（用于多 Runtime 并行观测）。
- `scopeId?: string`：可选 scope 标识（仅用于诊断关联，不作为身份来源）。

**Invariants**
- `instanceId` MUST 可复现（不得默认随机/时间）。
- 任何内部资源（队列/进程/缓存）生命周期 MUST 绑定到该实例的 Scope，销毁时可自动释放。

## Entity: RuntimeKernel

RuntimeKernel 是该实例的“单一装配点”：承载共享依赖与子系统解析入口。

**Fields**
- `moduleId?: string`
- `instanceId: string`
- `instrumentation: string`：观测级别或模式（例如 full/light/off；语义以 contracts 为准）。
- `isDevEnv: boolean`
- `services: ReadonlyArray<ServiceBinding>`：对外可解释的子系统绑定摘要（Slim）。

**Notes**
- Kernel 不是“胖 Context”：禁止捕获完整 Effect Context 作为字段，避免泄漏与隐式依赖。
- Kernel 负责装配/解析/闭包捕获（一次性完成依赖解析，避免热路径 Env 查找）；internal hooks 的对外访问入口由 `RuntimeInternals` 承担。

## Entity: RuntimeService（可替换内部契约）

表示一个可替换子系统的“最小契约”。

**Examples**
- `TxnScheduler`：入口排队/优先级/批处理策略（只表达调度意图与边界）。
- `TxnEngine`：事务窗口 begin→body→traits→commit 的执行语义。
- `DispatchEngine`：action 入口语义与 reducer/patch 证据接入。
- `OperationRunner`：EffectOp/middleware 的统一入口与链路标识传播。
- `InternalHooksBridge`：对 legacy internal hooks 的桥接层（内部兼容面，非 public API）。

**Minimal Contract Sketches (Draft)**  
（用于降低实现阶段歧义；以“能力面”表达，不锁死具体 TS 类型命名）

- `TxnScheduler`
  - `enqueueTransaction(request)`：将一次事务请求入队（包含 origin/priority/commitMode 等最小调度信息）。
  - `flush()`（可选）：触发一次队列 drain（实现可选择同步/异步调度策略，但必须遵守事务窗口禁止 IO）。
- `TxnEngine`
  - `runWithStateTransaction(origin, body)`：在同步事务窗口内执行 `body` 并产出提交结果（dirtySet/patchCount/commitMeta 等）。
  - `commit(result)`（可选）：把事务结果提交到对外可观察状态（通常只触发一次订阅通知）。
- `DispatchEngine`
  - `registerReducer(reducers)`：注册 reducer 映射或等价形态（供 dispatch 路径调用）。
  - `dispatch(action)`：将 action 转为事务请求（或直接在 txn 窗口内执行），并交由 TxnScheduler/TxnEngine 处理。
- `OperationRunner`
  - `runOperation(op)`：统一 EffectOp 运行入口（middleware 解析、linkId/identity 传播、错误语义与证据钩子）。

**Invariants**
- Runtime Service 必须是最小化接口（ISP）：调用方只依赖所需能力。
- 子系统之间依赖必须单向，避免环形耦合；共享能力通过 Kernel/Env 注入。

## Entity: RuntimeInternals（Internal Hooks Runtime Service）

表示“内部协作协议”的显式契约集合，用于替代散落的 `runtime.__*` / `bound.__*` 字段访问。

**Responsibilities**
- 暴露 lifecycle/transaction/traits/imports/devtools 等内部能力的最小接口；
- 作为仓库内统一访问入口（例如 internal accessor），供 `@logixjs/react`、trait-lifecycle、state-trait 等内部消费方使用；
- 在迁移期可由 shim 实现桥接 legacy 字段，但新增能力必须只依赖该 Runtime Service。

**Invariants**
- MUST 可通过 Effect Env 注入/覆写（支持按 Provider/实例/会话 Mock）。
- MUST 不持有完整 Context 或大型对象图（避免泄漏）；仅持有必要句柄与 Slim 配置。

## Entity: ServiceBinding

表示一次子系统绑定（某个 Runtime Service 选中了哪个实现与来源）。

**Fields**
- `serviceId: string`：稳定服务标识（可序列化/可比较）。
- `implId?: string`：可选的实现标识（稳定、可比较；用于解释“当前选中了哪个实现/策略”）。
- `implVersion?: string`：可选的实现版本/摘要（用于漂移检测与稳定对比；必须 Slim）。
- `scope: OverrideScope`：绑定来源范围。
- `overridden: boolean`：是否发生覆写（相对 builtin/runtime_default）。
- `notes?: string`：可选 Slim 说明（用于诊断解释）。

## Entity: ServiceOverride

表示一次“按实例/按 provider/按 runtime/module”等维度对服务绑定的覆写请求。

**Fields**
- `targetServiceId: string`
- `scope: OverrideScope`
- `patch: object`：Slim 的覆写参数摘要（不得包含函数/闭包/Effect 本体）。

**Invariants**
- 覆写 MUST 可序列化；禁止把闭包或不可序列化对象塞入 overrides。
- 覆写 MUST 不跨实例泄漏：同一进程内不同 instance 的 overrides 互不影响。

## Enum: OverrideScope

覆写与配置来源范围（优先级从低到高）：

- `builtin`
- `runtime_default`
- `runtime_module`
- `provider`
- `instance`

## Entity: RuntimeServicesEvidence

用于诊断/Devtools 的“可解释证据”：解释当前实例的子系统选择与覆写来源。

**Fields**
- `moduleId?: string`
- `instanceId: string`
- `scope: OverrideScope`：最终生效的最高来源范围（或 `builtin`）。
- `bindings: ReadonlyArray<ServiceBinding>`：每个 Runtime Service 的绑定摘要（Slim）。
- `overridesApplied: ReadonlyArray<string>`：已应用的覆写条目摘要（Slim）。

**Invariants**
- MUST Slim & 可序列化。
- diagnostics=off 时不得强制生成该结构（避免默认分配/扫描）。

## Entity: RunSession

表示一次“受控试运行会话”（用于平台侧试跑/离线分析/对比），作为证据与 IR 的关联边界。

**Fields**
- `runId: string`：会话标识（用于证据关联；不作为稳定身份锚点）。
- `source: { host: string; label?: string }`：运行环境摘要（浏览器/Node/unknown 等）。
- `startedAt?: number`：可选开始时间（仅用于诊断展示，不作为身份来源）。

**Invariants**
- RunSession MUST 不跨实例泄漏；同进程并行试跑应可隔离导出结果。
- 稳定锚点仍以 `instanceId/txn/op` 为主，runId 仅用于关联一批证据。

## Entity: RunSessionLocalState

表示 RunSession 隔离域内的“可变运行态状态”（仅用于去重/序列号分配等，不作为业务事实源）。

**Fields**
- `onceKeys: object`：用于 “once 去重” 的键集合（例如诊断告警只发一次）；必须按会话隔离，避免跨会话污染。
- `seqAllocators: object`：用于分配 opSeq/eventSeq 等单调序号的分配器集合；必须按会话隔离，支持并行会话可对比。

**Invariants**
- MUST 绑定到 RunSession/Scope 生命周期；会话结束后可释放，不得泄漏到进程级全局。
- MUST 不影响对外语义：仅用于可观测性/证据稳定性与性能优化的内部实现细节。

## Entity: TrialRunEvidence

表示一次试运行导出的“可机器处理证据集合”（不绑定具体传输）。

**Fields**
- `services?: RuntimeServicesEvidence`：子系统绑定与覆写来源证据（Slim）。
- `ir?: object`：关键 IR 摘要（例如 converge static IR 的导出或其摘要；需可序列化，且允许包含 Slim 的语义锚点/注解用于对比与可逆工程）。
- `events?: ReadonlyArray<object>`：可选事件序列（Slim；用于回放解释或调试）。

**Invariants**
- 证据结构 MUST 可序列化且可裁剪，避免默认导出大体积对象。
- diagnostics=off 时不得隐式构造/累积事件列表；平台应显式选择试运行证据级别。
