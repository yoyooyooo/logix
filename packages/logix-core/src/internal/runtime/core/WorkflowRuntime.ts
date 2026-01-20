import { Cause, Context, Deferred, Effect, Exit, Fiber, FiberRef, Option, Stream } from 'effect'
import * as EffectOpCore from './EffectOpCore.js'
import * as Debug from './DebugSink.js'
import * as LogicUnitMeta from './LogicUnitMeta.js'
import { toSerializableErrorSummary } from './errorSummary.js'
import type { AnyModuleShape, LogicPlan, ModuleRuntime as PublicModuleRuntime } from './module.js'
import { HostSchedulerTag, TickSchedulerTag } from './env.js'
import { currentTxnOriginOverride } from './TxnOriginOverride.js'
import { getRuntimeInternals } from './runtimeInternalsAccessor.js'
import { RootContextTag, type RootContext } from './RootContext.js'
import * as TaskRunner from './TaskRunner.js'
import * as EffectOp from '../../effect-op.js'
import { makeWorkflowError } from '../../workflow/errors.js'
import { compileWorkflowRuntimeStepsV1, type CompiledWorkflowStep } from '../../workflow/compiler.js'
import { evalInputExpr, type CompiledInputExpr } from '../../workflow/inputExpr.js'
import type { WorkflowDefV1, WorkflowTriggerV1 } from '../../workflow/model.js'

type ModuleTag = Context.Tag<unknown, PublicModuleRuntime<unknown, unknown>>

export type WorkflowLike = {
  readonly _tag?: 'Workflow'
  readonly def: WorkflowDefV1
  readonly validate?: () => void
}

type ConcurrencyMode = 'latest' | 'exhaust' | 'parallel'
type Priority = 'urgent' | 'nonUrgent'

type ServicePort = (input: unknown) => Effect.Effect<unknown, unknown, unknown>

type CompiledRuntimeStep =
  | { readonly kind: 'dispatch'; readonly key: string; readonly actionTag: string; readonly payload?: CompiledInputExpr }
  | { readonly kind: 'delay'; readonly key: string; readonly ms: number }
  | {
      readonly kind: 'call'
      readonly key: string
      readonly serviceId: string
      readonly input?: CompiledInputExpr
      readonly timeoutMs?: number
      readonly retryTimes?: number
      readonly port: ServicePort
      readonly onSuccess: ReadonlyArray<CompiledRuntimeStep>
      readonly onFailure: ReadonlyArray<CompiledRuntimeStep>
    }

type CompiledProgram = {
  readonly programId: string
  readonly localId: string
  readonly trigger: WorkflowTriggerV1
  readonly concurrency: ConcurrencyMode
  readonly priority: Priority
  readonly compiledSteps: ReadonlyArray<CompiledWorkflowStep>
  steps?: ReadonlyArray<CompiledRuntimeStep>
}

type ProgramState =
  | { readonly mode: 'latest'; runSeq: number; current?: Fiber.RuntimeFiber<void, never>; currentRunId?: string }
  | { readonly mode: 'exhaust'; runSeq: number; busy: boolean }
  | { readonly mode: 'parallel'; runSeq: number }

type ProgramEntry = {
  readonly program: CompiledProgram
  readonly state: ProgramState
}

type WorkflowRegistryV1 = {
  readonly byActionTag: Map<string, ReadonlyArray<ProgramEntry>>
  readonly entries: Array<ProgramEntry>
  watcherStarted: boolean
  watcherStartCount: number
  portsResolving: boolean
  portsReady: Deferred.Deferred<void, unknown>
  parallelLimiter: Effect.Semaphore | null | undefined
}

const WORKFLOW_REGISTRY = Symbol.for('@logixjs/core/workflowRegistry')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isObjectLike = (value: unknown): value is Record<string, unknown> | ((...args: never[]) => unknown) =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

const getRegistry = (runtime: object): WorkflowRegistryV1 | undefined =>
  (runtime as Record<PropertyKey, unknown>)[WORKFLOW_REGISTRY] as WorkflowRegistryV1 | undefined

const resolveActionTag = (action: unknown): string | undefined => {
  const tag = isObjectLike(action) ? (action as Record<string, unknown>)._tag : undefined
  if (typeof tag === 'string' && tag.length > 0) return tag
  const type = isObjectLike(action) ? (action as Record<string, unknown>).type : undefined
  if (typeof type === 'string' && type.length > 0) return type
  if (tag != null) return String(tag)
  if (type != null) return String(type)
  return undefined
}

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const KERNEL_PORT_SOURCE_REFRESH = 'logix/kernel/sourceRefresh'

