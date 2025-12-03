# Module Runtime Lifecycle & Scope 实现草图

> **Status**: Draft (v3 Final · Implementation Planning)
> **Scope**: `ModuleRuntimeConfig.lifecycle` 在运行时中如何绑定到 Effect Scope，实现 Local / Global Module 的 onInit/onDestroy 语义。

本说明文档聚焦于 v3 中 Module 生命周期钩子（`onInit` / `onDestroy`）的运行时实现方式，尤其是它们与 Effect Scope 的关系。

目标：

- 明确 Local Module（`useLocalModule`）与 Global Module（App modules 中的 Module）在生命周期上的差异与共性；
- 给出 `ModuleRuntime.make` / Module Runner 的伪代码，说明何时触发 onInit、如何注册 onDestroy；
- 提前指出错误处理与并发相关的注意点。

> **Note**: `ModuleRuntime.make` 与 `ModuleRuntimeConfig` 是 Runtime 内部的底层原语。在业务层，它们被封装在 `Logix.Module` + `Module.live` 之下。本文档主要供引擎开发者参考。

## 1. ModuleRuntimeConfig.lifecycle 回顾

核心配置如下：

```ts
export interface ModuleRuntimeConfig<S, A, R = never> {
  initial: S
  logic: Effect.Effect<any, any, any>[]

  lifecycle?: {
    // Module 实例创建并挂载到 Scope 后立即执行
    // 若 Logic 中定义了多个 onInit，此处为它们的串行组合
    onInit?: Effect.Effect<void, never, R>

    // Module 所在 Scope 关闭前执行 (自动注册为 finalizer)
    onDestroy?: Effect.Effect<void, never, R>
  }
}
```

关键约束：

- `onInit` / `onDestroy` 的错误通道为 `never`：
  - 意味着：钩子内部必须自行处理错误（例如 log + 忽略），不能让错误冒泡破坏整个 Scope；
  - 若未来发现确有需要，可以放宽为 `E = any`，并在 Runner 侧捕获日志后忽略。

## 2. Runtime 视角的 Module Runner

为了保证 `E=never` 的约束在运行时真正落地，Runner 必须对 lifecycle hook 进行安全包装。

### 2.1 安全包装器 (Foolproof Wrapper)

```ts
function safeLifecycleEffect<R>(
  id: string,
  hook: Effect.Effect<void, unknown, R> | undefined,
): Effect.Effect<void, never, R> {
  if (!hook) return Effect.unit

  return hook.pipe(
    Effect.matchCauseEffect({
      onSuccess: () => Effect.unit,
      onFailure: (cause) =>
        Effect.logError("Module lifecycle failed", { id, cause }).pipe(
          Effect.asUnit,
        ),
    }),
  )
}
```

### 2.2 Runner 实现伪代码

```ts
function ModuleRuntime.make<Sh extends Logix.ModuleShape<any, any>, R>(
  config: ModuleRuntimeConfig<Logix.StateOf<Sh>, Logix.ActionOf<Sh>, R>,
): Effect.Effect<ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>, never, R> {
  const { initial, logic, lifecycle } = config

  return Effect.gen(function* () {
    // 1. 构造 Logic 程序的组合
    const logicProgram = Effect.all(logic, { concurrency: "unbounded" as const })

    // 2. 在 scoped 环境中启动 Logic + 注册 finalizer
    const runtime = yield* Effect.scoped(
      Effect.gen(function* () {
        // 3.1 创建 ModuleRuntime（内部会使用 stateLayer / actionLayer / logicProgram）
        const moduleRuntime = yield* buildModuleRuntime(stateLayer, actionLayer, logicProgram)

        // 3.2 注册 onDestroy 作为 Scope finalizer (使用 safe wrapper)
        if (lifecycle?.onDestroy) {
          yield* Scope.addFinalizer(
            safeLifecycleEffect("module-destroy", lifecycle.onDestroy)
          )
        }

        // 3.3 运行 onInit (使用 safe wrapper)
        if (lifecycle?.onInit) {
          yield* safeLifecycleEffect("module-init", lifecycle.onInit)
        }

        return moduleRuntime
      }),
    )

    return runtime
  })
}
```

