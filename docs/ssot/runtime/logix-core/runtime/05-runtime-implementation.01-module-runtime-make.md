# 1. 核心组装工厂：`ModuleRuntime.make`（推荐实现草图）

`ModuleRuntime.make` 是 Logix 引擎的“心脏”。它负责将静态的 Schema、Logic 和初始状态“活化”为一个运行时的 `Logix.ModuleRuntime` 实例。

> **规范层说明**
>
> - 本节给出的 `ModuleRuntime.make` 签名是一种 **推荐的实现草图**，方便解释标准实现可以如何拆分 State / Actions / Logic；
> - **不是唯一合法的构造入口**：实现方可以选择其它工厂形态（例如 `make(initialState)`），只要最终得到的 `ModuleRuntime<S, A>` 满足 1.3 小节所定义的接口与语义不变式，即视为规范合规。

## 1.1 输入与输出

```ts
function ModuleRuntime.make<Sh extends Logix.ModuleShape<any, any>>(
  initial: Logix.StateOf<Sh>,
  options?: {
    readonly createState?: Effect.Effect<SubscriptionRef<Logix.StateOf<Sh>>>
    readonly createActionHub?: Effect.Effect<PubSub<Logix.ActionOf<Sh>>>
    readonly logics?: ReadonlyArray<Logic.Of<Sh, any, any, any>>
    readonly tag?: Logix.ModuleTag<Sh>
  }
): Effect<ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>>
```

> 业务侧在多数场景下只需要提供 `initial`；`createState` / `createActionHub` 则用于自定义状态来源（例如来自其它 Layer 或远程 Store），其 Effect 往往由 `Layer.buildWithScope(...)` 得到。  
> 因此，`ModuleRuntime.make` 同时覆盖了“直接传初始值”与“显式给出 state/action Layer”两条路径。

## 1.2 内部流程

当 `ModuleRuntime.make` 被调用时（通常是在 `Effect.scoped` 上下文中），它会按以下顺序执行：

1.  **State 初始化**：若提供了 `createState`（例如通过 `Layer.buildWithScope` 从自定义 Store 获得），则直接复用；否则根据 `initial` 创建默认的 `SubscriptionRef`。
2.  **Action 通道建立**：同理，`createActionHub` 可以让调用方注入已有的 Action 通道，默认实现为 `PubSub.unbounded()`。
3.  **Runtime 构造**：组装 `getState`、`dispatch`、`actions$` 等 API，形成 `Logix.ModuleRuntime` 对象。
4.  **Logic 启动**：
    - 将 `Logix.ModuleRuntime` 注入给所有传入的 `logicLayers`；
    - 并发启动这些 Logic Effect（`Effect.forkScoped`）；
    - 任何 Logic 的失败都会导致整个 Scope 的关闭（Fail Fast）。

## 1.3 扩展点：自定义 `ModuleRuntime` 的边界

从架构上看，`ModuleRuntime<S, A>` 是 Logix 运行时的核心接口，**允许被替换/自定义，但只面向引擎实现者与适配器作者**：

- 语义不变式（任何自定义实现都必须满足）：
  - `getState` / `setState`：反映一棵单一、严格一致的 State 树；`setState` 之后后续的 `getState` / `changes` 必须能观测到新值；
  - `dispatch` 与 `actions$`：所有通过 `dispatch` 派发的 Action 必须按顺序出现在 `actions$` 流中，不允许静默丢失或跨实例/跨模块串台；
  - `changes(selector)`：是基于 State 视图的变化流，语义等价于“`stateRef.changes` + `distinctUntilChanged(selector)`”，不能混入无关事件；
  - `ref()`：提供对当前 State 的 `SubscriptionRef` 视图：
    - `ref()` 返回整棵 State 的可读写 SubscriptionRef；
    - `ref(selector)` 在当前实现中返回一个**只读派生视图**（基于 selector 从整棵 State 派生值，写入会导致运行时 `die`），主要供引擎内部与高级 Pattern 使用；业务代码仍推荐优先通过 `$.onState` / `$.flow` 订阅变化，或在必要时在调用方自行封装更语义化的 Ref。
- 典型合法用例：
  - 为“远程 Store / 既有状态机”（例如后端推送的只读 Store、Redux/Zustand 等）包装一个 `ModuleRuntime`，让 Logix 逻辑可以在它之上运行；
  - 在测试环境中实现带时间旅行 / 录制能力的 `ModuleRuntime`，用于调试与回放；
  - 为特殊平台实现“懒加载 / 分片持久化”等高级特性，但对 Logic / Flow 保持完全透明。
