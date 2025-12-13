# runtime-logix · 实现备忘录 (Implementation Notes)

> **Status**: Draft (v3 Final · Implementation Planning)
> **Scope**: 运行时实现层的补充说明与技术备忘，不作为对外 API 契约，仅服务于后续落地与演进。

本目录用于沉淀 **Logix Engine 运行时侧** 的实现细节、技术决策与潜在风险分析。
核心目标：

- 把「架构规范」背后的 **具体实现思路** 写清楚，避免后续开发时各自揣测导致跑偏；
- 在进入实现阶段前，提前暴露「难点 / 隐患 / 取舍」，形成可审阅的技术决策记录；
- 为未来 v4 等版本的演进预留空间（如 Env 强隔离、Lazy 模块加载等），但不绑死当前实现。

## 使用方式

- 当我们在讨论 **App/Module/Store 模块体系、Logic Middleware、Store 生命周期、调试/诊断机制** 等「架构级」能力时，**务必同步在本目录下补一份实现备忘**：
  - 描述预期的 Effect/Layer/Scope 组合方式；
  - 标出可能的坑（性能、可观测性、错误语义、与平台解析的耦合点等）；
  - 若有多种实现路径，明确当前“首选方案”与备选方案。
- 本目录中的文档可以比 core/ 下的规范 **更细、更偏工程实现**，但一旦发现与核心规范冲突，应先修 core/ 规范，再修这里。

## 规划中的子文档

建议按能力领域拆分实现备忘，并随着实现推进逐步填充：

- `app-runtime-and-modules.md`  
  记录 AppRuntime（`makeApp`）/ `Logix.Module` / `ModuleDef` 的 flatten 规则、`imports/providers/processes/exports` 的展开顺序，以及 v3 使用 Env 扁平合并的具体实现方案；分析未来 Env 裁剪 / Lazy 模块加载的可能路径与风险。

- `logic-middleware-and-aop.md`  
  记录 Logic Middleware (`Logic.Meta` / `Middleware` / 组合与注入方式) 的实现草图：如何在 Logic 构造周期内挂载 Module/App 级 `middlewares`，如何保证 A/E/R 泛型不被破坏，以及平台如何可靠识别可解析子集。

- `module-lifecycle-and-scope.md`  
  记录 Store 生命周期钩子 (`lifecycle.onInit/onDestroy`) 与 Effect Scope 的绑定关系：Local Store vs Global Store 的 Scope 管理、finalizer 的注册时机与错误处理策略。

- `watcher-performance-and-flow.md`  
  记录 `$.onAction / $.onState / $.on` watcher 与 Flow/Logic/ModuleRuntime 之间的调用链、性能模型，以及当前 PoC 在浏览器环境下的压测基线与调优建议。

> 注：以上文件名与拆分方式可以根据实际实现调整，关键是做到：**每一块复杂能力，在规范确定后，都有一份对应的实现说明文档可查**。

## 目录与依赖铁律（logix-core 实现侧）

在 `packages/logix-core/src` 的实现中，约定以下几条“铁律”来约束代码布局与依赖方向，确保后续重构时不至于陷入循环依赖或实现语义漂移。

### 1. 顶层子模块 vs internal

- `src/*.ts` 直系文件视为「子模块」：`Module.ts` / `Logic.ts` / `Bound.ts` / `Flow.ts` / `Runtime.ts` / `Link.ts` / `Platform.ts` / `Debug.ts` / `MatchBuilder.ts` 等。
- 这些子模块必须包含**实际实现代码**（工厂函数、Thin Wrapper、组合逻辑），**不能**仅作为 `export * from "./something"` 的纯 re-export。
- 多个子模块共享的实现细节，统一下沉到 `src/internal/**`，再由子模块引入：
  - 例如 Module 类型内核在 `src/internal/module.ts`，Bound 实现内核在 `src/internal/runtime/BoundApiRuntime.ts`；
  - 顶层 `Module.ts` / `Bound.ts` 等只通过 `import * as Internal from "./internal/..."` 拿到这些能力并收口为公共 API。
