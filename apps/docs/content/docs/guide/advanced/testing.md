---
title: Testing
description: How to test Logix modules with @effect/vitest.
---

Logix modules are plain Effect programs. The default testing stack is `@effect/vitest` for runtime and logic behavior, plus `@testing-library/react` when the React binding is part of the assertion surface.

## 1. Install @effect/vitest

```bash
npm install @effect/vitest --save-dev
```

## 2. Use `it.effect` / `it.scoped`

`@effect/vitest` provides test APIs deeply integrated with Effect. Prefer `it.scoped` for tests that need Scope-managed resources:

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
    yield* $.onAction('inc').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
  }),
)

describe('Counter', () => {
  it.scoped('should increment count', () =>
    Effect.gen(function* () {
      // Build a test Layer
      const layer = Counter.live({ count: 0 }, CounterLogic)

      // Run in the test context
      const runtime = yield* Effect.provide(Counter, layer)

      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })

      const state = yield* runtime.getState
      expect(state.count).toBe(1)
    }),
  )
})
```

### `it.effect` vs `it.scoped`

| API         | Purpose                                                       |
| ----------- | ------------------------------------------------------------- |
| `it.effect` | Run a regular Effect test                                     |
| `it.scoped` | Run a Scope-managed test (recommended for Logix Module tests) |

## 3. Use TestClock to control time

For time-sensitive logic (debounce/delay), use `TestClock` for precise control:

```ts
it.scoped('should debounce state changes', () =>
  Effect.gen(function* () {
    // Advance by 500ms (no real waiting; virtual time)
    yield* TestClock.adjust('500 millis')

    // Logic depending on debounce(500ms) has now fired
    // ...
  }),
)
```

## 4. Mock dependencies (Mocking Services)

Use `Layer.succeed` to replace real services:

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


## 6. Integration tests (React)

Use `@testing-library/react` to test component integration:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Counter } from './Counter'

it('renders counter', () => {
  render(<Counter />)

  fireEvent.click(screen.getByText('Increment'))

  expect(screen.getByText('Count: 1')).toBeInTheDocument()
})
```

## See also

- Full React integration guide: [React integration](../recipes/react-integration)
- More patterns and best practices: [Common patterns](../recipes/common-patterns)
- Back to docs home: [Docs home](../../)
