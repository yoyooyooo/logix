import { Deferred, Effect, Exit, FiberRef, Option, Queue, Ref, Scope } from 'effect'
import * as EffectOpCore from './EffectOpCore.js'
import * as Debug from './DebugSink.js'
import * as TaskRunner from './TaskRunner.js'
import type { ConcurrencyDiagnostics } from './ConcurrencyDiagnostics.js'
import { RuntimeStoreTag, StateTransactionOverridesTag, TickSchedulerTag, type StateTransactionOverrides } from './env.js'
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

type CapturedDiagnosticContext = {
  readonly linkId: string
  readonly runtimeLabel: string | undefined
  readonly diagnosticsLevel: Debug.DiagnosticsLevel
  readonly debugSinks: ReadonlyArray<Debug.Sink>
  readonly overridesOpt: Option.Option<StateTransactionOverrides>
  readonly runtimeStoreOpt: Option.Option<any>
  readonly tickSchedulerOpt: Option.Option<any>
}

const captureDiagnosticContext = (args: {
  readonly nextLinkId: () => string
}): Effect.Effect<CapturedDiagnosticContext> =>
  Effect.gen(function* () {
    const overridesOpt = yield* Effect.serviceOption(StateTransactionOverridesTag)
    const runtimeStoreOpt = yield* Effect.serviceOption(RuntimeStoreTag)
    const tickSchedulerOpt = yield* Effect.serviceOption(TickSchedulerTag)
    const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
    const runtimeLabel = yield* FiberRef.get(Debug.currentRuntimeLabel)
    const debugSinks = yield* FiberRef.get(Debug.currentDebugSinks)
    const existingLinkId = yield* FiberRef.get(EffectOpCore.currentLinkId)
    const linkId = existingLinkId ?? args.nextLinkId()

    return {
      linkId,
      runtimeLabel,
      diagnosticsLevel,
      debugSinks,
      overridesOpt,
      runtimeStoreOpt,
      tickSchedulerOpt,
    }
  })

const withDiagnosticContext = <A, E>(
  context: CapturedDiagnosticContext,
  eff: Effect.Effect<A, E, never>,
): Effect.Effect<A, E, never> => {
  const effWithOverrides = Option.isSome(context.overridesOpt)
    ? Effect.provideService(eff, StateTransactionOverridesTag, context.overridesOpt.value)
    : eff

  const effWithRuntimeStore = Option.isSome(context.runtimeStoreOpt)
    ? Effect.provideService(effWithOverrides, RuntimeStoreTag, context.runtimeStoreOpt.value)
    : effWithOverrides

  const effWithTickScheduler = Option.isSome(context.tickSchedulerOpt)
    ? Effect.provideService(effWithRuntimeStore, TickSchedulerTag, context.tickSchedulerOpt.value)
    : effWithRuntimeStore

  return effWithTickScheduler.pipe(
    Effect.locally(EffectOpCore.currentLinkId, context.linkId),
    Effect.locally(Debug.currentRuntimeLabel, context.runtimeLabel),
    Effect.locally(Debug.currentDiagnosticsLevel, context.diagnosticsLevel),
    Effect.locally(Debug.currentDebugSinks, context.debugSinks),
  )
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
    const urgentQueue = yield* Queue.unbounded<Effect.Effect<void>>()
    const nonUrgentQueue = yield* Queue.unbounded<Effect.Effect<void>>()
    const wakeQueue = yield* Queue.unbounded<void>()
    const diagnostics = args.diagnostics

    let nextLinkSeq = 0
    const nextLinkId = (): string => {
      nextLinkSeq += 1
      return `${args.instanceId}::l${nextLinkSeq}`
    }

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

    const acquireBacklogSlot = (lane: TxnLane, capacity: number): Effect.Effect<void> =>
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
          const policy = yield* args.resolveConcurrencyPolicy()
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

            return [{ _tag: 'wait', backlogCount: s.backlogCount, signal: s.signal }, s] as const
          })

          if (attempt._tag === 'acquired') {
            return
          }

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

          yield* Effect.acquireUseRelease(
            Ref.update(stateRef, (s) => ({
              backlogCount: s.backlogCount,
              waiters: s.waiters + 1,
              signal: s.signal,
            })).pipe(Effect.as(attempt.signal)),
            (signal) => Deferred.await(signal),
            () =>
              Ref.update(stateRef, (s) => ({
                backlogCount: s.backlogCount,
                waiters: s.waiters > 0 ? s.waiters - 1 : 0,
                signal: s.signal,
              })),
          )
        }
      })

    const consumerLoop: Effect.Effect<never, never, never> = Effect.forever(
      Effect.gen(function* () {
        yield* Queue.take(wakeQueue)

        while (true) {
          const urgent = yield* Queue.poll(urgentQueue)
          if (Option.isSome(urgent)) {
            yield* urgent.value
            continue
          }

          const nonUrgent = yield* Queue.poll(nonUrgentQueue)
          if (Option.isSome(nonUrgent)) {
            yield* nonUrgent.value
            continue
          }

          break
        }
      }),
    )

    // Background consumer fiber: executes queued transaction Effects sequentially (urgent first).
    yield* Effect.forkScoped(consumerLoop)

    const enqueueTransaction: EnqueueTransaction = <A2, E2>(
      a0: TxnLane | Effect.Effect<A2, E2, never>,
      a1?: Effect.Effect<A2, E2, never>,
    ): Effect.Effect<A2, E2, never> =>
      Effect.gen(function* () {
        const lane: TxnLane = a1 ? (a0 as TxnLane) : 'urgent'
        const eff: Effect.Effect<A2, E2, never> = a1 ? a1 : (a0 as Effect.Effect<A2, E2, never>)
        const stateRef = lane === 'urgent' ? urgentStateRef : nonUrgentStateRef

        const policy = yield* args.resolveConcurrencyPolicy()
        const capacity = policy.losslessBackpressureCapacity
        yield* acquireBacklogSlot(lane, capacity)

        const done = yield* Deferred.make<Exit.Exit<A2, E2>>()

        const capturedContext = yield* captureDiagnosticContext({ nextLinkId })
        const effWithContext = withDiagnosticContext(capturedContext, eff)

        const task: Effect.Effect<void> = effWithContext.pipe(
          Effect.exit,
          Effect.flatMap((exit) => Deferred.succeed(done, exit)),
          Effect.asVoid,
          Effect.ensuring(release(stateRef)),
        )

        // Important: slot is already acquired; offer must be uninterruptible to avoid leaking backlog counters.
        const targetQueue = lane === 'urgent' ? urgentQueue : nonUrgentQueue
        yield* Effect.uninterruptible(Effect.all([Queue.offer(targetQueue, task), Queue.offer(wakeQueue, undefined)]))

        const exit = yield* Deferred.await(done)
        return yield* Exit.match(exit, {
          onFailure: (cause) => Effect.failCause(cause),
          onSuccess: (value) => Effect.succeed(value),
        })
      })

    return enqueueTransaction
  })