- **禁止**从 `src/internal/**` 反向 import 顶层子模块（`src/Module.ts` / `src/Logic.ts` / `src/Bound.ts` / `src/Flow.ts` 等），防止 internal 与公共 API 形成环依赖。

### 2. internal 内部的浅/深分层（浅 → 深 单向依赖）

为避免 internal 自身变成“黑盒大杂烩”，`src/internal/**` 内部也约定一条严格的浅/深分层原则：

- **核心实现一律下沉到 `src/internal/runtime/core/**`**：
  - `src/internal/runtime/core/module.ts`：ModuleShape / ModuleRuntime / ModuleInstance / ModuleImpl / BoundApi 等类型与核心契约；
  - `src/internal/runtime/core/LogicMiddleware.ts`：Logic.Env / Logic.Of / IntentBuilder / FluentMatch / Middleware 等 Logic 内核；
  - `src/internal/runtime/core/FlowRuntime.ts`：Flow.Api & `make(runtime)` 的具体实现；
  - `src/internal/runtime/core/Lifecycle.ts`：LifecycleManager / LifecycleContext 与生命周期调度实现；
  - `src/internal/runtime/core/Platform.ts`：Platform.Service / Platform.Tag 抽象；
  - `src/internal/runtime/core/DebugSink.ts`：Debug 事件模型与默认 Sink 实现；
  - `src/internal/runtime/core/MatchBuilder.ts`：`makeMatch` / `makeMatchTag` 的实现。

- **浅层 internal 文件只做 re-export 或薄适配，不再承载复杂实现**：
  - `src/internal/module.ts` 仅 `export * from "./runtime/core/module.js"`，给顶层子模块提供一个稳定入口；
  - `src/internal/LogicMiddleware.ts` / `src/internal/MatchBuilder.ts` / `src/internal/platform/Platform.ts` / `src/internal/debug/DebugSink.ts` 同理，全部只是从 `runtime/core/**` re-export；
  - `src/internal/runtime/FlowRuntime.ts` / `src/internal/runtime/Lifecycle.ts` 也只转发到对应 core 文件。

- **依赖方向约束**：
  - 浅层 internal（`src/internal/*.ts`、`src/internal/runtime/*.ts`）→ 允许 import `./runtime/core/**`；
  - `src/internal/runtime/core/**` → 只能依赖 `effect` 及 sibling core 文件，不得回头 import 上层 internal；
  - 检查方式：`rg "../" src/internal/runtime` 应保持为空（core 目录内除外），所有跨文件引用应表现为：
    - `./core/module.js`、`./core/LogicMiddleware.js`、`./Lifecycle.js` 这类“同级或更深”路径。

这一分层的目标是：

- 让“真正的运行时内核”在一个相对封闭的 core 子目录中演化，方便未来做拆包或抽取独立运行时；
- 浅层 internal 文件则承担“为顶层子模块提供稳定入口”的角色，避免顶层 API 与核心实现强耦合。

## 内部 Config Service 约定（Tag + layer）

在运行时实现层，对“运行期行为参数”（如 React 集成中的 `gcTime`、初始化超时等）统一采用 **Config Service** 模式：

- 为每类配置定义一个 Shape 接口与 Tag：
  - `interface XxxConfigShape { /* 完整配置字段 */ }`
  - `class XxxConfigTag extends Context.Tag<"XxxConfig", XxxConfigShape>() {}`
- 提供一个最小的 helper Namespace，至少包含：
  - `XxxConfig.tag`：导出 Tag 本体（lowerCamelCase，便于与 effect 风格对齐）；  
  - `XxxConfig.replace(partial: Partial<XxxConfigShape>)`：在当前 Env 中已有的配置基础上叠加 partial，若不存在则以 `DEFAULT_CONFIG` 为初始值，返回一个新的 Layer。
- 使用约束：
  - 运行时代码通过 `Effect.service(XxxConfigTag)` 读取配置，不直接访问 `DEFAULT_CONFIG`；  
  - 调用方若需要覆盖默认行为，通过 Runtime 或 Provider 的 `layer` 合成额外的 `XxxConfig.replace({...})` 覆写（语义类似 Logger.replace）；  
  - 是否从 `Effect.Config` / 环境变量补齐默认值，由 Config Service 内部实现决定，不向业务暴露细节。

