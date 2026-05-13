import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { createLogixDevLifecycleCarrier } from '@logixjs/react/dev/lifecycle'

const ModuleV1 = Logix.Module.make('ExampleHmrModuleInvalidationCounter', {
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

const ModuleV2 = Logix.Module.make('ExampleHmrModuleInvalidationCounterNext', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
  immerReducers: {
    inc: (draft) => {
      draft.count += 10
    },
  },
})

const ProgramV1 = Logix.Program.make(ModuleV1, {
  initial: { count: 0 },
  logics: [],
})

const ProgramV2 = Logix.Program.make(ModuleV2, {
  initial: { count: 0 },
  logics: [],
})

describe('example HMR module invalidation carrier contract', () => {
  it.effect('replaces a module runtime through the host carrier while the owner boundary stays stable', () =>
    Effect.gen(function* () {
      const carrier = createLogixDevLifecycleCarrier({ carrierId: 'browser-module-invalidation', hostKind: 'vitest' })
      const runtimeA = Logix.Runtime.make(ProgramV1)
      const runtimeB = Logix.Runtime.make(ProgramV2)
      const binding = carrier.bindRuntime({
        ownerId: 'browser-module-invalidation',
        runtime: runtimeA,
        runtimeInstanceId: 'runtime:module:v1',
      })

      const event = yield* binding.reset({
        nextRuntime: runtimeB,
        nextRuntimeInstanceId: 'runtime:module:v2',
      })

      const state = yield* Effect.promise(() =>
        runtimeB.runPromise(
          Effect.gen(function* () {
            const module = yield* Effect.service(ModuleV2.tag).pipe(Effect.orDie)
            yield* module.dispatch({ _tag: 'inc', payload: undefined })
            return yield* module.getState
          }),
        ),
      )

      expect(event.decision).toBe('reset')
      expect(event.previousRuntimeInstanceId).toBe('runtime:module:v1')
      expect(event.nextRuntimeInstanceId).toBe('runtime:module:v2')
      expect(event.residualActiveCount).toBe(0)
      expect(state.count).toBe(10)

      yield* carrier.dispose({ ownerId: 'browser-module-invalidation' })
      yield* Effect.promise(() => runtimeB.dispose())
      yield* Effect.promise(() => runtimeA.dispose())
    }),
  )
})
