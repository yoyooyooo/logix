# 6. 局部 ModuleImpl + React `useModule` 路径（当前实现）

这一节说明「不注册到应用级 Runtime，只在局部使用 ModuleImpl」时，ModuleRuntime 是如何被管理的。

## 6.1 从 Module 到 ModuleImpl Layer

以一个简单 Module 为例：

```ts
const CounterDef = Logix.Module.make("LocalCounter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("increment").runFork(
      $.state.mutate((s) => { s.count += 1 }),
    )
    yield* $.onAction("decrement").runFork(
      $.state.mutate((s) => { s.count -= 1 }),
    )
  }),
)

const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

`Module.make + implement` 会生成：

- `CounterDef.tag`：ModuleTag（身份锚点），用于从 Context 中取出 `ModuleRuntime`；
- `CounterModule.impl.layer`：`Layer.scoped(tag, ModuleRuntime.make(initial, { tag, logics, moduleId }))`。

可以把 `Module` / `ModuleImpl` 的内部实现粗略想象成这样（概念性伪代码）：

```ts
function ModuleTag(id, def) {
  const shape = /* 根据 def.state / def.actions 构造 Shape */

  // 1. 为这个 Module 定义一个 Tag：
  //    - 既是 Context.Tag（Effect 里的“键”）；
  //    - 也是 ModuleTag 本身。
  class ModuleTag extends Context.Tag(`@logix/Module/${id}`)<
    ModuleTag,
    ModuleRuntime<StateOf<typeof shape>, ActionOf<typeof shape>>
  >() {}
  const tag = ModuleTag

  const moduleTag = Object.assign(tag, {
    _kind: "ModuleTag",
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

    // 4. implement：基于 live 构造 ModuleImpl（蓝图 + Layer）
    implement: (config) => {
      const baseLayer = moduleTag.live(
        config.initial,
        ...(config.logics ?? []),
      )

      return {
        _tag: "ModuleImpl",
        module: moduleTag,
        layer: baseLayer,
        // withLayer/withLayers 只是对 layer 的进一步包装，这里略。
      } satisfies ModuleImpl<any, any, any>
    },
  })

  return moduleTag
}
```

从这个角度看，`.module` 和 `.layer` 是如何关联起来的就很清楚了：

- `.module`：就是那个 Context.Tag（ModuleTag）；
- `.layer`：内部使用 `.module` 作为 Tag，把 `ModuleRuntime.make(...)` 的结果挂到某个 Scope 的 Context 上；
- 当你调用 `Layer.buildWithScope(Impl.layer, scope)` 时，Tag 和 runtime 的映射才真正写入了 Env；
- 随后 `Context.get(env, Impl.module)` 只是利用这条映射把 runtime 读出来。

只要在某个 Scope 内执行：

```ts
const env = yield* Layer.buildWithScope(Counter.impl.layer, scope)
const runtime = Context.get(env, Counter.tag) // ModuleRuntime
```

就会在 `scope` 下：

- 创建一棵 `ModuleRuntime` 实例；
- 把它注册到 Context（Tag）里；
- 按 `logics` 启动所有 watcher（`run*` / `runFork` 等）。

## 6.2 React 局部模式：`useModule(Impl)` 如何托管 Scope

在 React 集成层，`useModule` 对 ModuleImpl 的重载形态是：

```ts
// @logix/react
useModule(handle: ModuleImpl): ModuleRuntime
```

内部实现简化后相当于：

在 L9「react-use-local-module-runtime-overhaul」实施后，React 适配层已切换为基于 **ModuleCache** 的实现。这解决了 StrictMode 下的资源抖动问题，并支持了 Suspense。

`useModule(Impl)` 的内部实现不再直接操作 Scope，而是委托给 Cache：

```ts
function useModule(impl: ModuleImpl, options) {
  const cache = getModuleCache(useRuntime())
  // 1. 生成 Key (组件 ID + deps hash)
  const key = computeKey(impl, options)

  // 2. 从 Cache 读取 (可能抛出 Promise)
  const runtime = cache.read(key, () => createFactory(impl))

  // 3. 锁定生命周期 (Retain)
  useEffect(() => cache.retain(key), [key])

  return runtime
}
```

**ModuleCache 核心机制**：

- **缓存维度**：每个 `ManagedRuntime` 对应一个 `ModuleCache`（WeakMap 关联）；
- **生命周期**：采用 `Acquire -> Retain -> Release -> GC` 流程：
  - **Acquire**：`readSync / read` 在 Render 阶段命中/创建 Entry，并为该 Entry 创建独立的 Effect Scope；
  - **Retain / Release**：在 Commit / Cleanup 阶段通过 `retain(key)` / `release(key)` 维护 `refCount`，仅当 `refCount` 降至 0 时才进入 Idle；
  - **延迟 GC**：Idle 后不会立即销毁，而是等待一小段窗口（如 500ms），若期间再次 `retain`（StrictMode 重挂载或会话恢复）则复用，否则关闭 Scope 并删除 Entry。
- **双模式支持**：
  - **同步模式 (默认)**：`readSync`，要求 Factory 同步返回，适合纯内存模块；
  - **Suspense 模式**：`read`，支持异步 Factory，抛出 Promise 挂起组件。

> **LifecycleManager 与 ModuleCache 的关系**
>
> - `LifecycleManager` 始终只关注“某棵 ModuleRuntime Scope 何时打开/关闭”，不关心该 Scope 是如何被创建或缓存的；
> - `ModuleRuntime.make` 在自身 Scope 上注册 finalizer：Scope 关闭时先执行 `lifecycle.runDestroy`，再记录 `module:destroy` 并从 `runtimeRegistry` 卸载实例；
> - `ModuleCache` 只是决定“某个 ModuleRuntime Scope 何时被关闭”：在 GC 阶段调用 `Scope.close(entry.scope)`，从而间接触发 `onDestroy`；
> - 换言之：**ModuleCache 只影响 ModuleRuntime 的存在时长，不改变 `onInit/onDestroy/onError` 的语义与触发时机**。

> **历史背景**：
> 在早期实现中，`useLocalModule` 曾采用“每次 Render/Effect 创建新 Scope”的朴素实现。这种方式在 React 18 StrictMode 下会导致 Module 被重复创建销毁（Mount -> Unmount -> Mount），触发不必要的 `onInit/onDestroy` 甚至状态丢失。引入 Resource Cache 后，这些问题已得到根治。

## 6.2 模块资源缓存：ModuleCache 与 Key 语义

当前 @logix/react 中，局部 ModuleImpl 的核心实现落在 `ModuleCache` 上，关键点如下：

- 缓存维度：
  - 每个 `ManagedRuntime` 对应一个 `ModuleCache`（通过 WeakMap 关联）；
  - 缓存内部以 `ResourceKey: string` 区分不同的局部 Module 实例。
- 同步模式（默认）：
  - `useModule(Impl)` / `useModule(Impl, { deps })` 走 `cache.readSync(key, factory)`；
  - key 由内部的“组件实例 ID + deps 哈希”组成（`instanceKey`），在 StrictMode 下通过专门策略避免 key 抖动；
  - 这一模式只适用于 `.layer` 不包含真正异步步骤的 ModuleImpl。
- Suspense 模式（`suspend: true`）：
  - `useModule(Impl, { suspend: true, key, deps })` 走 `cache.read(key, factory)`，在 render 阶段启动异步构建并通过 Promise 驱动 Suspense；
  - `ResourceKey` 完全由调用方提供的 `key` 控制（运行时只会附加稳定的 `deps` 哈希），**用于标识一份局部 ModuleRuntime 资源**；
  - cache 内部通过 `status: "pending" | "success" | "error" + refCount + 延迟 GC` 管理 Scope 生命周期，避免 StrictMode / Suspense 带来的频繁 mount/unmount 造成泄漏：
    - `pending`：初始化过程中，即便 `refCount` 为 0，也不会立即 GC，而是延后调度，直到状态变为 `success` / `error`；
    - `success`：GC 时使用业务配置的 `gcTime`（默认约 500ms），支持会话级保活；
    - `error`：将 `gcTime` 收紧为一个固定的短周期（实现中为常量 `ERROR_GC_DELAY_MS`），避免错误状态长期占用缓存并阻塞后续重试。

需要特别强调的是：

- 对于 **同步模式**，调用方可以不关心 `key`，库内部会根据组件实例自动生成稳定 key；
- 对于 **Suspense 模式**，`key` 被视为运行时契约的一部分——Logix 规范要求调用方：
  - 显式传入稳定的 `key`；
  - 该 `key` 在“同一份局部 ModuleRuntime 的所有渲染尝试”之间必须保持不变；
  - 不得依赖内部的默认 key 生成逻辑作为长期行为。

> useId 与 Suspense 的边界（结合 L9 调研）
>
> - React 18 中，`useId` 的设计目标是「保证最终 commit / Hydration 时 DOM `id` 的拓扑稳定」，**并不保证在 Suspense 重试 / 并发中断 / 未提交分支中的中间值不变**；
> - 将 `useId` 直接用作 `ModuleCache` 的 Key，会把「渲染中的中间状态」暴露给缓存层：一旦某次重试中 `useId` 生成了新的值，缓存就会认为这是“全新的资源”，从而不断创建新的 Scope 并一直抛 Promise，表现为 Suspense fallback 永远 pending；
> - 因此，异步局部 ModuleImpl 的推荐模式是：
>   - 在 Suspense 边界外层使用 `useId()` 或业务 ID 生成稳定前缀；
>   - 将该前缀通过 props 传入内部组件，用于构造 `useModule(Impl, { suspend: true, key })` 所需的 Key；
>   - 避免在 `useModule` 内部直接依赖 `useId` 作为唯一 Key 来源。

## 6.3 与 AppRuntime 的关系

- **局部 ModuleImpl 模式**：
  - 完全不需要将 ModuleImpl 注册到应用级 AppRuntime（`modules`）中；
  - 状态随组件生命周期创建/销毁，非常适合 B 端「每页一个局部模块」的场景。

- **全局 Module 模式**：
  - ModuleImpl 可以作为 AppRuntime 的模块条目：`modules: [CounterImpl]`；
  - 此时 ModuleRuntime 的 Scope 挂在 AppRuntime 上，`useModule(Tag)` 只能读取这棵“全局实例”，不再由 `useLocalModule` 额外创建 Scope。

这两条路径在实现层完全共存：
核心区别只是 **Scope 的挂载点与实例复用维度**：

- 全局 Module：挂在应用级 Runtime Scope，同一个 Tag 全局唯一实例；
- 局部 ModuleImpl：挂在组件所在 Runtime 上的 `ModuleCache` 管理的局部 Scope 树中，实例复用粒度由调用方提供的 `ResourceKey` 决定（同步模式由组件实例 ID 推导，Suspense 模式由显式 `key` 决定）。