`ReactRuntimeConfigTag` + `ReactRuntimeConfig.replace`（见 `@logix/react` 内部）是这一模式的参考实现；在命名上约定 `ReactRuntimeConfig.tag` 暴露 Tag，避免在 helper namespace 下再出现大写 `Tag` 属性。

## Universal Bound API / Module 的实现硬约束（v3 Final）

以下内容是对 `core/02-module-and-logic-api.md` 与 `core/03-logic-and-flow.md` 中最终架构的 **实现侧补充**，一旦开始写运行时代码，应视为硬性约束：

1. **Module 形态与品牌化**
   - `Logix.Module` 必须是一个「类型 + Tag + Factory」的统一抽象：
     - 提供 Module Id（字符串）、State/Action Schema、Shape 类型；
     - 暴露一个可注入 Env 的 `.logic(($) => Effect)` 工厂；
     - 同时充当 `Context.Tag`，用于 Env/Layer 提供和 `$.use` 的参数。
   - 建议在类型层为 Module 加品牌标记，例如：
     - `interface ModuleMarker<Shape> { readonly _kind: "Module"; readonly _shape: Shape }`；
     - `Logix.Module.make(...)` 返回的对象需实现该接口（既是 Tag，又携带 Shape 信息与工厂能力）。
   - `$.use` 的实现 **只能** 识别两类参数：实现了 ModuleMarker 的 Module 定义，以及普通 Service Tag；不得接受手写 `Context.GenericTag` 作为 Module。

2. **StoreHandle 与 Runtime 的解耦**
   - 对外暴露的 StoreHandle 类型必须是 Runtime 的「只读投影」，能力固定为：
     - `read(selector?)`：从当前 State 拿到一个快照值（非 Stream）；
     - `changes(selector)`：返回对应 selector 的 `Stream`；
     - `dispatch(action)`：向该 Store 派发 Action。
   - StoreHandle **不得** 直接暴露 `mutate` / `update` 或任何可以跨 Store 写入 State 的方法；
   - 内部实现可以通过封装底层运行时容器，但类型上要确保未来新增 Runtime 能力不会自动“渗透”到 Handle 接口。

3. **`$.use` 的运行时语义**
   - `$.use(Module)`：
     - 在类型上返回 StoreHandle<Shape>（即某个 ModuleRuntime 的只读视图）；
     - 在运行时，通过当前 Logic Env 中的 `Logix.ModuleTag` 或其他注册表查找对应 Runtime，再包装成 Handle；
     - 需要保证在未提供对应 ModuleRuntime 时给出**显式错误**（而不是静默返回 dummy）。
   - `$.use(ServiceTag)`：
     - 只是 `Effect.service(tag)` 的语法糖；
     - 建议在实现上仍通过 Tag 机制获取依赖，以避免出现“旁路注入”。

4. **Fluent DSL（`$.onState` / `$.onAction` / `$.on`）与 Flow 的翻译关系**
   - 所有 Fluent API 必须在运行时被机械地翻译为已有 `Flow.Api` 组合，而不是引入第二套执行语义：
     - `$.onState(selector)` → `$.flow.fromState(selector)`；
     - `$.onAction(predicate)` → `$.flow.fromAction(predicate)`；
     - `$.on(stream)` → 原样使用传入的 Stream；
     - `update/mutate/run*(effect)` → 等价于 `source.pipe(...ops, $.flow.run* (effect))`。
   - 并发策略映射表应在实现中固定下来，例如：
     - `mode: "parallel"` → `runParallel`；
     - `"latest"` → `runLatest`；
     - `"exhaust"` → `runExhaust`；
     - `"sequence"` → `run`（队列语义与默认 `run` 一致）。
   - 任何新增 Fluent API（例如 `whenEffect` 或 `whenInterval`）都必须以同样的方式可逆映射到 Flow/Effect 原语。

