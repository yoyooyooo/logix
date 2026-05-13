import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import {
  createHotLifecycleOwner,
  getCurrentRuntimeHotLifecycleOwner,
  makeRuntimeHotLifecycleContext,
  provideRuntimeHotLifecycleOwner,
} from '../../../src/internal/runtime-contracts.js'

describe('hot lifecycle DI context', () => {
  it.effect('defaults to no owner when no host carrier layer is installed', () =>
    Effect.gen(function* () {
      const owner = yield* getCurrentRuntimeHotLifecycleOwner()

      expect(owner).toBeUndefined()
    }),
  )

  it.effect('resolves the carrier-provided owner through Effect DI', () =>
    Effect.gen(function* () {
      const owner = createHotLifecycleOwner({
        ownerId: 'carrier:task-runner',
        runtimeInstanceId: 'runtime:1',
      })

      const resolved = yield* getCurrentRuntimeHotLifecycleOwner().pipe(
        Effect.provide(provideRuntimeHotLifecycleOwner(owner)),
      )

      expect(resolved?.ownerId).toBe('carrier:task-runner')
    }),
  )

  it('creates a runtime lifecycle context from the injected owner', () => {
    const owner = createHotLifecycleOwner({
      ownerId: 'carrier:context',
      runtimeInstanceId: 'runtime:1',
    })
    const context = makeRuntimeHotLifecycleContext(owner)

    context.register({
      resourceId: 'timer:1',
      category: 'timer',
    })

    expect(context.owner.ownerId).toBe('carrier:context')
    expect(context.runtimeInstanceId).toBe('runtime:1')
    expect(context.isCurrent()).toBe(true)
    expect(owner.registry.summary().timer.active).toBe(1)
  })
})
