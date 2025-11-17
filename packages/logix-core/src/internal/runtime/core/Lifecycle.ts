import { Cause, Context, Effect, Ref } from 'effect'
import { toSerializableErrorSummary } from './errorSummary.js'
import * as Debug from './DebugSink.js'

export type Phase = 'init' | 'run' | 'destroy' | 'platform'

export type Hook = 'initRequired' | 'start' | 'destroy' | 'suspend' | 'resume' | 'reset' | 'unknown'

export type TaskKind = 'initRequired' | 'start' | 'destroy' | 'platformSuspend' | 'platformResume' | 'platformReset'

export interface ErrorContext {
  readonly phase: Phase
  readonly hook: Hook
  readonly moduleId: string
  readonly instanceId: string
  readonly taskId?: string
  readonly txnSeq?: number
  readonly opSeq?: number
  /**
   * For diagnostics only: an implementation-side marker indicating where the error originated,
   * e.g. "logic.fork" / "initRequired" / "start".
   *
   * Note: this field must be serializable and must not become a protocol anchor.
   */
  readonly origin?: string
}

export interface ModuleRuntimeIdentity {
  readonly moduleId: string
  readonly instanceId: string
  readonly runtimeLabel?: string
}

export type InstanceStatus = 'creating' | 'initializing' | 'ready' | 'failed' | 'terminating' | 'terminated'

export interface InitProgress {
  readonly total: number
  readonly completed: number
  readonly current?: number
  readonly startedAt?: number
}

export type LifecycleOutcome =
  | { readonly status: 'success' }
  | {
      readonly status: 'failure'
      readonly error: import('./errorSummary.js').SerializableErrorSummary
    }

export interface LifecycleStatus {
  readonly identity: ModuleRuntimeIdentity
  readonly status: InstanceStatus
  readonly initOutcome?: LifecycleOutcome
  readonly initProgress?: InitProgress
}

export interface TaskRef {
  readonly taskId: string
  readonly kind: TaskKind
  readonly order: number
  readonly name?: string
  readonly fatalOnFailure?: boolean
}

export interface LifecycleTask extends TaskRef {
  readonly effect: Effect.Effect<void, never, any>
}

export interface Budgets {
  /** Per-instance lifecycle event budget (aligned with specs/011 data-model; default ≤ 20). */
  readonly maxEventsPerInstance: number
  /** Per-event size budget (aligned with specs/011 data-model; default ≤ 4KB). */
  readonly maxEventBytes: number
}

export interface LifecycleManager {
  readonly identity: ModuleRuntimeIdentity
  readonly budgets: Budgets

  readonly registerPlatformSuspend: (
    effect: Effect.Effect<void, never, any>,
    options?: { readonly name?: string },
  ) => void
  readonly registerPlatformResume: (
    effect: Effect.Effect<void, never, any>,
    options?: { readonly name?: string },
  ) => void
  readonly registerPlatformReset: (
    effect: Effect.Effect<void, never, any>,
    options?: { readonly name?: string },
  ) => void

