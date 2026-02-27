import { Effect, Stream, Option } from 'effect'
import type { AnyModuleShape, LogicEffect, ModuleRuntime, StateOf, ActionOf, ModuleShape } from './module.js'
import type * as Logic from './LogicMiddleware.js'
import * as EffectOp from '../../effect-op.js'
import * as EffectOpCore from './EffectOpCore.js'
import { RunSessionTag } from '../../observability/runSession.js'
import type { RuntimeInternals } from './RuntimeInternals.js'
import * as Debug from './DebugSink.js'
import * as ReadQuery from './ReadQuery.js'
import { makeRunBudgetEnvelopeV1, makeRunDegradeMarkerV1 } from './diagnosticsBudget.js'
import * as ModeRunner from './ModeRunner.js'
import { isDevEnv } from './env.js'

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

type LegacyRunAliasName = 'runParallel' | 'runLatest' | 'runExhaust'
type LegacyRunAliasMode = Exclude<ModeRunner.ModeRunnerMode, 'task'>

type EffectResolver<T, Sh extends AnyModuleShape, R, A, E> = (payload: T) => LogicEffect<Sh, R, A, E>

const FLOW_RUN_MODES = ['task', 'parallel', 'latest', 'exhaust'] as const
const FLOW_RUN_CONFIG_KEYS = ['effect', 'mode', 'options'] as const
const FLOW_RUN_CONFIG_KEY_SET: ReadonlySet<string> = new Set(FLOW_RUN_CONFIG_KEYS)
const INVALID_FLOW_RUN_CONFIG_MESSAGE =
  "[InvalidFlowRunConfig] run(config) expects { effect, mode?, options? }, and mode must be one of 'task' | 'parallel' | 'latest' | 'exhaust'."

interface CanonicalRunConfig<Sh extends AnyModuleShape, R, V, A = void, E = never> {
  readonly mode: ModeRunner.ModeRunnerMode
  readonly effect: LogicEffect<Sh, R, A, E> | ((payload: V) => LogicEffect<Sh, R, A, E>)
  readonly options?: Logic.OperationOptions
}

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
  const effect = candidate.effect
  if (effect == null) {
    return false
  }
  if (typeof effect !== 'function' && !Effect.isEffect(effect)) {
    return false
  }
  const mode = candidate.mode
  if (mode === undefined) {
    return true
  }
  return (FLOW_RUN_MODES as ReadonlyArray<string>).includes(mode as string)
}

const isRunConfigLike = (input: unknown): input is Record<string, unknown> => {
  if (!input || typeof input !== 'object') {
    return false
  }
  return FLOW_RUN_CONFIG_KEYS.some((key) => key in input)
}

const toCanonicalRunConfigOrThrow = <Sh extends AnyModuleShape, R, T, A, E>(
  effOrConfig:
    | RunConfig<Sh, R, T, A, E>
    | LogicEffect<Sh, R, A, E>
    | ((payload: T) => LogicEffect<Sh, R, A, E>),
  options?: Logic.OperationOptions,
): CanonicalRunConfig<Sh, R, T, A, E> => {
  if (!isRunConfigLike(effOrConfig)) {
    return {
      mode: 'task',
      effect: effOrConfig as LogicEffect<Sh, R, A, E> | ((payload: T) => LogicEffect<Sh, R, A, E>),
      options,
    }
  }

  if (options !== undefined) {
    throw new Error(`${INVALID_FLOW_RUN_CONFIG_MESSAGE} Put options inside config.options; do not pass a second argument.`)
  }

  const unknownKeys = Object.keys(effOrConfig).filter((key) => !FLOW_RUN_CONFIG_KEY_SET.has(key))
  if (unknownKeys.length > 0) {
    throw new Error(`${INVALID_FLOW_RUN_CONFIG_MESSAGE} Unknown keys: ${unknownKeys.join(', ')}.`)
  }

  if (!isRunConfig<Sh, R, T, A, E>(effOrConfig)) {
    throw new Error(INVALID_FLOW_RUN_CONFIG_MESSAGE)
  }

  return {
    mode: effOrConfig.mode ?? 'task',
    effect: effOrConfig.effect,
    options: effOrConfig.options,
  }
}

