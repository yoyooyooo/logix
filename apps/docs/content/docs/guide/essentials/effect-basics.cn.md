---
title: Effect 速成：只学你需要的 20%
description: 面向 Logix 用户的 Effect 入门速查表。
---

> **适合谁**
>
> - 正在使用 Logix，但从来没系统学过 Effect / 函数式编程；
> - 能看懂 `async/await`，但看到 `Effect.gen` / `Stream` 就有点发怵。
>
> **前置知识**
>
> - TypeScript 基础语法；
> - 大致知道什么是“异步请求”“错误处理”“依赖注入（Service）”。
>
> **读完你将获得**
>
> - 能看懂文档和示例中的大部分 `Effect.gen` 写法；
> - 知道 `Effect.Effect<A, E, R>` 三个泛型分别代表什么；
> - 知道什么时候应该继续只用 `$`，什么时候可以下钻到 Effect 层。

本页不是一份完整的 Effect 教程，而是 **“写 Logix 业务代码必须掌握的那 20%”**。如果你只想把 Logix 用起来，可以先读完本页，其余细节遇到再查。

## 1. 把 Effect 当成“更安全的 async 函数”

在直觉上，可以先把：

- `Effect.Effect<A, E, R>` 想象成一个“还没有执行的异步函数”；
- `A` 是成功时返回的值类型（类似 `Promise<A>` 中的 `A`）；
- `E` 是业务错误类型（不是异常，而是你愿意处理/上报的“失败”）；
- `R` 是运行这段逻辑时需要的“环境依赖”集合（Service / 配置等）。

在 Logix 里，你**几乎总是**通过 `Effect.gen(function* () { ... })` 来写 Effect：

```ts
const fx = Effect.gen(function* () {
  const user = yield* UserApi.getUser('id-123') // 调用 Service
  yield* Effect.log(`Loaded user ${user.name}`) // 打日志
  return user // 返回值 A = User
})
```

- `yield*` 的体验可以理解为 `await`，只是背后是 Effect；
- 整个 `Effect.gen(...)` 返回一个“尚未执行的程序”，Logix Runtime 会在合适的时机帮你跑；
- 你在 Logic 里几乎不会显式调用 `Effect.runXXX`，而是交给 `$` 的 `.run` / `.runLatest` 等执行。

> 心智模型：**“我在编排一个流程，而不是立刻跑它”**。

## 2. 在 Logix 里最常见的几个 Effect 原语

写业务 Logic 时，常见的 Effect 原语可以粗暴记住下面几个：

- `Effect.gen(function* () { ... })`：用同步的方式写异步流程；
- `Effect.map(fx, f)`：在不改变错误和依赖的前提下变换成功值；
- `Effect.flatMap(fx, f)`：在上一步结果的基础上继续拼接下一步逻辑；
- `Effect.all([...])`：并行/串行地跑多段 Effect（常用于“同时发起多个请求”）；
- `Effect.sleep("1 seconds")`：显式等待一段时间（少用，多数节流/防抖交给 Flow）。

在 Logix 文档和示例中，你最常见到的模式是：

- 外面是 `$` 的 Fluent DSL（例如 `$.onAction("submit").run(...)`）；
- 里面用 `Effect.gen` 串起具体步骤（调用 Service、更新状态、记录埋点等）。

```ts
yield*
  $.onAction('submit').run(() =>
    Effect.gen(function* () {
      const api = yield* $.use(UserApi)
      yield* $.state.mutate((draft) => {
        draft.meta.isSubmitting = true
      })

      const result = yield* api.submit(/* ... */)

      yield* $.state.mutate((draft) => {
        draft.meta.isSubmitting = false
        draft.meta.lastResult = result
      })
    }),
  )
```

你可以先不关心 `Effect` 具体怎么实现，只要知道：

- 业务流程都写在 `Effect.gen(function* () { ... })` 里；
- 每行 `yield*` 就是“下一步”；
- `$` 会帮你把这段流程挂到正确的 Action / State 流上。

## 3. 错误与环境：先知道有它们就够了

### 3.1 业务错误 `E`

Effect 把错误通道从 `throw` / `catch` 拉到了类型里：

- `Effect.Effect<User, ApiError, never>` 表示“要么拿到 User，要么得到一个 ApiError，且不依赖额外环境”；
- 在 Logix 的业务 Logic 里，通常会在边界处把错误转成状态/提示，而不是把 `E` 暴露到最外层。

对业务开发者来说，可以先记住两点：

- 绝大多数示例里的 Effect 都是 `E = never`，也就是“要么成功，要么被 Runtime 当成缺陷处理”；
- 当你需要更精细的错误控制时，再查看“错误处理”专题文档即可。

### 3.2 环境依赖 `R`

`R` 可以理解为“这段逻辑需要的服务集合”，例如：

- `Effect.Effect<User, never, UserApi>`：表示这段逻辑需要在环境里注入 `UserApi` 实现；
- 在 Logix 里，这类服务通常通过 Tag + Layer 提供，再通过 `$.use(ServiceTag)` 或 `$.use(Module)` 取出。

在日常写 Logic 时，你只需要：

- 用 `$.use(SomeService)` 获取服务实例；
- 在 ModuleImpl / Runtime 层用 `withLayer` 或 `Runtime.make` 把实现注入进去；
- 具体的 `R` 类型推导交给 TypeScript。

## 4. 什么时候该“下钻”到 Effect 视角？

默认建议：

- **写日常业务逻辑时**：优先只看 `$` 相关的文档，把 Effect 当作“更安全的 async”；
- **遇到下面这些需求时**，再回来看本页 + Advanced/Deep Dive：
  - 自己封装 Flow / Pattern，希望复用到多个 Module；
  - 需要复杂的并发控制、重试、超时策略；
  - 需要在测试里精准地控制时间与错误分支。

> 一句话总结：**先把 Logix 当作“带 Intent 的状态管理框架”，等你开始写库/Pattern，再把 Effect 当作“可以组合的运行时语言”认真学。**

## 下一步

- 学习模块生命周期：[Lifecycle](./lifecycle)
- 深入理解响应式流：[Flows & Effects](./flows-and-effects)
- 开始深入核心概念：[核心概念](../learn/describing-modules)
