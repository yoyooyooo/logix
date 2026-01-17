import { Cause, Effect, Fiber, FiberRef, Ref, Stream } from 'effect'
import * as Debug from './DebugSink.js'
import { isDevEnv } from './env.js'
import type * as Logic from './LogicMiddleware.js'
import type { AnyModuleShape, LogicEffect } from './module.js'
import type { RuntimeInternalsResolvedConcurrencyPolicy } from './RuntimeInternals.js'
import type { StateTxnOrigin } from './StateTransaction.js'

/**
 * Prevents calling run*Task inside a "synchronous transaction execution fiber" (it would deadlock the txnQueue).
 *
 * - ModuleRuntime locally marks it as true while executing each transaction (dispatch/source-refresh/devtools/...).
 * - run*Task checks the flag on start: when true, it emits diagnostics only in dev/test and then no-ops.
 */
export const inSyncTransactionFiber = FiberRef.unsafeMake(false)

/**
 * Force source.refresh:
 * - Default: when snapshot keyHash is unchanged and a non-idle snapshot already exists, refresh SHOULD be a no-op
 *   (avoid redundant IO/writeback).
 * - Exception: explicit refresh (manual refresh) / invalidation-driven refresh needs to "re-fetch even with the same keyHash".
 *
 * Note: use a FiberRef to locally pass "whether this refresh is forced", avoiding expanding the source refresh handler signature.
 */
export const forceSourceRefresh = FiberRef.unsafeMake(false)

/**
 * Synchronous transaction window (process-level) marker:
 * - Used as a hard guard in "non-Effect API" entry points (e.g. Promise/async functions).
 * - FiberRef cannot reliably read the "current fiber" in such entry points, so we need a synchronous callstack-level marker.
 *
 * Note: if a transaction body incorrectly crosses async boundaries, this marker will be held longer; that is a severe violation.
 */
let inSyncTransactionGlobalDepth = 0

export const enterSyncTransaction = (): void => {
  inSyncTransactionGlobalDepth += 1
}

export const exitSyncTransaction = (): void => {
  inSyncTransactionGlobalDepth = Math.max(0, inSyncTransactionGlobalDepth - 1)
}

export const isInSyncTransaction = (): boolean => inSyncTransactionGlobalDepth > 0

export type TaskRunnerMode =
  | 'task' // sequential
  | 'parallel'
  | 'latest'
  | 'exhaust'

export type TaskStatus = 'idle' | 'pending' | 'running' | 'success' | 'failure' | 'interrupted'

export interface TaskExecution {
  readonly taskId: number
  readonly status: TaskStatus
  readonly acceptedAt: number
  readonly startedAt?: number
  readonly endedAt?: number
}

export interface TaskRunnerOrigins {
  readonly pending?: StateTxnOrigin
  readonly success?: StateTxnOrigin
  readonly failure?: StateTxnOrigin
}

type TaskHandler<Payload, Sh extends AnyModuleShape, R> =
  | LogicEffect<Sh, R, void, never>
  | ((payload: Payload) => LogicEffect<Sh, R, void, never>)

type TaskEffect<Payload, Sh extends AnyModuleShape, R, A, E> =
  | LogicEffect<Sh, R, A, E>
  | ((payload: Payload) => LogicEffect<Sh, R, A, E>)

export interface TaskRunnerConfig<Payload, Sh extends AnyModuleShape, R, A = void, E = never> {
  /**
   * Optional: trigger source name (e.g. actionTag / fieldPath), used as the default pending origin.name.
   * - BoundApiRuntime may fill this in for onAction("xxx") / traits.source.refresh("field"), etc.
   * - Other callers are not required to provide it.
   */
  readonly triggerName?: string

  /**
   * pending: synchronous state writes (loading=true / clearing errors, etc.), always a separate transaction entry.
   * - Only executed for tasks that are accepted and actually started (ignored triggers in runExhaustTask do not run pending).
   */
  readonly pending?: TaskHandler<Payload, Sh, R>

  /**
   * effect: real IO / async work (must run outside the transaction window).
   */
  readonly effect: TaskEffect<Payload, Sh, R, A, E>

  /**
   * success: success writeback (separate transaction entry).
   */
  readonly success?: (result: A, payload: Payload) => LogicEffect<Sh, R, void, never>

  /**
   * failure: failure writeback (separate transaction entry).
   *
   * Note: takes a Cause to preserve defect/interrupt semantics; interrupts do not trigger failure writeback by default.
   */
  readonly failure?: (cause: Cause.Cause<E>, payload: Payload) => LogicEffect<Sh, R, void, never>