> **核心原则**：即使业务端误写了有错误通道的 Hook，Runner 也会吞掉并记录到日志；这类写法视为 bug，但不会影响其它 Module / Scope。

## 3. 错误处理最佳实践：Status Pattern

由于 `onInit` 不能抛错，推荐使用 **Status Pattern** 将错误内化为领域状态：

```ts
type Status = "idle" | "initializing" | "ready" | "error"

const onInit = Effect.gen(function* () {
  yield* $.state.update(s => ({ ...s, status: "initializing" }))

  // 尝试执行可能失败的操作
  const result = yield* Effect.tryPromise(fetchConfig).pipe(
    Effect.either
  )

  if (result._tag === "Left") {
    // 失败：写入错误状态，不抛错
    yield* $.state.update(s => ({
      ...s,
      status: "error",
      error: result.left
    }))
  } else {
    // 成功
    yield* $.state.update(s => ({
      ...s,
      status: "ready",
      config: result.right
    }))
  }
})
```

## 4. Local Module 与 React Strict Mode

### 4.1 Strict Mode 下的生命周期挑战

React 18 Strict Mode 会在开发环境下执行 `Mount -> Unmount -> Mount` 序列。
这意味着 `useLocalModule` 会经历：
1. `Scope 1` 创建 -> `onInit`
2. `Scope 1` 关闭 -> `onDestroy`
3. `Scope 2` 创建 -> `onInit`

### 4.2 幂等性要求

业务代码必须保证 `onInit` 是**逻辑幂等**的，或者能容忍多次执行。
推荐在 `onInit` 开头检查状态：

```ts
const onInit = Effect.gen(function* () {
  const status = yield* $.state.read(s => s.status)
  // 如果已经是 ready/initializing，说明可能是热重载或重复挂载（视具体 Module 持久化策略而定）
  // 对于 Local Module，通常每次都是新实例，状态重置，所以主要靠“不副作用外部系统”来保证安全。
  if (status !== "idle") return

  // ...
})
```

### 4.3 `useLocalModule` 实现范式（防 Scope 泄漏 & 内存膨胀）

对还不熟悉 Effect-ts 的开发者，可以把 `useLocalModule` 想象成：

> “帮你在组件下面开一块小空间，把 ModuleRuntime 放进去，用完就整体关掉这块空间。”

核心要点：

- **Scope 是“资源包裹层”**：  
  - 在 Effect 里，`Scope` 可以理解为“一块挂资源的挂载点”；  
  - 某棵 ModuleRuntime、它的 watcher Fiber、内部用到的 PubSub/SubscriptionRef，都会挂在某个 Scope 上。  
- **Context 不是全局单例**：  
  - `Layer.buildWithScope(layer, scope)` 会构造一份“只在这个 Scope 中有效”的 Context（Env）；  
  - 这份 Context 随 Scope 生命周期存在，Scope 关掉后，这份 Env 也就随之失效，不会挂在什么全局静态变量上。

React 侧的 `useLocalModule` 必须保证：

1. 每次调用只创建 **一棵活的 Scope + ModuleRuntime**；  
2. 组件卸载或依赖变更时，一定会调用 `Scope.close` 关闭这棵 Scope。

伪代码示意：

