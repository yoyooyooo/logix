---
title: Suspense & Async
description: Handling asynchronous data with React Suspense.
---

Logix 支持在 React 中以**可选**方式使用 Suspense 来等待“模块初始化完成后再渲染”。

默认行为是**不挂起**：`useModule(Impl)` 会同步返回模块句柄，你可以用 state 渲染 loading/error；只有在显式启用 `suspend:true` 时，`useModule` 才会通过 Suspense 挂起组件。

### 适合谁

- 使用 React 18+，希望用 Suspense 处理“模块初始化加载中/失败”等状态；
- 打算在 Logix Module 的 `onInit` 或异步 Layer 里做数据加载，需要知道它们与 Suspense / ErrorBoundary 的关系。

### 前置知识

- 熟悉 React Suspense / ErrorBoundary 的基本用法；
- 读过 [Lifecycle](../essentials/lifecycle)，理解 `onInit` 与 Module 实例生命周期的含义。

### 读完你将获得

- 能在项目里安全地给 Module 加上异步初始化，并配合 Suspense 使用；
- 理解 `useModule` 在同步模式 vs Suspense 模式下的行为差异；
- 清楚“加载失败时错误会流向哪里，以及谁应该负责展示 fallback”。

## 1. 异步初始化

如果你的 Module 需要在初始化时加载数据，可以把它写在必需初始化里（`onInitRequired/onInit`）。

在 React 中需要区分两种策略：

### 1.1 默认同步模式（不挂起）

默认情况下 `useModule(Impl)` 会同步返回模块句柄，不会等待初始化完成；因此初始化阶段不应包含真正的异步等待（例如 `Effect.sleep` / 异步 Layer 构建）。

推荐写法是：先渲染初始态，用 `onStart` 或 Watcher 发起异步加载，并用 state（如 `isLoading/error`）驱动 UI。

```ts
const UserLogic = UserModule.logic(($) => {
  // onStart：此时 Watcher 已经挂载，可以触发一次加载
  $.lifecycle.onStart($.dispatchers.refresh())

  return Effect.gen(function* () {
    yield* $.onAction('refresh').runLatest(() =>
      Effect.gen(function* () {
        yield* $.state.mutate((draft) => {
          draft.isLoading = true
          draft.error = undefined
        })
        const user = yield* fetchUser()
        yield* $.state.mutate((draft) => {
          draft.isLoading = false
          draft.user = user
        })
      }),
    )
  })
})
```

> 如果你在调用方试图用 `dispatch + sleep` 来“等完成”，通常意味着需要设计一个用例级 Action 或显式的完成信号；可以参考 [管理状态](../learn/managing-state)。

### 1.2 Suspense 模式（挂起等待）

当你希望“初始化完成前不渲染 UI”，请配合下一节的 `suspend:true` 使用；这时 `onInitRequired/onInit` 可以安全地包含异步等待。

```ts
const UserLogic = UserModule.logic(($) => {
  // setup-only：注册初始化逻辑（Runtime 统一调度；与 Suspense/ErrorBoundary 配合）
  $.lifecycle.onInitRequired(
    Effect.gen(function* () {
      // 模拟异步加载
      yield* Effect.sleep('1 seconds')
      const user = yield* fetchUser()
      yield* $.state.mutate((draft) => {
        draft.user = user
      })
    }),
  )

  return Effect.void
})
```

## 2. 在组件中使用 Suspense

当你希望“初始化完成前不渲染 UI”，请显式启用 Suspense 模式：

- `suspend:true`：开启 Suspense 挂起；
- `key`：必须提供稳定 key（用于复用/缓存该模块实例，避免挂起抖动）。

```tsx
function UserProfile() {
  // suspend:true：初始化未完成时，这里会挂起（需要 Suspense 边界）
  const userModule = useModule(UserImpl, { suspend: true, key: 'user:current' })
  const user = useSelector(userModule, (s) => s.user)

  return <div>Hello, {user.name}</div>
}

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfile />
    </Suspense>
  )
}
```

## 3. 交互期间的 Loading / Transition

很多时候你并不希望挂起组件树，而是希望在 Action 执行期间展示 Loading，并把错误收敛为 state。推荐做法是：在 Logic 中维护 `isLoading`/`error` 等状态，并在 UI 中渲染它们。

```ts
// 在 Logic 中（UserLogic 的 run 段内）
yield* $.onAction('refresh').runExhaust(() =>
  Effect.gen(function* () {
    // 标记开始 loading
    yield* $.state.mutate((draft) => {
      draft.isLoading = true
    })

    // ... 加载数据 ...

    // 标记结束 loading
    yield* $.state.mutate((draft) => {
      draft.isLoading = false
    })
  }),
)
```

如果你想让 UI 更新更平滑，可以在组件中配合 `useTransition`（可选）：

```tsx
const [isPending, startTransition] = useTransition()

const handleRefresh = () => {
  startTransition(() => {
    module.dispatch({ _tag: 'refresh' })
  })
}
```

## 4. 错误边界 (Error Boundaries)

在 `suspend:true` 模式下，如果初始化失败（例如异步 Layer 构建失败、必需初始化失败、或初始化超时），`useModule` 会将错误抛出到最近的 Error Boundary。

```tsx
<ErrorBoundary fallback={<div>Failed to load</div>}>
  <Suspense fallback={<div>Loading...</div>}>
    <UserProfile />
  </Suspense>
</ErrorBoundary>
```

## 下一步

- 学习如何处理各类错误：[错误处理](./error-handling)
- 了解如何调试模块行为：[调试与 DevTools](./debugging-and-devtools)
- 学习如何测试你的模块：[测试](./testing)
