---
title: 从 Zustand 迁移
description: 从 Zustand 迁移到 Logix 的完整指南。
---

# 从 Zustand 迁移到 Logix

本指南帮助你将现有的 Zustand 状态管理逐步迁移到 Logix。

## 概念映射

| Zustand            | Logix                     | 说明               |
| ------------------ | ------------------------- | ------------------ |
| `createStore`      | `Logix.Module.make`       | 定义状态结构       |
| Store              | Module                    | 状态容器           |
| State              | State Schema              | 用 Schema 定义类型 |
| Actions (in store) | Actions + Reducers/Logic  | 分离声明与实现     |
| `set(state)`       | `$.state.mutate`（推荐）  | 状态更新           |
| `get()`            | `$.state.read`            | 读取状态           |
| Selectors          | `useSelector(module, fn)` | 派生与订阅         |
| Middleware         | Logic + Flow              | 异步/副作用        |
| `useStore`         | `useModule`               | React 集成         |

## 迁移示例

### Zustand 原代码

```ts
import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  incrementAsync: () => Promise<void>
}

const useCounterStore = create<CounterState>((set, get) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  incrementAsync: async () => {
    await new Promise((r) => setTimeout(r, 1000))
    set((state) => ({ count: state.count + 1 }))
  },
}))

// 使用
function Counter() {
  const { count, increment } = useCounterStore()
  return <button onClick={increment}>{count}</button>
}
```

### Logix 迁移后

```ts
import * as Logix from '@logixjs/core'
import { Effect, Schema } from 'effect'

// 1. 定义 Module（分离声明与实现）
const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
    incrementAsync: Schema.Void,
  },
  // 同步逻辑可直接用 reducers
  reducers: {
    increment: (s) => ({ ...s, count: s.count + 1 }),
    decrement: (s) => ({ ...s, count: s.count - 1 }),
  },
})

// 2. 异步逻辑放在 Logic 中
const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('incrementAsync').run(() =>
      Effect.gen(function* () {
        yield* Effect.sleep(1000)
        yield* $.state.mutate((d) => {
          d.count++
        })
      }),
    )
  }),
)

// 3. 组装
const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

```tsx
// React 使用
import { useModule, useSelector, useDispatch } from '@logixjs/react'

function Counter() {
  const counter = useModule(CounterModule)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: 'increment' })}>{count}</button>
}
```

## 逐步迁移策略

### 1. 并行运行

保留 Zustand Store，新增 Logix Runtime 并行运行：

```tsx
function App() {
  return (
    <RuntimeProvider runtime={logixRuntime}>
      {/* 新模块用 Logix */}
      <NewFeature />
      {/* 旧模块继续用 Zustand，逐步迁移 */}
      <LegacyFeature />
    </RuntimeProvider>
  )
}
```

### 2. 逐个迁移

每次迁移一个 Store：

1. 创建对应的 `Module.make` 定义
2. 把 actions 实现迁移到 `reducers` + `Logic`
3. 替换组件中的 `useStore` 为 `useModule`
4. 测试验证后删除旧 Store

### 3. 共享状态（过渡期）

如果需要在迁移期间共享状态：

```ts
// 在 Logix Logic 中读取 Zustand
const BridgeLogic = NewModuleDef.logic(($) =>
  Effect.gen(function* () {
	    yield* $.onAction('syncFromZustand').run(() =>
	      Effect.sync(() => {
	        const zustandState = useOldStore.getState()
	        return $.state.mutate((d) => {
	          d.legacy = zustandState
	        })
	      }),
	    )
	  }),
)
```

## 主要收益

迁移后你将获得：

| 能力         | Zustand                  | Logix                       |
| ------------ | ------------------------ | --------------------------- |
| 异步竞态控制 | 手动管理                 | `runLatest/runExhaust` 内置 |
| 取消请求     | 手动 AbortController     | Effect 自动处理             |
| 类型安全     | 手动维护                 | Schema 自动推导             |
| 调试工具     | 需要 devtools middleware | 内置 DevTools               |
| 跨模块通信   | 手动依赖注入             | `$.use` / `Link.make`       |

## 常见问题

### Q: 需要一次性全部迁移吗？

不需要。可以保持 Zustand 和 Logix 并行运行，逐个模块迁移。

### Q: 性能有影响吗？

Logix 使用 `SubscriptionRef` 实现细粒度订阅，性能与 Zustand 相当。

### Q: 团队学习成本大吗？

基础用法（Module + Logic + useModule）与 Zustand 类似，可以在需要时再学习 Effect 高级能力。

## 下一步

- [Thinking in Logix](../essentials/thinking-in-logix)
- [Flows & Effects](../essentials/flows-and-effects)
- [常见问题排查](../advanced/troubleshooting)