```ts
function useLocalModule(factory, deps) {
  const [module, setModule] = useState(null)
  const scopeRef = useRef<Scope | null>(null)
  const runtime = useRuntime() // App 级 ManagedRuntime

  useEffect(() => {
    // 1. 清理旧 Scope（如果有）——防御性，避免旧实例悬挂
    if (scopeRef.current) {
      runtime.runSync(Scope.close(scopeRef.current, Exit.unit))
      scopeRef.current = null
    }

    // 2. 创建新 Scope 并启动 ModuleRuntime
    const fiber = runtime.runFork(
      Effect.gen(function* () {
        const scope = yield* Scope.make()
        scopeRef.current = scope

        // 在 scope 内构造 ModuleRuntime（触发 onInit）
        const moduleRuntime = yield* Effect.scoped(factory()).pipe(
          Scope.extend(scope),
        )

        setModule(moduleRuntime)
      }),
    )

    // 3. Cleanup：组件卸载或 deps 变更时，关闭 Scope（触发 onDestroy）
    return () => {
      if (scopeRef.current) {
        runtime.runFork(Scope.close(scopeRef.current, Exit.unit))
        scopeRef.current = null
      }
      // 同时也中断启动 Fiber（如果仍在启动过程中）
      fiber.interruptAsFork("react-unmount")
    }
  }, deps)

  return module
}
```

**对“内存会不会一直涨”的直观解读：**

- 每个 `useLocalModule` 调用都会对应一棵 Scope，Scope 里挂着这一棵 ModuleRuntime 和它相关的资源；  
- 当组件卸载时，我们显式调用 `Scope.close`：  
  - Effect Runtime 会负责触发所有 finalizer（包括 `ModuleRuntime` 的 `onDestroy`）；  
  - 把挂在这个 Scope 上的 Context/资源从运行时图中移除；  
  - React 不再持有那棵 `ModuleRuntime` 的引用，剩下交给 JS GC 回收。  
- 只要遵守“每个组件对应的 Scope 最终一定会被关闭”这一点，就不会出现“用久了局部 Module 内存一直膨胀”的情况。

总结这一节的关键不变量：

- 任意时刻，一个 `useLocalModule` 实例最多持有一个活跃的 `Scope`；  
- React cleanup 必定调用 `Scope.close`，从而触发 `onDestroy` finalizer 和资源释放；  
- 即使在 Strict Mode 下的“Mount → Unmount → Mount”序列中，之前的 Scope 也会被完整关闭，不会留下悬挂的 ModuleRuntime。

## 5. Global Module 的生命周期（AppRuntime 路径）

Global Module 的 Scope 由 **AppRuntime 根 Scope** 管理。本节结合 AppRuntime 的实现，说明全局模块如何挂载与销毁。

### 5.1 AppRuntime 与 AppDefinition

在 runtime 层，AppRuntime 的定义集中在 `AppRuntime.ts` 中：

```ts
// App 模块条目：由 AppRuntime.provide 生成
export interface AppModuleEntry {
  readonly module: ModuleInstance<any, AnyModuleShape>
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

- 所有 `modules[].layer`（通常是 `ModuleImpl.layer` 或 `Module.live(...)` 返回值）会与 App 级基础 `layer` 一起构成一个大的 Layer，挂在 **同一棵 App Scope** 下；  
- 这个 App Scope 由 `ManagedRuntime.make(finalLayer)` 持有：当 AppRuntime 被 `dispose()` 时，这棵 Scope 被关闭，所有全局 ModuleRuntime 和 Process 统一销毁。

### 5.2 AppRuntime.provide 与 ModuleImpl

为了方便把模块挂到 App 上，AppRuntime 的 `provide` 帮助函数提供了两种调用方式：

```ts
// 1. 显式指定 Module + Layer/Runtime（适合高级用法）
AppRuntime.provide(
  SomeModule,
  SomeModule.live(initial, ...logics) // 或已经构造好的 ModuleRuntime
)

// 2. 直接传 ModuleImpl（推荐）
const Impl = SomeModule.make({ initial, logics: [...] })
AppRuntime.provide(Impl) // 等价于 provide(Impl.module, Impl.layer)
```

在 App 级 Runtime 中，可以抽象为“Root ModuleImpl + AppInfraLayer” 的组合（由 `LogixRuntime.make` 封装）。在 React 场景下，典型用法是：

```tsx
const CounterImpl = CounterModule.make({ initial: { count: 0 }, logics: [CounterLogic] })

