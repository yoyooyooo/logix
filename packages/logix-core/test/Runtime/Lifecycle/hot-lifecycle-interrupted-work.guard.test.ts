import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { createHotLifecycleOwner } from '../../../src/internal/runtime/core/hotLifecycle/index.js'

describe('hot lifecycle interrupted work guard', () => {
  it.effect('prevents writeback after owner disposal when work checks owner status', () =>
    Effect.gen(function* () {
      let writebacks = 0
      const owner = createHotLifecycleOwner({
        ownerId: 'task-owner',
        runtimeInstanceId: 'runtime:1',
      })

      const work = Effect.gen(function* () {
        if (owner.getStatus().disposed) {
          return
        }
        writebacks += 1
      })

      yield* owner.dispose()
      yield* work

      expect(writebacks).toBe(0)
    }),
  )
})