export const make = <Sh extends AnyModuleShape, R = never>(
  runtime: ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
  runtimeInternals?: RuntimeInternals,
): Api<Sh, R> => {
  let flowBudgetRunSeq = 0
  const scope = getRuntimeScope(runtime)
  const resolveConcurrencyLimit = (): Effect.Effect<number | 'unbounded', never, any> =>
    runtimeInternals
      ? runtimeInternals.concurrency.resolveConcurrencyPolicy().pipe(Effect.map((p) => p.concurrencyLimit))
      : Effect.succeed(16)

  const emitLegacyRunAliasDiagnostic = (
    aliasName: LegacyRunAliasName,
    mode: LegacyRunAliasMode,
  ): Effect.Effect<void, never, any> => {
    if (!isDevEnv()) {
      return Effect.void
    }

    return Debug.record({
      type: 'diagnostic',
      moduleId: scope.moduleId,
      instanceId: scope.instanceId,
      code: 'flow::legacy_run_alias',
      severity: 'warning',
      message: `Flow alias ${aliasName} is compatibility-only and delegates to run({ mode: '${mode}', effect, options }).`,
      hint: 'run(config) is the canonical execution entry. Legacy run* aliases emit migration diagnostics only and will be removed.',
      kind: 'flow_legacy_run_alias',
      trigger: {
        kind: 'flow',
        name: aliasName,
        details: {
          mode,
          canonicalEntry: 'run(config)',
          semanticOwner: 'run(config)',
        },
      },
    })
  }

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

        return yield* ModeRunner.runByMode<T, E, any>({
          stream,
          mode,
          run: mapper,
          resolveConcurrencyLimit: resolveConcurrencyLimit(),
          latest: {
            strategy: 'switch',
          },
        })
      }) as any

  const runStreamParallelWithDiagnostics =
    <T, A, E, R2>(resolver: EffectResolver<T, Sh, R & R2, A, E>, options?: Logic.OperationOptions) =>
    (stream: Stream.Stream<T>): LogicEffect<Sh, R & R2, void, E> =>
      runStreamWithMode<T, A, E, R2>('parallel', 'flow.runParallel', resolver, options)(stream).pipe(
        Effect.catchAllCause((cause) =>
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
          }).pipe(Effect.zipRight(Effect.failCause(cause))),
        ),
      ) as any

  const executeCanonicalRun =
    <T, A, E, R2>(config: CanonicalRunConfig<Sh, R & R2, T, A, E>) =>
    (stream: Stream.Stream<T>): LogicEffect<Sh, R & R2, void, E> => {
      const resolver = preResolveEffectResolver<T, Sh, R & R2, A, E>(config.effect)
      if (config.mode === 'parallel') {
        return runStreamParallelWithDiagnostics<T, A, E, R2>(resolver, config.options)(stream) as any
      }
      return runStreamWithMode<T, A, E, R2>(
        config.mode,
        config.mode === 'latest' ? 'flow.runLatest' : config.mode === 'exhaust' ? 'flow.runExhaust' : 'flow.run',
        resolver,
        config.options,
      )(stream) as any
    }

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

  function runWithConfig<T, A = void, E = never, R2 = unknown>(
    eff: LogicEffect<Sh, R & R2, A, E> | ((payload: T) => LogicEffect<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ): (stream: Stream.Stream<T>) => LogicEffect<Sh, R & R2, void, E>
  function runWithConfig<T, A = void, E = never, R2 = unknown>(
    config: RunConfig<Sh, R & R2, T, A, E>,
  ): (stream: Stream.Stream<T>) => LogicEffect<Sh, R & R2, void, E>
  function runWithConfig<T, A = void, E = never, R2 = unknown>(
    effOrConfig:
      | RunConfig<Sh, R & R2, T, A, E>
      | LogicEffect<Sh, R & R2, A, E>
      | ((payload: T) => LogicEffect<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ): (stream: Stream.Stream<T>) => LogicEffect<Sh, R & R2, void, E> {
    return executeCanonicalRun<T, A, E, R2>(toCanonicalRunConfigOrThrow<Sh, R & R2, T, A, E>(effOrConfig, options))
  }

  const runLegacyAlias =
    <T, A, E, R2>(
      aliasName: LegacyRunAliasName,
      mode: LegacyRunAliasMode,
      eff: LogicEffect<Sh, R & R2, A, E> | ((payload: T) => LogicEffect<Sh, R & R2, A, E>),
      options?: Logic.OperationOptions,
    ) =>
    (stream: Stream.Stream<T>): LogicEffect<Sh, R & R2, void, E> =>
      Effect.zipRight(
        emitLegacyRunAliasDiagnostic(aliasName, mode),
        executeCanonicalRun<T, A, E, R2>({
          mode,
          effect: eff,
          options,
        })(stream),
      ) as any

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

    run: runWithConfig,

    runParallel: (eff, options) => runLegacyAlias('runParallel', 'parallel', eff, options),

    runLatest: (eff, options) => runLegacyAlias('runLatest', 'latest', eff, options),

    runExhaust: (eff, options) => runLegacyAlias('runExhaust', 'exhaust', eff, options),
  }
}