  /**
   * origin: optional override for the three transaction origins.
   * - Default: pending.kind="task:pending"; success/failure.kind="service-callback".
   */
  readonly origin?: TaskRunnerOrigins

  /**
   * priority: reserved for future debugging/sorting; does not change transaction boundaries or concurrency semantics.
   */
  readonly priority?: number
}

export interface TaskRunnerRuntime {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly runWithStateTransaction: (
    origin: StateTxnOrigin,
    body: () => Effect.Effect<void, never, any>,
  ) => Effect.Effect<void, never, any>
  readonly resolveConcurrencyPolicy?: () => Effect.Effect<RuntimeInternalsResolvedConcurrencyPolicy, never, any>
}

const resolve = <Payload, Sh extends AnyModuleShape, R, A, E>(
  eff: TaskEffect<Payload, Sh, R, A, E> | TaskHandler<Payload, Sh, R>,
  payload: Payload,
): any => (typeof eff === 'function' ? (eff as any)(payload) : eff)

const defaultOrigins = (triggerName: string | undefined): Required<TaskRunnerOrigins> => ({
  pending: {
    kind: 'task:pending',
    name: triggerName,
  },
  success: {
    kind: 'service-callback',
    name: 'task:success',
  },
  failure: {
    kind: 'service-callback',
    name: 'task:failure',
  },
})

export const shouldNoopInSyncTransactionFiber = (options: {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly code: string
  readonly severity: 'error' | 'warning' | 'info'
  readonly message: string
  readonly hint?: string
  readonly actionTag?: string
  readonly kind?: string
}): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    const inTxn = yield* FiberRef.get(inSyncTransactionFiber)
    if (!inTxn) {
      return false
    }
    // Always no-op regardless of env (otherwise we may deadlock); diagnostics are emitted only in dev/test.
    if (isDevEnv()) {
      yield* Debug.record({
        type: 'diagnostic',
        moduleId: options.moduleId,
        instanceId: options.instanceId,
        code: options.code,
        severity: options.severity,
        message: options.message,
        hint: options.hint,
        actionTag: options.actionTag,
        kind: options.kind,
      })
    }
    return true
  })

const resolveConcurrencyLimit = (runtime: TaskRunnerRuntime): Effect.Effect<number | 'unbounded', never, any> =>
  runtime.resolveConcurrencyPolicy
    ? runtime.resolveConcurrencyPolicy().pipe(Effect.map((p) => p.concurrencyLimit))
    : Effect.succeed(16)

const runTaskLifecycle = <Payload, Sh extends AnyModuleShape, R, A, E>(
  payload: Payload,
  runtime: TaskRunnerRuntime,
  config: TaskRunnerConfig<Payload, Sh, R, A, E>,
  getCanWriteBack?: Effect.Effect<boolean>,
): Effect.Effect<void, never, Logic.Env<Sh, R>> =>
  Effect.gen(function* () {
    const noop = yield* shouldNoopInSyncTransactionFiber({
      moduleId: runtime.moduleId,
      instanceId: runtime.instanceId,
      code: 'logic::invalid_usage',
      severity: 'error',
      message: 'run*Task is not allowed inside a synchronous StateTransaction body (it may deadlock the txnQueue).',
      hint:
        'Call run*Task from the run section of a watcher (e.g. $.onAction/$.onState/$.on); ' +
        'do not call it directly inside a reducer / trait.run / synchronous transaction body. For long-lived flows, use a multi-entry pattern (pending → IO → writeback).',
      kind: 'run_task_in_transaction',
    })
    if (noop) {
      return
    }

    const defaults = defaultOrigins(config.triggerName)
    const origins: Required<TaskRunnerOrigins> = {
      pending: config.origin?.pending ?? defaults.pending,
      success: config.origin?.success ?? defaults.success,
      failure: config.origin?.failure ?? defaults.failure,
    }

    // 1) pending: separate transaction entry; once started it should not be interrupted by runLatest.
    const pending = config.pending
    if (pending) {
      yield* Effect.uninterruptible(
        runtime.runWithStateTransaction(origins.pending, () => Effect.asVoid(resolve(pending, payload))),
      )
    }

    // 2) IO: runs outside the transaction window.
    const io = resolve(config.effect, payload) as Effect.Effect<A, E, Logic.Env<Sh, R>>
    const exit = yield* Effect.exit(io)

    // 3) writeback: use the guard to confirm it's still the current task (runLatestTask).
    if (getCanWriteBack) {
      const ok = yield* getCanWriteBack
      if (!ok) {
        return
      }
    }

    if (exit._tag === 'Success') {
      const success = config.success
      if (success) {
        yield* runtime.runWithStateTransaction(origins.success, () => Effect.asVoid(success(exit.value, payload)))
      }
      return
    }

    // Failure: interruptions do not trigger failure writeback (e.g. runLatestTask cancellation, Scope ending).
    const cause = exit.cause as Cause.Cause<E>
    if (Cause.isInterrupted(cause)) {
      return
    }

    const failure = config.failure
    if (failure) {
      yield* runtime.runWithStateTransaction(origins.failure, () => Effect.asVoid(failure(cause, payload)))
    }
  }).pipe(
    // Watchers must not crash as a whole due to a single task failure: swallow errors, but keep them diagnosable.
    Effect.catchAllCause((cause) =>
      Debug.record({
        type: 'diagnostic',
        moduleId: runtime.moduleId,
        instanceId: runtime.instanceId,
        code: 'task_runner::unhandled_failure',
        severity: 'error',
        message: 'TaskRunner encountered an unhandled failure (pending/IO/writeback).',
        hint: 'Add a failure writeback for this task or handle errors explicitly upstream; avoid fire-and-forget swallowing errors.',
        actionTag: config.triggerName,
        kind: 'task_runner_unhandled_failure',
        trigger: {
          kind: 'task',
          name: config.triggerName,
        },
      }).pipe(Effect.zipRight(Effect.logError('TaskRunner error', cause))),
    ),
  ) as Effect.Effect<void, never, Logic.Env<Sh, R>>