const resolveServicePort = (
  runtime: PublicModuleRuntime<unknown, unknown>,
  env: Context.Context<unknown>,
  serviceId: string,
  programId: string,
  stepKey: string,
): ServicePort => {
  if (serviceId === KERNEL_PORT_SOURCE_REFRESH) {
    return (input) =>
      Effect.gen(function* () {
        const fieldPath = asNonEmptyString(isRecord(input) ? input.fieldPath : undefined)
        if (!fieldPath) {
          throw makeWorkflowError({
            code: 'WORKFLOW_INVALID_STEP',
            message: 'KernelPort sourceRefresh requires input.fieldPath (non-empty string).',
            programId,
            source: { stepKey },
            detail: { serviceId, input },
          })
        }

        const internals = getRuntimeInternals(runtime)
        const handler = internals.traits.getSourceRefreshHandler(fieldPath)

        // If no refresh handler is registered, treat it as a no-op (aligns with BoundApiRuntime behavior).
        if (!handler) {
          return
        }

        const force = isRecord(input) && input.force === true
        const runHandler = (state: unknown) =>
          force ? Effect.locally(TaskRunner.forceSourceRefresh, true)(handler(state)) : handler(state)

        const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
        if (inTxn) {
          const state = yield* runtime.getState
          yield* runHandler(state)
          return
        }

        yield* internals.txn.runWithStateTransaction(
          {
            kind: 'source-refresh',
            name: fieldPath,
          },
          () =>
            Effect.gen(function* () {
              const state = yield* runtime.getState
              yield* runHandler(state)
            }),
        )
      })
  }

  const tag = Context.GenericTag<unknown>(serviceId)
  const opt = Context.getOption(env, tag)
  if (Option.isNone(opt)) {
    throw makeWorkflowError({
      code: 'WORKFLOW_MISSING_SERVICE',
      message: `Missing service for serviceId="${serviceId}".`,
      programId,
      source: { stepKey },
      detail: { serviceId },
    })
  }

  const value: unknown = opt.value
  if (typeof value === 'function') {
    const fn = value as (input: unknown) => Effect.Effect<unknown, unknown, unknown>
    return (input) => fn(input)
  }

  const callFn = isObjectLike(value) ? (value as Record<string, unknown>).call : undefined
  if (typeof callFn === 'function') {
    const call = callFn as (this: unknown, input: unknown) => Effect.Effect<unknown, unknown, unknown>
    return (input) => call.call(value, input)
  }

  throw makeWorkflowError({
    code: 'WORKFLOW_INVALID_SERVICE_PORT',
    message: `Invalid service port for serviceId="${serviceId}" (expected a function or { call(input): Effect }).`,
    programId,
    source: { stepKey },
    detail: { serviceId, portType: typeof value },
  })
}

const compileSteps = (steps: ReadonlyArray<CompiledWorkflowStep>, resolvePort: (serviceId: string, stepKey: string) => ServicePort) => {
  const visit = (step: CompiledWorkflowStep): CompiledRuntimeStep => {
    switch (step.kind) {
      case 'dispatch':
        return {
          kind: 'dispatch',
          key: step.key,
          actionTag: step.actionTag,
          ...(step.payload ? { payload: step.payload } : null),
        }
      case 'delay':
        return { kind: 'delay', key: step.key, ms: step.ms }
      case 'call':
        return {
          kind: 'call',
          key: step.key,
          serviceId: step.serviceId,
          port: resolvePort(step.serviceId, step.key),
          ...(step.input ? { input: step.input } : null),
          ...(step.timeoutMs !== undefined ? { timeoutMs: step.timeoutMs } : null),
          ...(step.retryTimes !== undefined ? { retryTimes: step.retryTimes } : null),
          onSuccess: step.onSuccess.map(visit),
          onFailure: step.onFailure.map(visit),
        }
    }
  }

  return steps.map(visit)
}

const resolveConcurrency = (def: WorkflowDefV1): ConcurrencyMode => (def.policy?.concurrency ?? 'parallel') as ConcurrencyMode
const resolvePriority = (def: WorkflowDefV1): Priority => (def.policy?.priority ?? 'urgent') as Priority

