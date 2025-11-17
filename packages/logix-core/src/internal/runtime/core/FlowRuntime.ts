import { Effect, Stream, Ref, Option } from 'effect'
import type { AnyModuleShape, ModuleRuntime, StateOf, ActionOf, ModuleShape } from './module.js'
import type * as Logic from './LogicMiddleware.js'
import * as EffectOp from '../../effect-op.js'
import * as EffectOpCore from './EffectOpCore.js'
import { RunSessionTag } from '../../observability/runSession.js'
import type { RuntimeInternals } from './RuntimeInternals.js'
import * as Debug from './DebugSink.js'
import * as ReadQuery from './ReadQuery.js'

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

export interface Api<Sh extends ModuleShape<any, any>, R = never> {
  readonly fromAction: <T extends ActionOf<Sh>>(predicate: (a: ActionOf<Sh>) => a is T) => Stream.Stream<T>

  readonly fromState: {
    <V>(selector: (s: StateOf<Sh>) => V): Stream.Stream<V>
    <V>(query: ReadQuery.ReadQuery<StateOf<Sh>, V>): Stream.Stream<V>
  }

  readonly debounce: <V>(ms: number) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly throttle: <V>(ms: number) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly filter: <V>(predicate: (value: V) => boolean) => (stream: Stream.Stream<V>) => Stream.Stream<V>

