# AppRuntime & ModuleDef 实现草图

> **Status**: Draft (v3 Final · Implementation Planning)  
> **Scope**: `Logix.app` / `Logix.module` / `ModuleDef` 在运行时层的具体组合方式与已知取舍。

本说明文档从 **Effect/Layer/Scope** 实现视角，展开 `ModuleDef` / `Logix.module` / `Logix.app` 的具体组合方式。  
目标是：

- 让后续实现者在落代码时有清晰的“拼 Layer 与 Scope”的规则可依；
- 提前暴露 v3 版本的一些刻意取舍（例如 Env 扁平合并、不做强隔离），避免后续误以为是“漏实现”；
- 为未来 v4 的 Env 裁剪 / Lazy 模块加载预留思考空间。

## 1. 核心类型回顾

来自 `architecture-app-runtime.md` 的核心定义（略去非关键字段）：

```ts
export interface ModuleDef<R> {
  readonly id: string
  readonly infra?: Layer.Layer<R, any, never>
  readonly imports?: ReadonlyArray<ModuleDef<any>>
  readonly providers?: ReadonlyArray<Provider<any>>
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, R>>
  readonly middlewares?: ReadonlyArray<Logic.Middleware<R>>
  readonly exports?: ReadonlyArray<Context.Tag<any, any>>
}

export interface Provider<S> {
  readonly tag: Context.Tag<S, S>
  readonly value: S // 通常是 Store.Runtime 或 Service 实现
}
```

- **ModuleDef<R>**：一个模块的“图纸”，R 表示该模块期望从外界获得的环境（Env）类型；  
- **infra**：该模块内部使用的基础设施 Layer，对外不要求可解析；  
- **imports**：依赖的其他模块（Module）；  
- **providers**：本模块提供的服务（含 Store.Runtime）；  
- **processes**：随模块启动的长生命周期协程（Coordinator / Daemon）；  
- **exports**：对外公开的 Tag 列表，平台用来做依赖检查与拓扑展示；v3 Runtime 暂不做强隔离。

`Logix.app` 是 `ModuleDef` 的特例（无 `exports` 要求，且额外提供 `makeRuntime`）。

## 2. flatten 目标：从 ModuleDef 到 { layer, processes }

运行时的目标是：给定一棵模块树（App 视为根 ModuleDef），生成：

```ts
interface BuiltModule<R> {
  layer: Layer.Layer<R, any, never>
  processes: ReadonlyArray<Effect.Effect<void, any, R>>
  middlewares: ReadonlyArray<Logic.Middleware<R>>
}
```

对于 App：

```ts
interface AppDefinition<R> {
  definition: ModuleDef<R>
  layer: Layer.Layer<R, any, never>
  makeRuntime: () => Effect.ManagedRuntime<R>
}
```

v3 版本的关键特性：

- Env 采用 **扁平合并**：所有 imports / providers 的 Tag 都会出现在同一个 `Context` 环境中；  
- `exports` 仅用于 **类型/平台检查**，不做 Env 强隔离；  
- `processes` 在构建好的 Env 上通过 `forkScoped` 挂到对应 Scope 上。

## 3. flatten 算法草图

为了避免实现过于复杂，v3 可以采用一个简单且可递归的 flatten 实现：