const makeRunId = (instanceId: string, programId: string, runSeq: number): string =>
  `${instanceId}::wf:${programId}::r${runSeq}`

const runBoundary = <A, E, R>(args: {
  readonly kind: EffectOp.EffectOp['kind']
  readonly name: string
  readonly effect: Effect.Effect<A, E, R>
  readonly payload?: unknown
  readonly meta?: EffectOp.EffectOp['meta']
  readonly middleware: EffectOpCore.EffectOpMiddlewareEnv | undefined
}): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    const op = yield* EffectOp.makeInRunSession({
      kind: args.kind,
      name: args.name,
      effect: args.effect,
      payload: args.payload,
      meta: args.meta,
    })
    const stack = args.middleware?.stack ?? []
    return yield* EffectOp.run(op, stack)
  }) as unknown as Effect.Effect<A, E, R>

const makeTimer = (args: {
  readonly host: { readonly scheduleTimeout: (ms: number, cb: () => void) => () => void }
  readonly ms: number
  readonly onCancel: Effect.Effect<void, never, unknown>
}): Effect.Effect<void, never, unknown> =>
  Effect.async<void, never, unknown>((resume) => {
    let fired = false
    const cancel = args.host.scheduleTimeout(args.ms, () => {
      fired = true
      resume(Effect.void)
    })
    return Effect.sync(() => {
      cancel()
    }).pipe(Effect.zipRight(fired ? Effect.void : args.onCancel))
  })

const ensureLimiterReady = (registry: WorkflowRegistryV1, runtime: PublicModuleRuntime<unknown, unknown>) =>
  Effect.gen(function* () {
    if (registry.parallelLimiter !== undefined) return

    const internals = getRuntimeInternals(runtime)
    const policy = yield* internals.concurrency.resolveConcurrencyPolicy()
    const limit = policy.concurrencyLimit
    if (limit === 'unbounded') {
      registry.parallelLimiter = null
      return
    }

    const n = typeof limit === 'number' && Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 16
    registry.parallelLimiter = yield* Effect.makeSemaphore(n)
  })

const withRootEnvIfAvailable = <A, E, R>(eff: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    const rootOpt = yield* Effect.serviceOption(RootContextTag)
    if (Option.isNone(rootOpt)) {
      return yield* eff
    }
    const root: RootContext = rootOpt.value
    const rootEnv = root.context ?? (yield* Deferred.await(root.ready))

    const currentEnv = yield* Effect.context<unknown>()
    const mergedEnv = Context.merge(rootEnv as unknown as Context.Context<unknown>, currentEnv)
    return yield* (Effect.provide(eff as unknown as Effect.Effect<A, E, unknown>, mergedEnv) as unknown as Effect.Effect<A, E, R>)
  }) as unknown as Effect.Effect<A, E, R>

const ensurePortsResolved = (
  registry: WorkflowRegistryV1,
  runtime: PublicModuleRuntime<unknown, unknown>,
): Effect.Effect<void, unknown, unknown> =>
  Effect.gen(function* () {
    const done = yield* Deferred.isDone(registry.portsReady)
    if (done) {
      yield* Deferred.await(registry.portsReady)
      return
    }

    if (registry.portsResolving) {
      yield* Deferred.await(registry.portsReady)
      return
    }

    registry.portsResolving = true
    const env = yield* Effect.context<unknown>()

    yield* Effect.sync(() => {
      const portCache = new Map<string, ServicePort>()
      for (const entry of registry.entries) {
        const program = entry.program
        if (program.steps) continue

        const resolvePort = (serviceId: string, stepKey: string): ServicePort => {
          const cached = portCache.get(serviceId)
          if (cached) return cached
          const resolved = resolveServicePort(runtime, env, serviceId, program.programId, stepKey)
          portCache.set(serviceId, resolved)
          return resolved
        }

        program.steps = compileSteps(program.compiledSteps, resolvePort)
      }
    }).pipe(
      Effect.tap(() => Deferred.succeed(registry.portsReady, undefined)),
      Effect.catchAllCause((cause) => Deferred.failCause(registry.portsReady, cause).pipe(Effect.zipRight(Effect.failCause(cause)))),
      Effect.ensuring(
        Effect.sync(() => {
          registry.portsResolving = false
        }),
      ),
    )
  })

const shouldObserveForRun = (diagnostics: Debug.DiagnosticsLevel, runSeq: number): boolean => {
  if (diagnostics === 'off') return false
  if (diagnostics === 'sampled') {
    // Deterministic sampling (no Math.random): 1/16 by runSeq.
    return (runSeq & 0x0f) === 0
  }
  return true
}

