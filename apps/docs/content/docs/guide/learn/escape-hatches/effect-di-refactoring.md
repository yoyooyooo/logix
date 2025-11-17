---
title: 'Effect DI：把“基础设施”从业务逻辑里拿出去'
description: 用 Tag + Layer 注入依赖，让 Logix Logic 更可复用、更好测试。
---

前端业务里常见的痛点是：**逻辑本身很简单，但为了能跑通，你不得不把 API、路由、Toast、埋点等“基础设施”一路透传**，最后组件/Hook 变成了依赖搬运工；或者你退而求其次用全局单例，换来更难测试和更难复用。

在 Logix 中，推荐把这些能力抽象成 **Effect Service（Tag）**，在运行时用 **Layer** 注入实现，然后在 Logic 内通过 `$.use(...)` 按需获取。

## 1. 先从 Logix 的写法开始（不需要先懂 Effect）

### 1.1 定义“能力”而不是“实现”

```ts
import { Context, Effect } from "effect"

class Api extends Context.Tag("Api")<Api, {
  readonly login: (username: string) => Effect.Effect<void, Error>
}>() {}

class Navigation extends Context.Tag("Navigation")<Navigation, {
  readonly push: (path: string) => Effect.Effect<void>
}>() {}

class Toast extends Context.Tag("Toast")<Toast, {
  readonly show: (message: string) => Effect.Effect<void>
}>() {}
```

### 1.2 在 Logic 中按需使用（不再传参）

```ts
import { Effect } from "effect"

const loginLogic = Auth.logic(($) =>
  Effect.gen(function* () {
    const api = yield* $.use(Api)
    const nav = yield* $.use(Navigation)
    const toast = yield* $.use(Toast)

    yield* api.login("yoyo")
    yield* Effect.all([nav.push("/dashboard"), toast.show("欢迎回来")], {
      concurrency: "unbounded",
    })
  }),
)
```

到这里你已经获得了两点收益：

- Logic 不再依赖具体宿主（Web/小程序/Node），只依赖“能力”；
- 依赖不再通过参数传递，组件/Hook 不再承担搬运工作。

## 2. 再理解 Effect DI：Layer 就是“注入实现”的地方

在应用启动时（或测试时），你需要用 Layer 把 Tag 对应的实现提供出去：

```ts
import * as Logix from "@logix/core"
import { Layer } from "effect"

const EnvLayer = Layer.mergeAll(
  Layer.succeed(Api, { login: (u) => /* ... */ } as any),
  Layer.succeed(Navigation, { push: (p) => /* ... */ } as any),
  Layer.succeed(Toast, { show: (m) => /* ... */ } as any),
)

const runtime = Logix.Runtime.make(RootImpl, { layer: EnvLayer })
```

同一套 Logic：

- 在 Web 里注入浏览器路由实现；
- 在 React Native 里注入原生导航实现；
- 在 Node 脚本或测试里注入 Mock 实现；

业务代码不需要改动。

## 3. 测试时的重构落点（最小闭环）

当你想单测某段 Logic 时，只要提供测试 Layer 即可：

1. 为每个外部依赖写一个最小接口（Tag）。
2. 在测试里用 `Layer.succeed(Tag, mockImpl)` 提供实现。
3. 运行同一段 Logic，断言状态变化或产出的结构化结果。

## 4. 迁移建议（从最小增量开始）

1. 先挑一个最痛的逻辑（例如登录、提交、支付）做 Tag 化：把 `api/router/toast` 从参数里拿掉。
2. 在 Runtime 入口统一注入实现（不要在组件里临时注入）。
3. 把“跨模块复用”的逻辑优先迁移（收益最大）。
4. 保持接口最小化：Tag 只暴露你真正需要的能力，避免把“大而全的客户端对象”直接塞进 Env。
