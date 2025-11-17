import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber } from 'effect'
import type { ConcurrencyDiagnostics } from '../../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import type { ResolvedConcurrencyPolicy } from '../../../../src/internal/runtime/ModuleRuntime.concurrencyPolicy.js'
import { makeEnqueueTransaction } from '../../../../src/internal/runtime/ModuleRuntime.txnQueue.js'

describe('ModuleRuntime.txnQueue (lanes)', () => {
  it.scoped('urgent should run before queued nonUrgent tasks (and nonUrgent should not starve)', () =>
    Effect.gen(function* () {
      const policy: ResolvedConcurrencyPolicy = {
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 16,
        allowUnbounded: false,
        pressureWarningThreshold: {
          backlogCount: 1000,
          backlogDurationMs: 5000,
        },
        warningCooldownMs: 30_000,
        configScope: 'builtin',
        concurrencyLimitScope: 'builtin',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'builtin',
        allowUnboundedScope: 'builtin',
      }

      const diagnostics: ConcurrencyDiagnostics = {
        emitPressureIfNeeded: () => Effect.void,
        emitUnboundedPolicyIfNeeded: () => Effect.void,
      }

      const enqueueTransaction = yield* makeEnqueueTransaction({
        moduleId: 'M',
        instanceId: 'i-1',
        resolveConcurrencyPolicy: () => Effect.succeed(policy),
        diagnostics,
      })

      const events: string[] = []
      const gate = yield* Deferred.make<void>()

      const n1 = enqueueTransaction(
        'nonUrgent',
        Effect.gen(function* () {
          yield* Effect.sync(() => events.push('n1:start'))
          yield* Deferred.await(gate)
          yield* Effect.sync(() => events.push('n1:end'))
        }),
      )

      const n2 = enqueueTransaction(
        'nonUrgent',
        Effect.sync(() => {
          events.push('n2')
        }),
      )

      const urgent = enqueueTransaction(
        'urgent',
        Effect.sync(() => {
          events.push('urgent')
        }),
      )

      const f1 = yield* Effect.fork(n1)
      yield* Effect.yieldNow()

      const f2 = yield* Effect.fork(n2)
      const fu = yield* Effect.fork(urgent)

      yield* Deferred.succeed(gate, undefined)

      yield* Fiber.join(f1)
      yield* Fiber.join(fu)
      yield* Fiber.join(f2)

      const idxUrgent = events.indexOf('urgent')
      const idxN2 = events.indexOf('n2')
      const idxN1End = events.indexOf('n1:end')

      expect(idxN1End).toBeGreaterThanOrEqual(0)
      expect(idxUrgent).toBeGreaterThanOrEqual(0)
      expect(idxN2).toBeGreaterThanOrEqual(0)
      expect(idxN1End).toBeLessThan(idxUrgent)
      expect(idxUrgent).toBeLessThan(idxN2)
    }),
  )
})