const startProgramRun = (args: {
  readonly entry: ProgramEntry
  readonly runtime: PublicModuleRuntime<unknown, unknown>
  readonly registry: WorkflowRegistryV1
  readonly trigger: { readonly kind: 'action'; readonly actionTag: string } | { readonly kind: 'lifecycle'; readonly phase: string }
  readonly payload: unknown
  readonly middleware: EffectOpCore.EffectOpMiddlewareEnv | undefined
}): Effect.Effect<void, never, unknown> =>
  Effect.gen(function* () {
    const { entry, runtime, registry } = args
    const { program, state } = entry

    const diagnostics = yield* FiberRef.get(Debug.currentDiagnosticsLevel)

    const beginRun = (): { readonly runSeq: number; readonly runId: string; readonly canWriteBack: () => boolean } => {
      if (state.mode === 'latest') {
        state.runSeq += 1
        const runSeq = state.runSeq
        const runId = makeRunId(runtime.instanceId, program.programId, runSeq)
        return {
          runSeq,
          runId,
          canWriteBack: () => state.runSeq === runSeq,
        }
      }

      state.runSeq += 1
      const runSeq = state.runSeq
      const runId = makeRunId(runtime.instanceId, program.programId, runSeq)
      return {
        runSeq,
        runId,
        canWriteBack: () => true,
      }
    }

    if (state.mode === 'exhaust') {
      if (state.busy) {
        if (diagnostics !== 'off') {
          const observe = shouldObserveForRun(diagnostics, state.runSeq)
          const tickSeq = observe ? (yield* TickSchedulerTag).getTickSeq() : undefined
          yield* runBoundary({
            kind: 'flow',
            name: 'workflow.drop',
            payload: { programId: program.programId, trigger: args.trigger },
            meta: {
              moduleId: runtime.moduleId,
              instanceId: runtime.instanceId,
              programId: program.programId,
              ...(tickSeq !== undefined ? { tickSeq } : null),
              policy: { disableObservers: !observe },
              reason: 'exhaust' as const,
            },
            effect: Effect.void,
            middleware: args.middleware,
          })
        }
        return
      }
      state.busy = true
    }

    const { runSeq, runId, canWriteBack } = beginRun()

    if (state.mode === 'latest') {
      const prev = state.current
      const prevRunId = state.currentRunId
      if (prev) {
        yield* Fiber.interruptFork(prev)
        if (diagnostics !== 'off') {
          const observe = shouldObserveForRun(diagnostics, runSeq)
          const tickSeq = observe ? (yield* TickSchedulerTag).getTickSeq() : undefined
          yield* runBoundary({
            kind: 'flow',
            name: 'workflow.cancel',
            payload: { programId: program.programId, cancelled: prevRunId, by: runId },
            meta: {
              moduleId: runtime.moduleId,
              instanceId: runtime.instanceId,
              programId: program.programId,
              ...(tickSeq !== undefined ? { tickSeq } : null),
              policy: { disableObservers: !observe },
              reason: 'latest' as const,
              cancelledByRunId: runId,
              cancelledRunId: prevRunId,
            },
            effect: Effect.void,
            middleware: args.middleware,
          })
        }
      }
      state.currentRunId = runId
    }

    const observe = shouldObserveForRun(diagnostics, runSeq)
    const policy = { disableObservers: !observe } satisfies NonNullable<EffectOp.EffectOp['meta']>['policy']

    const programEffect = Effect.gen(function* () {
      const host = yield* HostSchedulerTag
      const tick = yield* TickSchedulerTag

      if (!program.steps) {
        const env = yield* Effect.context<unknown>()
        const portCache = new Map<string, ServicePort>()
        const resolvePort = (serviceId: string, stepKey: string): ServicePort => {
          const cached = portCache.get(serviceId)
          if (cached) return cached
          const resolved = resolveServicePort(runtime, env, serviceId, program.programId, stepKey)
          portCache.set(serviceId, resolved)
          return resolved
        }
        program.steps = compileSteps(program.compiledSteps, resolvePort)
      }

      const getTickSeq = (): number | undefined => (observe ? tick.getTickSeq() : undefined)
      const emitTimerEvents = observe && diagnostics === 'full'

      const evalPayload = (expr: CompiledInputExpr | undefined): unknown => (expr ? evalInputExpr(expr, args.payload) : undefined)

      const defaultInputForCall = (): unknown =>
        args.trigger.kind === 'action' ? args.payload : undefined

      let timerTriggered = false

      const runSteps = (steps: ReadonlyArray<CompiledRuntimeStep>): Effect.Effect<void, never, unknown> =>
        Effect.gen(function* () {
          for (const step of steps) {
            if (!canWriteBack()) return

            if (step.kind === 'dispatch') {
              const payload = evalPayload(step.payload)
              const action = { _tag: step.actionTag, payload }
              const tickSeq = getTickSeq()

              const dispatchEffectBase =
                program.priority === 'nonUrgent' ? runtime.dispatchLowPriority(action) : runtime.dispatch(action)

              const dispatchEffect = timerTriggered
                ? Effect.locally(
                    currentTxnOriginOverride,
                    {
                      kind: 'workflow.timer',
                      name: `timer:${program.programId}:${step.key}`,
                    },
                  )(dispatchEffectBase)
                : dispatchEffectBase

              yield* runBoundary({
                kind: 'flow',
                name: 'workflow.dispatch',
                payload: { actionTag: step.actionTag },
                meta: {
                  moduleId: runtime.moduleId,
                  instanceId: runtime.instanceId,
                  programId: program.programId,
                  runId,
                  stepKey: step.key,
                  ...(tickSeq !== undefined ? { tickSeq } : null),
                  policy,
                },
                effect: dispatchEffect,
                middleware: args.middleware,
              }).pipe(Effect.asVoid)
              continue
            }

            if (step.kind === 'delay') {
              const timerId = emitTimerEvents ? `${runId}::timer:${step.key}` : undefined

              const recordTimerEvent = (name: string, patchMeta?: Record<string, unknown>) =>
                Effect.gen(function* () {
                  const tickSeq = getTickSeq()
                  yield* runBoundary({
                    kind: 'flow',
                    name,
                    payload: { ms: step.ms },
                    meta: {
                      moduleId: runtime.moduleId,
                      instanceId: runtime.instanceId,
                      programId: program.programId,
                      runId,
                      stepKey: step.key,
                      ...(timerId ? { timerId } : null),
                      ...(tickSeq !== undefined ? { tickSeq } : null),
                      policy,
                      ...(patchMeta ?? null),
                    },
                    effect: Effect.void,
                    middleware: args.middleware,
                  })
                })

              const schedule = emitTimerEvents ? recordTimerEvent('workflow.timer.schedule') : Effect.void
              const onCancel = emitTimerEvents ? recordTimerEvent('workflow.timer.cancel', { reason: 'interrupt' }) : Effect.void
              const fired = emitTimerEvents ? recordTimerEvent('workflow.timer.fired') : Effect.void

              const delayEffect = schedule.pipe(
                Effect.zipRight(makeTimer({ host, ms: step.ms, onCancel })),
                Effect.zipRight(fired),
              )

              const tickSeq = getTickSeq()

              yield* runBoundary({
                kind: 'flow',
                name: 'workflow.delay',
                payload: { ms: step.ms },
                meta: {
                  moduleId: runtime.moduleId,
                  instanceId: runtime.instanceId,
                  programId: program.programId,
                  runId,
                  stepKey: step.key,
                  ...(tickSeq !== undefined ? { tickSeq } : null),
                  ...(timerId ? { timerId } : null),
                  policy,
                },
                effect: delayEffect,
                middleware: args.middleware,
              }).pipe(Effect.asVoid)

              timerTriggered = true
              continue
            }

            // call
            const input = step.input ? evalInputExpr(step.input, args.payload) : defaultInputForCall()
            const tickSeq = getTickSeq()

            const base = runBoundary({
              kind: 'service',
              name: `workflow.call:${step.serviceId}`,
              payload: { serviceId: step.serviceId },
              meta: {
                moduleId: runtime.moduleId,
                instanceId: runtime.instanceId,
                programId: program.programId,
                runId,
                stepKey: step.key,
                serviceId: step.serviceId,
                ...(tickSeq !== undefined ? { tickSeq } : null),
                policy,
              },
              effect: step.port(input),
              middleware: args.middleware,
            })

            const withTimeout =
              step.timeoutMs !== undefined
                ? base.pipe(
                    Effect.timeoutFail({
                      duration: step.timeoutMs,
                      onTimeout: () => new Error(`[WorkflowTimeout] serviceId=${step.serviceId} timeoutMs=${step.timeoutMs}`),
                    }),
                  )
                : base

            const withRetry =
              step.retryTimes !== undefined ? withTimeout.pipe(Effect.retry({ times: step.retryTimes })) : withTimeout

            const exit = yield* Effect.exit(withRetry)

            if (!canWriteBack()) return

            if (Exit.isSuccess(exit)) {
              yield* runSteps(step.onSuccess)
            } else {
              // timeoutFail uses a timer; mark the continuation as timer-triggered (for trace:tick.triggerSummary)
              const failure = Option.getOrUndefined(Cause.failureOption(exit.cause))
              const isTimeout =
                failure instanceof Error &&
                typeof failure.message === 'string' &&
                failure.message.includes('[WorkflowTimeout]')
              if (isTimeout) {
                timerTriggered = true
              }
              yield* runSteps(step.onFailure)
            }
          }
        })

      const runTickSeq = getTickSeq()
      yield* runBoundary({
        kind: 'flow',
        name: 'workflow.run',
        payload: { trigger: args.trigger },
        meta: {
          moduleId: runtime.moduleId,
          instanceId: runtime.instanceId,
          programId: program.programId,
          runId,
          ...(runTickSeq !== undefined ? { tickSeq: runTickSeq } : null),
          policy,
        },
        effect: runSteps(program.steps!),
        middleware: args.middleware,
      }).pipe(Effect.asVoid)
    })

    const limited = registry.parallelLimiter ? registry.parallelLimiter.withPermits(1)(programEffect) : programEffect

    const fiber = yield* Effect.forkScoped(
      limited.pipe(
        Effect.catchAllCause((cause) => {
          const { errorSummary, downgrade } = toSerializableErrorSummary(cause)
          const downgradeHint = downgrade ? ` (downgrade=${downgrade})` : ''
          return Debug.record({
            type: 'diagnostic',
            moduleId: runtime.moduleId,
            instanceId: runtime.instanceId,
            code: 'workflow::run_crashed',
            severity: 'error',
            message: `Workflow run crashed for programId="${program.programId}" runId="${runId}".${downgradeHint}`,
            hint: `${errorSummary.name ? `${errorSummary.name}: ` : ''}${errorSummary.message}`,
            actionTag: args.trigger.kind === 'action' ? args.trigger.actionTag : undefined,
            kind: 'workflow_run_crashed',
            trigger: {
              kind: 'workflow',
              name: 'run',
              details: {
                programId: program.programId,
                runId,
                trigger: args.trigger,
              },
            },
          }).pipe(Effect.catchAllCause(() => Effect.void))
        }),
        Effect.ensuring(
          Effect.sync(() => {
            if (state.mode === 'exhaust') {
              state.busy = false
            }
          }),
        ),
      ),
    )

    if (state.mode === 'latest') {
      state.current = fiber as Fiber.RuntimeFiber<void, never>
    }
  })

