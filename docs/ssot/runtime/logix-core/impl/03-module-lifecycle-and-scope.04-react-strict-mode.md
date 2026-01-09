# 4. Local Module 与 React Strict Mode

## 4.1 Strict Mode 下的生命周期挑战

React 18 Strict Mode 会在开发环境下执行 `Mount -> Unmount -> Mount` 序列。
这意味着 `useLocalModule` 会经历：

1. `Scope 1` 创建 -> `onInit`
2. `Scope 1` 关闭 -> `onDestroy`
3. `Scope 2` 创建 -> `onInit`

## 4.2 幂等性要求

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

## 4.3 `useLocalModule` 实现范式（防 Scope 泄漏 & 内存膨胀）

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
