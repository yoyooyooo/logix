---
title: Suspense & Async
description: Handling asynchronous data with React Suspense.
---

# Suspense & Async

Logix 深度集成了 React Suspense，使得处理异步数据变得异常简单。

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

如果你的 Module 需要在初始化时加载数据，只需在 `onInit` 中执行异步操作，并确保你的 Module 是通过 `useModule` 消费的。

```ts
const UserLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.lifecycle.onInit(
      Effect.gen(function* () {
        // 模拟异步加载
        yield* Effect.sleep('1 seconds')
        const user = yield* fetchUser()
        yield* $.state.update((s) => ({ ...s, user }))
      }),
    )
  }),
)
```

## 2. 在组件中使用 Suspense

当 `useModule` 检测到 Module 正在初始化时，它会自动挂起组件。

```tsx
function UserProfile() {
  // 如果 UserModule 还在初始化，这里会挂起
  const userModule = useModule(UserImpl)
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

## 3. 手动控制挂起

有时你可能希望在某些 Action 执行期间挂起组件（Transition）。

```ts
// 在 Logic 中（UserLogic 的 run 段内）
yield* $.onAction('refresh').runExhaust(() =>
  Effect.gen(function* () {
    // 标记开始 loading
    yield* $.state.update((s) => ({ ...s, isLoading: true }))

    // ... 加载数据 ...

    // 标记结束 loading
    yield* $.state.update((s) => ({ ...s, isLoading: false }))
  }),
)
```

在组件中配合 `useTransition`：

```tsx
const [isPending, startTransition] = useTransition()

const handleRefresh = () => {
  startTransition(() => {
    module.dispatch({ _tag: 'refresh' })
  })
}
```

## 4. 错误边界 (Error Boundaries)

如果异步初始化失败，Logix 会将错误抛出到最近的 Error Boundary。

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