5. **白盒/黑盒边界在 runtime 层的配合**
   - 即便 Parser 只对白盒 Fluent 链给出结构化语义，runtime 实现也应保证：
     - Fluent 与非 Fluent 路径在错误语义与资源管理上完全一致（同样的 Scope / 同样的取消行为）；
     - Raw Mode（直接使用 `Flow.*` 或 `Stream.pipe`）不会绕开并发控制 / Lifecycle 约束。
   - 建议在实现中为 Fluent 路径留出 Hook（例如记录链路元信息），便于后续在调试/追踪视图中展示更友好的信息。

6. **多实例 Module 与 Runtime 的关系（留白但需记录）**
   - 目前文档默认“一类 Module 定义对应一类领域模块的 Runtime 实例”，但实际实现可能需要支持多实例（例如多 Tab Cart）；
   - 建议在实现设计中预留：
     - Module 作为「类型与 Factory」；
     - 实际实例标识（如 key / scopeId）由上层 Runtime 或 React Adapter 管理。
   - 一旦确定多实例方案，应在本目录单独补一份 `module-and-multi-instance.md`，并同步更新 `core/02-module-and-logic-api.md`。

以上条目如果在实现中出现偏差（例如 `$.use` 支持第三类 Tag、StoreHandle 新增写接口），**必须优先回到本文件与 core 规范中进行讨论与修订**，再进入代码变更。这样可以保证 v3 的实际运行时代码始终围绕「Context is World + Universal $」的初衷演进。

---

## ModuleImpl / withLayer / AppRuntime.provide(ModuleImpl) 的实现要点

> 对应规范：`core/02-module-and-logic-api.md` 中的 ModuleImpl 蓝图能力。

在实现层，ModuleImpl 相关能力的硬约束与当前做法：

1. **Module.make → ModuleImpl 的构造路径**
   - `Logix.Module.make(id, def)` 在内部委托给 `ModuleFactory.Module` 创建：
     - 先根据 Schema 推导出 `ModuleShape`；
     - 定义 `ModuleInstance.logic`：从当前 `Context` 中取出 ModuleRuntime，并基于它构造 Bound API `$`；
  - 定义 `ModuleInstance.live(initial, ...logics)`：调用 `ModuleRuntime.make(initial, { tag, logics, moduleId })`，挂载所有 Logic。
  - `ModuleInstance.implement({ initial, logics, imports?, processes? })` 则在 `live` 之上，生成一个：
     - `module`: 原始 `ModuleInstance`；
     - `layer`: 第一版 `Layer<ModuleRuntime, never, any>`，后续通过 `imports` 与 `withLayer/withLayers` 叠加 Env；
     - `processes`: 与该 Module 实现绑定的一组长期流程（含 Link），由 Runtime 容器在 Root Scope 内统一 fork；
     - `withLayer` / `withLayers`：用于在该 Layer 上叠加额外 Env 的轻量工厂。

2. **ModuleRuntime.make 与 Logic Env**
   - `ModuleRuntime.make<S, A, R>(initial, { tag, logics, moduleId })` 的签名约定：
     - 返回：`Effect<ModuleRuntime<S, A>, never, Scope.Scope | R>`；
     - 其中 `R` 表示 Logic 额外依赖的 Env（服务、平台能力等），不混入 `unknown`；
     - 通过 `Effect.provideService(logic, tag, runtime)` + `LifecycleContext` 把 Runtime 与生命周期能力注入到每个 Logic；
     - 逻辑 Fiber 运行时的 Env = `Scope.Scope + R + ModuleRuntimeTag + LifecycleContext`。
   - 这保证了：
     - 从类型上可以推导出 Logic 依赖的 Env；
     - 运行时只需关注 Scope 与 ModuleRuntime，Env 由外部 Layer 注入。

