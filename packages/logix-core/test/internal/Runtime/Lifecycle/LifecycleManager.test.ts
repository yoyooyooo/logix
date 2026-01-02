import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Cause, Effect } from 'effect'
import * as LifecycleCore from '../../../../src/internal/runtime/core/Lifecycle.js'

describe('LifecycleManager (internal core)', () => {
  it.effect('should run registered destroy effects and log failures', () =>
    Effect.gen(function* () {
      const manager = yield* LifecycleCore.makeLifecycleManager({
        moduleId: 'LifecycleManagerTest',
        instanceId: 'i1',
      })

      const executed: string[] = []

      manager.registerDestroy(
        Effect.sync(() => {
          executed.push('ok')
        }),
      )

      // A failing destroy effect should not stop subsequent execution, but should be logged via safeRun.
      manager.registerDestroy(Effect.die(new Error('destroy failed')))

      yield* manager.runDestroy

      expect(executed).toEqual(['ok'])
    }),
  )

  it.effect('should notify error handlers and swallow their failures', () =>
    Effect.gen(function* () {
      const manager = yield* LifecycleCore.makeLifecycleManager({
        moduleId: 'LifecycleManagerTest',
        instanceId: 'i1',
      })

      const phases: string[] = []

      manager.registerOnError((_cause, context) =>
        Effect.gen(function* () {
          phases.push(context.phase)

          // Errors thrown by the handler are caught and logged by notifyError, and are not rethrown upstream.
          yield* Effect.die(new Error('handler failed'))

          // Prevent the compiler from inferring this as unreachable.
          return yield* Effect.void
        }),
      )

      const cause = Cause.die(new Error('outer error'))
      yield* manager.notifyError(cause, {
        phase: 'run',
        hook: 'unknown',
        moduleId: 'LifecycleManagerTest',
        instanceId: 'i1',
        origin: 'test-phase',
      })

      expect(phases).toEqual(['run'])
    }),
  )
})
