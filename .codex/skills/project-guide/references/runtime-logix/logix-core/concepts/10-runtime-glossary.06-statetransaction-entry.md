# 6. StateTransaction 与逻辑入口（Logical Entry）

- **StateTransaction（状态事务）**
  - 概念上是一笔「状态从某个快照演进到下一个快照」的最小原子单元，内部允许多次写入事务草稿，对外只在提交时暴露一次新状态；
  - 在当前实现中，由 Runtime 内部的 `StateTransaction / StateTxnContext` 表示，承担“聚合一次逻辑入口下所有状态演进”的职责。

- **逻辑入口（Logical Entry）**
  - 指所有会显式进入 ModuleRuntime 的入口，包括但不限于：
    - `dispatch` / `ModuleHandle.dispatch` / `handle.actions.xxx(...)`；
    - StateTrait 的 `source.refresh(fieldPath)` 写回入口；
    - 面向服务回调的专用入口（例如 `origin.kind = "service-callback"` 的写回逻辑）；
    - Devtools 触发的时间旅行与状态回放操作（`origin.kind = "devtools"`）。
  - 这些入口在 Runtime 层统一被视为“事务的起点”，**每次进入入口 API 都会开启一笔新的 StateTransaction**。

- **事务窗口（Transaction Window）**
  - 在实现层由 `runWithStateTransaction(origin, body)` 这一模式界定：从 `beginTransaction` 到 `commit` 的整个 Effect 程序即为事务窗口；
  - Runtime 不解析 `body` 内部的 Effect 结构，也不会因为出现 `Effect.sleep` / HTTP 调用等异步步骤自动拆分事务；
  - 若在同一个事务窗口内包含长时间 IO，则这笔事务的 `durationMs` 会被拉长，事务内“中间状态”对外仍然不可见。

- **Operation Window（操作窗口）**
  - 面向业务/产品文档的口径：一次用户动作触发的收敛窗口；
  - 与“事务窗口（Transaction Window）”对齐（同一窗口对外最多 0/1 次可观察提交）。

- **长链路逻辑与 IO 拆分（多入口模式）**
  - 规范层要求：单个 StateTransaction 的窗口 **SHOULD** 只覆盖“纯计算 + 状态写入”，**MUST NOT** 跨越真实 IO 边界；
  - 任何「发起 IO + 等待结果 + 写回状态」的长链路逻辑，应拆分为至少两笔事务：
    - 事务 1（入口 1）：同步更新本地状态（例如 `loading = true` / 清理错误），并通过 `Effect.fork` 等方式发起 IO，而不在当前事务内等待结果；
    - 事务 2（入口 2）：在 IO 完成时，再通过新的入口（例如 `origin.kind = "service-callback"` 的 dispatch 或专用结果 Action）写回成功/失败结果；
  - 记忆规则：**想要多笔事务，就显式触发多次入口 API；不要指望 `Effect.sleep` 或其他异步调用自动切分事务。**

## 6.1 Module（定义对象）与 ModuleTag（身份锚点）

- **ModuleDef**：`Logix.Module.make(...)` 返回的定义对象（不含 `.impl`）；带 `.tag`（ModuleTag），可 `.logic(...)` 产出逻辑值，可 `.implement(...)` 产出 `Module`（wrap）。
- **ModuleTag**：运行时“模块身份锚点”（Context.Tag），用于 Env/DI 与实例解析（按 scope；imports-scope 最近 wins）；本仓历史上的 `Module`（Tag identity）在新体系中更名为 `ModuleTag`。
- **ModuleImpl**：装配蓝图（`layer` + imports/processes 等）；用于创建局部实例（常见来源：`module.impl`）。
- **ModuleRuntime**：运行时实例（真正的“实例”语义，`getState/dispatch/changes` 等能力都在这里）。
- **ModuleHandle**：Logic 侧的只读句柄（`yield* $.use(...)` 返回；可含 handle-extend 扩展，如 controller）。
- **ModuleRef**：React 侧的句柄（`useModule(...)` 返回；含 `runtime/dispatch/actions` 等）。
- **Module**：运行时“领域模块统一形状”（wrap 定义对象），用于把“模块身份（ModuleTag）+ 可运行蓝图（ModuleImpl）+ 可选领域扩展（controller/descriptor 等）+ 可挂载逻辑/依赖（withLogic/withLayers）”收敛到一个对象上，降低调用侧拆壳心智。
- **统一消费面（unwrap 规则）**：
  - Logic：`yield* $.use(module)` 等价于 `yield* $.use(module.tag)`（在当前 scope 下解析实例；可能是 root，也可能是 imports 的 child；不负责创建新实例；返回 `ModuleHandle`）。
  - Logic：`yield* module.tag` 直接解析 `ModuleRuntime`（同样按当前 Env/scope；若需固定 root provider，用 `Logix.Root.resolve(module.tag)`）。
  - Runtime：`Runtime.make(module)` 等价于 `Runtime.make(module.impl)`（以 impl 创建局部实例）。
  - React：`useModule(module)` 默认等价于 `useModule(module.impl)`（局部/会话级创建与缓存）；若要消费 `RuntimeProvider` 中的全局实例，使用 `useModule(moduleDef)`（无 `.impl` 的定义对象）或显式传 `useModule(module.tag)`（ModuleTag）。
- **actions 语义**：Module 的 `actions` 复用 ModuleHandle 的 action dispatchers（`ModuleHandle.actions`），不引入第二套“同名 actions”函数集合。

## 6.2 背压（Backpressure）与必达通道（Lossless Channels）

- **积压（Backlog）**
  - 事件积压：Action/StateChange 在通道内等待被消费；
  - 执行积压：大量 in-flight fibers / 未完成任务占用内存。
- **短命 Fiber（Ephemeral Fiber）**
  - 指在高频触发下“创建 → 很快结束/被取消”的执行 Fiber；
  - 常见来源：`runParallel`（每次触发都并行执行）、`runLatest`（新触发取消旧执行）、UI 层频繁 `runFork(dispatch(...))`。
- **背压（Backpressure）**
  - 指当通道容量达到上限时，入口侧通过“等待”来限制生产速率，从而在不丢事件的前提下保持内存上界。
- **必达通道（Lossless Channel）**
  - 业务 Action 与关键 Task 触发属于必达通道，**不得丢弃/不得静默跳过**；
  - 当容量达到上限时，不得用 “queue full” 类错误拒绝事件；必须通过背压等待实现“必达 + 有界”。
  - 在“不引入持久化存储”的前提下，必达通道要想“有界”，只能依赖背压；
  - **重要约束**：背压等待不得发生在事务窗口内；必须把等待放在逻辑入口外侧，或采用“事务内非阻塞 enqueue → 事务外可等待 drain”的桥接结构。
- **可降级通道（Lossy Channel）**
  - 诊断/Devtools/Trace 等通道允许采样或 Ring Buffer；
  - 但必须显式记录采样率/丢弃计数/丢弃原因，以便 Devtools 可解释。

以上裁决的决策记录见 `docs/specs/intent-driven-ai-coding/decisions/adr.md` 的 ADR-004。
