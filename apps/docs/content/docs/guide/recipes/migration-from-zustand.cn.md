---
title: 从 Zustand 迁移
description: 把 Zustand 的 state、action 和异步逻辑迁移到 Module、Program 和 Effect。
---

下表把最常见的 Zustand 心智映射到 Logix。

## 映射表

| Zustand | Logix | 角色 |
| --- | --- | --- |
| `createStore` | `Logix.Module.make` | 定义 |
| store | Module + Program | 定义 + 装配 |
| state | state schema | 状态形状 |
| 内联 actions | actions + reducers 或 logic | 操作 |
| selectors | `useSelector(...)` | 读取路径 |
| async actions | logic 中的 Effect | 副作用 |

## 示例

### Zustand

```ts
const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  incrementAsync: async () => {
    await new Promise((r) => setTimeout(r, 1000))
    set((state) => ({ count: state.count + 1 }))
  },
}))
```

### Logix

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    incrementAsync: Schema.Void,
  },
  reducers: {
    increment: (state) => ({ ...state, count: state.count + 1 }),
  },
})

const CounterLogic = Counter.logic("counter-logic", ($) =>
  $.onAction("incrementAsync").run(() =>
    Effect.gen(function* () {
      yield* Effect.sleep(1000)
      yield* $.state.mutate((draft) => {
        draft.count += 1
      })
    }),
  ),
)

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## React 侧

```tsx
const counter = useModule(Counter.tag)
const count = useSelector(counter, (s) => s.count)
const dispatch = useDispatch(counter)
```

## 迁移顺序

1. 先定义目标模块
2. 把同步状态变换移进 reducers
3. 把异步工作移进 logic
4. 把 React 读取切到 `useSelector(...)`
5. 把写入切到 `useDispatch(...)`

## 相关页面

- [Modules & State](../essentials/modules-and-state)
- [Flows & Effects](../essentials/flows-and-effects)
