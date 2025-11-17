# 5. Global Module 的生命周期（AppRuntime 路径）

Global Module 的 Scope 由 **AppRuntime 根 Scope** 管理。本节结合 AppRuntime 的实现，说明全局模块如何挂载与销毁。

## 5.1 AppRuntime 与 AppDefinition

在 runtime 层，AppRuntime 的定义集中在 `AppRuntime.ts` 中：

```ts
// App 模块条目：由 AppRuntime.provide 生成
export interface AppModuleEntry {
  readonly module: ModuleTag<any, AnyModuleShape>
  readonly layer: Layer.Layer<any, any, any>
}

export interface LogixAppConfig<R> {
  readonly layer: Layer.Layer<R, never, never>                // App 级基础 Env
  readonly modules: ReadonlyArray<AppModuleEntry>             // 全局模块列表
  readonly processes: ReadonlyArray<Effect.Effect<void, any, any>> // 长生命周期进程
  readonly onError?: (
    cause: import("effect").Cause.Cause<unknown>
  ) => Effect.Effect<void>
}

export interface AppDefinition<R> {
  readonly definition: LogixAppConfig<R>
  readonly layer: Layer.Layer<R, never, never>                // 聚合后的 App Layer
  readonly makeRuntime: () => ManagedRuntime.ManagedRuntime<R, never>
}
```

`makeApp` 的核心逻辑简化后如下：

```ts
export const makeApp = <R>(config: LogixAppConfig<R>): AppDefinition<R> => {
  // 1. 校验模块 ID 唯一性
  const seenIds = new Set<string>()
  for (const entry of config.modules) {
    const id = String(entry.module.id)
    if (seenIds.has(id)) {
      throw new Error(`Duplicate Module ID: ${id}`)
    }
    seenIds.add(id)
  }

  // 2. 聚合所有模块 Layer
  const moduleLayers = config.modules.map((entry) => entry.layer)
  const envLayer = moduleLayers.length > 0
    ? Layer.mergeAll(config.layer, ...moduleLayers)
    : config.layer

  // 3. 为 App 构造一个「根 Scope + Env」
  const finalLayer = Layer.unwrapScoped(
    Effect.gen(function* () {
      const scope = yield* Effect.scope
      const env = yield* Layer.buildWithScope(envLayer, scope)

      // 4. 在同一 Scope 下启动所有 Process（协调器等长期任务）
      yield* Effect.forEach(config.processes, (process) =>
        Effect.forkScoped(
          Effect.provide(
            config.onError
              ? Effect.catchAllCause(process, config.onError)
              : process,
            env
          )
        )
      )

      // 5. 返回带 Env 的 Layer：后续 runtime 复用这份 Context
      return Layer.succeedContext(env)
    })
  ) as Layer.Layer<R, never, never>

  return {
    definition: config,
    layer: finalLayer,
    makeRuntime: () => ManagedRuntime.make(finalLayer),
  }
}
```

**关键点：**

- 所有 `modules[].layer`（通常是 `ModuleImpl.layer` 或 `ModuleDef.live(...)` 返回值）会与 App 级基础 `layer` 一起构成一个大的 Layer，挂在 **同一棵 App Scope** 下；
- 这个 App Scope 由 `ManagedRuntime.make(finalLayer)` 持有：当 AppRuntime 被 `dispose()` 时，这棵 Scope 被关闭，所有全局 ModuleRuntime 和 Process 统一销毁。

## 5.2 AppRuntime.provide 与 ModuleImpl

为了方便把模块挂到 App 上，AppRuntime 的 `provide` 帮助函数提供了两种调用方式：

```ts
// 1. 显式指定 ModuleTag + Layer/Runtime（适合高级用法）
AppRuntime.provide(
  SomeDef.tag,
  SomeDef.live(initial, ...logics) // 或已经构造好的 ModuleRuntime
)

// 2. 通过 program module 取 layer（常见）
const SomeModule = SomeDef.implement({ initial, logics: [...] })
AppRuntime.provide(SomeDef.tag, SomeModule.impl.layer)
```

在 App 级 Runtime 中，可以抽象为“Root ModuleImpl + AppInfraLayer” 的组合（由 `Logix.Runtime.make` 封装）。在 React 场景下，典型用法是：

```tsx
// CounterDef = Logix.Module.make(...)
const CounterModule = CounterDef.implement({ initial: { count: 0 }, logics: [CounterLogic] })

const appRuntime = Logix.Runtime.make(CounterModule, {
  layer: AppInfraLayer,
})

function Root() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      <App />
    </RuntimeProvider>
  )
}

function CounterView() {
  const runtime = useModule(CounterDef) // ModuleDef（全局实例）
  const count = useSelector(runtime, (s) => s.count)
  const dispatch = useDispatch(runtime)
  // ...
}
```

- `useModule(Tag)` 使用当前 AppRuntime 运行 Tag Effect：
  - 本质是 `ManagedRuntime.runSync(Tag)`，从 App 级 Env 中取出对应的 `ModuleRuntime` 实例；
  - 所有使用同一个 Tag 的组件共享这棵 ModuleRuntime（「全局模块」语义）。
- 当宿主显式调用 `ManagedRuntime.dispose()`（当前实现中通常在应用卸载时处理）时，App Scope 被关闭：
  - 所有通过 `modules[].layer` 创建的 ModuleRuntime 会统一触发 `onDestroy`；
  - 所有通过 `processes` 启动的协调器/长期任务也会一起终止。

## 5.4 Global vs Local 的对比视角

- Global Module（通过 AppRuntime 挂载）：
  - ModuleRuntime 的 Scope 挂在 AppRuntime 根 Scope 上；
  - `useModule(Tag)` 只能看到这棵全局实例；
  - 适合 Auth、全局配置、跨页面共享的 Domain 模块。

- Local Module（通过 `ModuleImpl + useModule(Impl)` 挂载）：
  - ModuleRuntime 的 Scope 挂在组件自己的局部 Scope 上（见上一节）；
  - 每次 `useModule(Impl)` 调用都会创建一棵新的 ModuleRuntime，随组件卸载销毁；
  - 适合页面/组件局部状态，不需要注册到 App 层。

这两种模式在实现层共用同一套 `ModuleRuntime.make` / Layer 机制，只是 **Scope 的挂载点不同**：

- Global Module：挂在应用级 Runtime Scope；
- Local Module：挂在 React 组件局部 Scope。