type RegistryInit = {
  readonly moduleId: string
  readonly instanceId: string
  readonly registry: WorkflowRegistryV1
}

const ensureRegistry = (runtime: PublicModuleRuntime<unknown, unknown>) =>
  Effect.gen(function* () {
    const existing = getRegistry(runtime)
    if (existing) {
      return {
        moduleId: runtime.moduleId,
        instanceId: runtime.instanceId,
        registry: existing,
      }
    }

    const portsReady = yield* Deferred.make<void, unknown>()

    const next: WorkflowRegistryV1 = {
      byActionTag: new Map(),
      entries: [],
      watcherStarted: false,
      watcherStartCount: 0,
      portsResolving: false,
      portsReady,
      parallelLimiter: undefined,
    }

    Object.defineProperty(runtime, WORKFLOW_REGISTRY, {
      value: next,
      enumerable: false,
      configurable: true,
      writable: false,
    })

    return { moduleId: runtime.moduleId, instanceId: runtime.instanceId, registry: next }
  })

const registerPrograms = (args: {
  readonly moduleTag: ModuleTag
  readonly programs: ReadonlyArray<WorkflowLike>
  readonly entryLabel: string
}): Effect.Effect<void, never, unknown> =>
  Effect.gen(function* () {
    const runtime = yield* args.moduleTag
    const { moduleId, instanceId, registry } = yield* ensureRegistry(runtime)

    // Lazily resolve the global parallel limiter once.
    if (registry.parallelLimiter === undefined) {
      yield* ensureLimiterReady(registry, runtime)
    }

    const validateNoIoStepsForOnInit = (steps: ReadonlyArray<CompiledWorkflowStep>, programId: string): void => {
      const visit = (step: CompiledWorkflowStep): void => {
        if (step.kind === 'call' || step.kind === 'delay') {
          throw makeWorkflowError({
            code: 'WORKFLOW_INVALID_TRIGGER',
            message: 'Lifecycle onInit programs must not include call/delay (initRequired must stay sync-only; use onStart for IO/time).',
            programId,
            source: { stepKey: step.key },
            detail: { kind: step.kind },
          })
        }
      }
      for (const s of steps) visit(s)
    }

    const programHasCall = (steps: ReadonlyArray<CompiledWorkflowStep>): boolean =>
      steps.some((s) => s.kind === 'call')

    const insertEntry = (actionTag: string, entry: ProgramEntry): void => {
      const prev = registry.byActionTag.get(actionTag)
      registry.byActionTag.set(actionTag, prev ? [...prev, entry] : [entry])
    }

    const internals = getRuntimeInternals(runtime)

    for (const program of args.programs) {
      const def = program.def
      const localId = asNonEmptyString(def.localId)
      if (!localId) {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_DEF',
          message: 'Workflow.install: def.localId must be a non-empty string.',
          detail: { localId: def.localId },
        })
      }

      const programId = `${moduleId}.${localId}`
      const compiled = compileWorkflowRuntimeStepsV1({ def })

      if (def.trigger.kind === 'lifecycle' && def.trigger.phase === 'onInit') {
        validateNoIoStepsForOnInit(compiled, programId)
      }

      const compiledProgram: CompiledProgram = {
        programId,
        localId,
        trigger: def.trigger,
        concurrency: resolveConcurrency(def),
        priority: resolvePriority(def),
        compiledSteps: compiled,
      }

      if (!programHasCall(compiled)) {
        compiledProgram.steps = compileSteps(compiled, () => {
          throw makeWorkflowError({
            code: 'WORKFLOW_MISSING_SERVICE',
            message: 'Internal error: unexpected call step while resolving call-less program.',
            programId,
            detail: { programId },
          })
        })
      }

      const state: ProgramState =
        compiledProgram.concurrency === 'latest'
          ? { mode: 'latest', runSeq: 0, current: undefined, currentRunId: undefined }
          : compiledProgram.concurrency === 'exhaust'
            ? { mode: 'exhaust', runSeq: 0, busy: false }
            : { mode: 'parallel', runSeq: 0 }

      const entry: ProgramEntry = { program: compiledProgram, state }
      registry.entries.push(entry)

      if (def.trigger.kind === 'action') {
        insertEntry(def.trigger.actionTag, entry)
      } else {
        if (def.trigger.phase === 'onStart') {
          internals.lifecycle.registerStart(
            withRootEnvIfAvailable(
              Effect.gen(function* () {
                const middlewareOpt = yield* Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag)
                const middleware = Option.isSome(middlewareOpt) ? middlewareOpt.value : undefined
                yield* ensurePortsResolved(registry, runtime).pipe(Effect.orDie)
                yield* startProgramRun({
                  entry,
                  runtime,
                  registry,
                  trigger: { kind: 'lifecycle', phase: 'onStart' },
                  payload: undefined,
                  middleware,
                })
              }),
            ),
            { name: `workflow:${localId}` },
          )
        } else {
          internals.lifecycle.registerInitRequired(
            Effect.gen(function* () {
              const middlewareOpt = yield* Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag)
              const middleware = Option.isSome(middlewareOpt) ? middlewareOpt.value : undefined
              yield* startProgramRun({
                entry,
                runtime,
                registry,
                trigger: { kind: 'lifecycle', phase: 'onInit' },
                payload: undefined,
                middleware,
              })
            }),
            { name: `workflow:${localId}` },
          )
        }
      }
    }

    void instanceId
  })

