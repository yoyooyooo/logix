# Store Lifecycle & Scope 实现草图

> **Status**: Draft (v3 Final · Implementation Planning)  
> **Scope**: `StoreConfig.lifecycle` 在运行时中如何绑定到 Effect Scope，实现 Local / Global Store 的 onInit/onDestroy 语义。

本说明文档聚焦于 v3 中 Store 生命周期钩子（`onInit` / `onDestroy`）的运行时实现方式，尤其是它们与 Effect Scope 的关系。

目标：

- 明确 Local Store（`useLocalStore`）与 Global Store（App modules 中的 Store）在生命周期上的差异与共性；  
- 给出 `Store.make` / Store Runner 的伪代码，说明何时触发 onInit、如何注册 onDestroy；  
- 提前指出错误处理与并发相关的注意点。

## 1. StoreConfig.lifecycle 回顾

核心配置如下：

```ts
export interface StoreConfig<S, A, R = never> {
  initial: S
  logic: Effect.Effect<any, any, any>[]

  lifecycle?: {
    // Store 实例创建并挂载到 Scope 后立即执行
    onInit?: Effect.Effect<void, never, R>

    // Store 所在 Scope 关闭前执行 (自动注册为 finalizer)
    onDestroy?: Effect.Effect<void, never, R>
  }
}
```

关键约束：

- `onInit` / `onDestroy` 的错误通道为 `never`：  
  - 意味着：钩子内部必须自行处理错误（例如 log + 忽略），不能让错误冒泡破坏整个 Scope；  
  - 若未来发现确有需要，可以放宽为 `E = any`，并在 Runner 侧捕获日志后忽略。

## 2. Runtime 视角的 Store Runner

我们可以抽象出一个 Store Runner 概念：

```ts
interface StoreRuntime<S, A> extends Store.Runtime<S, A> {
  // 额外的生命周期控制能力（如有需要）
}

function makeStoreRuntime<Sh extends Store.Shape<any, any>, R>(
  config: StoreConfig<Store.StateOf<Sh>, Store.ActionOf<Sh>, R>,
): Effect.Effect<StoreRuntime<Store.StateOf<Sh>, Store.ActionOf<Sh>>, never, R> {
  // 在给定 Env (R) 上构造一个带生命周期的 StoreRuntime
}
```

实现上，`makeStoreRuntime` 通常会：

1. 基于 `Store.State.make` / `Store.Actions.make` / `Logic.make` 构造内部 Layer 和 Logic；  
2. 使用 `Effect.scoped` 在一个新的 Scope 中启动 Logic 长协程；  
3. 在该 Scope 上注册 `onDestroy` 作为 finalizer；  
4. 在 Scope 建立成功后运行 `onInit`。

### 2.1 伪代码示例

```ts
function makeStoreRuntime<Sh extends Store.Shape<any, any>, R>(
  config: StoreConfig<Store.StateOf<Sh>, Store.ActionOf<Sh>, R>,
): Effect.Effect<StoreRuntime<Store.StateOf<Sh>, Store.ActionOf<Sh>>, never, R> {
  const { initial, logic, lifecycle } = config

  return Effect.gen(function* () {
    // 1. 构造基础 Layer（State / Actions）
    const stateLayer = Store.State.make(/* schema */, initial)
    const actionLayer = Store.Actions.make(/* schema */)

    // 2. 构造 Logic 程序的组合
    const logicProgram = Effect.all(logic, { concurrency: "unbounded" as const })

    // 3. 在 scoped 环境中启动 Logic + 注册 finalizer
    const runtime = yield* Effect.scoped(
      Effect.gen(function* () {
        // 3.1 创建 Store.Runtime（内部会使用 stateLayer / actionLayer / logicProgram）
        const storeRuntime: StoreRuntime<Store.StateOf<Sh>, Store.ActionOf<Sh>> =
          yield* buildStoreRuntime(stateLayer, actionLayer, logicProgram)

        // 3.2 注册 onDestroy 作为 Scope finalizer
        if (lifecycle?.onDestroy) {
          // 假设可以访问当前 Scope 实例
          yield* Scope.addFinalizer(
            // onDestroy 在 Scope 关闭前执行
            lifecycle.onDestroy,
          )
        }

        // 3.3 运行 onInit（若有）
        if (lifecycle?.onInit) {
          yield* lifecycle.onInit
        }

        return storeRuntime
      }),
    )

    return runtime
  })
}
```

> 说明  
> - 上述伪代码省略了关于 `Scope` 获取方式的细节，实际实现中可以通过 `Effect.acquireUseRelease` 或 `Effect.scoped` 内部 API 获取当前 Scope；  
> - 核心思想是：**在同一个 Store Scope 内注册 finalizer，并在 Scope 建立后运行 onInit**。

## 3. Local Store 与 Global Store 的差异

### 3.1 Local Store (`useLocalStore`)

React 适配层通常会这样使用：

```ts
function useLocalStore<Sh extends Store.Shape<any, any>>(
  factory: () => Effect.Effect<StoreRuntime<Store.StateOf<Sh>, Store.ActionOf<Sh>>, never, R>,
  deps: ReadonlyArray<unknown>,
): StoreRuntime<Store.StateOf<Sh>, Store.ActionOf<Sh>> {
  // 大致语义：
  // - 每次 deps 变化时，重新构造一个 scoped StoreRuntime；
  // - 组件卸载时，关闭该 Scope，从而触发 onDestroy。
}
```

生命周期语义：

