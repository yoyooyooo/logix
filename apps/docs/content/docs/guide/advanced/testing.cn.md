---
title: 测试
description: 如何使用 @effect/vitest 测试 Logix 模块。
---

Logix 的设计天然支持测试。由于 Logic 是纯粹的 Effect，我们可以利用 Effect 官方的 `@effect/vitest` 进行单元测试和集成测试。

### 适合谁

- 希望为 Module / Logic 写单元测试和集成测试的工程师；
- 有 Vitest 经验，但不熟悉如何在测试环境构建 Runtime / 提供 Layer。

### 前置知识

- 了解 ModuleImpl (`Module.make`) 与 Runtime 的基本概念；
- 对 Effect 有基本直觉（知道如何用 `Effect.gen` 写流程）。

### 读完你将获得

- 能够使用 `@effect/vitest` 的 `it.effect` / `it.scoped` 测试 Logic；
- 知道如何用 Layer 注入/替换 Service，实现可控的测试双（Mock/Stub/Fake）；
- 了解如何使用 `TestClock` 控制时间相关的测试。

## 1. 安装 @effect/vitest

```bash
npm install @effect/vitest --save-dev
```

## 2. 使用 it.effect / it.scoped

`@effect/vitest` 提供了与 Effect 深度集成的测试 API。推荐使用 `it.scoped` 测试需要资源管理的场景：

```ts
import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, TestClock, Schema } from 'effect'
import * as Logix from '@logixjs/core'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
})

const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run(() =>
      $.state.mutate((draft) => {
        draft.count += 1
      }),
    )
  }),
)

describe('Counter', () => {
  it.scoped('should increment count', () =>
    Effect.gen(function* () {
      // 构建测试用的 Layer
      const layer = Counter.live({ count: 0 }, CounterLogic)

      // 在测试上下文中运行
      const runtime = yield* Effect.provide(Counter, layer)

      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })

      const state = yield* runtime.getState
      expect(state.count).toBe(1)
    }),
  )
})
```

### 区分 it.effect 与 it.scoped

| API         | 用途                                                        |
| ----------- | ----------------------------------------------------------- |
| `it.effect` | 运行普通 Effect 测试                                        |
| `it.scoped` | 运行需要 Scope 资源管理的测试（推荐用于 Logix Module 测试） |

## 3. 使用 TestClock 控制时间

测试涉及时间的逻辑（如防抖、延迟）时，使用 `TestClock` 精确控制：

```ts
it.scoped('should debounce state changes', () =>
  Effect.gen(function* () {
    // 前进 500ms（不会真正等待，而是虚拟推进）
    yield* TestClock.adjust('500 millis')

    // 此时依赖 debounce 500ms 的逻辑已经触发
    // ...
  }),
)
```

## 4. 模拟依赖 (Mocking Services)

使用 `Layer.succeed` 替换真实服务：

```ts
class UserApi extends Context.Tag('@app/UserApi')<
  UserApi,
  { readonly fetchUser: (id: string) => Effect.Effect<User> }
>() {}

const MockUserApi = Layer.succeed(UserApi, {
  fetchUser: (id) => Effect.succeed({ id, name: 'Mock User' }),
})

it.scoped('should fetch user with mock', () =>
  Effect.gen(function* () {
    const layer = Layer.merge(UserModule.live({ user: null }, UserLogic), MockUserApi)

    const runtime = yield* Effect.provide(UserModule, layer)
    yield* runtime.dispatch({ _tag: 'fetchUser', payload: '1' })

    const state = yield* runtime.getState
    expect(state.user?.name).toBe('Mock User')
  }),
)
```

## 5. 收集 Debug 事件

测试 Logic 行为时，可以注入自定义 DebugSink 收集事件：

```ts
import * as Logix from '@logixjs/core'

it.scoped('should emit debug events', () =>
  Effect.gen(function* () {
    const events: Logix.Debug.Event[] = []

    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ])

    // 合并 debugLayer 到测试 Layer
    const layer = Layer.mergeAll(
      Counter.live({ count: 0 }, CounterLogic),
      debugLayer,
    )

    const runtime = yield* Effect.provide(Counter, layer)
    yield* runtime.dispatch({ _tag: 'inc', payload: undefined })

    // 推进时钟让 Logic 运行
    yield* TestClock.adjust('10 millis')

    // 验证事件被记录
    const actionEvents = events.filter((e) => e.type === 'action:dispatch')
    expect(actionEvents.length).toBeGreaterThan(0)
  }),
)
```

## 6. 集成测试 (React)

使用 `@testing-library/react` 测试组件集成：

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Counter } from './Counter'

it('renders counter', () => {
  render(<Counter />)

  fireEvent.click(screen.getByText('Increment'))

  expect(screen.getByText('Count: 1')).toBeInTheDocument()
})
```

## 下一步

恭喜你完成了 Advanced 专题的学习！接下来可以：

- 查看 React 集成的完整指南：[React 集成](../recipes/react-integration)
- 了解更多常用模式与最佳实践：[常用模式](../recipes/common-patterns)
- 回到首页探索更多：[文档首页](../../)
