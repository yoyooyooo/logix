# ModuleImpl / withLayer / AppRuntime.provide(ModuleImpl) 的实现要点

> 对应规范：`../api/02-module-and-logic-api.md` 中的 ModuleImpl 蓝图能力。

在实现层，ModuleImpl 相关能力的硬约束与当前做法：

1. **ModuleTag.make / Module.make → ModuleImpl 的构造路径**
   - 内核工厂在 `ModuleFactory.Module`：根据 Schema 推导出 `ModuleShape`，并构造一个 `ModuleTag`（Context.Tag + shape + 工厂能力）。
   - `ModuleTag.live(initial, ...logics)`：
     - 调用 `ModuleRuntime.make(initial, { tag, logics, moduleId })`；
     - 并通过 `Layer.scoped(tag, ...)` 将 runtime 注册到当前 Scope 的 Context。
   - `ModuleTag.implement({ initial, logics, imports?, processes? })`：
     - 在 `live` 基础上叠加 imports 与 processes，返回 `ModuleImpl`（含 `module: ModuleTag` + `layer` + `withLayer/withLayers`）。
   - 上层 `Logix.Module.make(...).implement(...)` 会返回 `Module`（wrap），其 `.impl` 即上述 `ModuleImpl`，并在 `withLogic/withLayers` 等组合后通过 rebuild 重算 `.impl`。

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
     - `module`: ModuleTag（身份锚点，Tag + Shape 信息）；
     - `layer`: 对应的 ModuleRuntime Layer。
   - `AppRuntime.provide(impl: ModuleImpl)` 是一层语法糖：
     - 拆出 `impl.module` 与 `impl.layer`；
     - 调用 `AppRuntime.provide(module, layer)`，生成 `AppModuleEntry`。
   - 对外的 `Logix.Runtime.make(root, { layer, onError })` 支持 `ModuleImpl` 或 `Module`（wrap）：
     - 会统一 unwrap 到 `rootImpl = root._tag === "ModuleImpl" ? root : root.impl`；
     - modules 通常只包含一条由 `AppRuntime.provide(rootImpl.module, rootImpl.layer)` 生成的 Root 入口；
     - processes 列表来源于 `rootImpl.processes`（若未提供则为空数组）。
   - 这样可以保证：
     - AppRuntime 的核心实现仍然只关心“若干 Module + 一棵合并后的 Layer + 一组 processes”；
     - 业务与 React 集成只需要面对 Root ModuleImpl 与 Runtime（通过 `Logix.Runtime.make` 构造），无需直接操作 AppRuntime 组装细节。

5. **测试兜底与约束**
   - `packages/logix-core/test/ModuleImpl.test.ts` 中的两个用例视为 ModuleImpl 路径的“最小完备回归集”：
     - `withLayer` 能让 Logic 内的 `yield* ServiceTag` 正常拿到实现，并驱动状态更新；
     - `AppRuntime.provide(ModuleImpl)` 组合后，`Consumer` 模块的逻辑在 AppRuntime 环境下同样能拿到 Service 并正常工作。
   - 一旦对 ModuleImpl / withLayer / provide 的实现做改动，必须保证这两条测试保持绿灯，否则视为破坏了 ModuleImpl 的基本契约。
