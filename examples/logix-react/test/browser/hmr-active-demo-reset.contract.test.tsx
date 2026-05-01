import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { createLogixDevLifecycleCarrier } from '@logixjs/react/dev/lifecycle'

const ActiveDemo = Logix.Module.make('ExampleHmrActiveDemoCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
  immerReducers: {
    inc: (draft) => {
      draft.count += 1
    },
  },
})

const Program = Logix.Program.make(ActiveDemo, {
  initial: { count: 0 },
  logics: [],
})

describe('example HMR active demo reset contract', () => {
  it.effect('successor runtime remains interactive after reset', () =>
    Effect.gen(function* () {
      const carrier = createLogixDevLifecycleCarrier({ carrierId: 'browser-active-demo', hostKind: 'vitest' })
      const runtimeA = Logix.Runtime.make(Program)
      const runtimeB = Logix.Runtime.make(Program)
      const binding = carrier.bindRuntime({
        ownerId: 'browser-active-demo',
        runtime: runtimeA,
        runtimeInstanceId: 'runtime:A',
      })

      const event = yield* binding.reset({
        nextRuntime: runtimeB,
        nextRuntimeInstanceId: 'runtime:B',
      })

      const state = yield* Effect.promise(() =>
        runtimeB.runPromise(
          Effect.gen(function* () {
            const module = yield* Effect.service(ActiveDemo.tag).pipe(Effect.orDie)
            yield* module.dispatch({ _tag: 'inc', payload: undefined })
            return yield* module.getState
          }),
        ),
      )

      expect(event.decision).toBe('reset')
      expect(state.count).toBe(1)

      yield* carrier.dispose({ ownerId: 'browser-active-demo' })
      yield* Effect.promise(() => runtimeB.dispose())
      yield* Effect.promise(() => runtimeA.dispose())
    }),
  )
})
