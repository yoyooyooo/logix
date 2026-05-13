import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'
import * as Resource from '../../src/Resource.js'
import {
  CounterWithProfile,
  type CounterState,
} from '../../../../examples/logix-react/src/modules/counter-with-profile.js'

describe('FieldKernel runtime integration', () => {
  it('should automatically maintain computed and link fields via Runtime.make', async () => {
    const programModule = Logix.Program.make(CounterWithProfile, {
      initial: {
        a: 1,
        b: 2,
        sum: 0,
        profile: { id: 'u1', name: '' },
        profileResource: Resource.Snapshot.idle(),
      } satisfies CounterState,
    })

    const runtimeManager = Logix.Runtime.make(programModule, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const program = Effect.gen(function* () {
      const runtime = yield* Effect.service(CounterWithProfile.tag).pipe(Effect.orDie)

      // Update a/b to trigger sum recomputation.
      let state = (yield* runtime.getState) as CounterState
      state = {
        ...state,
        a: 3,
        b: 4,
      }
      yield* runtime.setState(state)

      // Wait for the field watcher to process the state update.
      yield* Effect.sleep('10 millis')

      const afterSum = (yield* runtime.getState) as CounterState
      expect(afterSum.sum).toBe(7)

      // Update profileResource.data.name to trigger profile.name propagation.
      const next: CounterState = {
        ...afterSum,
        profile: { ...afterSum.profile, name: '' },
        profileResource: Resource.Snapshot.success({
          keyHash: 'test',
          data: { name: 'Bob' },
        }),
      }

      yield* runtime.setState(next)

      // Wait for the link watcher as well.
      yield* Effect.sleep('10 millis')

      const finalState = (yield* runtime.getState) as CounterState
      expect(finalState.profile.name).toBe('Bob')
    })

    await runtimeManager.runPromise(program as Effect.Effect<void, never, any>)
  })
})
