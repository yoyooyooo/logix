import { Effect, Stream, Option } from 'effect'
import type { AnyModuleShape, LogicEffect, ModuleRuntime, StateOf, ActionOf, ModuleShape } from './module.js'
import type * as Logic from './LogicMiddleware.js'
import * as EffectOp from '../../effect-op.js'
import * as EffectOpCore from './EffectOpCore.js'
import { RunSessionTag } from '../../verification/runSession.js'
import type { RuntimeInternals } from './RuntimeInternals.js'
import * as Debug from './DebugSink.js'
import * as ReadQuery from './ReadQuery.js'
import { makeRunBudgetEnvelopeV1, makeRunDegradeMarkerV1 } from './diagnosticsBudget.js'
import * as ModeRunner from './ModeRunner.js'

const getMiddlewareStack = (): Effect.Effect<EffectOp.MiddlewareStack, never, any> =>
  Effect.serviceOption(EffectOpCore.EffectOpMiddlewareTag).pipe(
    Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.stack : [])),
  )

const getRuntimeScope = (runtime: unknown): { readonly moduleId?: string; readonly instanceId?: string } => {
  if (!runtime) return {}
  if (typeof runtime !== 'object' && typeof runtime !== 'function') return {}
  const scope = runtime as { readonly moduleId?: unknown; readonly instanceId?: unknown }
  return {
    moduleId: typeof scope.moduleId === 'string' ? scope.moduleId : undefined,
    instanceId: typeof scope.instanceId === 'string' ? scope.instanceId : undefined,
  }
}

type RuntimeReadQueryWithMetaCapability<S> = {
  readonly changesReadQueryWithMeta: <V>(readQuery: ReadQuery.ReadQueryInput<S, V>) => Stream.Stream<{ readonly value: V }>
}

const hasChangesReadQueryWithMeta = <S>(candidate: unknown): candidate is RuntimeReadQueryWithMetaCapability<S> => {
  if (candidate == null) return false
  if (typeof candidate !== 'object' && typeof candidate !== 'function') return false
  return typeof (candidate as { readonly changesReadQueryWithMeta?: unknown }).changesReadQueryWithMeta === 'function'
}

export interface Api<Sh extends ModuleShape<any, any>, R = never> {
  readonly fromAction: <T extends ActionOf<Sh>>(predicate: (a: ActionOf<Sh>) => a is T) => Stream.Stream<T>

  readonly fromState: {
    <V>(selector: (s: StateOf<Sh>) => V): Stream.Stream<V>
    <V>(query: ReadQuery.ReadQuery<StateOf<Sh>, V>): Stream.Stream<V>
  }

  readonly debounce: <V>(ms: number) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly throttle: <V>(ms: number) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly filter: <V>(predicate: (value: V) => boolean) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly run: {
    <V, A = void, E = never, R2 = unknown>(
      eff: LogicEffect<Sh, R & R2, A, E> | ((payload: V) => LogicEffect<Sh, R & R2, A, E>),
      options?: Logic.OperationOptions,
    ): (stream: Stream.Stream<V>) => LogicEffect<Sh, R & R2, void, E>
    <V, A = void, E = never, R2 = unknown>(
      config: RunConfig<Sh, R & R2, V, A, E>,
    ): (stream: Stream.Stream<V>) => LogicEffect<Sh, R & R2, void, E>
  }