/**
 * makeTaskRunner：
 * - Reuses FlowRuntime concurrency semantics (sequential/parallel/latest/exhaust).
 * - Splits a single trigger into: pending (separate txn) → IO → success/failure (separate txn).
 */
export const makeTaskRunner = <Payload, Sh extends AnyModuleShape, R, A = void, E = never>(
  stream: Stream.Stream<Payload>,
  mode: TaskRunnerMode,
  runtime: TaskRunnerRuntime,
  config: TaskRunnerConfig<Payload, Sh, R, A, E>,
): Effect.Effect<void, never, Logic.Env<Sh, R>> => {
  if (mode === 'latest') {
    return Effect.gen(function* () {
      const taskIdRef = yield* Ref.make(0)
      const currentFiberRef = yield* Ref.make<Fiber.RuntimeFiber<void, never> | undefined>(undefined)

      const start = (payload: Payload) =>
        Effect.gen(function* () {
          const taskId = yield* Ref.updateAndGet(taskIdRef, (n) => n + 1)

          const prev = yield* Ref.get(currentFiberRef)
          if (prev) {
            // Do not wait for the old fiber to fully end (avoid blocking new triggers); writeback is guarded by taskId.
            yield* Fiber.interruptFork(prev)
          }

          const canWriteBack = Ref.get(taskIdRef).pipe(Effect.map((current) => current === taskId))

          const fiber = yield* Effect.fork(
            runTaskLifecycle<Payload, Sh, R, A, E>(payload, runtime, config, canWriteBack),
          )

          yield* Ref.set(currentFiberRef, fiber)
        })

      return yield* Stream.runForEach(stream, start)
    })
  }

  if (mode === 'exhaust') {
    return Effect.gen(function* () {
      const concurrency = yield* resolveConcurrencyLimit(runtime)
      const busyRef = yield* Ref.make(false)

      const mapper = (payload: Payload) =>
        Effect.gen(function* () {
          const acquired = yield* Ref.modify(busyRef, (busy) =>
            busy ? ([false, busy] as const) : ([true, true] as const),
          )
          if (!acquired) {
            // Ignore trigger: no pending transaction is produced.
            return
          }
          try {
            yield* runTaskLifecycle<Payload, Sh, R, A, E>(payload, runtime, config)
          } finally {
            yield* Ref.set(busyRef, false)
          }
        })

      return yield* Stream.runDrain(stream.pipe(Stream.mapEffect(mapper, { concurrency })))
    }) as Effect.Effect<void, never, Logic.Env<Sh, R>>
  }

  if (mode === 'parallel') {
    return Effect.gen(function* () {
      const concurrency = yield* resolveConcurrencyLimit(runtime)

      return yield* Stream.runDrain(
        stream.pipe(
          Stream.mapEffect((payload) => runTaskLifecycle<Payload, Sh, R, A, E>(payload, runtime, config), {
            concurrency,
          }),
        ),
      )
    }) as Effect.Effect<void, never, Logic.Env<Sh, R>>
  }

  // mode === "task"（sequential）
  return Stream.runForEach(stream, (payload) =>
    runTaskLifecycle<Payload, Sh, R, A, E>(payload, runtime, config),
  ) as Effect.Effect<void, never, Logic.Env<Sh, R>>
}
