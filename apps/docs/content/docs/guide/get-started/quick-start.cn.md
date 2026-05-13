---
title: Quick Start
description: 定义模块、装配 program、挂载 runtime，并在 React 中读取状态。
---

下面用一个最小计数器切片串起模块定义、program 装配、runtime 挂载与 React 读取。

## 安装

```bash
npm install @logixjs/core @logixjs/react effect
```

## 定义模块

```ts
import * as Logix from "@logixjs/core"
import { Schema } from "effect"

export const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: {
    inc: Schema.Void,
  },
})
```

## 附加 logic

```ts
import { Effect } from "effect"

export const CounterLogic = Counter.logic("counter-logic", ($) =>
  $.onAction("inc").run(() =>
    $.state.mutate((draft) => {
      draft.count += 1
    }),
  ),
)
```

## 装配 program

```ts
export const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## 创建 runtime

```ts
import * as Logix from "@logixjs/core"
import { Layer } from "effect"

export const runtime = Logix.Runtime.make(CounterProgram, {
  layer: Layer.empty,
})
```

## 在 React 中挂载

```tsx
import { RuntimeProvider, useDispatch, useModule, useSelector } from "@logixjs/react"

function CounterView() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: "inc", payload: undefined })}>{count}</button>
}

export function App() {
  return (
    <RuntimeProvider runtime={runtime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

## 下一步

- [可取消搜索教程](./tutorial-first-app)
- [Modules & State](../essentials/modules-and-state)
- [Flows & Effects](../essentials/flows-and-effects)
