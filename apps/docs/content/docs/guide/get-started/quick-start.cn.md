---
title: 快速开始
description: 定义 module、装配 program、创建 runtime，并在 React 中读取。
---

这是 React 中最小的完整 Logix 路线。

## 定义 module

```ts
import { Schema } from "effect"
import * as Logix from "@logixjs/core"

const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
    decrement: Logix.Module.Reducer.mutate((draft) => {
      draft.count -= 1
    }),
  },
})
```

Reducer 是同步状态变换。Effect、订阅、服务和长链路任务放进 logic。

## 添加 logic

```ts
import { Effect } from "effect"

const CounterLogic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.readyAfter(Effect.log("Counter ready"), { id: "counter-ready" })

    yield* $.onAction("increment").run(() =>
      Effect.log("increment dispatched"),
    )
  }),
)
```

builder 收到 `$`，也就是绑定到当前 module 的 API。同步声明直接在 builder 内完成；返回的 `Effect` 是运行时程序。

## 装配 program

```ts
export const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

`Program.make` 是公开装配边界。imports、service layers、事务策略和声明都会在这里收敛。

## 挂载 React

```tsx
import * as Logix from "@logixjs/core"
import {
  RuntimeProvider,
  fieldValue,
  useDispatch,
  useModule,
  useSelector,
} from "@logixjs/react"

const runtime = Logix.Runtime.make(CounterProgram)

function CounterView() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, fieldValue("count"))
  const dispatch = useDispatch(counter)

  return (
    <button onClick={() => dispatch({ _tag: "increment", payload: undefined })}>
      {count}
    </button>
  )
}

export function App() {
  return (
    <RuntimeProvider runtime={runtime}>
      <CounterView />
    </RuntimeProvider>
  )
}
```

`RuntimeProvider` 持有 runtime 投影。`useModule(Counter.tag)` 从 runtime 中解析共享实例。`useSelector` 订阅精确读取；无参数读取整个 state 不是公开路线。

## Node 运行

```ts
await Logix.Runtime.run(CounterProgram, ({ module }) =>
  Effect.gen(function* () {
    yield* module.dispatch({ _tag: "increment", payload: undefined })
    return yield* module.getState
  }),
)
```

CLI 任务、smoke test 和一次性服务端执行使用 `Runtime.run`。
