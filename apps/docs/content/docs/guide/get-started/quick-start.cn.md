---
title: 快速开始
description: 创建一个 Counter Program，并在 React 中挂载。
---

## 1. 定义 Module 与 Logic

```ts
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

const CounterState = Schema.Struct({ value: Schema.Number })
const CounterActions = { inc: Schema.Void }

export const Counter = Logix.Module.make("Counter", {
  state: CounterState,
  actions: CounterActions,
})

export const CounterLogic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").mutate((state) => {
      state.value += 1
    })
  }),
)
```

## 2. 装配 Program

```ts
export const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [CounterLogic],
})
```

## 3. 创建 Runtime

```ts
export const runtime = Logix.Runtime.make(CounterProgram)
```

## 4. 在 React 中挂载并使用

```tsx
import { RuntimeProvider, useDispatch, useModule, useSelector } from "@logixjs/react"
import { Counter, runtime } from "./counter"

function CounterView() {
  const counter = useModule(Counter.tag)
  const value = useSelector(counter, (state) => state.value)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: "inc", payload: undefined })}>{value}</button>
}

export function App() {
  return (
    <RuntimeProvider runtime={runtime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

## 发生了什么

- `Module` 声明 state 与 actions。
- `Logic` 响应 `inc` action。
- `Program` 装配 runnable unit。
- `Runtime` 创建 execution container。
- React 通过 `useModule(Counter.tag)` 消费托管实例，并通过 `useSelector(...)` 做精确读取。
