import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { createLogixDevLifecycleCarrier } from '@logixjs/react/dev/lifecycle'

const Counter = Logix.Module.make('ExampleHotLifecycleOwnerCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const Program = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [],
})

describe('example host lifecycle carrier', () => {
  it.effect('tracks reset and dispose through the host carrier', () =>
    Effect.gen(function* () {
      const carrier = createLogixDevLifecycleCarrier({ carrierId: 'example-test-carrier', hostKind: 'vitest' })
      const runtimeA = Logix.Runtime.make(Program)
      const runtimeB = Logix.Runtime.make(Program)
      const binding = carrier.bindRuntime({
        ownerId: 'test-owner',
        runtime: runtimeA,
        runtimeInstanceId: 'runtime:A',
      })

      const event = yield* binding.reset({ nextRuntime: runtimeB, nextRuntimeInstanceId: 'runtime:B' })

      expect(event.decision).toBe('reset')
      expect(event.previousRuntimeInstanceId).toBe('runtime:A')
      expect(event.nextRuntimeInstanceId).toBe('runtime:B')
      expect(carrier.getOwner('test-owner')).toBe(binding.owner)

      yield* carrier.dispose({ ownerId: 'test-owner' })
      expect(carrier.getOwner('test-owner')).toBeUndefined()

      yield* Effect.promise(() => runtimeB.dispose())
      yield* Effect.promise(() => runtimeA.dispose())
    }),
  )
})