const startWatcherIfNeeded = (args: {
  readonly moduleTag: ModuleTag
  readonly entryLabel: string
}): Effect.Effect<void, never, unknown> =>
  Effect.gen(function* () {
    const runtime = yield* args.moduleTag
    const init = yield* ensureRegistry(runtime)
    const registry = init.registry

    if (registry.watcherStarted) {
      return
    }

    registry.watcherStarted = true
    registry.watcherStartCount += 1

    const middlewareOpt = yield* Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag)
    const middleware = Option.isSome(middlewareOpt) ? middlewareOpt.value : undefined

    const actions$ = runtime.actions$ as Stream.Stream<unknown>

    const portsExit = yield* Effect.exit(ensurePortsResolved(registry, runtime))
    if (Exit.isFailure(portsExit)) {
      const { errorSummary, downgrade } = toSerializableErrorSummary(portsExit.cause)
      const downgradeHint = downgrade ? ` (downgrade=${downgrade})` : ''
      yield* Debug.record({
        type: 'diagnostic',
        moduleId: runtime.moduleId,
        instanceId: runtime.instanceId,
        code: 'workflow::ports_resolution_failed',
        severity: 'error',
        message: `Workflow ports resolution failed before starting watcher.${downgradeHint}`,
        hint: `${errorSummary.name ? `${errorSummary.name}: ` : ''}${errorSummary.message}`,
        kind: 'workflow_ports_resolution_failed',
        trigger: {
          kind: 'workflow',
          name: 'portsResolution',
          details: {
            entryLabel: args.entryLabel,
          },
        },
      })
      return
    }

    yield* Stream.runForEach(actions$, (action) =>
      Effect.gen(function* () {
        const actionTag = resolveActionTag(action)
        if (!actionTag) return

        const entries = registry.byActionTag.get(actionTag)
        if (!entries || entries.length === 0) return

        const payload = isRecord(action) ? action.payload : undefined

        yield* Effect.forEach(
          entries,
          (entry) =>
            startProgramRun({
              entry,
              runtime,
              registry,
              trigger: { kind: 'action', actionTag },
              payload,
              middleware,
            }),
          { discard: true },
        )
      }),
    ).pipe(
      Effect.catchAllCause((cause) => {
        const { errorSummary, downgrade } = toSerializableErrorSummary(cause)
        const downgradeHint = downgrade ? ` (downgrade=${downgrade})` : ''
        return Debug.record({
          type: 'diagnostic',
          moduleId: runtime.moduleId,
          instanceId: runtime.instanceId,
          code: 'workflow::watcher_crashed',
          severity: 'error',
          message: `Workflow watcher crashed.${downgradeHint}`,
          hint: `${errorSummary.name ? `${errorSummary.name}: ` : ''}${errorSummary.message}`,
          kind: 'workflow_watcher_crashed',
          trigger: {
            kind: 'workflow',
            name: 'watcher',
            details: {
              entryLabel: args.entryLabel,
            },
          },
        })
      }),
    )

    void args.entryLabel
  })

