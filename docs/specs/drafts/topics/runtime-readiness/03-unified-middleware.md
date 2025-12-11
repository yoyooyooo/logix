---
title: Logix v3 Unified Middleware Architecture
status: draft
layer: Kernel
related:
  - logix-reactive-module-integration.md
priority: 1000
---

# Logix v3: Unified Middleware Architecture

为了支撑 "元编程模式" (Metaprogramming Pattern)，我们需要一个统一的内核级拦截机制。
灵感来源于 Redux 的 `applyMiddleware`，但针对 Effect Runtime 进行了适配。

## 1. 核心设计 (Core Design)

我们定义一个统一的 `Middleware` 接口，它可以同时拦截 Module 生命周期的三个关键阶段：

```ts
interface Middleware<S, A> {
  // 拦截 State 更新
  // 用于: 持久化, Undo/Redo, 调试日志
  state?: (next: (s: S) => Effect<void>) => (s: S) => Effect<void>

  // 拦截 Action 分发
  // 用于: 埋点, 乐观更新, 权限拦截
  action?: (next: (a: A) => Effect<void>) => (a: A) => Effect<void>

  // 拦截 Logic 初始化 (可选)
  // 用于: 自动注入 Context, 性能监控
  logic?: (next: LogicFn) => LogicFn
}
```

## 2. 组合机制 (Composition)

类似于 Redux，我们提供一个 `applyMiddleware` 工具，将多个中间件组合成一个增强器 (Enhancer)。

```ts
// 组合器
const enhance = applyMiddleware(
  LoggerMiddleware,
  PersistMiddleware,
  UndoRedoMiddleware
)

// 在 Module.live 中使用
const runtime = yield* ModuleRuntime.make(initialState, {
  enhancer: enhance
})
```

## 3. 运行时实现 (Runtime Implementation)

在 `ModuleRuntime.make` 内部，我们会应用这个 Enhancer：

```ts
// 伪代码
function make(initialState, options) {
  // 1. 原始的底层操作
  let setState = (s) => stateRef.set(s)
  let dispatch = (a) => actionHub.publish(a)

  // 2. 应用中间件链
  if (options.enhancer) {
    const enhanced = options.enhancer({ setState, dispatch })
    setState = enhanced.setState
    dispatch = enhanced.dispatch
  }

  // 3. 暴露给外部的是"增强后"的版本
  return {
    setState,
    dispatch,
    ...
  }
}
```

## 4. 示例：持久化中间件

```ts
const PersistMiddleware = (config) => ({
  state: (next) => (state) => {
    // 1. 先执行更新
    return next(state).pipe(
      // 2. 后执行持久化 (不阻塞主流程)
      Effect.tap(() => Storage.set(config.key, state))
    )
  }
})
```

这种设计既保持了内核的纯净，又提供了无限的扩展能力。
