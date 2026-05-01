import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { createHotLifecycleOwner } from '../../../src/internal/runtime/core/hotLifecycle/index.js'

describe('hot lifecycle owner handoff', () => {
  it.effect('reset closes previous owner once and records successor runtime', () =>
    Effect.gen(function* () {
      let cleanupCalls = 0
      const owner = createHotLifecycleOwner({
        ownerId: 'task-runner',
        runtimeInstanceId: 'runtime:1',
        cleanup: () =>
          Effect.sync(() => {
            cleanupCalls += 1
          }),
      })

      const first = yield* owner.reset({ nextRuntimeInstanceId: 'runtime:2', reason: 'hot-update' })
      const second = yield* owner.reset({ nextRuntimeInstanceId: 'runtime:2', reason: 'hot-update' })

      expect(cleanupCalls).toBe(1)
      expect(first.decision).toBe('reset')
      expect(first.previousRuntimeInstanceId).toBe('runtime:1')
      expect(first.nextRuntimeInstanceId).toBe('runtime:2')
      expect(second.idempotent).toBe(true)
    }),
  )

  it.effect('repeated reset to a new successor closes the current owner again', () =>
    Effect.gen(function* () {
      let cleanupCalls = 0
      const owner = createHotLifecycleOwner({
        ownerId: 'counter',
        runtimeInstanceId: 'runtime:1',
        cleanup: () =>
          Effect.sync(() => {
            cleanupCalls += 1
          }),
      })

      const first = yield* owner.reset({ nextRuntimeInstanceId: 'runtime:2', reason: 'hot-update' })
      const second = yield* owner.reset({ nextRuntimeInstanceId: 'runtime:3', reason: 'hot-update' })

      expect(cleanupCalls).toBe(2)
      expect(first.cleanupId).toBe('counter::cleanup:1')
      expect(second.cleanupId).toBe('counter::cleanup:2')
      expect(second.previousRuntimeInstanceId).toBe('runtime:2')
      expect(second.nextRuntimeInstanceId).toBe('runtime:3')
    }),
  )
})
