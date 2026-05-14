---
title: Modules & State
description: 定义 state 与 actions，然后装配成 Programs。
---

Module 声明 state 与 actions。Program 选择 initial state、mounted logic、services、imports 与 transaction options。

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ value: Schema.Number }),
  actions: { inc: Schema.Void },
})

const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
})
```

## State writes

在 logic 内使用 Bound API：

```ts
const Logic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").mutate((state) => {
      state.value += 1
    })
  }),
)
```

在 React 中，写入通常走 `useDispatch(...)` 或 Form handle 这样的领域 handle。

## Reads

在 React 中：

```tsx
const counter = useModule(Counter.tag)
const value = useSelector(counter, (state) => state.value)
```

React acquisition 不要使用裸 Module object。托管实例用 `Module.tag`；local/keyed 实例用 `Program`。
