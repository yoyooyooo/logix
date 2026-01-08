---
title: 快速开始
description: 用不到 30 分钟构建你的第一个 Logix 应用。
---

本指南将带你从零开始构建一个最小可运行的计数器应用。

> **适合谁**
>
> - 已经读过「介绍」，希望马上跑通一个 Demo；
> - 熟悉 React 基本用法，但对 Logix / Effect 还比较陌生。
>
> **前置知识**
>
> - 会创建 React 应用（如 Vite / Next.js 等任一脚手架即可）；
> - 会写简单的 TypeScript 组件。
>
> **读完你将获得**
>
> - 能在自己的项目中接入 Logix Runtime；
> - 会定义一个最简单的 Module 和 Logic；
> - 会在 React 组件中读取状态、派发动作。

## 1. 安装

```bash
npm install @logixjs/core @logixjs/react effect
```

## 2. 定义 Module（状态与动作）

首先，我们在任意目录下定义一个最简单的计数器 Module：

```typescript
// counter.module.ts
import * as Logix from "@logixjs/core"
import { Schema } from "effect"

export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    inc: Schema.Void,
  },
})
```

这一步只做两件事：

- 用 Schema 描述状态结构：这里只有一个 `count: number`；
- 定义可以发生的动作：这里只有一个不带参数的 `inc`。

## 3. 编写 Logic（如何响应动作）

接下来，我们为这个 Module 编写一段最简单的逻辑：每当收到 `inc` 动作时，把 `count` 加一。

```typescript
// counter.logic.ts
import { Effect } from "effect"
import { CounterDef } from "./counter.module"

export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    // 监听 "inc" 动作，并更新当前 Module 的状态
    yield* $.onAction("inc").update((prev) => ({
      ...prev,
      count: prev.count + 1,
    }))
  }),
)
```

这里你可以把 `Effect.gen` 理解为“用同步写法描述一段逻辑流程”，`yield*` 则可以粗暴看成 `await`。

## 4. 组装 Module 实现（可复用的蓝图）

在大多数真实项目中，我们会把 “ModuleDef + 初始状态 + 逻辑” 组装成一个可复用的 program module（它带 `.impl` 蓝图，供 Runtime/React 消费）：

```typescript
// counter.impl.ts
import { CounterDef } from "./counter.module"
import { CounterLogic } from "./counter.logic"

export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.impl
```

后续无论是在 React 组件里，还是在测试里，你都可以拿着 `CounterModule`（或其 `CounterImpl`）创建运行时实例。

## 5. 创建 Runtime，并在 React 中挂载

在应用入口，我们需要：

1. 基于根 program module（或其 `ModuleImpl`）构造一个 Runtime；
2. 用 `RuntimeProvider` 把 Runtime 挂到 React 根节点上。

```tsx
// runtime.ts
import * as Logix from "@logixjs/core"
import { Layer } from "effect"
import { CounterModule } from "./counter.impl"

// 这里暂时没有额外服务依赖，用 Layer.empty 即可
export const AppRuntime = Logix.Runtime.make(CounterModule, {
  layer: Layer.empty,
})
```

```tsx
// App.tsx（或任意应用入口）
import { RuntimeProvider } from "@logixjs/react"
import { AppRuntime } from "./runtime"
import { CounterView } from "./CounterView"

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

## 6. 在组件中读取状态并派发动作

最后，我们在组件中使用 `useModule` + `useSelector` / `useDispatch` 读取状态、派发动作：

```tsx
// CounterView.tsx
import { useModule, useSelector, useDispatch } from "@logixjs/react"
import { CounterDef } from "./counter.module"

export function CounterView() {
  // 获取对应 Module 的运行时实例
  const counter = useModule(CounterDef)

  // 只订阅 count 字段，避免不必要的重渲染
  const count = useSelector(counter, (s) => s.count)

  // 派发动作
  const dispatch = useDispatch(CounterDef)

  return (
    <button onClick={() => dispatch({ _tag: "inc" })}>
      Count: {count}
    </button>
  )
}
```

到这里，你已经完成了一个完整的 Logix 流程：

- 定义 Module（状态 + 动作）；
- 在 Logic 中用 `$` 编排业务逻辑；
- 创建 Runtime，并通过 React `RuntimeProvider` 提供它；
- 在组件中通过 Hook 读取状态与派发动作。

接下来，推荐继续阅读：

- [教程：第一个业务流（可取消搜索）](./tutorial-first-app)
- （表单）[Form 快速开始](../../form/quick-start)
- [Modules & State](../essentials/modules-and-state)
- [Flows & Effects](../essentials/flows-and-effects)