```ts
function buildModule<R>(def: ModuleDef<R>): BuiltModule<R> {
  // 1. 构建自身 infra Layer（若无则为 Layer.empty）
  const infraLayer: Layer.Layer<R, any, never> = def.infra ?? Layer.empty

  // 2. 递归构建 imports
  const imported = (def.imports ?? []).map(buildModuleAny)
  const importedLayers = imported.map((m) => m.layer)
  const importedProcesses = imported.flatMap((m) => m.processes)
  const importedMiddlewares = imported.flatMap((m) => m.middlewares)

  // 3. 构建 providers 对应的 Layer
  // Provider<S> 等价于 Layer.succeed(tag, value)
  const providerLayers = (def.providers ?? []).map((p) =>
    Layer.succeed(p.tag as Context.Tag<any, any>, p.value as any),
  )

  // 4. 合并所有环境 Layer（Env 扁平）
  const envLayer = Layer.mergeAll(
    infraLayer,
    ...importedLayers,
    ...providerLayers,
  )

  // 5. 构建本模块的 processes，挂在 envLayer 提供的 Env 上
  const processLayer = Layer.scopedDiscard(
    Effect.all(
      (def.processes ?? []).map((eff) => Effect.forkScoped(eff)),
      { concurrency: "unbounded" as const },
    ),
  ).pipe(Layer.provide(envLayer))

  // 6. 合并最终 Layer：对外暴露 envLayer 能力，内部运行着本模块 processes
  const finalLayer = Layer.merge(envLayer, processLayer)

  // 7. Middlewares：v3 Runtime 不自动注入，仅在类型/平台层记录
  const middlewares: ReadonlyArray<Logic.Middleware<R>> =
    (def.middlewares as ReadonlyArray<Logic.Middleware<R>>) ?? []

  return {
    layer: finalLayer,
    processes: [
      ...importedProcesses as ReadonlyArray<Effect.Effect<void, any, R>>,
      ...(def.processes ?? []),
    ],
    middlewares: [
      ...importedMiddlewares as ReadonlyArray<Logic.Middleware<R>>,
      ...middlewares,
    ],
  }
}
```

> 说明  
> - `buildModuleAny` 可以是一个内部帮助函数，用泛型擦除方式递归构建 imported Module；  
> - `processes` 在返回值中仅作为“逻辑列表”存在，v3 实际挂载是通过 `processLayer` 完成的；  
> - `middlewares` 在 v3 Runtime 中只作为元信息留存，供平台/出码器使用，Runtime 本身不做自动注入（见 Middleware 实现文档）。

### 3.1 AppDefinition 构建

`Logix.app` 可以基于 `buildModule` 实现：

```ts
function app<R>(def: Omit<ModuleDef<R>, "exports">): AppDefinition<R> {
  const built = buildModule(def)

  return {
    definition: def,
    layer: built.layer,
    makeRuntime: () => Effect.ManagedRuntime.make(built.layer),
  }
}
```

> 注意  
> - v3 暂不对 `processes` 做单独的生命周期管理接口（如 start/stop API），统一由 Runtime Scope 控制；  
> - 若未来需要按 Module 维度分别启停，可考虑在 `buildModule` 返回值中保留更精细的 Scope/Layer 分组信息。

## 4. exports：封装边界的实现策略

### 4.1 v3 策略：类型 & 平台为主

在 v3：

- `exports` 的主要职责是：  
  - **类型约束**：ModuleDef 类型中，只有 `exports` 中声明的 Tag 被视为对外可引用；  
  - **平台检查**：Universe View 与依赖检查工具在发现“模块 A 使用了模块 B 未 exports 的 Tag”时，给出错误或强烈警告。
- Runtime 层面的 Env 暂时不做裁剪：  
  - 这样所有 Tag 在开发/调试时都可以通过 `Effect.service` 拿到，降低实现复杂度；  
  - 也便于在 PoC 阶段探索更多模式，而不被“Env 强隔离”挡路。

### 4.2 v4 方向：Env 裁剪与 Scoped Layer（仅规划，不在 v3 实现）

若未来需要更强封装，可以考虑：

- 在 `buildModule` 中引入 “投影 Layer”：  
  - 内部构建完整 envLayer；  
  - 对外仅暴露 `exports` 中的 Tag（例如通过包装 Runtime、限制可用 Tag 集合）。
- 或者通过 **多级 Scope** 模拟模块边界：  
  - 每个 Module 拥有独立 Scope 与 Env；  
  - 子 Module 只继承父 Module 的 `exports` 环境，而非全部 Tag。

以上方案都涉及较大的实现／调试成本，v3 暂不落地，仅作为规划备忘。

## 5. 已知取舍与隐患

### 5.1 Env 扁平化带来的隐患

- **优势**：实现简单、调试方便、PoC 阶段灵活；  
- **隐患**：
  - 模块内部 Tag 可以被“越界使用”，如果不依赖平台检查，很难在 TypeScript 层完全阻止；  
  - 某些错误（比如 Tag 名冲突）会在运行时才暴露。

