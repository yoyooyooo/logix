import { Deferred, Effect, FiberRef, Ref, Scope } from 'effect'
import * as Debug from './DebugSink.js'
import * as EffectOpCore from './EffectOpCore.js'
import * as TaskRunner from './TaskRunner.js'
import type { ConcurrencyDiagnostics } from './ConcurrencyDiagnostics.js'
import type { StateTransactionOverrides } from './env.js'
import type { ResolvedConcurrencyPolicy } from './ModuleRuntime.concurrencyPolicy.js'

export type TxnLane = 'urgent' | 'nonUrgent'

export interface EnqueueTransaction {
  <A, E>(eff: Effect.Effect<A, E, never>): Effect.Effect<A, E, never>
  <A, E>(lane: TxnLane, eff: Effect.Effect<A, E, never>): Effect.Effect<A, E, never>
}

type BackpressureState = {
  readonly backlogCount: number
  readonly waiters: number
  readonly signal: Deferred.Deferred<void>
}

type BacklogAcquireAttempt =
  | { readonly _tag: 'acquired' }
  | {
      readonly _tag: 'wait'
      readonly backlogCount: number
      readonly signal: Deferred.Deferred<void>
    }

export type CapturedTxnRuntimeScope = {
  readonly runtimeLabel: string | undefined
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly debugSinks: ReadonlyArray<Debug.Sink>
  readonly overrides: StateTransactionOverrides | undefined
}

/**
 * Builds a "single-instance transaction queue":
 * - All entry points (dispatch/source-refresh/...) execute serially through the same FIFO queue.
 * - Callers still experience the entry as a single Effect (preserving the existing API shape).
 * - Tasks must "never fail", otherwise the queue consumer fiber would deadlock (so we return results via Deferred/Exit).
 *
 * NOTE: transaction execution happens inside a background queue fiber. To support Provider-local overrides (Tag/Layer)
 * and diagnostics tiers (FiberRef) at the call site, we capture minimal context at enqueue-time and re-provide it to the task.
 */
