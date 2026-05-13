import { Effect, Stream } from 'effect'
import type * as Logix from './module.js'
import * as Logic from './LogicMiddleware.js'
import * as TaskRunner from './TaskRunner.js'
import { mutateWithPatchPaths } from './mutativePatches.js'
import * as FlowRuntime from './FlowRuntime.js'
import type { RuntimeInternals } from './RuntimeInternals.js'
import type { AnyModuleShape, ActionOf, ModuleRuntime, StateOf } from './module.js'
import { getDirectStateWriteMetadata } from './BoundApiRuntime.directStateWrite.js'

export const makeLogicBuilderFactory = <Sh extends AnyModuleShape, R = never>(
  runtime: ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
  runtimeInternals: RuntimeInternals,
) => {
  const flowApi = FlowRuntime.make<Sh, R>(runtime, runtimeInternals)

  return <T>(stream: Stream.Stream<T>, triggerName?: string): Logic.IntentBuilder<T, Sh, R> => {
    const runWithStateTransaction: TaskRunner.TaskRunnerRuntime['runWithStateTransaction'] = (origin, body) =>
      runtimeInternals.txn.runWithStateTransaction(origin as any, body)

    const taskRunnerRuntime: TaskRunner.TaskRunnerRuntime = {
      moduleId: runtime.moduleId,
      instanceId: runtimeInternals.instanceId,
      hotLifecycle: runtimeInternals.hotLifecycle,
      runWithStateTransaction,
      resolveConcurrencyPolicy: runtimeInternals.concurrency.resolveConcurrencyPolicy,
    }

    const builder = {
      debounce: (ms: number) =>
        makeLogicBuilderFactory<Sh, R>(runtime, runtimeInternals)(flowApi.debounce<T>(ms)(stream), triggerName),
      throttle: (ms: number) =>
        makeLogicBuilderFactory<Sh, R>(runtime, runtimeInternals)(flowApi.throttle<T>(ms)(stream), triggerName),
      filter: (predicate: (value: T) => boolean) =>
        makeLogicBuilderFactory<Sh, R>(runtime, runtimeInternals)(flowApi.filter(predicate)(stream), triggerName),
      map: <U>(f: (value: T) => U) =>
        makeLogicBuilderFactory<Sh, R>(runtime, runtimeInternals)(stream.pipe(Stream.map(f)), triggerName),
      run<A = void, E = never, R2 = unknown>(
        eff: Logic.Of<Sh, R & R2, A, E> | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
        options?: Logic.OperationOptions,
      ): Logic.Of<Sh, R & R2, void, E> {
        return flowApi.run<T, A, E, R2>(eff, options)(stream)
      },
      runLatest<A = void, E = never, R2 = unknown>(
        eff: Logic.Of<Sh, R & R2, A, E> | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
        options?: Logic.OperationOptions,
      ): Logic.Of<Sh, R & R2, void, E> {
        return flowApi.runLatest<T, A, E, R2>(eff, options)(stream)
      },
      runExhaust<A = void, E = never, R2 = unknown>(
        eff: Logic.Of<Sh, R & R2, A, E> | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
        options?: Logic.OperationOptions,
      ): Logic.Of<Sh, R & R2, void, E> {
        return flowApi.runExhaust<T, A, E, R2>(eff, options)(stream)
      },
      runParallel<A = void, E = never, R2 = unknown>(
        eff: Logic.Of<Sh, R & R2, A, E> | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
        options?: Logic.OperationOptions,
      ): Logic.Of<Sh, R & R2, void, E> {
        return flowApi.runParallel<T, A, E, R2>(eff, options)(stream)
      },
      runFork: <A = void, E = never, R2 = unknown>(
        eff: Logic.Of<Sh, R & R2, A, E> | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
      ): Logic.Of<Sh, R & R2, void, E> => {
        if (runtimeInternals && triggerName && typeof eff !== 'function' && getDirectStateWriteMetadata<Sh>(eff) != null) {
          return Effect.sync(() => {
            const metadata = getDirectStateWriteMetadata<Sh>(eff)!
            runtimeInternals.txn.registerActionStateWriteback(
              triggerName,
              metadata.kind === 'update'
                ? ({ kind: 'update', run: metadata.run } as any)
                : ({ kind: 'mutate', run: metadata.run } as any),
            )
          }) as Logic.Of<Sh, R & R2, void, E>
        }
        return Effect.forkScoped(flowApi.run<T, A, E, R2>(eff)(stream)).pipe(Effect.asVoid) as Logic.Of<
          Sh,
          R & R2,
          void,
          E
        >
      },
      runParallelFork: <A = void, E = never, R2 = unknown>(
        eff: Logic.Of<Sh, R & R2, A, E> | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
      ): Logic.Of<Sh, R & R2, void, E> => {
        if (runtimeInternals && triggerName && typeof eff !== 'function' && getDirectStateWriteMetadata<Sh>(eff) != null) {
          return Effect.sync(() => {
            const metadata = getDirectStateWriteMetadata<Sh>(eff)!
            runtimeInternals.txn.registerActionStateWriteback(
              triggerName,
              metadata.kind === 'update'
                ? ({ kind: 'update', run: metadata.run } as any)
                : ({ kind: 'mutate', run: metadata.run } as any),
            )
          }) as Logic.Of<Sh, R & R2, void, E>
        }
        return Effect.forkScoped(flowApi.runParallel<T, A, E, R2>(eff)(stream)).pipe(Effect.asVoid) as Logic.Of<
          Sh,
          R & R2,
          void,
          E
        >
      },
      runTask: <A = void, E = never, R2 = unknown>(
        config: TaskRunner.TaskRunnerConfig<T, Sh, R & R2, A, E>,
      ): Logic.Of<Sh, R & R2, void, never> =>
        TaskRunner.makeTaskRunner<T, Sh, R & R2, A, E>(stream, 'task', taskRunnerRuntime, {
          ...config,
          triggerName: config.triggerName ?? triggerName,
        }) as Logic.Of<Sh, R & R2, void, never>,
      runParallelTask: <A = void, E = never, R2 = unknown>(
        config: TaskRunner.TaskRunnerConfig<T, Sh, R & R2, A, E>,
      ): Logic.Of<Sh, R & R2, void, never> =>
        TaskRunner.makeTaskRunner<T, Sh, R & R2, A, E>(stream, 'parallel', taskRunnerRuntime, {
          ...config,
          triggerName: config.triggerName ?? triggerName,
        }) as Logic.Of<Sh, R & R2, void, never>,
      runLatestTask: <A = void, E = never, R2 = unknown>(
        config: TaskRunner.TaskRunnerConfig<T, Sh, R & R2, A, E>,
      ): Logic.Of<Sh, R & R2, void, never> =>
        TaskRunner.makeTaskRunner<T, Sh, R & R2, A, E>(stream, 'latest', taskRunnerRuntime, {
          ...config,
          triggerName: config.triggerName ?? triggerName,
        }) as Logic.Of<Sh, R & R2, void, never>,
      runExhaustTask: <A = void, E = never, R2 = unknown>(
        config: TaskRunner.TaskRunnerConfig<T, Sh, R & R2, A, E>,
      ): Logic.Of<Sh, R & R2, void, never> =>
        TaskRunner.makeTaskRunner<T, Sh, R & R2, A, E>(stream, 'exhaust', taskRunnerRuntime, {
          ...config,
          triggerName: config.triggerName ?? triggerName,
        }) as Logic.Of<Sh, R & R2, void, never>,
      toStream: () => stream,
      update: (
        reducer: (prev: StateOf<Sh>, payload: T) => StateOf<Sh> | Effect.Effect<StateOf<Sh>, any, any>,
      ): Logic.Of<Sh, R, void, never> =>
        Stream.runForEach(stream, (payload) =>
          taskRunnerRuntime.runWithStateTransaction(
            {
              kind: 'watcher:update',
              name: triggerName,
            },
            () =>
              Effect.gen(function* () {
                const prev = (yield* runtime.getState) as StateOf<Sh>
                const next = reducer(prev, payload)
                if (Effect.isEffect(next)) {
                  const exit = yield* Effect.exit(next as Effect.Effect<StateOf<Sh>, any, any>)
                  if (exit._tag === 'Failure') {
                    yield* Effect.logError('Flow error', exit.cause)
                    return
                  }
                  yield* runtime.setState(exit.value as StateOf<Sh>)
                  return
                }
                yield* runtime.setState(next as StateOf<Sh>)
              }),
          ),
        ).pipe(Effect.catchCause((cause) => Effect.logError('Flow error', cause))) as Logic.Of<Sh, R, void, never>,
      mutate: (reducer: (draft: Logic.Draft<StateOf<Sh>>, payload: T) => void): Logic.Of<Sh, R, void, never> =>
        Stream.runForEach(stream, (payload) =>
          taskRunnerRuntime.runWithStateTransaction(
            {
              kind: 'watcher:mutate',
              name: triggerName,
            },
            () =>
              Effect.gen(function* () {
                const prev = (yield* runtime.getState) as StateOf<Sh>
                const recordPatch = runtimeInternals.txn.recordStatePatch
                const updateDraft = runtimeInternals.txn.updateDraft

                const { nextState, patchPaths } = mutateWithPatchPaths(prev as StateOf<Sh>, (draft) => {
                  reducer(draft as Logic.Draft<StateOf<Sh>>, payload)
                })

                for (const path of patchPaths) {
                  recordPatch(path, 'unknown')
                }

                updateDraft(nextState)
              }),
          ),
        ).pipe(Effect.catchCause((cause) => Effect.logError('Flow error', cause))) as Logic.Of<Sh, R, void, never>,
    } as Omit<Logic.IntentBuilder<T, Sh, R>, 'pipe'>

    const pipe: Logic.IntentBuilder<T, Sh, R>['pipe'] = function (this: unknown) {
      // eslint-disable-next-line prefer-rest-params
      const fns = arguments as unknown as ReadonlyArray<
        (self: Logic.IntentBuilder<T, Sh, R>) => Logic.IntentBuilder<T, Sh, R>
      >
      let acc: Logic.IntentBuilder<T, Sh, R> = builder as Logic.IntentBuilder<T, Sh, R>
      for (let i = 0; i < fns.length; i++) {
        acc = fns[i](acc)
      }
      return acc
    }

    return Object.assign(builder, { pipe }) as Logic.IntentBuilder<T, Sh, R>
  }
}