3. **ModuleImpl.withLayer / withLayers 的 Env 注入语义**
   - 目标：在不破坏 ModuleRuntime 构造方式的前提下，为特定 ModuleImpl 注入局部 Env（Service / 平台），并对 Logic 生效。
   - 当前实现的策略（见 `runtime/ModuleFactory.ts`）：
     - `makeImplWithLayer(layer)` 持有当前“已注入 Env”的 ModuleRuntime Layer；
     - `withLayer(extra)`：
       - 先对 `layer` 进行一次 `Layer.provide(extra)`，把 `extra` 中的服务喂给 ModuleRuntime 构造逻辑（让 Logic 内的 `yield* ServiceTag` 能拿到实现）；
       - 再用 `Layer.mergeAll(provided, extra)` 把 `extra` 本身也挂到最终 Context 中，便于外部 `Context.get(context, ServiceTag)` 读取；
       - 返回一个新的 ModuleImpl，`layer` 指向合并后的 Layer。
     - `withLayers(...extras)` 只是对初始 Impl 连续调用 `withLayer` 的语法糖，以保证行为一致。
   - 这种实现牺牲了一部分 Env 泛型的精确性（ModuleImpl 的 `REnv` 收敛为 `any`），但换来了：
     - 更简单可靠的运行时语义（所有 Env 注入都通过 Layer 组合完成）；
     - 较好的 React 适配体验（`useModule(impl)` 只需关心最终 layer，不需要重新拼 Env）。

4. **Runtime（Logix.Runtime） / AppRuntime.provide(ModuleImpl) 在 AppRuntime 中的角色**
   - 内部的 AppRuntime 在实现上只接收 `AppModuleEntry`：
     - `module`: ModuleInstance（Tag + Shape 信息）；
     - `layer`: 对应的 ModuleRuntime Layer。
   - `AppRuntime.provide(impl: ModuleImpl)` 是一层语法糖：
     - 拆出 `impl.module` 与 `impl.layer`；
     - 调用 `AppRuntime.provide(module, layer)`，生成 `AppModuleEntry`。
   - 对外的 `Logix.Runtime.make(rootImpl, { layer, onError })` 则基于 Root ModuleImpl 构造 AppRuntime 配置：
     - modules 通常只包含一条由 `AppRuntime.provide(rootImpl)` 生成的 Root 入口；
     - processes 列表来源于 `rootImpl.processes`（若未提供则为空数组）。
   - 这样可以保证：
     - AppRuntime 的核心实现仍然只关心“若干 Module + 一棵合并后的 Layer + 一组 processes”；
     - 业务与 React 集成只需要面对 Root ModuleImpl 与 Runtime（通过 `Logix.Runtime.make` 构造），无需直接操作 AppRuntime 组装细节。

5. **测试兜底与约束**
   - `packages/logix-core/test/ModuleImpl.test.ts` 中的两个用例视为 ModuleImpl 路径的“最小完备回归集”：
     - `withLayer` 能让 Logic 内的 `yield* ServiceTag` 正常拿到实现，并驱动状态更新；
     - `AppRuntime.provide(ModuleImpl)` 组合后，`Consumer` 模块的逻辑在 AppRuntime 环境下同样能拿到 Service 并正常工作。
   - 一旦对 ModuleImpl / withLayer / provide 的实现做改动，必须保证这两条测试保持绿灯，否则视为破坏了 ModuleImpl 的基本契约。

## Env 初始化与 Logic 启动时序（最终规范）

> 状态：draft 段落已吸收并实施，未来迭代以此为基线；不再依赖 `docs/specs/drafts/L4/L6`。

### 三层模型（实现视角）

1. **Module 蓝图层（import 期）**  
   - `Module.make` 仅声明 Schema 与静态 reducer；禁止访问 Env/Service，也不触发任何 Effect。
2. **Module 实例启动层（t=0）**  
   - `ModuleRuntime.make` 创建 stateRef/actionHub/lifecycle，并执行所有 Logic 的 **setup 段**（注册 reducer / lifecycle / Debug/Devtools hook）。  
   - setup 段不可访问 Env，不做 IO，必须幂等；StrictMode 重跑时若重复注册会通过诊断提示，而非静默覆盖。
3. **完全铺好 Env 的 Runtime 层**  
   - AppRuntime / RuntimeProvider 完成 `envLayer` 构建后，统一 `forkScoped(plan.run)` 启动 Logic 的 **run 段** 与 processes。  
   - 此后若出现 `Service not found` 视为真实配置错误（硬错误信号），不再有“初始化噪音”。

### LogicPlan 与 BoundApi 视图

