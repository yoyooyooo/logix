---
title: 在 React 中使用 Logix
description: 如何在 React 应用中接入 Logix Runtime，并通过 Hooks 使用模块状态与动作。
---


本篇从“业务开发者”的视角，演示如何在一个普通的 React 应用中接入 Logix，并通过 `@logix/react` 提供的组件和 Hooks 读取/更新状态。

> 如果只想快速看结论，可以记住两件事：  
> 1. 在应用根部用 `RuntimeProvider` 包住路由或页面；  
> 2. 在组件里只用 `useModule` / `useSelector` / `useDispatch`，不要再写 `useEffect + useState` 胶水。

## 1. 准备一个 Logix Module

先在任意目录下定义一个最简单的计数器 Module：

```ts
import { Logix } from "@logix/core"
import { Schema } from "effect"

export const CounterModule = Logix.Module("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void
  }
})

export const CounterLogic = CounterModule.logic(($) =>
  $.onAction((a): a is { _tag: "inc" } => a._tag === "inc")
    .update((state) => ({ ...state, count: state.count + 1 }))
)
```

在你的应用入口，为这个 Module 构造一个 Root ModuleImpl，并通过 `LogixRuntime.make` 组装 Runtime：

```ts
import { Logix, LogixRuntime } from "@logix/core"
import { Layer } from "effect"
import { CounterModule, CounterLogic } from "./CounterModule"

export const CounterImpl = CounterModule.make({
  initial: { count: 0 },
  logics: [CounterLogic],
})

export const AppRuntime = LogixRuntime.make(CounterImpl, {
  layer: Layer.empty, // 也可以在这里合并各种服务 Layer
})
```

## 2. 在 React 根组件中挂载 RuntimeProvider

在 React 应用根组件中，用 `RuntimeProvider` 包住你的路由/页面：

```tsx
// App.tsx
import { RuntimeProvider } from "@logix/react"
import { AppRuntime } from "./runtime"
import { Router } from "./Router"

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <Router />
    </RuntimeProvider>
  )
}
```

`RuntimeProvider` 会负责：

- 创建并托管一个 Logix `ManagedRuntime`；
- 把必要的 Context（Layer 提供的服务）注入到 Runtime 中；
- 让子树里的所有 Hooks 都能访问到同一个 Runtime。

如果你的项目已经自己创建了 Runtime，也可以直接传入 `runtime` 属性，而不是 `app`。

## 3. 在组件中读取状态：useModule / useSelector

在任意组件里，通过 Hook 读取 Module 的状态：

```tsx
import { useModule, useSelector } from "@logix/react"
import { CounterModule } from "../runtime/CounterModule"

export function CounterValue() {
  // 获取完整 ModuleRuntime（包含 state / dispatch 等能力）
  const counter = useModule(CounterModule)

  // 或者只订阅某个字段，组件只会在该字段变化时重渲染
  const count = useSelector(counter, (s) => s.count)

  return <span>{count}</span>
}
```

推荐在大多数场景中使用 `useSelector` 订阅切片状态，而不是把完整 `state` 传给组件，这样可以避免不必要的重渲染。

## 4. 在组件中派发动作：useDispatch

要改变状态，只需要派发一个符合 Action Schema 的对象：

```tsx
import { useDispatch, useModule } from "@logix/react"
import { CounterModule } from "../runtime/CounterModule"

export function CounterButton() {
  const counter = useModule(CounterModule)
  const dispatch = useDispatch(CounterModule)

  return (
    <button onClick={() => dispatch({ _tag: "inc" })}>
      +1
    </button>
  )
}
```

`useDispatch` 会自动使用当前的 Runtime 和对应的 ModuleRuntime，在内部调用 `runtime.runFork(moduleRuntime.dispatch(action))`，不需要你自己处理异步或错误通道。

## 5. 局部状态：useLocalModule

对于仅在单个页面或组件中使用的状态（例如临时表单、向导），可以用 `useLocalModule` 创建一个“局部模块实例”：

```tsx
import { useLocalModule } from "@logix/react"
import { Logix } from "@logix/core"
import { Schema } from "effect"

const LocalForm = Logix.Module("LocalForm", {
  state: Schema.Struct({ text: Schema.String }),
  actions: { change: Schema.String }
})

export function LocalFormComponent() {
  const runtime = useLocalModule(LocalForm, { initial: { text: "" } })
  const text = useSelector(runtime, (s) => s.text)
  const dispatch = useDispatch(runtime)

  return (
    <input
      value={text}
      onChange={(e) => dispatch({ _tag: "change", payload: e.target.value })}
    />
  )
}
```

`useLocalModule` 会在组件挂载时创建一个新的 ModuleRuntime，并在组件卸载时自动关闭相关 Scope 和资源。

> 注意：`useLocalModule` 当前是在 React 渲染阶段通过 `runtime.runSync(...)` 构建本地 ModuleRuntime，这意味着它只适用于**同步可构建**的模块（例如纯内存状态、已注入好依赖的模块）。  
> 如果模块的构建依赖异步初始化的服务（如 IndexedDB、远程配置等），建议改用：
> - 在 React 外部通过 `LogixRuntime.make` + `Layer` 异步构建好 Runtime；
> - 或在组件树上使用支持异步 Layer 的 `RuntimeProvider layer={...}` + `useModule` 组合。

## 6. 下一步

- 想了解更多 Logix API，可以继续阅读 [API 参考](../../api/index) 部分；  
- 想看更复杂的集成场景（多模块协作、异步流、远程服务），可以参考仓库中的 `examples/logix-react` 示例项目。 