缓解策略：

- 严格依赖 `exports` + 平台检查 + Lint 规则，避免跨模块随意引用 Tag；  
- 在 Runtime 日志中增加模块边界相关的诊断信息，方便排查。

#### 5.1.1 Tag 冲突风险（命名约定）

由于 v3 采用 Env 扁平合并，**不同模块提供的 Tag 会共享同一个 Context 命名空间**：

- 如果两个 Module 定义了相同 key 的 Tag（例如都写了 `Context.Tag("Config")`），那么在 `Layer.mergeAll` 时后者会覆盖前者；  
- 这在类型层面难以及时发现，只能依赖运行时异常或行为异常暴露。

建议约定：

- 所有 Tag 的 key（`Context.Tag("...")` 中的字符串）应保持全局唯一，推荐包含模块前缀，例如：  
  - `"Order/OrderApi"`、`"User/UserStore"`、`"Global/Layout"`；  
- 可通过 Lint/内部检查脚本对 Tag key 做重复扫描，提前发现潜在冲突。

### 5.2 processes 的错误语义

- 默认实现中，`processes` 会通过 `Effect.forkScoped` 挂在 Scope 上：  
  - 若某个进程以失败结束（Left），默认行为是：  
    - Fiber 结束；  
    - 上层需显式对错误做处理（例如在进程内部使用 `Effect.catchAll/logError`）。
- 若希望“进程永不退出”，建议在 `processes` 内部使用 `Effect.forever` 或循环结构显式保持长生命周期。

建议：

- 在实现 `processes` 时，提供统一 helper，例如：

  ```ts
  const daemon = <R, E>(
    eff: Effect.Effect<void, E, R>,
  ): Effect.Effect<void, never, R> =>
    eff.pipe(
      Effect.catchAll((e) => Logger.error(e)), // 记录错误
      Effect.forever,
    )
  ```

  并在文档中推荐所有进程使用该 helper 包裹。

### 5.2.1 Infra Error 通道的汇聚

`ModuleDef.infra` 的 Layer 允许 `E = any`，这意味着：

- 单个模块的 infra 部分可能在构建时失败（例如 Config 读取失败、外部服务初始化失败）；  
- 多个模块 flatten 后，App 根 Layer 的 Error 通道实质上是“所有子模块 Infra Error 类型的联合”。

实现与使用建议：

- 在 `Logix.app(...).makeRuntime()` 的调用侧，明确处理 App 启动失败的场景：  
  - 例如在 CLI/Node 场景中 log 错误并退出；  
  - 在前端场景中展示“应用启动失败，请联系管理员”之类的降级 UI。  
- 在 runtime 实现中，保持 infra Layer 的 Error 通道不被默默吞掉；让调用者有机会在顶层看到并处理这些错误。

### 5.3 middlewares 的 Runtime 接入

- v3 版本中，`ModuleDef.middlewares` 主要为 **平台与代码生成器** 服务：  
  - 平台可以根据模块配置生成或检查 `Logic.compose(Logging, AuthGuard, ...)` 这类组合调用；  
  - Runtime 暂不自动从 ModuleDef 将中间件注入到 Logic 执行路径中。
- 若后续希望 Runtime 自动注入 Module 级中间件，可以考虑：
  - 定义一个 `LogicMiddlewareRegistry` Service，通过 Tag 提供；  
  - 在 `buildModule` 时根据 ModuleDef 构造该 Registry；  
  - 在 `Logic.make` 的实现中从 Registry 读取当前 Store/Module 对应的中间件并套用。

此方案较重，且会给逻辑执行链引入隐式依赖，v3 暂不落地，仅作为 v4 备选方向记录。

---

**结论**：  
v3 的 `Logix.app` / `Logix.module` 在实现上以“递归 flatten 到一个大 Layer + processes 列表”为主，Env 扁平、exports 只用于类型与平台检查。  
这为后续演进（Env 裁剪、Lazy 模块、自动 Middleware 注入）预留了空间，同时保证当前实现简单可控、调试成本低。***
