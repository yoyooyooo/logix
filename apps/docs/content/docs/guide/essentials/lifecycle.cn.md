---
title: Lifecycle
description: 理解模块生命周期钩子以及它们与 Runtime/React 的关系。
---

Logix Module 的生命周期与 Effect 的 `Scope` 紧密绑定。

### 适合谁

- 已经能编写基本 Logic，希望正确处理“初始化 / 清理 / 错误上报”等生命周期问题；
- 在 React 项目里使用 Logix，想搞清楚 Module 与组件挂载/卸载之间的对应关系。

### 前置知识

- 了解 Module / Logic 的基本概念；
- 读过 [Flows & Effects](./flows-and-effects)，知道什么是长逻辑 Watcher。

### 读完你将获得

- 知道何时应该在 `onInit` 里做初始化，何时用 Watcher 监听 Action/State；
- 理解 `onDestroy` 与 React 卸载之间的关系，以及它适合做哪些事情；
- 能为模块设计合理的“启动/销毁”和错误上报策略。

## 主要阶段

1.  **Mount (Init)**: 模块被挂载时。
2.  **Running**: 模块运行中。
3.  **Unmount (Destroy)**: 模块被卸载时。

## 钩子函数

### `onInitRequired` / `onInit`

必需初始化：决定实例可用性。适合做“必须先完成才能进入业务”的初始化请求（例如加载配置）。

> `onInit` 是 legacy alias，语义等同于 `onInitRequired`。

提示：`onInitRequired/onInit` 会在 Watcher 启动前执行，因此这里不适合 `dispatch` 一个“依赖 `$.onAction/$.onState` 处理”的 Action；如果想复用某段逻辑，建议把它提取成函数，并在 `onInitRequired` 与对应 Watcher 中分别调用。

```ts
$.lifecycle.onInitRequired(
  Effect.gen(function* () {
    yield* Effect.log('Module mounted')
    yield* $.state.mutate((d) => {
      d.ready = true
    })
  }),
)
```

### `onStart`

启动任务：不阻塞实例可用性，适合启动轮询/订阅等后台行为；失败会进入同一条错误兜底链路。

```ts
$.lifecycle.onStart(Effect.log('Start background tasks'))
```

### `onDestroy`

模块卸载时触发。适合做清理工作（尽管 Effect Scope 通常会自动处理）。

```ts
$.lifecycle.onDestroy(Effect.log('Module unmounted'))
```

### `onError`

当后台逻辑发生未捕获错误时触发。

```ts
$.lifecycle.onError((cause) => Effect.logError('Something went wrong', cause))
```

## 编写 Logic 的启动顺序（避免初始化噪音）

Logix 的 Logic 会经历 **setup → run** 两个阶段：return 前的同步调用用于注册生命周期与 reducer，return 的 Effect 才会在 Env 就绪后以长期 Fiber 运行。推荐按以下顺序书写，避免在 Env 未就绪时读取 Service：

1. 在 builder 顶部注册 `$.lifecycle.onError/onInit`；
2. 如需动态 reducer，随后调用 `$.reducer`（确保目标 action 尚未 dispatch 过）；
3. 在 `return Effect.gen(...)` 内挂载 `$.onAction/$.onState` 等 Watcher/Flow，并在此处读取 Env/Service。

在开发模式下，如果在 setup 段访问 `$.use/$.onAction/$.onState`，或在 builder 顶层直接 `Effect.run*`，Runtime 会给出 `logic::invalid_phase` / `logic::setup_unsafe_effect` 诊断提示。

## React 集成

在 React 中，`useModule` 会自动管理生命周期：

- **组件挂载**: 创建 Module 实例，触发 `onInit`。
- **组件卸载**: 销毁 Module 实例，触发 `onDestroy`。

> 注意：如果你使用的是全局单例 Module（未指定 `key` 且不是 Local Module），它通常只会在 App 启动时初始化一次。

## 下一步

恭喜你完成了 Essentials 必备概念的学习！接下来可以：

- 进入核心概念深入学习：[描述模块](../learn/describing-modules)
- 学习高级主题：[Suspense & Async](../advanced/suspense-and-async)
- 学习错误处理：[错误处理](../advanced/error-handling)
- 查看 React 集成指南：[React 集成](../recipes/react-integration)
