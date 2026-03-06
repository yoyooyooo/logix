import { Deferred, Effect, FiberRef, Ref, Scope } from 'effect'
import * as Debug from './DebugSink.js'
import * as EffectOpCore from './EffectOpCore.js'
import * as TaskRunner from './TaskRunner.js'
import type { ConcurrencyDiagnostics } from './ConcurrencyDiagnostics.js'
import type { StateTransactionOverrides } from './env.js'
import type { ResolvedConcurrencyPolicy } from './ModuleRuntime.concurrencyPolicy.js'

export type TxnLane = 'urgent' | 'nonUrgent'

export type TxnQueueStartMode = 'direct_idle' | 'direct_handoff' | 'post_visibility_window'

export type TxnQueueStartTrace = {
  readonly lane: TxnLane
  readonly waiterSeq: number
  readonly enqueueAtMs: number
  readonly startAtMs: number
  readonly queueWaitMs: number
  readonly startMode: TxnQueueStartMode
  readonly visibilityWindowMs?: number
  readonly previousCompletedLane?: TxnLane
  readonly activeLaneAtEnqueue?: TxnLane
  readonly queueDepthAtStart: {
    readonly urgent: number
    readonly nonUrgent: number
  }
}

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

type QueueWaiter = {
  readonly lane: TxnLane
  readonly start: Deferred.Deferred<void>
  readonly waiterSeq: number
  readonly enqueueAtMs: number
  readonly activeLaneAtEnqueue?: TxnLane
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
    // Observation-first note:
    // - We keep the scheduler semantics unchanged here.
    // - The only added surface is a slim `trace:txn-queue` start event so perf suites can distinguish
    //   "urgent enqueued late" vs "urgent already queued but waited for baton".
    let currentWaiter: QueueWaiter | undefined = undefined
    let currentLane: TxnLane | undefined = undefined
    let lastCompletedLane: TxnLane | undefined = undefined
    let nextWaiterSeq = 0
    const startTraceByStart = new Map<Deferred.Deferred<void>, TxnQueueStartTrace>()
    const urgentWaitQueue: Array<QueueWaiter> = []
    const nonUrgentWaitQueue: Array<QueueWaiter> = []

    const readClockMs = (): number => {
      const perf = globalThis.performance
      if (perf && typeof perf.now === 'function') {
        return perf.now()
      }
      return Date.now()
    }

    const nextQueueWaiterSeq = (): number => {
      nextWaiterSeq += 1
      return nextWaiterSeq
    }

    const pickNextWaiter = (): QueueWaiter | undefined => {
      if (urgentWaitQueue.length > 0) {
        return urgentWaitQueue.shift()
      }
      if (nonUrgentWaitQueue.length > 0) {
        return nonUrgentWaitQueue.shift()
      }
      return undefined
    }

    const recordStartTrace = (waiter: QueueWaiter, startMode: TxnQueueStartMode): void => {
      const startAtMs = readClockMs()
      startTraceByStart.set(waiter.start, {
        lane: waiter.lane,
        waiterSeq: waiter.waiterSeq,
        enqueueAtMs: waiter.enqueueAtMs,
        startAtMs,
        queueWaitMs: Math.max(0, startAtMs - waiter.enqueueAtMs),
        startMode,
        ...(lastCompletedLane ? { previousCompletedLane: lastCompletedLane } : {}),
        ...(waiter.activeLaneAtEnqueue ? { activeLaneAtEnqueue: waiter.activeLaneAtEnqueue } : {}),
        queueDepthAtStart: {
          urgent: urgentWaitQueue.length,
          nonUrgent: nonUrgentWaitQueue.length,
        },
      })
    }

    const removeWaiter = (lane: TxnLane, start: Deferred.Deferred<void>): void => {
      const q = lane === 'urgent' ? urgentWaitQueue : nonUrgentWaitQueue
      for (let i = 0; i < q.length; i += 1) {
        if (q[i]?.start === start) {
          q.splice(i, 1)
          return
        }
      }
    }

    const emitStartTrace = (trace: TxnQueueStartTrace | undefined): Effect.Effect<void> =>
      !trace
        ? Effect.void
        : FiberRef.get(Debug.currentDiagnosticsLevel).pipe(
            Effect.flatMap((diagnosticsLevel) =>
              diagnosticsLevel === 'off'
                ? Effect.void
                : Debug.record({
                    type: 'trace:txn-queue',
                    moduleId: args.moduleId,
                    instanceId: args.instanceId,
                    data: trace,
                  }),
            ),
          )

    const enqueueAndMaybeStart = (waiter: QueueWaiter): Effect.Effect<void> =>
      Effect.gen(function* () {
        let toStart: QueueWaiter | undefined
        yield* Effect.uninterruptible(
          Effect.sync(() => {
            if (waiter.lane === 'urgent') {
              urgentWaitQueue.push(waiter)
            } else {
              nonUrgentWaitQueue.push(waiter)
            }

            if (!currentWaiter) {
              const next = pickNextWaiter()
              if (next) {
                currentWaiter = next
                currentLane = next.lane
                recordStartTrace(next, lastCompletedLane ? 'direct_handoff' : 'direct_idle')
                toStart = next
              }
            }
          }),
        )
        if (toStart) {
          yield* Deferred.succeed(toStart.start, undefined)
        }
      })

    const advanceQueue = (lane: TxnLane, start: Deferred.Deferred<void>): Effect.Effect<void> =>
      Effect.gen(function* () {
        let toStart: QueueWaiter | undefined
        yield* Effect.uninterruptible(
          Effect.sync(() => {
            if (currentWaiter?.start === start) {
              currentWaiter = undefined
              currentLane = undefined
              lastCompletedLane = lane
              const next = pickNextWaiter()
              if (next) {
                currentWaiter = next
                currentLane = next.lane
                recordStartTrace(next, 'direct_handoff')
                toStart = next
              }
              return
            }

            // If the fiber is interrupted before it becomes active, remove it from the wait queue.
            removeWaiter(lane, start)

            // Safety: if the system became idle (should not happen unless interrupted races), restart the baton.
            if (!currentWaiter) {
              const next = pickNextWaiter()
              if (next) {
                currentWaiter = next
                currentLane = next.lane
                recordStartTrace(next, lastCompletedLane ? 'direct_handoff' : 'direct_idle')
                toStart = next
              }
            }
          }),
        )
        if (toStart) {
          yield* Deferred.succeed(toStart.start, undefined)
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
        const waiter: QueueWaiter = {
          lane,
          start,
          waiterSeq: nextQueueWaiterSeq(),
          enqueueAtMs: readClockMs(),
          ...(currentLane ? { activeLaneAtEnqueue: currentLane } : {}),
        }
        yield* Effect.locally(EffectOpCore.currentLinkId, linkId)(enqueueAndMaybeStart(waiter))

        return yield* Effect.locally(EffectOpCore.currentLinkId, linkId)(
          Effect.uninterruptibleMask((restore) =>
            Effect.ensuring(
              Effect.flatMap(restore(Deferred.await(start)), () => {
                const startTrace = startTraceByStart.get(start)
                startTraceByStart.delete(start)
                return emitStartTrace(startTrace).pipe(Effect.zipRight(restore(eff)))
              }),
              Effect.uninterruptible(advanceQueue(lane, start).pipe(Effect.zipRight(release(stateRef)))),
            ),
          ),
        )
      })

    return enqueueTransaction
  })
