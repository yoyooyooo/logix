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

### 4.3 `useLocalModule` 实现范式 (防 Scope 泄漏)

React 适配层必须保证 Scope 的创建与销毁严格成对，不留悬挂 Scope。

```ts
function useLocalModule(factory, deps) {
  const [module, setModule] = useState(null)
  const scopeRef = useRef(null)
  const runtime = useRuntime() // App 级 Runtime

  useEffect(() => {
    // 1. 清理旧 Scope (如果有) - 防御性编程
    if (scopeRef.current) {
      runtime.runSync(Scope.close(scopeRef.current, Exit.unit))
    }

    // 2. 创建新 Scope 并启动 Module
    const fiber = runtime.runFork(
      Effect.gen(function* () {
        const scope = yield* Scope.make()
        scopeRef.current = scope

        // 在 Scope 内创建 ModuleRuntime (触发 onInit)
        const moduleRuntime = yield* Effect.scoped(factory()).pipe(
          Scope.extend(scope)
        )

        setModule(moduleRuntime)
      })
    )

    // 3. Cleanup: 组件卸载或 deps 变更时，关闭 Scope (触发 onDestroy)
    return () => {
      if (scopeRef.current) {
        runtime.runFork(Scope.close(scopeRef.current, Exit.unit))
        scopeRef.current = null
      }
      // 同时也中断启动 Fiber (如果还在启动中)
      fiber.interruptAsFork("react-unmount")
    }
  }, deps)

  return module
}
```

**关键不变量**：
- 任意时刻，一个 `useLocalModule` 实例最多持有一个活跃的 `Scope`；
- React cleanup 必定调用 `Scope.close`，从而触发 `onDestroy` finalizer；
- 即使在 Strict Mode 下，也能保证 `Scope 1` 彻底关闭后才创建 `Scope 2`（或并行创建但各自独立），不会有资源泄漏。

## 5. Global Module 的生命周期

Global Module 的 Scope 由 AppRuntime 根 Scope 管理：
- App 启动时创建一次 Scope + ModuleRuntime，运行一次 onInit；
- AppRuntime 关闭时关闭 Scope，触发 onDestroy；
- React 侧的 `useModule(Tag)` 只负责订阅状态，**不得**创建或关闭新的 Scope。

## 6. 总结

通过 **Safe Wrapper**、**Status Pattern** 和 **Strict Scope Management**，v3 运行时可以保证：
1. `onInit/onDestroy` 里的错误永远不会炸掉 Scope；
2. React 组件的频繁挂载/卸载不会导致资源泄漏；
3. 开发体验（Strict Mode）与生产行为一致且安全。
