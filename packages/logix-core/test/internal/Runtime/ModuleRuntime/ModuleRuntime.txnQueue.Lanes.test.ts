import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Deferred, Effect, Fiber, Option, Ref } from 'effect'
import type { ConcurrencyDiagnostics } from '../../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import type { ResolvedConcurrencyPolicy } from '../../../../src/internal/runtime/core/ModuleRuntime.concurrencyPolicy.js'
import { makeEnqueueTransaction } from '../../../../src/internal/runtime/core/ModuleRuntime.txnQueue.js'

describe('ModuleRuntime.txnQueue (lanes)', () => {
  it.effect('urgent should run before queued nonUrgent tasks (and nonUrgent should not starve)', () =>
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

      const f1 = yield* Effect.forkChild(n1)
      yield* Effect.yieldNow

      const f2 = yield* Effect.forkChild(n2)
      const fu = yield* Effect.forkChild(urgent)
      yield* Effect.yieldNow

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

  it.effect('drains burst enqueue after idle transition without losing wake-ups', () =>
    Effect.gen(function* () {
      const policy: ResolvedConcurrencyPolicy = {
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 256,
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

      const completed = yield* Ref.make(0)
      const burstSize = 96

      const runBurst = (offset: number) =>
        Effect.all(
          Array.from({ length: burstSize }, (_, i) =>
            enqueueTransaction(
              (offset + i) % 4 === 0 ? 'nonUrgent' : 'urgent',
              Effect.yieldNow.pipe(Effect.flatMap(() => Ref.update(completed, (n) => n + 1)), Effect.asVoid),
            ),
          ),
          { concurrency: 32 },
        ).pipe(
          Effect.timeoutOption('5 seconds'),
          Effect.flatMap((maybe) =>
            Option.isSome(maybe) ? Effect.void : Effect.die(new Error('txnQueue burst drain timeout')),
          ),
        )

      // Run two rounds to cover both cold wake-up and post-idle wake-up paths.
      yield* runBurst(0)
      yield* Effect.yieldNow
      yield* runBurst(burstSize)

      expect(yield* Ref.get(completed)).toBe(burstSize * 2)
    }),
  )

  it.effect('should not miss wake-up when release happens during blocked acquire diagnostics path', () =>
    Effect.gen(function* () {
      const policy: ResolvedConcurrencyPolicy = {
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 1,
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

      const enteredBlockedPath = yield* Deferred.make<void>()
      const unblockBlockedPath = yield* Deferred.make<void>()
      const diagnostics: ConcurrencyDiagnostics = {
        emitPressureIfNeeded: () =>
          Effect.gen(function* () {
            yield* Deferred.succeed(enteredBlockedPath, undefined)
            yield* Deferred.await(unblockBlockedPath)
          }),
        emitUnboundedPolicyIfNeeded: () => Effect.void,
      }

      const enqueueTransaction = yield* makeEnqueueTransaction({
        moduleId: 'M',
        instanceId: 'i-1',
        resolveConcurrencyPolicy: () => Effect.succeed(policy),
        diagnostics,
      })

      const gate = yield* Deferred.make<void>()
      const runningStarted = yield* Deferred.make<void>()
      const waitingExecuted = yield* Deferred.make<void>()

      const running = enqueueTransaction(
        'urgent',
        Effect.gen(function* () {
          yield* Deferred.succeed(runningStarted, undefined)
          yield* Deferred.await(gate)
        }),
      )

      const waiting = enqueueTransaction(
        'urgent',
        Deferred.succeed(waitingExecuted, undefined).pipe(Effect.asVoid),
      )

      const runningFiber = yield* Effect.forkChild(running)
      yield* Deferred.await(runningStarted)

      const waitingFiber = yield* Effect.forkChild(waiting)
      yield* Deferred.await(enteredBlockedPath)

      yield* Deferred.succeed(gate, undefined)
      yield* Deferred.succeed(unblockBlockedPath, undefined)
      yield* Deferred.await(waitingExecuted)
      yield* Fiber.join(runningFiber)
      yield* Fiber.join(waitingFiber)
    }),
  )

  it.effect('should keep queue usable after interrupted blocked acquire diagnostics path', () =>
    Effect.gen(function* () {
      const policy: ResolvedConcurrencyPolicy = {
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 1,
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

      const enteredBlockedPath = yield* Deferred.make<void>()
      const unblockBlockedPath = yield* Deferred.make<void>()
      const diagnostics: ConcurrencyDiagnostics = {
        emitPressureIfNeeded: () =>
          Effect.gen(function* () {
            yield* Deferred.succeed(enteredBlockedPath, undefined)
            yield* Deferred.await(unblockBlockedPath)
          }),
        emitUnboundedPolicyIfNeeded: () => Effect.void,
      }

      const enqueueTransaction = yield* makeEnqueueTransaction({
        moduleId: 'M',
        instanceId: 'i-1',
        resolveConcurrencyPolicy: () => Effect.succeed(policy),
        diagnostics,
      })

      const runningStarted = yield* Deferred.make<void>()
      const runningGate = yield* Deferred.make<void>()
      const followerExecuted = yield* Deferred.make<void>()

      const runningFiber = yield* Effect.forkChild(enqueueTransaction(
        'urgent',
        Effect.gen(function* () {
          yield* Deferred.succeed(runningStarted, undefined)
          yield* Deferred.await(runningGate)
        }),
      ))
      yield* Deferred.await(runningStarted)

      const blockedFiber = yield* Effect.forkChild(enqueueTransaction('urgent', Effect.void))
      yield* Deferred.await(enteredBlockedPath)
      yield* Fiber.interrupt(blockedFiber)

      yield* Deferred.succeed(unblockBlockedPath, undefined)
      yield* Deferred.succeed(runningGate, undefined)
      yield* Fiber.join(runningFiber)

      yield* enqueueTransaction(
        'urgent',
        Deferred.succeed(followerExecuted, undefined).pipe(Effect.asVoid),
      )
      yield* Deferred.await(followerExecuted)
    }),
  )

  it.effect('should reuse resolved concurrency policy inside blocked acquire diagnostics path', () =>
    Effect.gen(function* () {
      const policy: ResolvedConcurrencyPolicy = {
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 1,
        allowUnbounded: false,
        pressureWarningThreshold: {
          backlogCount: 1,
          backlogDurationMs: 1,
        },
        warningCooldownMs: 30_000,
        configScope: 'builtin',
        concurrencyLimitScope: 'builtin',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'builtin',
        allowUnboundedScope: 'builtin',
      }

      let resolveCalls = 0
      const enteredBlockedPath = yield* Deferred.make<void>()
      const unblockBlockedPath = yield* Deferred.make<void>()
      const diagnostics: ConcurrencyDiagnostics = {
        emitPressureIfNeeded: () =>
          Effect.gen(function* () {
            yield* Deferred.succeed(enteredBlockedPath, undefined)
            yield* Deferred.await(unblockBlockedPath)
          }),
        emitUnboundedPolicyIfNeeded: () => Effect.void,
      }

      const enqueueTransaction = yield* makeEnqueueTransaction({
        moduleId: 'M',
        instanceId: 'i-1',
        resolveConcurrencyPolicy: () =>
          Effect.sync(() => {
            resolveCalls += 1
            return policy
          }),
        diagnostics,
      })

      const runningStarted = yield* Deferred.make<void>()
      const runningGate = yield* Deferred.make<void>()
      const waitingExecuted = yield* Deferred.make<void>()

      const runningFiber = yield* Effect.forkChild(enqueueTransaction(
        'urgent',
        Effect.gen(function* () {
          yield* Deferred.succeed(runningStarted, undefined)
          yield* Deferred.await(runningGate)
        }),
      ))
      yield* Deferred.await(runningStarted)

      const waitingFiber = yield* Effect.forkChild(enqueueTransaction(
        'urgent',
        Deferred.succeed(waitingExecuted, undefined).pipe(Effect.asVoid),
      ))

      yield* Deferred.await(enteredBlockedPath)
      yield* Deferred.succeed(runningGate, undefined)
      yield* Deferred.succeed(unblockBlockedPath, undefined)

      yield* Deferred.await(waitingExecuted)
      yield* Fiber.join(waitingFiber)
      yield* Fiber.join(runningFiber)

      expect(resolveCalls).toBe(2)
    }),
  )
})
