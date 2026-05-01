import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { createHotLifecycleOwner } from '../../../src/internal/runtime/core/hotLifecycle/index.js'

describe('hot lifecycle repeated reset guard', () => {
  it.effect('runs repeated reset without duplicate active resources', () =>
    Effect.gen(function* () {
      const owner = createHotLifecycleOwner({
        ownerId: 'repeated-reset',
        runtimeInstanceId: 'runtime:0',
      })

      for (let i = 1; i <= 20; i++) {
        owner.registry.register({
          ownerId: 'repeated-reset',
          resourceId: `timer:${i}`,
          category: 'timer',
          cleanup: () => Effect.void,
        })
        const event = yield* owner.reset({ nextRuntimeInstanceId: `runtime:${i}` })
        expect(event.residualActiveCount).toBe(0)
      }

      expect(owner.registry.activeCount()).toBe(0)
      expect(owner.getStatus().runtimeInstanceId).toBe('runtime:20')
    }),
  )
})
