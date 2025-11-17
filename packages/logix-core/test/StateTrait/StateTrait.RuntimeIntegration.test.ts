import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'
import {
  CounterWithProfile,
  type CounterState,
} from '../../../../examples/logix-react/src/modules/counter-with-profile.js'

describe('StateTrait runtime integration', () => {
  it('should automatically maintain computed and link fields via Runtime.make', async () => {
    const impl = CounterWithProfile.implement({
      initial: {
        a: 1,
        b: 2,
        sum: 0,
        profile: { id: 'u1', name: '' },
        profileResource: Logix.Resource.Snapshot.idle(),
      } satisfies CounterState,
    })

    const runtimeManager = Logix.Runtime.make(impl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const program = Effect.gen(function* () {
      const runtime = yield* CounterWithProfile.tag

      // 修改 a/b，应触发 sum 的重算
      let state = (yield* runtime.getState) as CounterState
      state = {
        ...state,
        a: 3,
        b: 4,
      }
      yield* runtime.setState(state)

      // 等待 traits watcher 消化此次状态更新
      yield* Effect.sleep('10 millis')

      const afterSum = (yield* runtime.getState) as CounterState
      expect(afterSum.sum).toBe(7)

      // 修改 profileResource.data.name，应触发 profile.name 的联动
      const next: CounterState = {
        ...afterSum,
        profile: { ...afterSum.profile, name: '' },
        profileResource: Logix.Resource.Snapshot.success({
          keyHash: 'test',
          data: { name: 'Bob' },
        }),
      }

      yield* runtime.setState(next)

      // 同样等待 link watcher 生效
      yield* Effect.sleep('10 millis')

      const finalState = (yield* runtime.getState) as CounterState
      expect(finalState.profile.name).toBe('Bob')
    })

    await runtimeManager.runPromise(program as Effect.Effect<void, never, any>)
  })
})