export const mountAll = (args: {
  readonly moduleTag: ModuleTag
  readonly programs: ReadonlyArray<WorkflowLike>
}): LogicPlan<AnyModuleShape, unknown, never> => {
  const plan = {
    setup: registerPrograms({ moduleTag: args.moduleTag, programs: args.programs, entryLabel: 'mountAll' }),
    run: startWatcherIfNeeded({ moduleTag: args.moduleTag, entryLabel: 'mountAll' }),
  } satisfies LogicPlan<AnyModuleShape, unknown, never>

  LogicUnitMeta.attachLogicUnitMeta(plan, {
    id: '__logix_internal:workflows',
    kind: 'internal',
    name: 'workflows',
  })

  return plan
}

export const installOne = (args: {
  readonly moduleTag: ModuleTag
  readonly program: WorkflowLike
}): LogicPlan<AnyModuleShape, unknown, never> => {
  const localId = asNonEmptyString(args.program.def.localId) ?? 'unknown'
  const plan = {
    setup: registerPrograms({ moduleTag: args.moduleTag, programs: [args.program], entryLabel: `install:${localId}` }),
    run: startWatcherIfNeeded({ moduleTag: args.moduleTag, entryLabel: `install:${localId}` }),
  } satisfies LogicPlan<AnyModuleShape, unknown, never>

  LogicUnitMeta.attachLogicUnitMeta(plan, {
    id: `workflow:${localId}`,
    kind: 'workflow',
    name: localId,
  })

  return plan
}

// test-only probe: whether a watcher has started (for single-subscription gates).
export const __unsafeGetWatcherStartCount = (runtime: unknown): number => {
  if (!runtime || typeof runtime !== 'object') return 0
  const reg = getRegistry(runtime)
  return reg ? reg.watcherStartCount : 0
}
