---
title: Modules & State
description: Learn how to define state and actions in Logix.
---

# Modules & State

在 Logix 中，一切皆 Module。Module 是状态、动作和逻辑的容器。

本指南将带你从零开始构建一个简单的计数器模块。

### 适合谁

- 已经跑通「快速开始」中的计数器示例，希望系统理解 Module 的设计；
- 有 Redux / Zustand 等状态管理经验，想对照理解 Logix 的不同之处。

### 前置知识

- 熟悉 TypeScript 类型与基本语法；
- 大致理解“状态 + Action + Reducer”的概念。

### 读完你将获得

- 能够为自己的业务定义清晰的 State / Actions Schema；
- 理解哪些逻辑适合放在 Module 的 `reducers`，哪些适合放在 Logic watcher 中；
- 知道如何用 `Module.make` 组装一个可复用的模块实现（ModuleImpl）。

## 1. 定义 State (状态)

首先，我们需要定义模块的状态长什么样。Logix 使用 `effect` 的 `Schema` 来定义强类型的状态结构。

```ts
import { Schema } from 'effect'

// 定义 State Schema
const State = Schema.Struct({
  count: Schema.Number,
  isLoading: Schema.Boolean,
})
```

## 2. 定义 Actions (动作)

接下来，定义我们可以对状态做什么操作。Action 也是通过 Schema 定义的。

```ts
// 定义 Actions
const Actions = {
  increment: Schema.Void, // 无参数
  decrement: Schema.Void, // 无参数
  setValue: Schema.Number, // 参数为 number
}
```

## 3. 创建 Module 蓝图

现在，我们将 State 和 Actions 组合成一个 Module。

```ts
import * as Logix from '@logix/core'

	export const CounterDef = Logix.Module.make('Counter', {
	  state: State,
	  actions: Actions,
	})
```

## 4. 实现 Logic (逻辑)

定义好“形状”后，我们需要实现具体的业务逻辑。推荐的写法是让 `Module.logic` 返回一个 `Effect.gen`，把所有 watcher 都写在 generator 体内：

```ts
import { Effect } from 'effect'

		const CounterLogic = CounterDef.logic(($) =>
		  Effect.gen(function* () {
	    // 监听 increment
	    yield* $.onAction('increment').runFork(
	      $.state.mutate((draft) => {
	        draft.count += 1
	      }),
	    )

	    // 监听 decrement
	    yield* $.onAction('decrement').runFork(
	      $.state.mutate((draft) => {
	        draft.count -= 1
	      }),
	    )

	    // 监听 setValue
	    yield* $.onAction('setValue').runFork(({ payload: value }) =>
	      $.state.mutate((draft) => {
	        draft.count = value
	      }),
	    )
	  }),
	)
```

上面的例子通过 Logic 中的监听器（watcher）来更新状态。对于像计数器这类**纯同步、无副作用**的核心状态变更，你也可以选择在 `Logix.Module` 定义里通过可选的 `reducers` 字段声明主 reducer，由 Runtime 在 `dispatch` 时同步应用；两者的职责划分和更完整的示例可以参考「Thinking in Logix」文档中的 Primary Reducer vs Watcher 说明。

## 5. 组装 Implementation

最后，我们将逻辑挂载到 Module 上，并提供初始状态。

```ts
export const CounterModule = CounterDef.implement({
  initial: { count: 0, isLoading: false },
  logics: [CounterLogic],
})

export const CounterImpl = CounterModule.impl
```

现在，`CounterImpl` 就可以在 React 组件中使用了！

```tsx
function Counter() {
  const counter = useModule(CounterModule)
  // ...
}
```

## 下一步

学会了如何定义状态和简单的同步逻辑，接下来我们将学习如何处理异步流程和副作用。
👉 [Flows & Effects](./flows-and-effects)
