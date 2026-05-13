import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Lifecycle from '../../../src/internal/runtime/core/Lifecycle.js'

describe('ModuleRuntime destroy LIFO', () => {
  it.effect('should run destroy tasks in LIFO order on normal completion', () =>
    Effect.gen(function* () {
      const calls: Array<string> = []
      const manager = yield* Lifecycle.makeLifecycleManager({
        moduleId: 'ModuleRuntime.DestroyLifo.Normal',
        instanceId: 'destroy-normal',
      })

      manager.registerDestroy(Effect.sync(() => calls.push('destroy:1')), { name: 'first' })
      manager.registerDestroy(Effect.sync(() => calls.push('destroy:2')), { name: 'second' })
      yield* manager.runDestroy

      expect(calls).toEqual(['destroy:2', 'destroy:1'])
    }),
  )

  it.effect('should run destroy tasks exactly once on failure', () =>
    Effect.gen(function* () {
      const calls: Array<string> = []
      const manager = yield* Lifecycle.makeLifecycleManager({
        moduleId: 'ModuleRuntime.DestroyLifo.Failure',
        instanceId: 'destroy-failure',
      })

      manager.registerDestroy(Effect.sync(() => calls.push('destroy:1')), { name: 'first' })
      manager.registerDestroy(Effect.sync(() => calls.push('destroy:2')), { name: 'second' })
      const exit = yield* Effect.exit(manager.runDestroy.pipe(Effect.flatMap(() => Effect.fail('boom'))))

      expect(exit._tag).toBe('Failure')
      expect(calls).toEqual(['destroy:2', 'destroy:1'])
    }),
  )

  it.effect('should run destroy tasks exactly once on interrupt', () =>
    Effect.gen(function* () {
      const calls: Array<string> = []
      const manager = yield* Lifecycle.makeLifecycleManager({
        moduleId: 'ModuleRuntime.DestroyLifo.Interrupt',
        instanceId: 'destroy-interrupt',
      })

      manager.registerDestroy(Effect.sync(() => calls.push('destroy:1')), { name: 'first' })
      manager.registerDestroy(Effect.sync(() => calls.push('destroy:2')), { name: 'second' })
      yield* manager.runDestroy

      expect(calls).toEqual(['destroy:2', 'destroy:1'])
    }),
  )
})
