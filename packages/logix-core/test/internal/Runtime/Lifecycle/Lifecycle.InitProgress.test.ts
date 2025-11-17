import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber } from 'effect'
import * as LifecycleCore from '../../../../src/internal/runtime/core/Lifecycle.js'

describe('LifecycleStatus.initProgress', () => {
  it.effect('should be observable while initRequired is in progress', () =>
    Effect.gen(function* () {
      const manager = yield* LifecycleCore.makeLifecycleManager({
        moduleId: 'Lifecycle.InitProgress',
        instanceId: 'i1',
      })

      const firstStarted = yield* Deferred.make<void>()
      const gate = yield* Deferred.make<void>()

      manager.registerInitRequired(
        Effect.gen(function* () {
          yield* Deferred.succeed(firstStarted, undefined)
          yield* Deferred.await(gate)
        }),
      )
      manager.registerInitRequired(Effect.void)

      const fiber = yield* Effect.fork(manager.runInitRequired)

      yield* Deferred.await(firstStarted)

      const statusDuring = yield* manager.getStatus
      expect(statusDuring.status).toBe('initializing')
      expect(statusDuring.initProgress).toBeDefined()
      expect(statusDuring.initProgress).toMatchObject({
        total: 2,
        completed: 0,
        current: 0,
      })
      expect(typeof statusDuring.initProgress!.startedAt).toBe('number')

      yield* Deferred.succeed(gate, undefined)
      yield* Fiber.join(fiber)

      const statusAfter = yield* manager.getStatus
      expect(statusAfter.status).toBe('ready')
      expect(statusAfter.initProgress).toMatchObject({
        total: 2,
        completed: 2,
        current: 2,
      })
      expect(statusAfter.initOutcome).toEqual({ status: 'success' })
    }),
  )
})