  readonly run: <V, A = void, E = never, R2 = unknown>(
    eff: Logic.Of<Sh, R & R2, A, E> | ((payload: V) => Logic.Of<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, Logic.Env<Sh, R & R2>>

  readonly runParallel: <V, A = void, E = never, R2 = unknown>(
    eff: Logic.Of<Sh, R & R2, A, E> | ((payload: V) => Logic.Of<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, Logic.Env<Sh, R & R2>>

  readonly runLatest: <V, A = void, E = never, R2 = unknown>(
    eff: Logic.Of<Sh, R & R2, A, E> | ((payload: V) => Logic.Of<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, Logic.Env<Sh, R & R2>>

  readonly runExhaust: <V, A = void, E = never, R2 = unknown>(
    eff: Logic.Of<Sh, R & R2, A, E> | ((payload: V) => Logic.Of<Sh, R & R2, A, E>),
    options?: Logic.OperationOptions,
  ) => (stream: Stream.Stream<V>) => Effect.Effect<void, E, Logic.Env<Sh, R & R2>>
}

const resolveEffect = <T, Sh extends AnyModuleShape, R, A, E>(
  eff: Logic.Of<Sh, R, A, E> | ((payload: T) => Logic.Of<Sh, R, A, E>),
  payload: T,
): Logic.Of<Sh, R, A, E> => (typeof eff === 'function' ? (eff as (p: T) => Logic.Of<Sh, R, A, E>)(payload) : eff)

export const make = <Sh extends AnyModuleShape, R = never>(
  runtime: ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
  runtimeInternals?: RuntimeInternals,
): Api<Sh, R> => {
  const scope = getRuntimeScope(runtime)
  const resolveConcurrencyLimit = (): Effect.Effect<number | 'unbounded', never, any> =>
    runtimeInternals
      ? runtimeInternals.concurrency.resolveConcurrencyPolicy().pipe(Effect.map((p) => p.concurrencyLimit))
      : Effect.succeed(16)

  const runAsFlowOp = <A, E, R2, V>(
    name: string,
    payload: V,
    eff: Effect.Effect<A, E, Logic.Env<Sh, R & R2>>,
    options?: Logic.OperationOptions,
  ): Effect.Effect<A, E, Logic.Env<Sh, R & R2>> =>
    Effect.gen(function* () {
      const stack = yield* getMiddlewareStack()
      const meta: any = {
        ...(options?.meta ?? {}),
        policy: options?.policy,
        tags: options?.tags,
        trace: options?.trace,
        moduleId: scope.moduleId,
        instanceId: scope.instanceId,
      }

      if (!(typeof meta.opSeq === 'number' && Number.isFinite(meta.opSeq))) {
        const sessionOpt = yield* Effect.serviceOption(RunSessionTag)
        if (Option.isSome(sessionOpt)) {
          const key = meta.instanceId ?? 'global'
          meta.opSeq = sessionOpt.value.local.nextSeq('opSeq', key)
        }
      }

      const op = EffectOp.make<A, E, any>({
        kind: 'flow',
        name,
        payload,
        effect: eff as any,
        meta,
      })
      return yield* EffectOp.run(op, stack)
    }) as any

  const runEffect =
    <T, A, E, R2>(eff: Logic.Of<Sh, R & R2, A, E> | ((payload: T) => Logic.Of<Sh, R & R2, A, E>)) =>
    (payload: T) =>
      resolveEffect<T, Sh, R & R2, A, E>(eff, payload)

  const runStreamSequential =
    <T, A, E, R2>(
      eff: Logic.Of<Sh, R & R2, A, E> | ((payload: T) => Logic.Of<Sh, R & R2, A, E>),
      options?: Logic.OperationOptions,
    ) =>
    (stream: Stream.Stream<T>): Effect.Effect<void, E, Logic.Env<Sh, R & R2>> =>
      Stream.runForEach(stream, (payload) =>
        runAsFlowOp<A, E, R2, T>('flow.run', payload, runEffect<T, A, E, R2>(eff)(payload), options),
      )

  const runStreamParallel =
    <T, A, E, R2>(
      eff: Logic.Of<Sh, R & R2, A, E> | ((payload: T) => Logic.Of<Sh, R & R2, A, E>),
      options?: Logic.OperationOptions,
    ) =>
    (stream: Stream.Stream<T>): Effect.Effect<void, E, Logic.Env<Sh, R & R2>> =>
      Effect.gen(function* () {
        const concurrency = yield* resolveConcurrencyLimit()

        return yield* Stream.runDrain(
          stream.pipe(
            Stream.mapEffect(
              (payload) =>
                runAsFlowOp<A, E, R2, T>('flow.runParallel', payload, runEffect<T, A, E, R2>(eff)(payload), options),
              { concurrency },
            ),
          ),
        ).pipe(
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
        )
      }) as any

  return {
    fromAction: <T extends ActionOf<Sh>>(predicate: (a: ActionOf<Sh>) => a is T) =>
      runtime.actions$.pipe(Stream.filter(predicate)),

    fromState: <V>(selectorOrQuery: ((s: StateOf<Sh>) => V) | ReadQuery.ReadQuery<StateOf<Sh>, V>) =>
      runtime.changes(ReadQuery.isReadQuery(selectorOrQuery) ? selectorOrQuery.select : selectorOrQuery),

    debounce: (ms: number) => (stream) => Stream.debounce(stream, ms),

    throttle: (ms: number) => (stream) =>
      Stream.throttle(stream, {
        cost: () => 1,
        units: 1,
        duration: ms,
        strategy: 'enforce',
      }),

    filter: (predicate: (value: any) => boolean) => (stream) => Stream.filter(stream, predicate),

    run: (eff, options) => (stream) => runStreamSequential<any, any, any, any>(eff, options)(stream),

    runParallel: (eff, options) => (stream) => runStreamParallel<any, any, any, any>(eff, options)(stream),

    runLatest: (eff, options) => (stream) =>
      Stream.runDrain(
        Stream.map(stream, (payload) =>
          runAsFlowOp<any, any, any, any>(
            'flow.runLatest',
            payload,
            runEffect<any, any, any, any>(eff)(payload),
            options,
          ),
        ).pipe(
          Stream.flatMap((effect) => Stream.fromEffect(effect), {
            switch: true,
          }),
        ),
      ),

    runExhaust: (eff, options) => (stream) =>
      Effect.gen(function* () {
        const concurrency = yield* resolveConcurrencyLimit()
        const busyRef = yield* Ref.make(false)
        const mapper = (payload: any) =>
          Effect.gen(function* () {
            const acquired = yield* Ref.modify(busyRef, (busy) =>
              busy ? ([false, busy] as const) : ([true, true] as const),
            )
            if (!acquired) {
              return
            }
            try {
              yield* runAsFlowOp<any, any, any, any>(
                'flow.runExhaust',
                payload,
                runEffect<any, any, any, any>(eff)(payload),
                options,
              )
            } finally {
              yield* Ref.set(busyRef, false)
            }
          })

        return yield* Stream.runDrain(stream.pipe(Stream.mapEffect(mapper, { concurrency })))
      }),
  }
}
