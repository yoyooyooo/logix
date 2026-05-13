import { describe, expect, it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RuntimeContracts from '../../../src/internal/runtime-contracts.js'
import {
  createHotLifecycleOwner,
  createHotLifecycleResourceRegistry,
} from '../../../src/internal/runtime/core/hotLifecycle/index.js'

const RuntimeOwnedResources = Logix.Module.make('HotLifecycleRuntimeOwnedResources', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {},
})

const RuntimeOwnedResourcesProgram = Logix.Program.make(RuntimeOwnedResources, {
  initial: { count: 0 },
  logics: [],
})

describe('hot lifecycle resource cleanup', () => {
  it.effect('closes runtime-owned resources and reports zero disallowed residuals', () =>
    Effect.gen(function* () {
      let closed = 0
      const registry = createHotLifecycleResourceRegistry({ ownerId: 'task-runner' })
      registry.register({
        ownerId: 'task-runner',
        resourceId: 'task:1',
        category: 'task',
        cleanup: () =>
          Effect.sync(() => {
            closed += 1
          }),
      })
      registry.register({
        ownerId: 'task-runner',
        resourceId: 'timer:1',
        category: 'timer',
        cleanup: () =>
          Effect.sync(() => {
            closed += 1
          }),
      })

      const summary = yield* registry.cleanupActive()

      expect(closed).toBe(2)
      expect(summary.task.closed).toBe(1)
      expect(summary.timer.closed).toBe(1)
      expect(registry.activeCount()).toBe(0)
    }),
  )

  it.effect('owner reset includes resource cleanup summary', () =>
    Effect.gen(function* () {
      const owner = createHotLifecycleOwner({
        ownerId: 'owner',
        runtimeInstanceId: 'runtime:1',
      })
      owner.registry.register({
        ownerId: 'owner',
        resourceId: 'subscription:1',
        category: 'subscription',
        cleanup: () => Effect.void,
      })

      const event = yield* owner.reset({ nextRuntimeInstanceId: 'runtime:2' })

      expect(event.resourceSummary.subscription.closed).toBe(1)
      expect(event.residualActiveCount).toBe(0)
    }),
  )

  it.effect('attributes runtime-created module, store, imports, and debug resources to the injected owner', () =>
    Effect.gen(function* () {
      const owner = createHotLifecycleOwner({
        ownerId: 'runtime-owned-resources',
        runtimeInstanceId: 'runtime:1',
      })
      const runtime = Logix.Runtime.make(RuntimeOwnedResourcesProgram, {
        layer: RuntimeContracts.provideRuntimeHotLifecycleOwner(owner),
        debug: true,
      })

      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.gen(function* () {
            const module = yield* Effect.service(RuntimeOwnedResources.tag).pipe(Effect.orDie)
            return yield* module.getState
          }),
        ),
      )

      const before = owner.registry.summary()
      expect(before['module-cache-entry'].active).toBe(1)
      expect(before['runtime-store-topic'].active).toBe(1)
      expect(before['imports-scope'].active).toBe(1)
      expect(before.subscription.active).toBeGreaterThan(0)
      expect(before['debug-sink'].active).toBe(1)

      const event = yield* owner.reset({ nextRuntimeInstanceId: 'runtime:2' })

      expect(event.resourceSummary['module-cache-entry'].closed).toBe(1)
      expect(event.resourceSummary['runtime-store-topic'].closed).toBe(1)
      expect(event.resourceSummary['imports-scope'].closed).toBe(1)
      expect(event.resourceSummary.subscription.closed).toBeGreaterThan(0)
      expect(event.resourceSummary['debug-sink'].closed).toBe(1)
      expect(event.residualActiveCount).toBe(0)

      yield* Effect.promise(() => runtime.dispose())
    }),
  )
})
