# ModuleImpl / withLayer / Runtime.make 的实现要点

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
   - 当前实现的策略（见 `packages/logix-core/src/internal/runtime/ModuleFactory.ts`）：
     - `makeImplWithLayer(layer)` 持有当前“已注入 Env”的 ModuleRuntime Layer；
     - `withLayer(extra)`：
       - 先对 `layer` 进行一次 `Layer.provide(extra)`，把 `extra` 中的服务喂给 ModuleRuntime 构造逻辑（让 Logic 内的 `yield* ServiceTag` 能拿到实现）；
       - 再用 `Layer.mergeAll(provided, extra)` 把 `extra` 本身也挂到最终 Context 中，便于外部 `Context.get(context, ServiceTag)` 读取；
       - 返回一个新的 ModuleImpl，`layer` 指向合并后的 Layer。
     - `withLayers(...extras)` 只是对初始 Impl 连续调用 `withLayer` 的语法糖，以保证行为一致。
   - 这种实现牺牲了一部分 Env 泛型的精确性（ModuleImpl 的 `REnv` 收敛为 `any`），但换来了：
     - 更简单可靠的运行时语义（所有 Env 注入都通过 Layer 组合完成）；
     - 较好的 React 适配体验（`useModule(impl)` 只需关心最终 layer，不需要重新拼 Env）。

4. **Runtime（Logix.Runtime）与 AppRuntime 的装配关系**
   - AppRuntime 的实现（内部）只接收 `AppModuleEntry`：
     - `module`: ModuleTag（身份锚点，Tag + Shape 信息）；
     - `layer`: 对应的 ModuleRuntime Layer（或已构造的 ModuleRuntime 实例）。
   - 当前实现中没有对外暴露 `AppRuntime.provide(ModuleImpl)` 这类语法糖；装配入口统一通过 `Logix.Runtime.make(root, options)`：
     - `packages/logix-core/src/Runtime.ts` 会把 `root` 归一化为 `rootImpl`（`ModuleImpl` 或 `Module` wrap 的 `.impl`）；
     - 然后用 `packages/logix-core/src/internal/runtime/AppRuntime.ts` 的 `provide(rootImpl.module, rootImpl.layer)` 生成 `AppModuleEntry`；
     - `processes` 列表来自 `rootImpl.processes ?? []`，并由 `ProcessRuntime` 统一安装/监督（raw Effect 仍允许作为兼容 fallback，但缺少静态 surface 与诊断能力）。

5. **测试兜底与约束**
   - `packages/logix-core/test/Module/ModuleImpl.test.ts` 视为 ModuleImpl 路径的回归集（最少覆盖）：
     - `withLayer` 注入能让 Logic 内的 `yield* ServiceTag` 正常拿到实现，并驱动状态更新；
     - `implement({ imports: [Layer...] })` 能把 service layer 注入到 ModuleImpl.layer；
     - `implement({ imports: [OtherImpl] })` 能导入其他 ModuleImpl.layer 并在同一 Context 中可解析到对应的 ModuleRuntime。
   - 一旦对 ModuleImpl / withLayer / imports 合成策略做改动，必须保证上述用例保持绿灯，否则视为破坏了 ModuleImpl 的基本契约。
