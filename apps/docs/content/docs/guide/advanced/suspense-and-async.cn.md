---
title: Suspense & Async
description: Handling asynchronous data with React Suspense.
---

`useModule` 的默认路径是同步获取模块句柄。`useModule(Program)` 会立刻返回句柄，加载与失败状态留在模块 state 中表达。只有显式传入 `suspend: true` 时，初始化过程才会交给 Suspense 和 Error Boundary。

只有在 UI 必须等待初始化完成时才建议启用 Suspense。交互期的 loading 和 error 仍然更适合留在 state 中显式渲染。

## 1. 异步初始化

如果你的 Module 需要在初始化时加载数据，可以把它写在必需初始化里（`onInitRequired/onInit`）。

在 React 中需要区分两种策略：

### 1.1 默认同步模式（不挂起）

默认情况下 `useModule(Program)` 会同步返回模块句柄，不会等待初始化完成；因此初始化阶段不应包含真正的异步等待（例如 `Effect.sleep` / 异步 Layer 构建）。

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
  // declaration-only：注册初始化逻辑（Runtime 统一调度；与 Suspense/ErrorBoundary 配合）
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
  const userModule = useModule(UserProgram, { suspend: true, key: 'user:current' })
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

## 延伸阅读

- 学习如何处理各类错误：[错误处理](./error-handling)
- 学习如何测试你的模块：[测试](./testing)
