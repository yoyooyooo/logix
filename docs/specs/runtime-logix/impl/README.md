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

建议按能力领域拆分实现备忘：

- `app-runtime-and-modules.md`
  记录 AppRuntime（`makeApp`）/ `Logix.Module` / `ModuleDef` 的 flatten 规则、`imports/providers/processes/exports` 的展开顺序，以及 v3 使用 Env 扁平合并的具体实现方案；分析未来 Env 裁剪 / Lazy 模块加载的可能路径与风险。

- `logic-middleware-and-aop.md`
  记录 Logic Middleware (`Logic.Meta` / `Middleware` / 组合与注入方式) 的实现草图：如何在 Logic 构造周期内挂载 Module/App 级 `middlewares`，如何保证 A/E/R 泛型不被破坏，以及平台如何可靠识别可解析子集。

- `module-lifecycle-and-scope.md`
  记录 Store 生命周期钩子 (`lifecycle.onInit/onDestroy`) 与 Effect Scope 的绑定关系：Local Store vs Global Store 的 Scope 管理、finalizer 的注册时机与错误处理策略。

> 注：以上文件名仅为建议，可根据实际实现拆分/合并。关键是做到：**每一块复杂能力，在规范确定后，都有一份对应的实现说明文档可查**。

## Universal Bound API / Module 的实现硬约束（v3 Final）

以下内容是对 `core/02-module-and-logic-api.md` 与 `core/03-logic-and-flow.md` 中最终架构的 **实现侧补充**，一旦开始写运行时代码，应视为硬性约束：

1. **Module 形态与品牌化**
   - `Logix.Module` 必须是一个「类型 + Tag + Factory」的统一抽象：
     - 提供 Module Id（字符串）、State/Action Schema、Shape 类型；
     - 暴露一个可注入 Env 的 `.logic(($) => Effect)` 工厂；
     - 同时充当 `Context.Tag`，用于 Env/Layer 提供和 `$.use` 的参数。
   - 建议在类型层为 Module 加品牌标记，例如：
     - `interface ModuleMarker<Shape> { readonly _kind: "Module"; readonly _shape: Shape }`；
     - `Logix.Module(...)` 返回的对象需实现该接口（既是 Tag，又携带 Shape 信息与工厂能力）。
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
   - `Logix.Module(id, def)` 在内部委托给 `ModuleFactory.Module` 创建：
     - 先根据 Schema 推导出 `ModuleShape`；
     - 定义 `ModuleInstance.logic`：从当前 `Context` 中取出 ModuleRuntime，并基于它构造 Bound API `$`；
     - 定义 `ModuleInstance.live(initial, ...logics)`：调用 `ModuleRuntime.make(initial, { tag, logics, moduleId })`，挂载所有 Logic。
   - `ModuleInstance.make({ initial, logics, imports?, processes? })` 则在 `live` 之上，生成一个：
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

4. **LogixRuntime / AppRuntime.provide(ModuleImpl) 在 AppRuntime 中的角色**
   - 内部的 AppRuntime 在实现上只接收 `AppModuleEntry`：
     - `module`: ModuleInstance（Tag + Shape 信息）；
     - `layer`: 对应的 ModuleRuntime Layer。
   - `AppRuntime.provide(impl: ModuleImpl)` 是一层语法糖：
     - 拆出 `impl.module` 与 `impl.layer`；
     - 调用 `AppRuntime.provide(module, layer)`，生成 `AppModuleEntry`。
   - 对外的 `LogixRuntime.make(rootImpl, { layer, onError })` 则基于 Root ModuleImpl 构造 AppRuntime 配置：
     - modules 通常只包含一条由 `AppRuntime.provide(rootImpl)` 生成的 Root 入口；
     - processes 列表来源于 `rootImpl.processes`（若未提供则为空数组）。
   - 这样可以保证：
     - AppRuntime 的核心实现仍然只关心“若干 Module + 一棵合并后的 Layer + 一组 processes”；
     - 业务与 React 集成只需要面对 Root ModuleImpl 与 `LogixRuntime`，无需直接操作 AppRuntime 组装细节。

5. **测试兜底与约束**
   - `packages/logix-core/test/ModuleImpl.test.ts` 中的两个用例视为 ModuleImpl 路径的“最小完备回归集”：
     - `withLayer` 能让 Logic 内的 `yield* ServiceTag` 正常拿到实现，并驱动状态更新；
     - `AppRuntime.provide(ModuleImpl)` 组合后，`Consumer` 模块的逻辑在 AppRuntime 环境下同样能拿到 Service 并正常工作。
   - 一旦对 ModuleImpl / withLayer / provide 的实现做改动，必须保证这两条测试保持绿灯，否则视为破坏了 ModuleImpl 的基本契约。
