import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { createLogixDevLifecycleCarrier } from '@logixjs/react/dev/lifecycle'

const Counter = Logix.Module.make('ExampleHmrRepeatedResetCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const Program = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [],
})

describe('example HMR repeated reset contract', () => {
  it.effect('handles 20 consecutive owner resets', () =>
    Effect.gen(function* () {
      const carrier = createLogixDevLifecycleCarrier({ carrierId: 'browser-repeated-reset', hostKind: 'vitest' })
      let runtime = Logix.Runtime.make(Program)
      let binding = carrier.bindRuntime({
        ownerId: 'browser-repeated-reset',
        runtime,
        runtimeInstanceId: 'runtime:0',
      })

      for (let i = 1; i <= 20; i++) {
        const nextRuntime = Logix.Runtime.make(Program)
        const event = yield* binding.reset({
          nextRuntime,
          nextRuntimeInstanceId: `runtime:${i}`,
        })
        expect(event.decision).toBe('reset')
        expect(event.residualActiveCount).toBe(0)

        yield* Effect.promise(() => runtime.dispose())
        runtime = nextRuntime
        binding = carrier.bindRuntime({
          ownerId: 'browser-repeated-reset',
          runtime: nextRuntime,
          runtimeInstanceId: `runtime:${i}`,
        })
      }

      expect(binding.runtimeInstanceId).toBe('runtime:20')
      yield* carrier.dispose({ ownerId: 'browser-repeated-reset' })
      yield* Effect.promise(() => runtime.dispose())
    }),
  )
})