- 明确**不推荐**的用法：
  - 在业务模块内部为每个 Module 自行造一套“特立独行”的 Runtime；这会破坏平台统一的调试/观测能力，也会让 Intent/Flow 录制难以复用。

因此，日常业务开发应统一通过 `Logix.Module.make`（ModuleDef）+ `ModuleDef.logic` + `ModuleDef.live` 使用引擎提供的标准 `ModuleRuntime` 实现；只有在实现适配层 / 平台扩展时，才在本文件约束下自定义 `ModuleRuntime`，并通过 Root Module 的 `.impl` + `Logix.Runtime.make`（或内部 AppRuntime 组合）注入到应用级 Runtime 中。

> 换句话说：
>
> - **硬约束** 只落在 `ModuleRuntime<S, A>` 接口与上述语义不变式上；
> - `ModuleRuntime.make` / Adapter / Layer 组合等都属于 **可选的构造路径**，实现方可根据工程需要自由选择或封装。

## 1.4 EffectOp MiddlewareEnv 与统一中间件总线（补充）

> 本小节补充描述当前主线中基于 EffectOp 的统一中间件总线在 Runtime 实现层的落点，与 [`04-logic-middleware.md`](../api/04-logic-middleware.md) 中的 Logic 级 Middleware 互为补充而非替代。

- **EffectOpMiddlewareEnv（Env Service 层）**
  - Runtime 内部通过一个 Env Service 暴露当前使用的 EffectOp MiddlewareStack：

    ```ts
    export interface EffectOpMiddlewareEnv {
      readonly stack: MiddlewareStack
    }

    export class EffectOpMiddlewareTag extends Context.Tag(
      "Logix/EffectOpMiddleware",
    )<EffectOpMiddlewareTag, EffectOpMiddlewareEnv>() {}
    ```

  - 该 Service 由 `Logix.Runtime.make` 构造应用级 Runtime 时注入（见 `@logixjs/core` RuntimeOptions 中的 `middleware` 字段），所有需要走统一总线的运行时代码（例如 StateTrait.install、Resource/Query 中间件、调试中间件）都通过 `Effect.serviceOption(EffectOpMiddlewareTag)` 读取当前 stack。

- **Runtime.make 中的总线注入点（对外 API 层）**
  - Runtime 对业务侧暴露的配置约定为（简化签名）：
    ```ts
    export interface RuntimeOptions {
      readonly layer?: Layer.Layer<any, never, never>
      readonly onError?: (cause: Cause.Cause<unknown>) => Effect.Effect<void>
      readonly label?: string
      readonly middleware?: EffectOp.MiddlewareStack
      readonly stateTransaction?: {
        readonly instrumentation?: "full" | "light"
      }
    }
    ```
  - 当 `middleware` 为空或未配置时，运行时代码视为「无中间件总线」（所有 EffectOp 直接运行其内部 effect）；
  - 当传入非空的 MiddlewareStack 时，Runtime 会在应用级 Layer 中注入 `EffectOpMiddlewareEnv`，后续所有 EffectOp 行为（Action / Flow / State / Service / Lifecycle）都可以在同一总线上被拦截与装饰。

- **与 Logic Middleware 的关系**
- Logic Middleware（见 [`04-logic-middleware.md`](../api/04-logic-middleware.md)）工作在「单次边界操作」层，主要解决某段业务逻辑是否经过鉴权/审计等问题；
  - EffectOp MiddlewareStack 工作在「引擎事件」层，对所有 Action / Flow / State / Service / Lifecycle 边界统一拦截，是一个更低层、与业务无关的基础设施：
    - 典型用法包括：运行时级日志/监控、Resource/Query 集成、全局限流/熔断、统一 Debug Observer（将 EffectOp 转为 Debug 事件）；
  - 两者可以叠加使用：
    - Logic 级中间件用于表达“这段业务逻辑必须经过哪些守卫”；
    - EffectOp 总线用于保证“所有边界事件都在统一链路上可观测、可调优”。

