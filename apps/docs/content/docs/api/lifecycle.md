---
title: "Lifecycle (`$.lifecycle`)"
---
Logix Module 拥有明确的生命周期，`$.lifecycle` 提供了挂钩这些阶段的能力。

## 生命周期阶段

一个 Module 的生命周期通常绑定在一个 Effect `Scope` 上。

1.  **Init**: 当 Module 的 Layer 被构建（acquire）时触发。
2.  **Running**: Module 处于活跃状态，处理 Action 和 State 变更。
3.  **Destroy**: 当 Module 的 Scope 被关闭（release）时触发。

## 钩子函数

### 1. `onInit`

在 Module 初始化完成后立即执行。常用于：
-   发起初始数据加载请求。
-   建立 WebSocket 连接。
-   启动定时器。

```typescript
$.lifecycle.onInit(
  Effect.gen(function* () {
    yield* Console.log("Module mounted")
    yield* $.actions.dispatch({ _tag: "fetchData" })
  })
)
```

### 2. `onDestroy`

在 Module 销毁前执行。常用于：
-   清理外部资源（如果不是通过 Scope 管理的）。
-   埋点上报（Module 卸载）。

**注意**：Effect 的 `Scope` 机制通常能自动处理资源释放（如 `Effect.addFinalizer`），`onDestroy` 更多用于业务逻辑层面的清理。

```typescript
$.lifecycle.onDestroy(
  Console.log("Module unmounted")
)
```

### 3. `onError`

当 Logic 中的后台 Fiber（如 `$.onAction` 启动的流程）发生未捕获的错误（Defect）时触发。

Logix 的设计原则是 **Logic Fiber 不应崩溃**。如果用户的 Effect 抛出了未处理的错误，Logix Runtime 会捕获它，防止整个 Module 崩溃，并通过 `onError` 钩子通知业务层。

```typescript
$.lifecycle.onError((cause, context) =>
  Effect.gen(function* () {
    yield* Console.error(`Error in ${context.phase}:`, cause)
    yield* Toast.error("系统错误，请稍后重试")
  })
)
```

`context` 参数包含错误发生的阶段（如 `flow.run`）和 Module ID 等信息。

## 平台生命周期

除了 Module 自身的生命周期，Logix 还通过 `Platform` 接口对接宿主环境（如 React 组件、App 状态）的生命周期。

-   **`onSuspend`**: App 切后台 / 组件隐藏。
-   **`onResume`**: App 切前台 / 组件显示。
-   **`onReset`**: 收到全局重置信号（如注销登录）。

这些钩子需要底层 Platform Adapter 的支持（在 React 中通常由 `useLogix` 自动绑定）。

```typescript
// 页面可见时自动刷新数据
$.lifecycle.onResume(
  $.actions.dispatch({ _tag: "refresh" })
)
```

在 React 集成场景下，通常推荐：

- 使用 `RuntimeProvider runtime={LogixRuntime.make(rootImpl, { layer, onError })}` 作为**应用或页面级的 Composition Root**；  
- 把 Module 的生命周期理解为“挂在这棵 Runtime 上”：当 Runtime 存在时，Module 即处于 Running 阶段，销毁 Runtime（例如单页应用整体卸载）时，Module 的 Scope 会被统一关闭并触发 `onDestroy`；  
- 如果你需要手动管理 Runtime 的创建/销毁（例如在更大的宿主框架中嵌入 Logix 应用），可以选择 `runtime={...}` 形式，由宿主显式调用 `ManagedRuntime.make` 与 `dispose`，RuntimeProvider 只负责在 React 树中传递这个 Runtime，而不会自动销毁它。