- `Module.logic(($)=>Effect)` 在内部被提升为 `LogicPlan = { setup, run }`：return 前的同步注册被收集为 setup，return 的 Effect 作为 run。旧写法自动视为 `setup=Effect.void`、`run=原逻辑`。  
- BoundApi 在 setup 阶段仅暴露注册类 API；run 阶段暴露完整 `$`。所有 Runtime 只与 LogicPlan 对话，不再直接 fork 整坨 Logic Effect。

### 诊断与防呆

- **phase 守卫**：在 setup 段调用 `$.use/$.onAction/$.onState/...` 等 run-only 能力会抛出 `LogicPhaseError`，经 DebugSink 转为 `diagnostic(error) code=logic::invalid_phase kind=...`，提示将调用移至 run 段。  
- **unsafe effect**：在 builder 顶层执行 `Effect.run*` 会转为 `diagnostic(error) code=logic::setup_unsafe_effect`，提示将 IO 放入 run 段或 Process。  
- **重复注册**：setup 幂等性通过诊断折叠提示，仍保持「每个 tag 至多一个 primary reducer」的不变式。  
- **Env 缺失**：`logic::env_service_not_found` 仅用于真实缺失（Env Ready 后仍找不到 Tag），作为硬错误提示；初始化阶段因设计不会再触发该诊断。

## StateTransaction / RuntimeDebugEvent / Devtools 契约（实现备忘）

> 本节补充记录 003-trait-txn-lifecycle 特性在 runtime-logix 实现侧的关键技术点，方便后续维护与排查。规范性描述以 `core/05-runtime-implementation.md` 与 `core/09-debugging.md` 为准，此处强调实现细节与风险。

### 1. StateTransaction 与观测策略

- Runtime 内部统一通过 `StateTransaction.StateTxnContext` 管理状态写入：
  - 任何进入 ModuleRuntime 的状态写入路径（reducer / Trait / middleware / Devtools 操作）都必须在 `runWithStateTransaction(origin, fn)` 包装下执行；  
  - `StateTransaction.commit` 负责单次 `SubscriptionRef.set` 与 Debug 事件派发，是“单入口 = 单事务 = 单次提交”的唯一落点。  
- 观测策略实现要点：
  - `StateTxnInstrumentationLevel = "full" | "light"` 定义在 `src/internal/runtime/core/env.ts` 中，`makeContext` 在构造时解析：
    - `"full"`：构建 Patch 列表与 initial/final 快照，并在 Debug 事件中携带 `patchCount` / `originKind`；  
    - `"light"`：跳过 Patch 与快照，仅在 commit 时写入最终状态；  
  - 默认观测级别：
    - `getDefaultStateTxnInstrumentation()` 基于 `NODE_ENV` 选择 dev/test 下 `"full"`、production 下 `"light"`；  
    - RuntimeOptions 与 ModuleImpl 的显式配置通过 `StateTxnRuntimeConfig` 覆盖默认值，优先级为 ModuleImpl > Runtime.make > 默认；  
  - 实现层避免把 Instrumentation 细节泄漏到业务层 API，只在 `RuntimeOptions` / `Module.implement` 上暴露最小的 `{ instrumentation?: "full" | "light" }` 选项。

### 2. 事务历史与 dev-only 时间旅行

- ModuleRuntime 在 dev/test 环境下为每个实例维护事务 ring buffer：
  - `maxTxnHistory` 当前固定为 500；当长度超过上限时按 FIFO 丢弃最旧事务；  
  - 使用 `txnById: Map<string, StateTransaction<S>>` 支持 O(1) 按 `txnId` 查找；  
  - 存储结构仅驻留内存，不做持久化。  
- 时间旅行实现关键点：
  - 在 `ModuleRuntime.make` 中为 runtime 挂载内部方法 `__applyTransactionSnapshot(txnId, mode)`（非公共 API）；  
  - 实现逻辑：
    - 非 dev 环境直接返回 no-op；  
    - 未找到事务或事务未记录快照时返回 no-op；  
    - 根据 `mode` 选择 `initialStateSnapshot` / `finalStateSnapshot`，通过 `StateTransaction.updateDraft` 写入草稿并 commit；  
    - 为该操作创建新的 StateTransaction，`origin.kind = "devtools"`，从而在 Debug 侧留下完整轨迹。  
  - 公共入口 `Logix.Runtime.applyTransactionSnapshot` 只是查找对应 ModuleRuntime，并调用其 `__applyTransactionSnapshot`，自身不再涉足具体逻辑。  