- **公共中间件模块（`@logixjs/core/Middleware`）**
  - Runtime 并不直接依赖具体中间件实现，只依赖 `EffectOp.Middleware` / `MiddlewareStack` 抽象；具体中间件由调用方在 `@logixjs/core/Middleware` 命名空间下组合：
    - 通用中间件：以 `Middleware.Middleware` 形式实现，例如计时 / 指标上报 / 限流 / 审计 / Query 适配等，对 `op.effect` 做包装但不直接触碰 DebugSink；
    - 调试中间件：推荐使用高层组合入口 `Middleware.withDebug(stack, options?)` 在现有 `MiddlewareStack` 上一次性追加 DebugLogger（日志）与 DebugObserver（`type = "trace:effectop"`）；
    - 底层原语：`Middleware.applyDebug` / `Middleware.applyDebugObserver` 仍然可用，用于需要精细控制中间件顺序或选择性启用 logger/observer 的高级场景；
- 这样可以保持 Runtime 内核只关心“有无中间件总线”这一事实，业务侧则可以在 `Runtime.make(..., { middleware })` 一处集中挂载所需的通用与调试中间件组合，同时通过 `Middleware.withDebug` 快速打开调试链路。

## 1.5 StateTransaction 与状态提交路径

> 状态：本节与 `specs/003-trait-txn-lifecycle/spec.md` / `data-model.md` / `contracts/devtools-runtime-contracts.md` 对齐，约束正式实现中的状态事务语义与观测策略。

- **单入口 = 单事务 = 单次提交**
  - 标准 `ModuleRuntime` 内部以 `StateTransaction / StateTxnContext` 封装一次逻辑入口下的全部状态演进；
  - 支持的入口包括：`action:dispatch`、StateTrait `source.refresh` 写回、服务回调写回、Devtools 时间旅行等；
  - 对同一逻辑入口，Runtime 必须：
    - 在事务内部聚合所有 reducer / Trait / middleware 对状态的修改；
    - 只在 `commit` 时调用一次底层 `setState`，对外触发一次 `state:update` Debug 事件与一次订阅通知；
    - 确保 Debug 侧同一 `txnId` 下最多出现一条 `kind = "state"` 的 `RuntimeDebugEventRef`（见 [`09-debugging.md`](../observability/09-debugging.md)）。
  - 实现层面，`runWithStateTransaction(origin, body)` 会将 `body` 视为黑盒 Effect 程序：
    - 引擎不会尝试解析 `body` 内部的 `Effect.gen` 结构，也不会因为出现 `Effect.sleep` / HTTP 调用等异步步骤自动拆分为多笔事务；
    - 若调用方在单个 `body` 中塞入长时间 IO，则这一笔事务的 `durationMs` 将直接反映该 IO 的耗时，“中间状态”在 commit 之前对外始终不可见；
    - 因此「长链路 = 多次逻辑入口」应由 Logic/Flow 层通过多次 `dispatch` / 专用入口 Action 显式表达，而不是依赖 StateTransaction 内部的隐式切分。

- **观测策略：`"full"` / `"light"`**
  - StateTransaction 支持两个观测强度：
    - `"full"`：记录 Patch 列表、初始/最终状态快照，并在 Debug 事件中填充 `patchCount` / `originKind` 等诊断信息，供 Devtools 构建事务视图与时间旅行；
    - `"light"`：只保留必要的计时信息与最终状态，跳过 Patch 与快照构建，仍然保证“单事务 = 单次提交”的语义。
  - impl 补充（dirty-set id-first / staticIrDigest gate / 事务历史细节）：见 `../impl/README.09-statetransaction-devtools.md`。
  - 配置入口与优先级：
    - Runtime 级：`Logix.Runtime.make(root, { stateTransaction?: { instrumentation?: "full" | "light" } })`（`root` 可为 program module 或其 `.impl`）；
    - Module 级：`ModuleDef.implement({ ..., stateTransaction?: { instrumentation?: "full" | "light" } })`；
    - 默认：若调用方未显式配置，则由 `getDefaultStateTxnInstrumentation()` 基于 `NODE_ENV` 推导（dev/test 默认 `"full"`，production 默认 `"light"`）。
  - 优先级规则：**ModuleImpl 配置 > Runtime.make 配置 > NODE_ENV 默认**；无论观测强度如何变化，都不得改变事务边界与通知次数。

