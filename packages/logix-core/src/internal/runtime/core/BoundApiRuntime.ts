import { Context, Effect, FiberRef, Option, Schema, Stream, SubscriptionRef } from 'effect'
import { create } from 'mutative'
import type * as Logix from './module.js'
import * as Logic from './LogicMiddleware.js'
import * as Action from '../../action.js'
import * as TaskRunner from './TaskRunner.js'
import { mutateWithPatchPaths } from './mutativePatches.js'
import * as FlowRuntime from './FlowRuntime.js'
import * as MatchBuilder from './MatchBuilder.js'
import * as Platform from './Platform.js'
import * as Lifecycle from './Lifecycle.js'
import * as Debug from './DebugSink.js'
import * as LogicDiagnostics from './LogicDiagnostics.js'
import { isDevEnv } from './env.js'
import { RunSessionTag } from '../../observability/runSession.js'
import * as Root from '../../root.js'
import type { RuntimeInternals } from './RuntimeInternals.js'
import type * as ModuleTraits from './ModuleTraits.js'
import { getRuntimeInternals, setBoundInternals } from './runtimeInternalsAccessor.js'
import type { AnyModuleShape, ModuleRuntime, StateOf, ActionOf } from './module.js'

// Local IntentBuilder factory; equivalent to the old internal/dsl/LogicBuilder.makeIntentBuilderFactory.
const LogicBuilderFactory = <Sh extends AnyModuleShape, R = never>(
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
      runWithStateTransaction,
      resolveConcurrencyPolicy: runtimeInternals.concurrency.resolveConcurrencyPolicy,
    }

    const builder = {
      debounce: (ms: number) =>
        LogicBuilderFactory<Sh, R>(runtime, runtimeInternals)(flowApi.debounce<T>(ms)(stream), triggerName),
      throttle: (ms: number) =>
        LogicBuilderFactory<Sh, R>(runtime, runtimeInternals)(flowApi.throttle<T>(ms)(stream), triggerName),
      filter: (predicate: (value: T) => boolean) =>
        LogicBuilderFactory<Sh, R>(runtime, runtimeInternals)(flowApi.filter(predicate)(stream), triggerName),
      map: <U>(f: (value: T) => U) =>
        LogicBuilderFactory<Sh, R>(runtime, runtimeInternals)(stream.pipe(Stream.map(f)), triggerName),
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
      ): Logic.Of<Sh, R & R2, void, E> =>
        Effect.forkScoped(flowApi.run<T, A, E, R2>(eff)(stream)).pipe(Effect.asVoid) as Logic.Of<Sh, R & R2, void, E>,
      runParallelFork: <A = void, E = never, R2 = unknown>(
        eff: Logic.Of<Sh, R & R2, A, E> | ((p: T) => Logic.Of<Sh, R & R2, A, E>),
      ): Logic.Of<Sh, R & R2, void, E> =>
        Effect.forkScoped(flowApi.runParallel<T, A, E, R2>(eff)(stream)).pipe(Effect.asVoid) as Logic.Of<
          Sh,
          R & R2,
          void,
          E
        >,
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
        ).pipe(Effect.catchAllCause((cause) => Effect.logError('Flow error', cause))) as Logic.Of<Sh, R, void, never>,
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
        ).pipe(Effect.catchAllCause((cause) => Effect.logError('Flow error', cause))) as Logic.Of<Sh, R, void, never>,
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
import type { BoundApi } from './module.js'

/**
 * BoundApi implementation: creates a pre-bound `$` for a given Store shape + runtime.
 *
 * Note: public types and entrypoint signatures live in api/BoundApi.ts; this file only hosts the implementation.
 */
