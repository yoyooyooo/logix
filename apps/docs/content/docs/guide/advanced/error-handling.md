---
title: 错误处理
description: Logix 中的错误处理策略。
---

# 错误处理

在 Logix 中，错误处理分为两个层面：**预期错误**（Expected Errors）和**意外错误**（Defects）。

### 适合谁

- 已经在项目中使用 Logix，希望系统整理"业务错误 vs 系统缺陷"的处理策略；
- 对 Effect 的错误通道（`E`）和 React Error Boundary 有基本了解，想在项目里统一用法。

### 前置知识

- 读过 [Effect 速成](../essentials/effect-basics) 或对 `Effect.gen` 有基本直觉；
- 理解 `$.lifecycle.onError` 会在 Logic Fiber 出现 Defect 时触发。

### 读完你将获得

- 一套可落地的"业务错误（Expected）"与"系统缺陷（Defect）"处理分层方案；
- 在 Logix/React 组合场景下，如何在 Module 层、Runtime 层与 UI 层配合处理错误的示例。

## 1. 预期错误 (Expected Errors)

预期错误是业务逻辑的一部分，例如"用户未找到"、"网络超时"。这些错误应该在 Effect 的错误通道（`E`）中处理。

```ts
const LoginLogic = LoginModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('login').run(({ payload: credentials }) =>
      Effect.gen(function* () {
        // 尝试登录
        yield* loginApi(credentials).pipe(
          // 捕获特定错误
          Effect.catchTag('InvalidPassword', () => $.state.update((s) => ({ ...s, error: '密码错误' }))),
          // 捕获其他错误
          Effect.catchAll(() => $.state.update((s) => ({ ...s, error: '登录失败' }))),
        )
      }),
    )
  }),
)
```

## 2. 意外错误 (Defects)

意外错误是代码 bug 或不可恢复的系统错误。Logix 会自动捕获 Logic 中的 Defect，防止整个应用崩溃。

### `onError` 钩子

你可以通过 `$.lifecycle.onError` 钩子统一处理未捕获的错误：

```ts
const AppLogic = AppModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.lifecycle.onError((cause) => Effect.logError('System error', cause))

    // ... 其他逻辑
  }),
)
```

## 3. Error Boundary 集成

如果错误发生在初始化阶段（Suspense），它会被抛出到 React 组件树，由 Error Boundary 捕获。

```tsx
import { ErrorBoundary } from 'react-error-boundary'

function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<Loading />}>
        <MainContent />
      </Suspense>
    </ErrorBoundary>
  )
}
```

## 4. 恢复策略 (Retry)

Effect 提供了强大的重试机制：

```ts
// 自动重试 3 次
yield * fetchApi().pipe(Effect.retry({ times: 3 }))

// 指数退避重试
yield *
  fetchApi().pipe(
    Effect.retry({
      schedule: Schedule.exponential('100 millis'),
    }),
  )
```

## 下一步

- 了解如何调试模块行为：[调试与 DevTools](./debugging-and-devtools)
- 学习如何测试你的模块：[测试](./testing)
- 查看常用模式与最佳实践：[常用模式](../recipes/common-patterns)