- **Dev-only 事务历史与时间旅行**
  - 在 dev/test 环境下，标准 ModuleRuntime 会为每个 `moduleId + instanceId` 维护一段有限长度的事务历史（当前实现为环形缓冲区，容量约 500 条）；
  - 对外通过 Devtools 契约暴露：
    - `listTransactions(moduleId, instanceId)`：返回最近事务概要（`txnId` / `origin` / `durationMs` / `patchCount` / `traitTouchedNodeIds` 等）；
    - `getTransactionDetail(moduleId, instanceId, txnId)`：返回单个事务的 Patch 列表、事件序列以及可选的 `initialStateSnapshot` / `finalStateSnapshot`；
    - `applyTransactionSnapshot(moduleId, instanceId, txnId, mode: "before" | "after")`：在 dev/test 环境中将实例状态回放到指定事务开始前或提交后的状态。
  - 时间旅行本身也被视为一次 StateTransaction：
    - 通过 `origin.kind = "devtools"` 标记，并在 `state:update` 的 `originKind` 中体现；
    - 可以选择不再次触发外部副作用（例如网络请求），但必须留下完整的事务记录供 Devtools 回放。
  - 事务历史与时间旅行能力只在 dev/test 环境开启，生产环境默认退化为 `"light"` 模式且不开启 dev-only 写入路径。

### 1.5.1 StateTrait：事务内派生收敛（Derived Converge）

> 背景：`specs/007-unify-trait-system` 将 Trait 系统定义为「对外行为不变（004 心智），对内内核强约束（006 红线）」的统一内核。  
> 运行时实现上，Trait 的核心要求是：**每次事务窗口内派生必须收敛，并且最终对外最多 0/1 次可观察提交**。

Runtime 在事务窗口的提交前，会对当前模块已注册的 `StateTraitProgram` 执行一次派生收敛（Phase 2 形态），总体顺序为：

1. 先执行业务逻辑入口（reducer / watcher writeback / middleware 产生的状态写入）。
2. 执行 **StateTrait.converge**：在事务内统一计算并写回派生字段（当前覆盖 `computed/link`）。
3. 执行 **TraitLifecycle.scopedValidate flush**：在 converge 之后统一执行本窗口累计的 scoped validate（保证读取到最新派生）。
4. 执行 **source idle 同步回收**：若任意 source 的 keySelector 结果变为空（`undefined`），在提交前同步将该字段写回 idle（避免 tearing）。
5. 执行 `commit`（若 draft 无变化则 0 commit）。

其中 converge 的关键不变式：

- **单窗口 0/1 commit**：converge 只会更新事务 draft，并通过 StateTransaction 聚合 patch；对外提交仍由 commit 统一完成。
- **拓扑顺序 + 配置硬失败**：computed/link 的 writer 图在执行前会做拓扑排序；若发现环或同一字段多个 writer，将抛错并阻止本窗口 commit（Hard Fail）。
- **预算与降级（Soft Degrade）**：converge 具有固定预算（当前实现默认 200ms）；超预算或运行期异常会：
  - 回退到 **converge 开始时的 draft**（即：只回滚本次 converge 写入的派生字段；不回滚业务入口在本窗口内的写入，避免产生半成品派生）；
  - 发出结构化诊断（见 [`09-debugging.md`](../observability/09-debugging.md)）：`trait::budget_exceeded` / `trait::runtime_error`；
  - 语义上表现为“本次窗口派生被冻结”（业务写入仍可提交）。
- **显式 deps 是唯一依赖事实源**：converge 的排序与增量调度只认 `deps`；dev/test 环境会做一次 deps-trace 辅助检查并发出 `state_trait::deps_mismatch`（warning）。

> 说明：converge 对外配置键为 `traitConvergeMode`，对应三档 requestedMode：
>
> - `auto`（默认）：以“不低于 full”为下界，在事务开始时根据 dirtyRoots 分布与计划缓存选择 executedMode（`full|dirty`），并写入可解释证据（`configScope/reasons/stepStats/cache/staticIrDigest/...`）。
> - `full`：强制 executedMode=full（用于止血/回归对比），并标记 `reason=module_override`。
> - `dirty`：强制 executedMode=dirty；dirtyRoots 不可判定（`"*"`/空 roots）时会退化为“全量计划”（证据保留 `dirtyAll`/affectedSteps 等用于解释）。  
>   覆盖优先级：`provider > runtime_module > runtime_default > builtin`（下一笔事务生效）。  
>   当前 `dirty` 模式对 list/index 的 dirtyRoots 会做折叠归一（安全但偏粗），更精细的 rowId/trackBy 粒度需后续阶段再收敛。

当前 `auto` 的决策（v0，保守可证明）：