export function make<Sh extends Logix.AnyModuleShape, R = never>(
  shape: Sh,
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
  options?: {
    readonly getPhase?: () => 'setup' | 'run'
    readonly phaseService?: LogicDiagnostics.LogicPhaseService
    readonly moduleId?: string
    readonly logicUnit?: LogicDiagnostics.LogicUnitService
  },
): BoundApi<Sh, R> {
  const runtimeInternals = getRuntimeInternals(runtime as any)

  const getPhase = options?.getPhase ?? (() => 'run')
  const getCurrentPhase = (): 'setup' | 'run' => {
    const phaseService = options?.phaseService
    const phase = phaseService?.current ?? getPhase()
    return phase === 'setup' ? 'setup' : 'run'
  }
  const guardRunOnly = (kind: string, api: string) => {
    const phaseService = options?.phaseService
    const phase = phaseService?.current ?? getPhase()
    if (phase === 'setup') {
      throw LogicDiagnostics.makeLogicPhaseError(kind, api, 'setup', options?.moduleId)
    }
  }
  const flowApi = FlowRuntime.make<Sh, R>(runtime, runtimeInternals)

  const makeIntentBuilder = (runtime_: Logix.ModuleRuntime<any, any>) =>
    LogicBuilderFactory<Sh, R>(runtime_, runtimeInternals)
  const withLifecycle = <A>(
    available: (manager: Lifecycle.LifecycleManager) => Effect.Effect<A, never, any>,
    missing: () => Effect.Effect<A, never, any>,
  ) =>
    Effect.serviceOption(Lifecycle.LifecycleContext).pipe(
      Effect.flatMap((maybe) =>
        Option.match(maybe, {
          onSome: available,
          onNone: missing,
        }),
      ),
    )
  const withPlatform = (invoke: (platform: Platform.Service) => Effect.Effect<void, never, any>) =>
    Effect.serviceOption(Platform.Tag).pipe(
      Effect.flatMap((maybe) =>
        Option.match(maybe, {
          onSome: invoke,
          onNone: () => Effect.void,
        }),
      ),
    )

  const emitSetupOnlyViolation = (api: string): Effect.Effect<void> =>
    Debug.record({
      type: 'diagnostic',
      moduleId: runtime.moduleId,
      instanceId: runtime.instanceId,
      code: 'logic::invalid_phase',
      severity: 'error',
      message: `${api} is setup-only and is not allowed in run phase.`,
      hint:
        'Move $.lifecycle.* calls to the synchronous part of Module.logic builder (before return) for registration; ' +
        'for dynamic resource cleanup in the run phase, use Effect.acquireRelease / Scope finalizer instead of registering onDestroy late.',
      kind: 'lifecycle_in_run',
    })

  const createIntentBuilder = <T>(stream: Stream.Stream<T>, triggerName?: string) =>
    makeIntentBuilder(runtime)(stream, triggerName)

  const onceInRunSession = (key: string): Effect.Effect<boolean, never, any> =>
    Effect.serviceOption(RunSessionTag).pipe(
      Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.local.once(key) : true)),
    )

  let cachedDiagnosticsLevel: Debug.DiagnosticsLevel | undefined

  const isModuleLike = (
    value: unknown,
  ): value is {
    readonly _kind: 'ModuleDef' | 'Module'
    readonly id: string
    readonly tag: Context.Tag<any, Logix.ModuleRuntime<any, any>>
    readonly schemas?: Record<string, unknown>
    readonly meta?: Record<string, unknown>
    readonly dev?: { readonly source?: { readonly file: string; readonly line: number; readonly column: number } }
  } =>
    Boolean(
      value &&
      typeof value === 'object' &&
      ((value as any)._kind === 'ModuleDef' || (value as any)._kind === 'Module') &&
      'tag' in (value as object) &&
      Context.isTag((value as any).tag),
    )

  const buildModuleHandle = (
    tag: Context.Tag<any, Logix.ModuleRuntime<any, any>>,
    rt: Logix.ModuleRuntime<any, any>,
  ): unknown => {
    const actionsProxy: Logix.ModuleHandle<any>['actions'] = new Proxy(
      {},
      {
        get: (_target, prop) => (payload: unknown) =>
          rt.dispatch({
            _tag: prop as string,
            payload,
          }),
      },
    ) as Logix.ModuleHandle<any>['actions']

    const handle: Logix.ModuleHandle<any> = {
      read: (selector) => Effect.map(rt.getState, selector),
      changes: rt.changes,
      dispatch: rt.dispatch,
      actions$: rt.actions$,
      actions: actionsProxy,
    }

    const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
    const extend = (tag as any)?.[EXTEND_HANDLE] as
      | ((runtime: Logix.ModuleRuntime<any, any>, base: Logix.ModuleHandle<any>) => unknown)
      | undefined

    return typeof extend === 'function' ? (extend(rt, handle) ?? handle) : handle
  }

  const emitModuleDescriptorOnce = (
    module: {
      readonly id: string
      readonly tag: any
      readonly schemas?: Record<string, unknown>
      readonly meta?: Record<string, unknown>
      readonly dev?: { readonly source?: { readonly file: string; readonly line: number; readonly column: number } }
    },
    rt: Logix.ModuleRuntime<any, any>,
  ): Effect.Effect<void, never, any> =>
    Effect.gen(function* () {
      // Hot-path guard: never emit events when diagnostics are off.
      if (cachedDiagnosticsLevel === 'off') return

      const key = `module_descriptor:${String(rt.instanceId ?? 'unknown')}`
      const shouldEmit = yield* onceInRunSession(key)
      if (!shouldEmit) return

      const actionKeys = Object.keys((module.tag as any)?.shape?.actionMap ?? {})

      const internalSymbol = Symbol.for('logix.module.internal')
      const internal = (module as any)[internalSymbol] as { readonly mounted?: ReadonlyArray<any> } | undefined

      const logicUnits = (internal?.mounted ?? []).map((u: any) => ({
        kind: String(u?.kind ?? 'user'),
        id: String(u?.id ?? ''),
        derived: u?.derived ? true : undefined,
        name: typeof u?.name === 'string' ? u.name : undefined,
      }))

      const schemaKeys = module.schemas && typeof module.schemas === 'object' ? Object.keys(module.schemas) : undefined

      const meta = module.meta && typeof module.meta === 'object' ? module.meta : undefined

      const source = module.dev?.source

      const traitsSnapshot = runtimeInternals.traits.getModuleTraitsSnapshot()
      const traits = traitsSnapshot
        ? {
            digest: traitsSnapshot.digest,
            count: traitsSnapshot.traits.length,
          }
        : undefined

      const data = {
        id: module.id,
        moduleId: String(rt.moduleId),
        instanceId: String(rt.instanceId),
        actionKeys,
        logicUnits,
        schemaKeys,
        meta,
        source,
        traits,
      }

      yield* Debug.record({
        type: 'trace:module:descriptor',
        moduleId: rt.moduleId,
        instanceId: rt.instanceId,
        data,
      } as any)
    })

  /**
   * strict: resolve a Module runtime only from the current Effect environment.
   *
   * Notes:
   * - With multiple roots / instances, any process-wide registry cannot express the correct semantics.
   * - A missing provider is a wiring error: fail deterministically and provide actionable hints (more details in dev/test).
   */
  const resolveModuleRuntime = (
    tag: Context.Tag<any, Logix.ModuleRuntime<any, any>>,
  ): Effect.Effect<Logix.ModuleRuntime<any, any>, never, any> =>
    Effect.gen(function* () {
      const requestedModuleId = typeof (tag as any)?.id === 'string' ? ((tag as any).id as string) : undefined
      const fromModuleId = typeof options?.moduleId === 'string' ? options.moduleId : runtime.moduleId

      // self: always allow resolving the current ModuleRuntime (both Bound.make and runtime injection paths).
      if (requestedModuleId && requestedModuleId === runtime.moduleId) {
        return runtime as unknown as Logix.ModuleRuntime<any, any>
      }

      const fromImports = runtimeInternals.imports.get(tag as unknown as Context.Tag<any, any>)
      if (fromImports) {
        return fromImports as unknown as Logix.ModuleRuntime<any, any>
      }

      // Bound.make (no moduleId context): allow resolving from the current Effect env (useful for tests/scaffolding).
      if (typeof options?.moduleId !== 'string') {
        const fromEnv = yield* Effect.serviceOption(tag as any)
        if (Option.isSome(fromEnv)) {
          return fromEnv.value as unknown as Logix.ModuleRuntime<any, any>
        }
      }

      // 2) Not found: die immediately — this is a wiring error; guide the caller to fix the composition.
      const tokenId = requestedModuleId ?? '<unknown module id>'
      const fix: string[] = isDevEnv()
        ? [
            '- Provide the child implementation in the same scope (imports).',
            `  Example: ${fromModuleId ?? 'ParentModule'}.implement({ imports: [${requestedModuleId ?? 'ChildModule'}.impl], ... })`,
            '- If you intentionally want a root singleton, provide it at app root (Runtime.make(...,{ layer }) / root imports),',
            '  and use Root.resolve(ModuleTag) (instead of $.use) at the callsite.',
          ]
        : []

      const err = new Error(
        isDevEnv()
          ? [
              '[MissingModuleRuntimeError] Cannot resolve ModuleRuntime for ModuleTag.',
              '',
              `tokenId: ${tokenId}`,
              'entrypoint: logic.$.use',
              'mode: strict',
              `from: ${fromModuleId ?? '<unknown module id>'}`,
              `startScope: moduleId=${fromModuleId ?? '<unknown>'}, instanceId=${String(runtime.instanceId ?? '<unknown>')}`,
              '',
              'fix:',
              ...fix,
            ].join('\n')
          : '[MissingModuleRuntimeError] module runtime not found',
      )

      ;(err as any).tokenId = tokenId
      ;(err as any).entrypoint = 'logic.$.use'
      ;(err as any).mode = 'strict'
      ;(err as any).from = fromModuleId
      ;(err as any).startScope = {
        moduleId: fromModuleId,
        instanceId: String(runtime.instanceId ?? '<unknown>'),
      }
      ;(err as any).fix = fix

      err.name = 'MissingModuleRuntimeError'
      return yield* Effect.die(err)
    })

  const stateApi: BoundApi<Sh, R>['state'] = {
    read: runtime.getState,
    update: (f) =>
      Effect.gen(function* () {
        const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
        if (inTxn) {
          const prev = yield* runtime.getState
          return yield* runtime.setState(f(prev))
        }

        const body = () => Effect.flatMap(runtime.getState, (prev) => runtime.setState(f(prev)))

        return yield* runtimeInternals
          ? runtimeInternals.txn.runWithStateTransaction({ kind: 'state', name: 'update' } as any, body)
          : body()
      }),
    mutate: (f) =>
      Effect.gen(function* () {
        const recordPatch = runtimeInternals?.txn.recordStatePatch
        const updateDraft = runtimeInternals?.txn.updateDraft

        const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
        if (inTxn) {
          const prev = yield* runtime.getState
          const { nextState, patchPaths } = mutateWithPatchPaths(prev as Logix.StateOf<Sh>, (draft) => {
            f(draft as Logic.Draft<Logix.StateOf<Sh>>)
          })

          for (const path of patchPaths) {
            recordPatch?.(path, 'unknown')
          }

          updateDraft?.(nextState)
          return
        }

        const body = () =>
          Effect.gen(function* () {
            const prev = yield* runtime.getState
            const { nextState, patchPaths } = mutateWithPatchPaths(prev as Logix.StateOf<Sh>, (draft) => {
              f(draft as Logic.Draft<Logix.StateOf<Sh>>)
            })

            for (const path of patchPaths) {
              recordPatch?.(path, 'unknown')
            }

            updateDraft?.(nextState)
          })

        return yield* runtimeInternals
          ? runtimeInternals.txn.runWithStateTransaction({ kind: 'state', name: 'mutate' } as any, body)
          : body()
      }),
    ref: runtime.ref,
  }

  const actions = shape.actionMap as BoundApi<Sh, R>['actions']

  const dispatcherCache = new Map<string, (...args: any[]) => Effect.Effect<void, any, any>>()

  const hasAction = (key: string): boolean => Object.prototype.hasOwnProperty.call(actions as any, key)

  const dispatchers: BoundApi<Sh, R>['dispatchers'] = new Proxy({} as any, {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined
      if (!hasAction(prop)) return undefined

      const cached = dispatcherCache.get(prop)
      if (cached) return cached

      const token = (actions as any)[prop] as Action.AnyActionToken
      const fn = (...args: any[]) => runtime.dispatch((token as any)(...args))

      dispatcherCache.set(prop, fn)
      return fn
    },
    has: (_target, prop) => typeof prop === 'string' && hasAction(prop),
    ownKeys: () => Object.keys(actions as any),
    getOwnPropertyDescriptor: (_target, prop) => {
      if (typeof prop !== 'string') return undefined
      if (!hasAction(prop)) return undefined
      return { enumerable: true, configurable: true }
    },
  }) as unknown as BoundApi<Sh, R>['dispatchers']

  const dispatch: BoundApi<Sh, R>['dispatch'] = (...args: any[]) => {
    const [first, second] = args

    if (typeof first === 'string') {
      return runtime.dispatch({ _tag: first, payload: second } as Logix.ActionOf<Sh>)
    }

    if (Action.isActionToken(first)) {
      return runtime.dispatch((first as any)(second))
    }

    return runtime.dispatch(first as Logix.ActionOf<Sh>)
  }

  const matchApi = <V>(value: V): Logic.FluentMatch<V> => MatchBuilder.makeMatch(value)

  const matchTagApi = <V extends { _tag: string }>(value: V): Logic.FluentMatchTag<V> =>
    MatchBuilder.makeMatchTag(value)

  // Primary reducer registration: write into the reducer map via the runtime's internal registrar.
  const reducer: BoundApi<Sh, R>['reducer'] = (tag, fn) => {
    return Effect.sync(() => {
      runtimeInternals.txn.registerReducer(String(tag), fn as any)
    }) as any
  }

  const effect: BoundApi<Sh, R>['effect'] = (token, handler) =>
    Effect.gen(function* () {
      if (!Action.isActionToken(token)) {
        return yield* Effect.dieMessage('[BoundApi.effect] token must be an ActionToken')
      }

      const phase = getCurrentPhase()
      const logicUnit = options?.logicUnit

      yield* runtimeInternals.effects.registerEffect({
        actionTag: token.tag,
        handler: handler as any,
        phase,
        ...(logicUnit
          ? {
              logicUnit: {
                logicUnitId: logicUnit.logicUnitId,
                logicUnitLabel: logicUnit.logicUnitLabel,
                path: logicUnit.path,
              },
            }
          : {}),
      })
    }) as any

  const api: BoundApi<Sh, R> = {
    root: {
      resolve: (tag: any) => {
        guardRunOnly('root_resolve_in_setup', '$.root.resolve')
        return Root.resolve(tag, {
          entrypoint: 'logic.$.root.resolve',
          waitForReady: true,
        }) as any
      },
    },
    state: stateApi,
    actions,
    dispatchers,
    dispatch,
    flow: flowApi,
    match: matchApi,
    matchTag: matchTagApi,
    lifecycle: {
      onInitRequired: (eff: Logic.Of<Sh, R, void, never>) => {
        if (getCurrentPhase() === 'run') {
          return emitSetupOnlyViolation('$.lifecycle.onInitRequired') as any
        }
        runtimeInternals.lifecycle.registerInitRequired(eff as any)
        return Effect.void as any
      },
      onStart: (eff: Logic.Of<Sh, R, void, never>) => {
        if (getCurrentPhase() === 'run') {
          return emitSetupOnlyViolation('$.lifecycle.onStart') as any
        }
        runtimeInternals.lifecycle.registerStart(eff as any)
        return Effect.void as any
      },
      onInit: (eff: Logic.Of<Sh, R, void, never>) => {
        // Legacy alias: same semantics as onInitRequired (to reduce migration friction).
        if (getCurrentPhase() === 'run') {
          return emitSetupOnlyViolation('$.lifecycle.onInit') as any
        }
        runtimeInternals.lifecycle.registerInitRequired(eff as any)
        return Effect.void as any
      },
      onDestroy: (eff: Logic.Of<Sh, R, void, never>) => {
        if (getCurrentPhase() === 'run') {
          return emitSetupOnlyViolation('$.lifecycle.onDestroy') as any
        }
        runtimeInternals.lifecycle.registerDestroy(eff as any)
        return Effect.void as any
      },
      onError: (
        handler: (
          cause: import('effect').Cause.Cause<unknown>,
          context: Lifecycle.ErrorContext,
        ) => Effect.Effect<void, never, R>,
      ) => {
        if (getCurrentPhase() === 'run') {
          return emitSetupOnlyViolation('$.lifecycle.onError') as any
        }
        runtimeInternals.lifecycle.registerOnError(handler as any)
        return Effect.void as any
      },
      onSuspend: (eff: Logic.Of<Sh, R, void, never>) => {
        if (getCurrentPhase() === 'run') {
          return emitSetupOnlyViolation('$.lifecycle.onSuspend') as any
        }
        runtimeInternals.lifecycle.registerPlatformSuspend(Effect.asVoid(eff as Effect.Effect<void, never, any>))
        return Effect.void as any
      },
      onResume: (eff: Logic.Of<Sh, R, void, never>) => {
        if (getCurrentPhase() === 'run') {
          return emitSetupOnlyViolation('$.lifecycle.onResume') as any
        }
        runtimeInternals.lifecycle.registerPlatformResume(Effect.asVoid(eff as Effect.Effect<void, never, any>))
        return Effect.void as any
      },
      onReset: (eff: Logic.Of<Sh, R, void, never>) => {
        if (getCurrentPhase() === 'run') {
          return emitSetupOnlyViolation('$.lifecycle.onReset') as any
        }
        runtimeInternals.lifecycle.registerPlatformReset(Effect.asVoid(eff as Effect.Effect<void, never, any>))
        return Effect.void as any
      },
    },
    traits: {
      declare: (traits: ModuleTraits.TraitSpec) => {
        if (getCurrentPhase() === 'run') {
          throw LogicDiagnostics.makeLogicPhaseError(
            'traits_declare_in_run',
            '$.traits.declare',
            'run',
            options?.moduleId,
          )
        }

        if (!traits || typeof traits !== 'object') {
          throw new Error('[InvalidTraitsDeclaration] $.traits.declare expects an object.')
        }

        const logicUnit = options?.logicUnit ?? {
          logicUnitId: 'unknown',
          logicUnitIdKind: 'derived' as const,
          logicUnitLabel: 'logicUnit:unknown',
          path: undefined as string | undefined,
        }

        runtimeInternals.traits.registerModuleTraitsContribution({
          traits,
          provenance: {
            originType: 'logicUnit',
            originId: logicUnit.logicUnitId,
            originIdKind: logicUnit.logicUnitIdKind,
            originLabel: logicUnit.logicUnitLabel,
            path: logicUnit.path,
          },
        })
      },
      source: {
        refresh: (fieldPath: string, options?: { readonly force?: boolean }) =>
          Effect.gen(function* () {
            const handler = runtimeInternals.traits.getSourceRefreshHandler(fieldPath) as
              | ((state: Logix.StateOf<Sh>) => Effect.Effect<void, never, any>)
              | undefined
            if (!handler) {
              // If no refresh handler is registered, treat it as a no-op to avoid throwing when StateTraitProgram is not installed.
              return yield* Effect.void
            }

            const force = options?.force === true
            const runHandler = (state: Logix.StateOf<Sh>) =>
              force ? Effect.locally(TaskRunner.forceSourceRefresh, true)(handler(state)) : handler(state)

            // Never call enqueueTransaction inside the transaction window (it can deadlock):
            // - Run the handler inside the current transaction so it writes to the draft via bound.state.mutate.
            // - The outer transaction window is responsible for commit + debug aggregation.
            const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
            if (inTxn) {
              const state = (yield* runtime.getState) as Logix.StateOf<Sh>
              return yield* runHandler(state)
            }

            // Treat one source-refresh as a dedicated transaction entry.
            return yield* runtimeInternals.txn.runWithStateTransaction(
              {
                kind: 'source-refresh',
                name: fieldPath,
              } as any,
              () =>
                Effect.gen(function* () {
                  const state = (yield* runtime.getState) as Logix.StateOf<Sh>
                  return yield* runHandler(state)
                }),
            )
          }),
      },
    },
    reducer,
    effect,
    use: new Proxy(() => {}, {
      apply: (_target, _thisArg, [arg]) => {
        guardRunOnly('use_in_setup', '$.use')
        if (isModuleLike(arg)) {
          const domain = arg
          const tag = domain.tag as unknown as Context.Tag<any, Logix.ModuleRuntime<any, any>>

          const resolveAndBuild = resolveModuleRuntime(tag).pipe(Effect.map((rt) => buildModuleHandle(tag, rt)))

          const resolveWithDescriptor = resolveModuleRuntime(tag).pipe(
            Effect.tap((rt) => emitModuleDescriptorOnce(domain, rt)),
            Effect.map((rt) => buildModuleHandle(tag, rt)),
          )

          const detectAndSelect = FiberRef.get(Debug.currentDiagnosticsLevel).pipe(
            Effect.tap((level) => {
              cachedDiagnosticsLevel = level
            }),
            Effect.flatMap((level) => (level === 'off' ? resolveAndBuild : resolveWithDescriptor)),
          )

          // 022 perf gate: when diagnostics are off, $.use(module) and $.use(module.tag) must be equivalent with zero extra overhead.
          // Constraint: Effect is a value (reusable), so we must one-time cache at execution time instead of branching at construction time.
          return Effect.suspend(() => {
            if (cachedDiagnosticsLevel === 'off') {
              return resolveAndBuild
            }

            if (cachedDiagnosticsLevel !== undefined) {
              return resolveWithDescriptor
            }

            return detectAndSelect
          }) as unknown as Logic.Of<Sh, R, any, never>
        }
        if (Context.isTag(arg)) {
          const candidate = arg as { _kind?: unknown }

          // Module: return a read-only ModuleHandle view.
          if (candidate._kind === 'ModuleTag') {
            return resolveModuleRuntime(arg as any).pipe(
              Effect.map((rt: Logix.ModuleRuntime<any, any>) => buildModuleHandle(arg as any, rt)),
            ) as unknown as Logic.Of<Sh, R, any, never>
          }

          // Regular service tag: read the service from Env.
          return arg as unknown as Logic.Of<Sh, R, any, never>
        }
        return Effect.die('BoundApi.use: unsupported argument') as unknown as Logic.Of<Sh, R, any, never>
      },
    }) as unknown as BoundApi<Sh, R>['use'],
    onAction: new Proxy(() => {}, {
      apply: (_target, _thisArg, args) => {
        guardRunOnly('use_in_setup', '$.onAction')
        const arg = args[0]
        if (Action.isActionToken(arg)) {
          const tag = arg.tag
          return createIntentBuilder(
            runtime.actions$.pipe(
              Stream.filter((a: any) => a._tag === tag || a.type === tag),
              Stream.map((a: any) => a.payload),
            ),
            tag,
          )
        }
        if (typeof arg === 'function') {
          return createIntentBuilder(runtime.actions$.pipe(Stream.filter(arg)))
        }
        if (typeof arg === 'string') {
          return createIntentBuilder(
            runtime.actions$.pipe(Stream.filter((a: any) => a._tag === arg || a.type === arg)),
            arg,
          )
        }
        if (typeof arg === 'object' && arg !== null) {
          if ('_tag' in arg) {
            return createIntentBuilder(
              runtime.actions$.pipe(Stream.filter((a: any) => a._tag === (arg as any)._tag)),
              String((arg as any)._tag),
            )
          }
          if (Schema.isSchema(arg)) {
            return createIntentBuilder(
              runtime.actions$.pipe(
                Stream.filter((a: any) => {
                  const result = Schema.decodeUnknownSync(arg as Schema.Schema<any, any, never>)(a)
                  return !!result
                }),
              ),
            )
          }
        }
        return createIntentBuilder(runtime.actions$)
      },
      get: (_target, prop) => {
        guardRunOnly('use_in_setup', '$.onAction')
        if (typeof prop === 'string') {
          return createIntentBuilder(
            runtime.actions$.pipe(Stream.filter((a: any) => a._tag === prop || a.type === prop)),
            prop,
          )
        }
        return undefined
      },
    }) as unknown as BoundApi<Sh, R>['onAction'],
    onState: (selector: (s: Logix.StateOf<Sh>) => any) => {
      guardRunOnly('use_in_setup', '$.onState')
      return createIntentBuilder(runtime.changes(selector))
    },
    on: (stream: Stream.Stream<any>) => {
      guardRunOnly('use_in_setup', '$.on')
      return createIntentBuilder(stream)
    },
  } as any

  setBoundInternals(api as any, runtimeInternals)

  return api
}