const appRuntime = LogixRuntime.make(CounterImpl, {
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
  const runtime = useModule(CounterImpl.module) // ModuleInstance / Tag
  const count = useSelector(CounterImpl.module, (s) => s.count)
  const dispatch = useDispatch(runtime)
  // ...
}
```

- `useModule(Tag)` 使用当前 AppRuntime 运行 Tag Effect：  
  - 本质是 `ManagedRuntime.runSync(Tag)`，从 App 级 Env 中取出对应的 `ModuleRuntime` 实例；  
  - 所有使用同一个 Tag 的组件共享这棵 ModuleRuntime（「全局模块」语义）。  
- 当宿主显式调用 `ManagedRuntime.dispose()`（当前 PoC 中通常在应用卸载时处理）时，App Scope 被关闭：  
  - 所有通过 `modules[].layer` 创建的 ModuleRuntime 会统一触发 `onDestroy`；  
  - 所有通过 `processes` 启动的协调器/长期任务也会一起终止。

### 5.4 Global vs Local 的对比视角

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

## 6. 局部 ModuleImpl + React `useModule` 路径（当前实现）

这一节说明「不注册到应用级 Runtime，只在局部使用 ModuleImpl」时，ModuleRuntime 是如何被管理的。

### 6.1 从 Module 到 ModuleImpl Layer

以一个简单 Module 为例：

```ts
const CounterModule = Logix.Module("LocalCounter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const CounterLogic = CounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("increment").runFork(
      $.state.mutate((s) => { s.count += 1 }),
    )
    yield* $.onAction("decrement").runFork(
      $.state.mutate((s) => { s.count -= 1 }),
    )
  }),
)