- `txnSeq === 1`：`executedMode="full"`，`reasons=["cold_start"]`
- `dirtyAll=true` 或 rootIds 为空：`executedMode="full"`，`reasons=["unknown_write"]`
- 其他情况：计算/复用 execution plan（写入 `cache.hit/miss`）；若命中决策预算（`decisionBudgetMs`）则直接回退 `full` 并追加 `reason="budget_cutoff"`
- 若 `dirtyRoots / totalSteps >= 0.75`：回退 `full` 并追加 `reason="near_full"`
- 否则若 `affectedSteps / totalSteps >= 0.9`：回退 `full` 并追加 `reason="near_full"`；否则采用 `dirty`

> 043 time-slicing（可选）：当开启 `traitConvergeTimeSlicing` 且模块存在 `scheduling="deferred"` 的 computed/link 时，正常事务窗口只收敛 `immediate` 范围；`deferred` 范围会被合并到后续内部事务（`origin.kind="trait:deferred_flush"`）补算，因此被标记为 deferred 的派生字段允许短暂读到旧值（语义换性能）。

### 1.5.2 scoped validate：Reverse Closure（反向闭包）最小化校验范围

`TraitLifecycle.scopedValidate(...)` 会把校验请求（FieldRef → ValidateTarget）挂到当前事务，等待在提交前统一 flush。flush 时：

- Runtime 会基于 `StateTraitProgram.graph.edges` 构建 DependencyGraph；
- 对每个 validate target，计算其在依赖图中的 **Reverse Closure**（target 自身 + 所有直接或间接依赖 target 的节点）；
- 只执行 Reverse Closure 范围内的 check 规则，并将结果写回 `state.errors.*`（同构错误树）。

该策略保证：当用户只改动一个字段时，校验传播只覆盖“受影响”的规则集合，而不是全量重跑所有 check。

### 1.5.3 RowID 虚拟身份层（对外 index，内核 RowID）

> 目标：在保持对外 index 语义（RHF 心智）的前提下，为“in-flight 门控/缓存复用/稳定诊断定位”提供内部稳定身份。

Runtime 会为每个 ModuleRuntime 维护一个 `RowIdStore`：

- `RowIdStore` 只用于内核与领域包（Form/Query/…）的实现；对外仍以 `items[i]` 的 index 语义表达状态与错误树。
- 每次产生可观察提交后，Runtime 会根据 `StateTraitProgram.spec` 中声明的 `StateTraitList.identityHint.trackBy` 收集 list 配置，并对齐 `index -> RowID` 映射：
  - 若数组引用未变，RowID 不变；
  - 若长度未变且没有 reorder（按引用观测），RowID 不变；
  - 若发生 insert/remove/reorder，则优先用 trackBy（否则退回到 item 引用）复用旧 RowID，并通知“被移除的 RowID”。

RowID 的直接收益是：list.item scope 的 source-refresh 可以在插入/删除/重排下仍然把结果写回到“正确的那一行”，并在行移除时确定性清理 in-flight / trailing 状态。

### 1.5.4 StateTrait.source：两阶段提交、竞态门控与回放（Replay Mode）

`StateTrait.source` 的 refresh 入口由 `StateTrait.install` 安装到 `$.traits.source.refresh(fieldPath)`：

- **阶段 1（同步）**：在 `source.refresh` 的事务窗口内，先写入 `loading` snapshot（包含 `keyHash`）。
- **阶段 2（异步）**：在后台 fiber 中执行实际 service 调用；完成后以 `keyHash gate` 写回 `success/error` snapshot：
  - 若当前字段的 `keyHash` 已变化，旧结果会被丢弃（避免竞态覆盖）；
  - key 变空（`undefined`）时，必须同步写回 idle snapshot（清空 data/error），避免视图读取到非法中间态。

并发策略（Phase 2）：

- `concurrency = "switch"`：新 key 到来时视旧请求为过期（旧结果由 gate 丢弃，部分场景会中断旧 fiber）；
- `concurrency = "exhaust-trailing"`：忙碌时记录 trailing，并立即更新到最新 loading；in-flight 结束后补跑一次 trailing。

回放模式（Replay Mode）的核心口径是：**re-emit，不 re-fetch**。

- live 模式下：source-refresh 会把 `loading/success/error/idle` 的 ResourceSnapshot 事件记录到 `ReplayLog`；
- replay 模式下：source-refresh 不调用真实资源实现，而是按 `ReplayLog` 的顺序消费并重赛这些 snapshot，使时间旅行能够复现“当时发生了什么”。

更详细的 ReplayLog 数据模型与 Devtools 聚合口径见：[`09-debugging.md`](../observability/09-debugging.md)。

---