- 风险与注意事项：
  - 所有 dev-only 字段（事务历史、`__applyTransactionSnapshot`）必须在生产构建中保持“冷路径”：  
    - 访问前先通过 `isDevEnv()` 守卫；  
    - 不在生产环境分支上产生额外对象分配或大型数组。  
  - 时间旅行必须保证“不重放外部 IO”：回放只修改本地状态与派生 Trait，不重新执行 HTTP 请求或写入外部存储。

### 3. DebugSink → RuntimeDebugEventRef 映射

- `src/internal/runtime/core/DebugSink.ts` 是 Debug 事件聚合的唯一事实源：
  - `DebugSink.Event` 中的 `state:update` 事件必须在 Runtime 层填充 `txnId` / `patchCount` / `originKind`，否则 Devtools 无法构建完整的事务视图；  
  - `toRuntimeDebugEventRef(event)` 负责：
    - 为每条事件分配单调递增的 `eventId` 与 `timestamp`；  
    - 将 `trace:react-render` 映射为 `kind = "react-render"`，并基于 `runtimeId` + 最近一次 `state:update` 补全缺失的 `txnId`；  
    - 将 `trace:effectop` 映射为 `"service"` / `"trait-*"` 等类别，并透传 EffectOp 的 `meta` 信息；  
    - 其余 `trace:*` 统一归类为 `kind = "devtools"`。  
- 浏览器环境下的 Debug 行为需要额外注意噪音控制：
  - `browserConsoleLayer` 默认只对 `lifecycle:error` / `diagnostic` 做带样式的 console 输出，其余事件通过自定义 DebugSink 或 Node 环境下的 `consoleLayer` 观察；  
  - 为避免 React StrictMode 导致重复日志，引擎在浏览器侧对 lifecycle / diagnostic 事件做了简单去重（moduleId + payload）。  

### 4. DevtoolsHub（全局聚合）与 RuntimeOptions.devtools（一键启用）

- DevtoolsHub 是进程/页面级全局单例：  
  - 维护 `instances`（runtimeLabel::moduleId 计数）、`events`（ring buffer）、`latestStates`（runtimeLabel::moduleId::runtimeId → 最近 state:update）。  
  - 通过 `Debug.devtoolsHubLayer({ bufferSize? })` 以“追加 sinks”的方式挂入 Debug sinks 集合；不会覆盖调用方已有 sinks。  
  - 对外暴露 `Debug.getDevtoolsSnapshot / subscribeDevtoolsSnapshot / clearDevtoolsEvents` 等只读 API，供 Devtools UI 订阅与派生视图模型。

- `RuntimeOptions.devtools` 作为“显式 override”的一键入口：  
  - 在 `Runtime.make` 中自动 merge `Debug.devtoolsHubLayer({ bufferSize })`；  
  - 自动对 `options.middleware ?? []` 追加 DebugObserver（`Middleware.withDebug(..., { logger: false, observer })`），确保产生 `trace:effectop` 且携带 txnId；  
  - 由于该开关代表“明确开启 Devtools”，因此不受 `isDevEnv()` 裁剪。

- React 渲染事件的 gating：  
  - `@logix/react` 的 `trace:react-render` 采集应满足：`isDevEnv() || Debug.isDevtoolsEnabled()`；  
  - 这样在生产环境也可以在“业务显式开启 Devtools”时开启渲染观测，并保持默认情况下的开销可控。

这一节的目标是帮助后续维护者在阅读 `packages/logix-core/src/internal/runtime/core/StateTransaction.ts`、`ModuleRuntime.ts` 与 `DebugSink.ts` 时快速对齐设计意图，并在扩展 Devtools 契约（例如步级 time-travel、事务录制导出）时避免破坏现有不变量。