  readonly registerInitRequired: (effect: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => void
  readonly registerStart: (
    effect: Effect.Effect<void, never, any>,
    options?: { readonly name?: string; readonly fatalOnFailure?: boolean },
  ) => void
  readonly registerDestroy: (effect: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => void
  readonly registerOnError: (
    handler: (cause: Cause.Cause<unknown>, context: ErrorContext) => Effect.Effect<void, never, any>,
  ) => void

  readonly getStatus: Effect.Effect<LifecycleStatus>
  readonly setStatus: (
    status: InstanceStatus,
    patch?: {
      readonly initOutcome?: LifecycleOutcome | undefined
      readonly initProgress?: InitProgress | undefined
      readonly runtimeLabel?: string | undefined
    },
  ) => Effect.Effect<void>

  readonly notifyError: (cause: Cause.Cause<unknown>, context: ErrorContext) => Effect.Effect<void, never, any>

  readonly runPlatformSuspend: Effect.Effect<void, never, any>
  readonly runPlatformResume: Effect.Effect<void, never, any>
  readonly runPlatformReset: Effect.Effect<void, never, any>

  readonly runInitRequired: Effect.Effect<void, unknown, any>
  readonly runStart: Effect.Effect<void, never, any>
  readonly runDestroy: Effect.Effect<void, never, any>

  /** Diagnostics only: whether any onError handler has been registered. */
  readonly hasOnErrorHandlers: Effect.Effect<boolean>

  /** Tests/diagnostics only: read a snapshot of registered tasks (immutable view). */
  readonly getTaskSnapshot: Effect.Effect<
    Readonly<{
      readonly initRequired: ReadonlyArray<TaskRef>
      readonly start: ReadonlyArray<TaskRef>
      readonly destroy: ReadonlyArray<TaskRef>
      readonly platformSuspend: ReadonlyArray<TaskRef>
      readonly platformResume: ReadonlyArray<TaskRef>
      readonly platformReset: ReadonlyArray<TaskRef>
    }>,
    never,
    never
  >
}

export const LifecycleContext = Context.GenericTag<LifecycleManager>('@logix/LifecycleManager')

const safeRun = (label: string, eff: Effect.Effect<void, any, any>) =>
  eff.pipe(
    Effect.matchCauseEffect({
      onSuccess: () => Effect.void,
      onFailure: (cause) => Effect.logError(`[${label}] failed: ${Cause.pretty(cause)}`),
    }),
  )

const makeTaskId = (kind: TaskKind, order: number): string => `${kind}:${order}`

export const makeLifecycleManager = (identity: ModuleRuntimeIdentity): Effect.Effect<LifecycleManager> =>
  Effect.gen(function* () {
    const budgets: Budgets = {
      maxEventsPerInstance: 20,
      maxEventBytes: 4 * 1024,
    }

    const statusRef = yield* Ref.make<LifecycleStatus>({
      identity,
      status: 'creating',
    })

    const initRequired: LifecycleTask[] = []
    const start: LifecycleTask[] = []
    const destroy: LifecycleTask[] = []
    const platformSuspend: LifecycleTask[] = []
    const platformResume: LifecycleTask[] = []
    const platformReset: LifecycleTask[] = []
    const onErrorHandlers: Array<
      (cause: Cause.Cause<unknown>, context: ErrorContext) => Effect.Effect<void, never, any>
    > = []

    const getStatus: Effect.Effect<LifecycleStatus> = Ref.get(statusRef)

    const recordPhase = (phase: Phase, name: string, payload?: unknown): Effect.Effect<void, never, any> =>
      Debug.record({
        type: 'lifecycle:phase',
        moduleId: identity.moduleId,
        instanceId: identity.instanceId,
        phase,
        name,
        payload,
      })

    const setStatus = (
      status: InstanceStatus,
      patch?: {
        readonly initOutcome?: LifecycleOutcome | undefined
        readonly initProgress?: InitProgress | undefined
        readonly runtimeLabel?: string | undefined
      },
    ) =>
      Ref.update(statusRef, (prev) => ({
        ...prev,
        identity: {
          ...prev.identity,
          ...(patch?.runtimeLabel ? { runtimeLabel: patch.runtimeLabel } : null),
        },
        status,
        ...(patch?.initOutcome !== undefined ? { initOutcome: patch.initOutcome } : null),
        ...(patch?.initProgress !== undefined ? { initProgress: patch.initProgress } : null),
      }))

    const registerInitRequired = (effect: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => {
      const order = initRequired.length
      initRequired.push({
        taskId: makeTaskId('initRequired', order),
        kind: 'initRequired',
        order,
        name: options?.name,
        effect,
      })
    }

    const registerStart = (
      effect: Effect.Effect<void, never, any>,
      options?: { readonly name?: string; readonly fatalOnFailure?: boolean },
    ) => {
      const order = start.length
      start.push({
        taskId: makeTaskId('start', order),
        kind: 'start',
        order,
        name: options?.name,
        fatalOnFailure: options?.fatalOnFailure,
        effect,
      })
    }

    const registerDestroy = (effect: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => {
      const order = destroy.length
      destroy.push({
        taskId: makeTaskId('destroy', order),
        kind: 'destroy',
        order,
        name: options?.name,
        effect,
      })
    }

    const registerOnError = (
      handler: (cause: Cause.Cause<unknown>, context: ErrorContext) => Effect.Effect<void, never, any>,
    ) => {
      onErrorHandlers.push(handler)
    }

    const registerPlatformSuspend = (effect: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => {
      const order = platformSuspend.length
      platformSuspend.push({
        taskId: makeTaskId('platformSuspend', order),
        kind: 'platformSuspend',
        order,
        name: options?.name,
        effect,
      })
    }

    const registerPlatformResume = (effect: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => {
      const order = platformResume.length
      platformResume.push({
        taskId: makeTaskId('platformResume', order),
        kind: 'platformResume',
        order,
        name: options?.name,
        effect,
      })
    }

    const registerPlatformReset = (effect: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => {
      const order = platformReset.length
      platformReset.push({
        taskId: makeTaskId('platformReset', order),
        kind: 'platformReset',
        order,
        name: options?.name,
        effect,
      })
    }

    const notifyError = (cause: Cause.Cause<unknown>, context: ErrorContext) => {
      // Interrupt/cancel should not be reported as an error.
      if (Cause.isInterrupted(cause)) {
        return Effect.void
      }

      return Debug.record({
        type: 'lifecycle:error',
        moduleId: context.moduleId,
        instanceId: context.instanceId,
        cause,
        phase: context.phase,
        hook: context.hook,
        taskId: context.taskId,
        txnSeq: context.txnSeq,
        opSeq: context.opSeq,
        origin: context.origin,
      }).pipe(
        Effect.zipRight(
          Effect.forEach(
            onErrorHandlers,
            (handler) =>
              handler(cause, context).pipe(
                Effect.catchAllCause((inner) => Effect.logError(`[lifecycle.onError] failed: ${Cause.pretty(inner)}`)),
              ),
            { discard: true },
          ),
        ),
      )
    }

    const runInitRequired: Effect.Effect<void, unknown, any> = Effect.gen(function* () {
      const total = initRequired.length
      if (total === 0) {
        yield* setStatus('ready', {
          initProgress: { total: 0, completed: 0 },
          initOutcome: { status: 'success' },
        })
        return
      }

      const startedAt = Date.now()
      yield* recordPhase('init', 'initRequired:start', { total })
      yield* setStatus('initializing', {
        initProgress: { total, completed: 0, current: 0, startedAt },
      })

      let completed = 0
      for (let i = 0; i < initRequired.length; i++) {
        yield* setStatus('initializing', {
          initProgress: { total, completed, current: i, startedAt },
        })

        const task = initRequired[i]
        const exit = yield* Effect.exit(task.effect)

        if (exit._tag === 'Success') {
          completed += 1
          yield* setStatus('initializing', {
            initProgress: { total, completed, current: i + 1, startedAt },
          })
          continue
        }

        const summary = toSerializableErrorSummary(exit.cause)
        yield* notifyError(exit.cause, {
          phase: 'init',
          hook: 'initRequired',
          moduleId: identity.moduleId,
          instanceId: identity.instanceId,
          taskId: task.taskId,
          origin: 'initRequired',
        })

        yield* setStatus('failed', {
          initProgress: { total, completed, current: i, startedAt },
          initOutcome: { status: 'failure', error: summary.errorSummary },
        })

        return yield* Effect.failCause(exit.cause)
      }

      yield* recordPhase('init', 'initRequired:success', { total })
      yield* setStatus('ready', {
        initProgress: { total, completed, current: total, startedAt },
        initOutcome: { status: 'success' },
      })
    })

    const runStart: Effect.Effect<void, never, any> = recordPhase('run', 'start:schedule', {
      total: start.length,
    }).pipe(
      Effect.zipRight(
        Effect.forEach(
          start,
          (task) =>
            Effect.forkScoped(
              task.effect.pipe(
                Effect.catchAllCause((cause) =>
                  notifyError(cause, {
                    phase: 'run',
                    hook: 'start',
                    moduleId: identity.moduleId,
                    instanceId: identity.instanceId,
                    taskId: task.taskId,
                    origin: 'start',
                  }),
                ),
              ),
            ).pipe(Effect.asVoid),
          { discard: true, concurrency: 'unbounded' },
        ),
      ),
    )

    const runDestroy: Effect.Effect<void, never, any> = Effect.gen(function* () {
      yield* recordPhase('destroy', 'destroy:start', { total: destroy.length })
      yield* setStatus('terminating')

      // destroy: run in reverse registration order (LIFO), best-effort (one failure does not block others).
      for (let i = destroy.length - 1; i >= 0; i--) {
        const task = destroy[i]
        yield* safeRun(
          'lifecycle.onDestroy',
          task.effect.pipe(
            Effect.catchAllCause((cause) =>
              notifyError(cause, {
                phase: 'destroy',
                hook: 'destroy',
                moduleId: identity.moduleId,
                instanceId: identity.instanceId,
                taskId: task.taskId,
                origin: 'destroy',
              }),
            ),
          ),
        )
      }

      yield* setStatus('terminated')
      yield* recordPhase('destroy', 'destroy:done', { total: destroy.length })
    })

    const runPlatformSuspend: Effect.Effect<void, never, any> = Effect.gen(function* () {
      if (platformSuspend.length === 0) return

      yield* recordPhase('platform', 'signal:suspend', { total: platformSuspend.length })
      for (const task of platformSuspend) {
        yield* safeRun(
          'lifecycle.onSuspend',
          task.effect.pipe(
            Effect.catchAllCause((cause) =>
              notifyError(cause, {
                phase: 'platform',
                hook: 'suspend',
                moduleId: identity.moduleId,
                instanceId: identity.instanceId,
                taskId: task.taskId,
                origin: 'platform.suspend',
              }),
            ),
          ),
        )
      }
    })

    const runPlatformResume: Effect.Effect<void, never, any> = Effect.gen(function* () {
      if (platformResume.length === 0) return

      yield* recordPhase('platform', 'signal:resume', { total: platformResume.length })
      for (const task of platformResume) {
        yield* safeRun(
          'lifecycle.onResume',
          task.effect.pipe(
            Effect.catchAllCause((cause) =>
              notifyError(cause, {
                phase: 'platform',
                hook: 'resume',
                moduleId: identity.moduleId,
                instanceId: identity.instanceId,
                taskId: task.taskId,
                origin: 'platform.resume',
              }),
            ),
          ),
        )
      }
    })

    const runPlatformReset: Effect.Effect<void, never, any> = Effect.gen(function* () {
      if (platformReset.length === 0) return

      yield* recordPhase('platform', 'signal:reset', { total: platformReset.length })
      for (const task of platformReset) {
        yield* safeRun(
          'lifecycle.onReset',
          task.effect.pipe(
            Effect.catchAllCause((cause) =>
              notifyError(cause, {
                phase: 'platform',
                hook: 'reset',
                moduleId: identity.moduleId,
                instanceId: identity.instanceId,
                taskId: task.taskId,
                origin: 'platform.reset',
              }),
            ),
          ),
        )
      }
    })

    const getTaskSnapshot: LifecycleManager['getTaskSnapshot'] = Effect.sync(() => ({
      initRequired: initRequired.map(({ effect: _eff, ...rest }) => rest),
      start: start.map(({ effect: _eff, ...rest }) => rest),
      destroy: destroy.map(({ effect: _eff, ...rest }) => rest),
      platformSuspend: platformSuspend.map(({ effect: _eff, ...rest }) => rest),
      platformResume: platformResume.map(({ effect: _eff, ...rest }) => rest),
      platformReset: platformReset.map(({ effect: _eff, ...rest }) => rest),
    }))

    const hasOnErrorHandlers: LifecycleManager['hasOnErrorHandlers'] = Effect.sync(() => onErrorHandlers.length > 0)

    return {
      identity,
      budgets,
      registerPlatformSuspend,
      registerPlatformResume,
      registerPlatformReset,
      registerInitRequired,
      registerStart,
      registerDestroy,
      registerOnError,
      getStatus,
      setStatus,
      notifyError,
      runPlatformSuspend,
      runPlatformResume,
      runPlatformReset,
      runInitRequired,
      runStart,
      runDestroy,
      hasOnErrorHandlers,
      getTaskSnapshot,
    }
  })