  readonly runParallel: <V, A = void, E = never, R2 = unknown>(
    eff: LogicEffect<Sh, R & R2, A, E> | ((payload: V) => LogicEffect<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ) => (stream: Stream.Stream<V>) => LogicEffect<Sh, R & R2, void, E>

  readonly runLatest: <V, A = void, E = never, R2 = unknown>(
    eff: LogicEffect<Sh, R & R2, A, E> | ((payload: V) => LogicEffect<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ) => (stream: Stream.Stream<V>) => LogicEffect<Sh, R & R2, void, E>

  readonly runExhaust: <V, A = void, E = never, R2 = unknown>(
    eff: LogicEffect<Sh, R & R2, A, E> | ((payload: V) => LogicEffect<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ) => (stream: Stream.Stream<V>) => LogicEffect<Sh, R & R2, void, E>
}

export interface RunConfig<Sh extends AnyModuleShape, R, V, A = void, E = never> {
  readonly effect: LogicEffect<Sh, R, A, E> | ((payload: V) => LogicEffect<Sh, R, A, E>)
  readonly mode?: ModeRunner.ModeRunnerMode
  readonly options?: Logic.OperationOptions
}

type EffectResolver<T, Sh extends AnyModuleShape, R, A, E> = (payload: T) => LogicEffect<Sh, R, A, E>

const preResolveEffectResolver = <T, Sh extends AnyModuleShape, R, A, E>(
  eff: LogicEffect<Sh, R, A, E> | EffectResolver<T, Sh, R, A, E>,
): EffectResolver<T, Sh, R, A, E> => {
  if (typeof eff === 'function') {
    return eff as EffectResolver<T, Sh, R, A, E>
  }
  return () => eff
}

const resolveFlowRunId = (name: string, meta: Record<string, unknown>, fallbackRunSeq?: number): string => {
  const explicitRunId = meta.runId
  if (typeof explicitRunId === 'string' && explicitRunId.length > 0) {
    return explicitRunId
  }

  const instanceId = typeof meta.instanceId === 'string' && meta.instanceId.length > 0 ? meta.instanceId : 'global'
  const opSeq = meta.opSeq
  if (typeof opSeq === 'number' && Number.isFinite(opSeq) && opSeq >= 1) {
    return `${instanceId}::${name}::r${Math.floor(opSeq)}`
  }
  if (typeof fallbackRunSeq === 'number' && Number.isFinite(fallbackRunSeq) && fallbackRunSeq >= 1) {
    return `${instanceId}::${name}::r${Math.floor(fallbackRunSeq)}`
  }
  return `${instanceId}::${name}`
}

const withFlowRunBudgetMeta = (
  name: string,
  meta: Record<string, unknown>,
  fallbackRunSeq?: number,
): Record<string, unknown> => {
  const disableObservers =
    typeof meta.policy === 'object' && meta.policy !== null && (meta.policy as { readonly disableObservers?: unknown }).disableObservers === true

  return {
    ...meta,
    budgetEnvelope: makeRunBudgetEnvelopeV1({
      domain: 'flow',
      runId: resolveFlowRunId(name, meta, fallbackRunSeq),
    }),
    degrade: makeRunDegradeMarkerV1(disableObservers, disableObservers ? 'observer_disabled' : undefined),
  }
}

const isRunConfig = <Sh extends AnyModuleShape, R, V, A, E>(
  input: unknown,
): input is RunConfig<Sh, R, V, A, E> => {
  if (!input || typeof input !== 'object') {
    return false
  }
  const candidate = input as { readonly effect?: unknown; readonly mode?: unknown }
  if (!('effect' in candidate)) {
    return false
  }
  const mode = candidate.mode
  if (mode === undefined) {
    return true
  }
  return mode === 'task' || mode === 'parallel' || mode === 'latest' || mode === 'exhaust'
}

export const make = <Sh extends AnyModuleShape, R = never>(
  runtime: ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
  runtimeInternals?: RuntimeInternals,
): Api<Sh, R> => {
  let flowBudgetRunSeq = 0
  let flowWatcherResourceSeq = 0
  const scope = getRuntimeScope(runtime)
  const hotLifecycle = runtimeInternals?.hotLifecycle
  const resolveConcurrencyLimit = (): Effect.Effect<number | 'unbounded', never, any> =>
    runtimeInternals
      ? runtimeInternals.concurrency.resolveConcurrencyPolicy().pipe(Effect.map((p) => p.concurrencyLimit))
      : Effect.succeed(16)

  interface FlowOpRunContext {
    readonly stack: EffectOp.MiddlewareStack
    readonly hasMiddleware: boolean
    readonly metaTemplate: Record<string, unknown>
    readonly hasFiniteTemplateOpSeq: boolean
    readonly allocateOpSeq?: () => number
  }

  const makeFlowOpRunContext = (
    options?: Logic.OperationOptions,
  ): Effect.Effect<FlowOpRunContext, never, any> =>
    Effect.gen(function* () {
      const stack = yield* getMiddlewareStack()
      if (stack.length === 0) {
        return {
          stack,
          hasMiddleware: false,
          metaTemplate: {},
          hasFiniteTemplateOpSeq: false,
          allocateOpSeq: undefined,
        }
      }

      const sessionOpt = yield* Effect.serviceOption(RunSessionTag)

      const metaTemplate: Record<string, unknown> = {
        ...(options?.meta ?? {}),
        policy: options?.policy,
        tags: options?.tags,
        trace: options?.trace,
        moduleId: scope.moduleId,
        instanceId: scope.instanceId,
      }

      const hasFiniteTemplateOpSeq =
        typeof metaTemplate.opSeq === 'number' && Number.isFinite(metaTemplate.opSeq)
      const runSessionLocal = Option.isSome(sessionOpt) ? sessionOpt.value.local : undefined
      const opSeqKey = (metaTemplate.instanceId as string | undefined) ?? 'global'
      const allocateOpSeq = runSessionLocal
        ? () => runSessionLocal.nextSeq('opSeq', opSeqKey)
        : undefined

      return {
        stack,
        hasMiddleware: true,
        metaTemplate,
        hasFiniteTemplateOpSeq,
        allocateOpSeq,
      }
    })

  const buildFlowOpMeta = (context: FlowOpRunContext): Record<string, unknown> => {
    if (context.hasFiniteTemplateOpSeq) {
      // Keep per-op meta isolation when caller provided a fixed opSeq.
      return { ...context.metaTemplate }
    }
    if (context.allocateOpSeq) {
      return {
        ...context.metaTemplate,
        opSeq: context.allocateOpSeq(),
      }
    }
    // No in-session opSeq allocation: share template and let EffectOp.make fill opSeq.
    return context.metaTemplate
  }

  const runAsFlowOp = <A, E, R2, V>(
    context: FlowOpRunContext,
    name: string,
    payload: V,
    eff: LogicEffect<Sh, R & R2, A, E>,
  ): LogicEffect<Sh, R & R2, A, E> => {
    if (!context.hasMiddleware) {
      return eff
    }
    return Effect.gen(function* () {
      flowBudgetRunSeq += 1
      const meta = withFlowRunBudgetMeta(name, buildFlowOpMeta(context), flowBudgetRunSeq)

      const op = EffectOp.make<A, E, any>({
        kind: 'flow',
        name,
        payload,
        effect: eff as any,
        meta,
      })
      return yield* EffectOp.run(op, context.stack)
    }) as any
  }

  const makeFlowOpMapper = <T, A, E, R2>(
    context: FlowOpRunContext,
    name: string,
    resolver: EffectResolver<T, Sh, R & R2, A, E>,
  ) => {
    if (!context.hasMiddleware) {
      return resolver
    }
    return (payload: T) => runAsFlowOp<A, E, R2, T>(context, name, payload, resolver(payload))
  }

  const runStreamWithMode =
    <T, A, E, R2>(
      mode: ModeRunner.ModeRunnerMode,
      name: 'flow.run' | 'flow.runParallel' | 'flow.runLatest' | 'flow.runExhaust',
      resolver: EffectResolver<T, Sh, R & R2, A, E>,
      options?: Logic.OperationOptions,
    ) =>
    (stream: Stream.Stream<T>): LogicEffect<Sh, R & R2, void, E> =>
      Effect.gen(function* () {
        const context = yield* makeFlowOpRunContext(options)
        const mapper = makeFlowOpMapper<T, A, E, R2>(context, name, resolver)
        const watcherResourceId = hotLifecycle
          ? `${hotLifecycle.owner.ownerId}::watcher:${scope.moduleId ?? 'unknown'}:${scope.instanceId ?? 'unknown'}:${++flowWatcherResourceSeq}`
          : undefined
        if (hotLifecycle && watcherResourceId) {
          hotLifecycle.register({
            resourceId: watcherResourceId,
            category: 'watcher',
            moduleId: scope.moduleId,
            moduleInstanceId: scope.instanceId,
          })
        }

        return yield* ModeRunner.runByMode<T, E, any>({
          stream,
          mode,
          run: (payload) =>
            hotLifecycle && !hotLifecycle.isCurrent()
              ? Effect.void
              : mapper(payload).pipe(
                  Effect.flatMap((value) => (hotLifecycle && !hotLifecycle.isCurrent() ? Effect.void : Effect.succeed(value))),
                ),
          resolveConcurrencyLimit: resolveConcurrencyLimit(),
          latest: {
            strategy: 'switch',
          },
        }).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              if (hotLifecycle && watcherResourceId) {
                hotLifecycle.owner.registry.markClosed(watcherResourceId)
              }
            }),
          ),
        )
      }) as any

  const runStreamParallelWithDiagnostics =
    <T, A, E, R2>(resolver: EffectResolver<T, Sh, R & R2, A, E>, options?: Logic.OperationOptions) =>
    (stream: Stream.Stream<T>): LogicEffect<Sh, R & R2, void, E> =>
      runStreamWithMode<T, A, E, R2>('parallel', 'flow.runParallel', resolver, options)(stream).pipe(
        Effect.catchCause((cause) =>
          Debug.record({
            type: 'diagnostic',
            moduleId: scope.moduleId,
            instanceId: scope.instanceId,
            code: 'flow::unhandled_failure',
            severity: 'error',
            message: 'Flow watcher (runParallel) failed with an unhandled error.',
            hint: 'Handle errors explicitly inside the watcher (catch/catchAll) or write back via TaskRunner failure; avoid silent failures.',
            kind: 'flow_unhandled_failure',
            trigger: {
              kind: 'flow',
              name: 'runParallel',
            },
          }).pipe(Effect.flatMap(() => Effect.failCause(cause)))),
      ) as any

  const fromState = <V>(
    selectorOrQuery: ((s: StateOf<Sh>) => V) | ReadQuery.ReadQuery<StateOf<Sh>, V>,
  ): Stream.Stream<V> => {
    const runtimeWithReadQueryMeta = hasChangesReadQueryWithMeta<StateOf<Sh>>(runtime)
      ? runtime
      : undefined

    if (ReadQuery.isReadQuery(selectorOrQuery)) {
      if (runtimeWithReadQueryMeta) {
        return runtimeWithReadQueryMeta.changesReadQueryWithMeta(selectorOrQuery).pipe(Stream.map((evt) => evt.value))
      }
      return runtime.changes(selectorOrQuery.select)
    }

    if (!runtimeWithReadQueryMeta) {
      return runtime.changes(selectorOrQuery)
    }

    const compiled = ReadQuery.compile(selectorOrQuery)
    if (compiled.lane === 'static') {
      return runtimeWithReadQueryMeta.changesReadQueryWithMeta(compiled).pipe(Stream.map((evt) => evt.value))
    }

    return runtime.changes(selectorOrQuery)
  }

  return {
    fromAction: <T extends ActionOf<Sh>>(predicate: (a: ActionOf<Sh>) => a is T) =>
      runtime.actions$.pipe(Stream.filter(predicate)),

    fromState,

    debounce: (ms: number) => (stream) => Stream.debounce(stream, ms),

    throttle: (ms: number) => (stream) =>
      Stream.throttle(stream, {
        cost: () => 1,
        units: 1,
        duration: ms,
        strategy: 'enforce',
      }),

    filter: (predicate: (value: any) => boolean) => (stream) => Stream.filter(stream, predicate),

    run: (effOrConfig: unknown, options?: Logic.OperationOptions) => (stream) => {
      const mode = isRunConfig<Sh, any, any, any, any>(effOrConfig) ? (effOrConfig.mode ?? 'task') : 'task'
      const resolvedOptions = isRunConfig<Sh, any, any, any, any>(effOrConfig) ? effOrConfig.options : options
      const effect = isRunConfig<Sh, any, any, any, any>(effOrConfig) ? effOrConfig.effect : effOrConfig
      const resolver = preResolveEffectResolver<any, Sh, any, any, any>(effect as any)
      if (mode === 'parallel') {
        return runStreamParallelWithDiagnostics<any, any, any, any>(resolver, resolvedOptions)(stream) as any
      }
      return runStreamWithMode<any, any, any, any>(
        mode,
        mode === 'latest' ? 'flow.runLatest' : mode === 'exhaust' ? 'flow.runExhaust' : 'flow.run',
        resolver,
        resolvedOptions,
      )(stream) as any
    },

    runParallel: (eff, options) => (stream) =>
      runStreamParallelWithDiagnostics<any, any, any, any>(
        preResolveEffectResolver<any, Sh, any, any, any>(eff),
        options,
      )(stream),

    runLatest: (eff, options) => (stream) =>
      runStreamWithMode<any, any, any, any>(
        'latest',
        'flow.runLatest',
        preResolveEffectResolver<any, Sh, any, any, any>(eff),
        options,
      )(stream),

    runExhaust: (eff, options) => (stream) =>
      runStreamWithMode<any, any, any, any>(
        'exhaust',
        'flow.runExhaust',
        preResolveEffectResolver<any, Sh, any, any, any>(eff),
        options,
      )(stream),
  }
}
