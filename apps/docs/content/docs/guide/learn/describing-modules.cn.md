---
title: 模块 (Modules)
description: 理解 Logix 中的模块概念。
---

**Module** 是 Logix 的核心。它定义了应用中特定领域的 **状态 (State)** 和 **行为 (Actions)**。

## 定义模块

```typescript
	import * as Logix from '@logixjs/core'
	import { Schema } from 'effect'

	export const CounterDef = Logix.Module.make('Counter', {
	  state: Schema.Struct({
	    count: Schema.Number,
	  }),
	  actions: {
	    increment: Schema.Void,
	    decrement: Schema.Void,
	  },
	})
```

## 实现模块 (Module Implementation)

模块定义对象仅定义了“形状”(Shape)，要让它运行起来，我们需要创建一个“可运行的模块对象”（它带 `.impl` 蓝图）。它将模块定义与初始状态、业务逻辑绑定在一起。

```typescript
// 1. 定义 Logic (业务逻辑)
const CounterLogic = CounterDef.logic(($) => ...);

// 2. 创建可运行模块对象（program module，带 `.impl` 蓝图）
export const CounterModule = CounterDef.implement({
  initial: { count: 0 },
  logics: [CounterLogic]
});

export const CounterImpl = CounterModule.impl
```

`CounterModule` 是一个可以直接被 React 或 App 消费的实体；其 `.impl`（如 `CounterImpl`）是底层 `ModuleImpl` 蓝图。

### 声明实现所需的依赖 (imports)

在很多场景下，一个模块实现会“自带”一些依赖（例如共享的 Service、其他模块的实现）。
你可以在 `ModuleDef.implement` 时，通过 `imports` 一次性声明这些依赖：

```ts
	import { Layer } from 'effect'
	import { AuthImpl } from '../auth/module.impl'
	import { SessionTag } from '../auth/session'

	export const CounterModule = CounterDef.implement({
	  initial: { count: 0 },
	  logics: [CounterLogic],
	  imports: [
	    // 1. 依赖另一个 Module 的实现
	    AuthImpl,
	    // 2. 提供一个 Service 的默认实现
	    Layer.succeed(SessionTag, { currentUserId: null }),
	  ],
	})

	export const CounterImpl = CounterModule.impl
```

要点：

- `imports` 接受：
  - 任意 `Layer`（例如某个 Service 的实现、平台能力等）；
  - 其他 `ModuleImpl`（例如当前模块依赖 Auth 模块的运行时）。
- 这些依赖只影响 **运行时装配**：
  - 让当前模块的 Logic 可以通过 Tag 访问到对应的 Service / ModuleRuntime；
  - 不会改变“跨模块协作通过 `$.use`（imports 内）/ `Link.make`（跨模块胶水逻辑）完成”的基本方式，也不会引入 TypeScript 层面的循环依赖。
- 对于模块作者来说，可以把“这个模块默认需要带着哪些依赖”写在 `imports` 里；
  对于装配者（AppRuntime / React），仍然可以用 `module.withLayer(...)`（或 `module.impl.withLayer(...)`）在外层做局部覆盖或注入。

## 在 React 中使用

推荐使用 `useModule` Hook 消费模块对象（或 `ModuleImpl`）：

```tsx
import { useModule, useSelector, useDispatch } from '@logixjs/react'

	function CounterComponent() {
	  // 自动处理依赖注入与生命周期
	  const counter = useModule(CounterModule)

  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: 'increment' })}>{count}</button>
}
```

## 下一步

- 学习如何编写响应式的业务逻辑：[逻辑流](./adding-interactivity)
- 掌握状态管理最佳实践：[管理状态](./managing-state)
- 了解模块生命周期：[生命周期与 Watcher](./lifecycle-and-watchers)