- 组件 Mount：  
  - `factory()` 被执行，内部通过 `makeStoreRuntime` 构造一个新的 Scope + StoreRuntime；  
  - `onInit` 在该 Scope 建立后立即执行。
- 组件 Unmount：  
  - React Hook 清理逻辑关闭 Store Scope；  
  - Scope 关闭时，`onDestroy` finalizer 被触发。

### 3.2 Global Store（App modules 中的 Store）

在 `Logix.app` / `ModuleDef.providers` 中注册的 Store，则与 AppRuntime 的根 Scope 绑定：

```ts
export const GlobalLayoutModule = Logix.module({
  id: "GlobalLayout",
  providers: [
    Logix.provide(GlobalLayoutTag, GlobalLayoutStore), // GlobalLayoutStore 内部可以使用 lifecycle
  ],
  processes: [GlobalLayoutCoordinator],
})
```

实现要点：

- AppRuntime 构建时，`GlobalLayoutStore` 的内部 Runner 会在 App 根 Scope 下构造 Store Scope：  
  - `onInit` 在 App 启动时执行一次；  
  - `onDestroy` 在 AppRuntime 关闭时执行（例如应用退出或测试环境 teardown）。

与 Local Store 的差异在于：

- Global Store 的 Scope 生命周期通常与 App 一致，不随页面/组件卸载而变化；  
- 适配层（如 React）通过 `useStore(Tag)` 只做“订阅状态”，不影响 Store Scope。

## 4. 错误处理与并发注意事项

### 4.1 onInit 中的错误

由于 `onInit: Effect<void, never, R>`，按规范不允许错误冒泡到外层。实现层需特别注意：

- 若业务端确实需要在 onInit 中处理可能失败的操作（例如远程拉取配置），推荐模式是：  
  - 使用 `Effect.either` 或 `Effect.catchAll` 在内部收敛错误；  
  - 将错误状态写入 Store State（例如某个 `meta.error` 字段），而不是直接 fail 整个初始化过程。

#### 4.1.1 初始化状态模式（Status Pattern）

为了让 UI / 上层逻辑更好地感知初始化过程，建议在 Store State 中预留统一的状态字段，例如：

```ts
type Status = "idle" | "initializing" | "ready" | "error"
```

典型模式：

- 初始状态：`status = "idle"` 或 `"initializing"`；  
- onInit 开始时：将 `status` 置为 `"initializing"`；  
- onInit 成功：将 `status` 置为 `"ready"`，并写入必要的初始化数据；  
- onInit 捕获错误：  
  - 将 `status` 置为 `"error"`，  
  - 写入错误详情到 `state.meta.error` 或类似字段；  
  - UI 层可据此展示降级页面或错误提示。

这种模式与 onInit 的 `E = never` 约束配合，可以实现“初始化失败可见、但不会炸掉整个 Scope”的鲁棒行为。

### 4.2 onDestroy 的错误

同理，onDestroy 作为 finalizer，也不应让错误破坏 Scope 关闭流程：

- 实现时可在 finalizer 外层包一层：

  ```ts
  const safeOnDestroy = lifecycle.onDestroy
    ? lifecycle.onDestroy.pipe(Effect.catchAll((e) => Logger.error(e)))
    : Effect.unit
  ```

  然后注册 `safeOnDestroy` 为 finalizer。

### 4.3 多次初始化 / 多次销毁的场景

- 对 Local Store 而言，每次 deps 变化等价于“销毁旧实例 + 创建新实例”：  
  - React 适配层需要保证在切换实例时先关闭旧 Scope，再创建新 Scope；  
  - 避免两代 Store 同时存在造成竞态。
- 对 Global Store 而言，除非 AppRuntime 被显式重建（如测试场景或 HMR），否则只会 init 一次、destroy 一次。

#### 4.3.1 React Strict Mode 的影响

在 React 18 的 Strict Mode 下，某些 Hook 会经历“模拟的双重 Mount/Unmount”过程，用以发现副作用问题：

- 这意味着 Local Store 的 onInit/onDestroy 可能在开发模式下被调用多次；  
- 若 onInit 内部进行了外部副作用（如网络请求、写入 LocalStorage），需要保证：  
  - 要么这些操作是幂等的；  
  - 要么能够容忍短时间内重复执行，不影响业务语义。

建议：

- 在实现 onInit 时尽量保证逻辑幂等（例如通过状态检查避免重复初始化）；  
  - 或者将可能产生副作用的部分放入 processes / Logic 中，由业务明确控制其生命周期，而不是放在 Store lifecycle 钩子中。

## 5. 实现注意点小结

1. **实现位置**  
   - 生命周期钩子的具体执行逻辑，建议集中在 Store Runner / Runtime 构造函数中，而不是分散在 Logic 或 React 适配层；  
   - React 适配层只负责控制 Scope 生命周期（何时创建/销毁），不直接关心 onInit/onDestroy 的细节。

2. **与 Debug/Tracing 的集成**  
   - 在实现 onInit/onDestroy 时，可以考虑在 Debug 层发出结构化事件（如 `StoreLifecycleEvent`），方便 DevTools 展示 Store 生命周期时间线。

3. **与 ModuleDef 的关系**  
   - 虽然生命周期主要是 Store 层概念，但在 ModuleDef 视图中，可以将某些 Store 标记为具有特殊 lifecycle 行为（例如“在 App 启动时预加载配置”），帮助平台在 Universe View 中突出显示。

通过上述约定，v3 可以在不引入额外 Lifecycle Manager 的前提下，利用 Effect Scope + finalizer 实现强语义的 Store 生命周期管理，同时保持 Local / Global Store 行为的一致性与可预测性。***