const CounterImpl = CounterModule.make({
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

`Module.make` 会生成：

- `CounterImpl.module`：Module Tag（`ModuleInstance<"LocalCounter", Shape>`），用于从 Context 中取出 `ModuleRuntime`；
- `CounterImpl.layer`：`Layer.scoped(tag, ModuleRuntime.make(initial, { tag, logics, moduleId }))`。

可以把 `Module` / `ModuleImpl` 的内部实现粗略想象成这样（概念性伪代码）：

```ts
function Module(id, def) {
  const shape = /* 根据 def.state / def.actions 构造 Shape */

  // 1. 为这个 Module 定义一个 Tag：
  //    - 既是 Context.Tag（Effect 里的“键”）；
  //    - 也是 ModuleInstance 本身。
  const tag = Context.GenericTag<
    any,
    ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>
  >(`@logix/Module/${id}`)

  const moduleInstance = Object.assign(tag, {
    _kind: "Module",
    id,
    shape,

    // 2. logic：在当前 ModuleRuntime 上运行的一段程序（BoundApi 封装细节）
    logic: (build) =>
      Effect.gen(function* () {
        const runtime = yield* tag
        const $ = BoundApi.make(shape, runtime)
        return yield* build($)
      }),

    // 3. live：给定 initial + logics，返回一个会在 Scope 上挂载 ModuleRuntime 的 Layer
    live: (initial, ...logics) =>
      Layer.scoped(
        tag,
        ModuleRuntime.make(initial, {
          tag,
          logics,
          moduleId: id,
        }),
      ),

    // 4. make：基于 live 构造 ModuleImpl（蓝图 + Layer）
    make: (config) => {
      const baseLayer = moduleInstance.live(
        config.initial,
        ...(config.logics ?? []),
      )

      return {
        _tag: "ModuleImpl",
        module: moduleInstance,
        layer: baseLayer,
        // withLayer/withLayers 只是对 layer 的进一步包装，这里略。
      } satisfies ModuleImpl<any, any, any>
    },
  })

  return moduleInstance
}
```

从这个角度看，`.module` 和 `.layer` 是如何关联起来的就很清楚了：

- `.module`：就是那个 Context.Tag，本身也是 ModuleInstance；  
- `.layer`：内部使用 `.module` 作为 Tag，把 `ModuleRuntime.make(...)` 的结果挂到某个 Scope 的 Context 上；  
- 当你调用 `Layer.buildWithScope(Impl.layer, scope)` 时，Tag 和 runtime 的映射才真正写入了 Env；  
- 随后 `Context.get(env, Impl.module)` 只是利用这条映射把 runtime 读出来。

只要在某个 Scope 内执行：

```ts
const env = yield* Layer.buildWithScope(CounterImpl.layer, scope)
const runtime = Context.get(env, CounterImpl.module) // ModuleRuntime
```

就会在 `scope` 下：

- 创建一棵 `ModuleRuntime` 实例；
- 把它注册到 Context（Tag）里；
- 按 `logics` 启动所有 watcher（`run*` / `runFork` 等）。

### 6.2 React 局部模式：`useModule(Impl)` 如何托管 Scope

在 React 集成层，`useModule` 对 ModuleImpl 的重载形态是：

```ts
// @logix/react
useModule(handle: ModuleImpl): ModuleRuntime
```

内部实现简化后相当于：

```ts
function useModule(impl: ModuleImpl) {
  return useLocalModule(
    () =>
      Effect.gen(function* () {
        const scope = yield* Scope.make()
        const env = yield* Layer.buildWithScope(impl.layer, scope)
        const runtime = Context.get(env, impl.module)
        // 注意：scope 的关闭由 useLocalModule 统一托管
        return runtime
      }),
    [impl],
  )
}
```

而 `useLocalModule(factory, deps)` 的职责是：

1. 通过 `useRuntime()` 拿到当前 App/页面级 `ManagedRuntime`（`RuntimeProvider` 提供）；  
2. 在 `useMemo` 里：
   - `const scope = runtime.runSync(Scope.make())` 创建一个局部 Scope；
   - `const moduleRuntime = runtime.runSync(factory(scope))` 构造 ModuleRuntime（`Layer.buildWithScope + Context.get`）；
   - 返回 `{ scope, moduleRuntime }`；
3. 在 `useEffect` cleanup 里：
   - 组件卸载或 `deps` 变更时，调用 `runtime.runFork(Scope.close(scope, Exit.void))`；
   - 触发该 Scope 下的 `ModuleRuntime` finalizer 和所有 `forkScoped` watcher 的中断。

**这就形成了一个清晰的生命周期链条：**

- 每次 `useModule(Impl)` 调用都会创建一棵独立的 `Scope + ModuleRuntime` 实例，挂在当前 React 组件之下；
- 当组件卸载时，通过 `Scope.close` 统一销毁这棵 Scope，包括：  
  - `ModuleRuntime` 自身（`module:destroy` + `lifecycle.onDestroy`）；  
  - 所有 `runFork` / `runParallelFork` 等挂出的 watcher Fiber。

### 6.3 与 AppRuntime 的关系

- **局部 ModuleImpl 模式**：  
  - 完全不需要将 ModuleImpl 注册到应用级 AppRuntime（`modules`）中；  
  - 状态随组件生命周期创建/销毁，非常适合 B 端「每页一个局部模块」的场景。

- **全局 Module 模式**：  
  - ModuleImpl 可以作为 AppRuntime 的模块条目：`modules: [CounterImpl]`；  
  - 此时 ModuleRuntime 的 Scope 挂在 AppRuntime 上，`useModule(Tag)` 只能读取这棵“全局实例”，不再由 `useLocalModule` 额外创建 Scope。

这两条路径在实现层完全共存：  
核心区别只是 **Scope 的挂载点**——局部 ModuleImpl 挂在组件自己的 Scope 上，全局 Module 挂在 AppRuntime 的根 Scope 上。

## 7. 总结

通过 **Safe Wrapper**、**Status Pattern** 和 **Strict Scope Management**，v3 运行时可以保证：
1. `onInit/onDestroy` 里的错误永远不会炸掉 Scope；
2. React 组件的频繁挂载/卸载不会导致资源泄漏；
3. 开发体验（Strict Mode）与生产行为一致且安全。