export const makeEnqueueTransaction = (args: {
  readonly moduleId: string | undefined
  readonly instanceId: string
  readonly resolveConcurrencyPolicy: () => Effect.Effect<ResolvedConcurrencyPolicy>
  readonly diagnostics: ConcurrencyDiagnostics
}): Effect.Effect<EnqueueTransaction, never, Scope.Scope> =>
  Effect.gen(function* () {
    const diagnostics = args.diagnostics

    const initialUrgentSignal = yield* Deferred.make<void>()
    const urgentStateRef = yield* Ref.make<BackpressureState>({
      backlogCount: 0,
      waiters: 0,
      signal: initialUrgentSignal,
    })

    const initialNonUrgentSignal = yield* Deferred.make<void>()
    const nonUrgentStateRef = yield* Ref.make<BackpressureState>({
      backlogCount: 0,
      waiters: 0,
      signal: initialNonUrgentSignal,
    })

    const release = (stateRef: Ref.Ref<BackpressureState>) =>
      Effect.gen(function* () {
        let prevSignal: Deferred.Deferred<void> | undefined
        const nextSignal = yield* Deferred.make<void>()
        yield* Ref.update(stateRef, (s) => {
          const nextBacklogCount = s.backlogCount > 0 ? s.backlogCount - 1 : 0
          if (s.waiters <= 0) {
            return {
              backlogCount: nextBacklogCount,
              waiters: 0,
              signal: s.signal,
            }
          }
          prevSignal = s.signal
          return {
            backlogCount: nextBacklogCount,
            waiters: s.waiters,
            signal: nextSignal,
          }
        })
        if (prevSignal) {
          yield* Deferred.succeed(prevSignal, undefined)
        }
      })

    const acquireBacklogSlot = (lane: TxnLane, capacity: number, policy: ResolvedConcurrencyPolicy): Effect.Effect<void> =>
      Effect.gen(function* () {
        const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
        if (inTxn) {
          yield* Debug.record({
            type: 'diagnostic',
            moduleId: args.moduleId,
            instanceId: args.instanceId,
            code: 'state_transaction::enqueue_in_transaction',
            severity: 'error',
            message:
              'enqueueTransaction is not allowed inside a synchronous StateTransaction body (it may deadlock or violate backpressure constraints).',
            hint: 'Move dispatch/setState calls outside the transaction window, or use a multi-entry pattern (pending → IO → writeback).',
            kind: 'enqueue_in_transaction',
          })
          yield* Effect.dieMessage('enqueueTransaction is not allowed inside a synchronous StateTransaction body')
        }

        const stateRef = lane === 'urgent' ? urgentStateRef : nonUrgentStateRef

        let waitedFromMs: number | undefined
        while (true) {
          const attempt = yield* Ref.modify(stateRef, (s): readonly [BacklogAcquireAttempt, BackpressureState] => {
            if (s.backlogCount < capacity) {
              return [
                { _tag: 'acquired' },
                {
                  backlogCount: s.backlogCount + 1,
                  waiters: s.waiters,
                  signal: s.signal,
                },
              ] as const
            }

            return [
              { _tag: 'wait', backlogCount: s.backlogCount, signal: s.signal },
              {
                backlogCount: s.backlogCount,
                waiters: s.waiters + 1,
                signal: s.signal,
              },
            ] as const
          })

          if (attempt._tag === 'acquired') {
            return
          }

          yield* Effect.uninterruptibleMask((restore) =>
            Effect.ensuring(
              restore(
                Effect.gen(function* () {
                  const now = Date.now()
                  if (waitedFromMs === undefined) {
                    waitedFromMs = now
                  }
                  const saturatedDurationMs = now - waitedFromMs

                  yield* diagnostics.emitPressureIfNeeded({
                    policy,
                    trigger: { kind: 'txnQueue', name: `enqueueTransaction.${lane}` },
                    backlogCount: attempt.backlogCount,
                    saturatedDurationMs,
                  })

                  yield* Deferred.await(attempt.signal)
                }),
              ),
              Ref.update(stateRef, (s) => ({
                backlogCount: s.backlogCount,
                waiters: s.waiters > 0 ? s.waiters - 1 : 0,
                signal: s.signal,
              })),
            ),
          )
        }
      })

    // Priority FIFO queue:
    // - Runs each transaction Effect on the *caller fiber* (preserves Provider-local overrides + FiberRef diagnostics).
    // - Serializes per-instance transactions (at most one active at a time).
    // - Urgent lane always wins over non-urgent lane when choosing the next task.
    //
    // Note: this means interrupting the caller fiber can cancel a queued transaction. This is acceptable for
    // Logix runtime semantics (forward-only evolution) and avoids the hot-path overhead of a background consumer
    // fiber + per-task diagnostic-context capture.
    let currentStart: Deferred.Deferred<void> | undefined = undefined
    const urgentWaitQueue: Array<Deferred.Deferred<void>> = []
    const nonUrgentWaitQueue: Array<Deferred.Deferred<void>> = []

    const pickNextWaiter = (): Deferred.Deferred<void> | undefined => {
      if (urgentWaitQueue.length > 0) {
        return urgentWaitQueue.shift()
      }
      if (nonUrgentWaitQueue.length > 0) {
        return nonUrgentWaitQueue.shift()
      }
      return undefined
    }

    const removeWaiter = (lane: TxnLane, start: Deferred.Deferred<void>): void => {
      const q = lane === 'urgent' ? urgentWaitQueue : nonUrgentWaitQueue
      for (let i = 0; i < q.length; i += 1) {
        if (q[i] === start) {
          q.splice(i, 1)
          return
        }
      }
    }

    const enqueueAndMaybeStart = (lane: TxnLane, start: Deferred.Deferred<void>): Effect.Effect<void> =>
      Effect.gen(function* () {
        let toStart: Deferred.Deferred<void> | undefined
        yield* Effect.uninterruptible(
          Effect.sync(() => {
            if (lane === 'urgent') {
              urgentWaitQueue.push(start)
            } else {
              nonUrgentWaitQueue.push(start)
            }

            if (!currentStart) {
              const next = pickNextWaiter()
              if (next) {
                currentStart = next
                toStart = next
              }
            }
          }),
        )
        if (toStart) {
          yield* Deferred.succeed(toStart, undefined)
        }
      })

    const advanceQueue = (lane: TxnLane, start: Deferred.Deferred<void>): Effect.Effect<void> =>
      Effect.gen(function* () {
        let toStart: Deferred.Deferred<void> | undefined
        yield* Effect.uninterruptible(
          Effect.sync(() => {
            if (currentStart === start) {
              currentStart = undefined
              const next = pickNextWaiter()
              if (next) {
                currentStart = next
                toStart = next
              }
              return
            }

            // If the fiber is interrupted before it becomes active, remove it from the wait queue.
            removeWaiter(lane, start)

            // Safety: if the system became idle (should not happen unless interrupted races), restart the baton.
            if (!currentStart) {
              const next = pickNextWaiter()
              if (next) {
                currentStart = next
                toStart = next
              }
            }
          }),
        )
        if (toStart) {
          yield* Deferred.succeed(toStart, undefined)
        }
      })

    let nextLinkSeq = 0
    const assignLinkId = (existing: string | undefined): string => {
      if (typeof existing === 'string' && existing.length > 0) {
        return existing
      }
      nextLinkSeq += 1
      // Stable and deterministic: never use randomness/time.
      return `${args.instanceId}::l${nextLinkSeq}`
    }

    const enqueueTransaction: EnqueueTransaction = <A2, E2>(
      a0: TxnLane | Effect.Effect<A2, E2, never>,
      a1?: Effect.Effect<A2, E2, never>,
    ): Effect.Effect<A2, E2, never> =>
      Effect.gen(function* () {
        const lane: TxnLane = a1 ? (a0 as TxnLane) : 'urgent'
        const eff: Effect.Effect<A2, E2, never> = a1 ? a1 : (a0 as Effect.Effect<A2, E2, never>)
        const stateRef = lane === 'urgent' ? urgentStateRef : nonUrgentStateRef

        const existingLinkId = yield* FiberRef.get(EffectOpCore.currentLinkId)
        const linkId = assignLinkId(existingLinkId)

        const policy = yield* args.resolveConcurrencyPolicy()
        const capacity = policy.losslessBackpressureCapacity
        yield* Effect.locally(EffectOpCore.currentLinkId, linkId)(
          acquireBacklogSlot(lane, capacity, policy),
        )

        const start = yield* Deferred.make<void>()
        yield* Effect.locally(EffectOpCore.currentLinkId, linkId)(enqueueAndMaybeStart(lane, start))

        return yield* Effect.locally(EffectOpCore.currentLinkId, linkId)(
          Effect.uninterruptibleMask((restore) =>
            Effect.ensuring(
              restore(Deferred.await(start)).pipe(Effect.zipRight(restore(eff))),
              Effect.uninterruptible(advanceQueue(lane, start).pipe(Effect.zipRight(release(stateRef)))),
            ),
          ),
        )
      })

    return enqueueTransaction
  })
