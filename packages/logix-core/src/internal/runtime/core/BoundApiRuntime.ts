import { Deferred, Effect, Exit, Option, Schema, ServiceMap, Stream } from 'effect'
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
import * as Readiness from './BoundApiRuntime.readiness.js'
import * as Debug from './DebugSink.js'
import * as LogicDiagnostics from './LogicDiagnostics.js'
import { isDevEnv } from './env.js'
import { computed as fieldComputed, externalStore as fieldExternalStore, source as fieldSource } from '../../field-kernel/dsl.js'
import type { JsonValue } from '../../protocol/jsonValue.js'
import { RunSessionTag, type RunSession } from '../../verification/runSession.js'
import * as Root from '../../root.js'
import type { RuntimeInternals } from './RuntimeInternals.js'
import type * as ModuleFields from './ModuleFields.js'
import { getRuntimeInternals, setBoundInternals } from './runtimeInternalsAccessor.js'
import type { BoundApi } from './module.js'
import { markDirectStateWriteEffect } from './BoundApiRuntime.directStateWrite.js'
import { makeLogicBuilderFactory } from './BoundApiRuntime.logicBuilder.js'
import {
  buildModuleHandle,
  makeActionStreamByTag,
  makeDispatch,
  makeDispatchers,
} from './BoundApiRuntime.facade.js'

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
    readonly captureDeclarations?: (args: {
      readonly fields: ModuleFields.FieldSpec
      readonly provenance: {
        readonly originType: 'logicUnit'
        readonly originId: string
        readonly originIdKind: 'explicit' | 'derived'
        readonly originLabel: string
        readonly path?: string
      }
    }) => void
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
    makeLogicBuilderFactory<Sh, R>(runtime_, runtimeInternals)
  const withLifecycle = <A>(
    available: (manager: Lifecycle.LifecycleManager) => Effect.Effect<A, never, any>,
    missing: () => Effect.Effect<A, never, any>,
  ) =>
    Effect.serviceOption(Lifecycle.LifecycleContext as ServiceMap.Key<any, Lifecycle.LifecycleManager>).pipe(
      Effect.flatMap((maybe) =>
        Option.match(maybe, {
          onSome: available,
          onNone: missing,
        })),
    )
  const withPlatform = (invoke: (platform: Platform.Service) => Effect.Effect<void, never, any>) =>
    Effect.serviceOption(Platform.Tag as ServiceMap.Key<any, Platform.Service>).pipe(
      Effect.flatMap((maybe) =>
        Option.match(maybe, {
          onSome: invoke,
          onNone: () => Effect.void,
        }),
      ),
    )

  const emitDeclarationOnlyViolation = (api: string): Effect.Effect<void> =>
    Debug.record({
      type: 'diagnostic',
      moduleId: runtime.moduleId,
      instanceId: runtime.instanceId,
      code: 'logic::invalid_phase',
      severity: 'error',
      message: `${api} belongs to the declaration phase and is not allowed in run phase.`,
      hint:
        api === '$.readyAfter'
          ? 'Move $.readyAfter(...) to the synchronous declaration part of Module.logic builder (before return).'
          : 'Move declaration calls to the synchronous declaration part of Module.logic builder (before return); for dynamic resource cleanup in the run phase, use Effect.acquireRelease / Scope finalizer.',
      kind: api === '$.readyAfter' ? 'readiness_in_run' : 'declaration_in_run',
    }).pipe(Effect.orDie)

  const readyAfter = Readiness.makeReadyAfter<Sh, R>({
    getPhase: getCurrentPhase,
    runtimeInternals,
    emitDeclarationOnlyViolation,
  })

  const declareFields = (fields: ModuleFields.FieldSpec): void => {
    if (getCurrentPhase() === 'run') {
      throw LogicDiagnostics.makeLogicPhaseError('fields_declare_in_run', '$.fields.declare', 'run', options?.moduleId)
    }

    if (!fields || typeof fields !== 'object') {
      throw new Error('[InvalidFieldsDeclaration] $.fields.declare expects an object.')
    }

    const logicUnit = options?.logicUnit ?? {
      logicUnitId: 'unknown',
      logicUnitIdKind: 'derived' as const,
      logicUnitLabel: 'logicUnit:unknown',
      path: undefined as string | undefined,
    }

    options?.captureDeclarations?.({
      fields,
      provenance: {
        originType: 'logicUnit',
        originId: logicUnit.logicUnitId,
        originIdKind: logicUnit.logicUnitIdKind,
        originLabel: logicUnit.logicUnitLabel,
        path: logicUnit.path,
      },
    })
  }

  const createIntentBuilder = <T>(stream: Stream.Stream<T>, triggerName?: string) =>
    makeIntentBuilder(runtime)(stream, triggerName)

  const actionStreamByTag = makeActionStreamByTag(runtime)

  const onceInRunSession = (key: string): Effect.Effect<boolean, never, any> =>
    Effect.serviceOption(RunSessionTag as unknown as ServiceMap.Key<any, RunSession>).pipe(
      Effect.map((maybe) => (Option.isSome(maybe) ? maybe.value.local.once(key) : true)),
    )

  let cachedDiagnosticsLevel: Debug.DiagnosticsLevel | undefined
  const moduleHandleCache = new WeakMap<Logix.ModuleRuntime<any, any>, unknown>()

  const getOrBuildModuleHandle = (
    tag: ServiceMap.Key<any, Logix.ModuleRuntime<any, any>>,
    rt: Logix.ModuleRuntime<any, any>,
  ): unknown => {
    const cached = moduleHandleCache.get(rt)
    if (cached) return cached

    const handle = buildModuleHandle(tag, rt)
    moduleHandleCache.set(rt, handle)
    return handle
  }

  const isModuleLike = (
    value: unknown,
  ): value is {
    readonly _kind: 'Module' | 'Program'
    readonly id: string
    readonly tag: ServiceMap.Key<any, Logix.ModuleRuntime<any, any>>
    readonly schemas?: Record<string, unknown>
    readonly meta?: Record<string, JsonValue>
    readonly dev?: { readonly source?: { readonly file: string; readonly line: number; readonly column: number } }
  } =>
    Boolean(
      value &&
      typeof value === 'object' &&
      ((value as any)._kind === 'Module' || (value as any)._kind === 'Program') &&
      'tag' in (value as object) &&
      ServiceMap.isKey((value as any).tag),
    )

  const emitModuleDescriptorOnce = (
    module: {
      readonly id: string
      readonly tag: any
      readonly schemas?: Record<string, unknown>
      readonly meta?: Record<string, JsonValue>
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

      const fieldsSnapshot = runtimeInternals.fields.getModuleFieldsSnapshot()
      const fields = fieldsSnapshot
        ? {
            digest: fieldsSnapshot.digest,
            count: fieldsSnapshot.fields.length,
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
        fields,
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
  tag: ServiceMap.Key<any, Logix.ModuleRuntime<any, any>>,
    entrypoint = 'logic.$.use',
  ): Effect.Effect<Logix.ModuleRuntime<any, any>, never, any> =>
    Effect.gen(function* () {
      const requestedModuleId = typeof (tag as any)?.id === 'string' ? ((tag as any).id as string) : undefined
      const fromModuleId = typeof options?.moduleId === 'string' ? options.moduleId : runtime.moduleId

      // self: always allow resolving the current ModuleRuntime (both Bound.make and runtime injection paths).
      if (requestedModuleId && requestedModuleId === runtime.moduleId) {
        return runtime as unknown as Logix.ModuleRuntime<any, any>
      }

  const fromImports = runtimeInternals.imports.get(tag as unknown as ServiceMap.Key<any, any>)
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
            `  Example: Program.make(${fromModuleId ?? 'ParentModule'}, { capabilities: { imports: [${requestedModuleId ?? 'ChildModule'}] }, ... })`,
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
              `entrypoint: ${entrypoint}`,
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
      ;(err as any).entrypoint = entrypoint
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

  type BatchedStateWritebackOutcome =
    | { readonly _tag: 'ok' }
    | { readonly _tag: 'failure'; readonly cause: unknown }

  type BatchedStateWritebackRequest =
    | {
        readonly kind: 'update'
        readonly update: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>
        readonly done: Deferred.Deferred<BatchedStateWritebackOutcome>
      }
    | {
        readonly kind: 'mutate'
        readonly mutate: (draft: Logic.Draft<Logix.StateOf<Sh>>) => void
        readonly done: Deferred.Deferred<BatchedStateWritebackOutcome>
      }

  type BatchedStateWritebackCoordinator = {
    readonly enqueueUpdate: (update: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>) => Effect.Effect<void, never, any>
    readonly enqueueMutate: (mutate: (draft: Logic.Draft<Logix.StateOf<Sh>>) => void) => Effect.Effect<void, never, any>
  }

  // Perf-first batching for `$.state.update/$.state.mutate` called *outside* a transaction:
  // - Many watchers may write back on the same tick; running N transactions is dominated by fixed txn cost.
  // - Batch them into a single StateTransaction (still sequentially applies reducers), reducing queue/commit overhead.
  //
  // Notes:
  // - Enabled only when runtimeInternals exists and NODE_ENV=production (perf mode).
  // - Semantics change: multiple state writebacks may share the same txnSeq/txnId (forward-only evolution).
  let batchedStateWritebackCoordinator: BatchedStateWritebackCoordinator | undefined

  const getOrCreateBatchedStateWritebackCoordinator = (): BatchedStateWritebackCoordinator => {
    if (batchedStateWritebackCoordinator) return batchedStateWritebackCoordinator
    if (!runtimeInternals) {
      throw new Error('[BatchedStateWritebackCoordinator] Missing runtimeInternals (expected in ModuleRuntime-backed $).')
    }

    let inFlight = false
    const pending: Array<BatchedStateWritebackRequest> = []

    const drain = (): ReadonlyArray<BatchedStateWritebackRequest> => {
      if (pending.length === 0) return []
      return pending.splice(0, pending.length)
    }

    const ok: BatchedStateWritebackOutcome = { _tag: 'ok' }
    const fail = (cause: unknown): BatchedStateWritebackOutcome => ({ _tag: 'failure', cause })

    const applyBatch = (batch: ReadonlyArray<BatchedStateWritebackRequest>): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        if (batch.length === 0) return

        let current = (yield* runtime.getState) as Logix.StateOf<Sh>

        for (let i = 0; i < batch.length; i++) {
          const req = batch[i]!
          if (req.kind === 'update') {
            const next = req.update(current)
            current = next
            yield* runtime.setState(next)
            continue
          }

          const { nextState, patchPaths } = mutateWithPatchPaths(current as Logix.StateOf<Sh>, (draft) => {
            req.mutate(draft as Logic.Draft<Logix.StateOf<Sh>>)
          })

          for (const path of patchPaths) {
            runtimeInternals.txn.recordStatePatch(path, 'unknown')
          }

          runtimeInternals.txn.updateDraft(nextState)
          current = nextState as Logix.StateOf<Sh>
        }
      })

    const flushInFlight = (): Effect.Effect<void, never, any> =>
      Effect.uninterruptible(
        Effect.gen(function* () {
          if (inFlight) return
          inFlight = true
          try {
            while (true) {
              const batch = drain()
              if (batch.length === 0) {
                // Release the inFlight lock, then re-check pending to avoid the "enqueue while exiting" race.
                inFlight = false
                if (pending.length === 0) return
                inFlight = true
                continue
              }

              const originName =
                batch.length === 1 ? (batch[0]!.kind === 'update' ? 'update' : 'mutate') : 'writeback:batched'

              const exit = yield* Effect.exit(
                runtimeInternals.txn.runWithStateTransaction(
                  {
                    kind: 'state',
                    name: originName,
                    details: { batched: true, count: batch.length },
                  } as any,
                  () => applyBatch(batch).pipe(Effect.asVoid),
                ),
              )

              const outcome: BatchedStateWritebackOutcome = exit._tag === 'Success' ? ok : fail(exit.cause)

              for (let i = 0; i < batch.length; i++) {
                yield* Deferred.succeed(batch[i]!.done, outcome)
              }

              // Unexpected failures are treated as fatal; unblock waiters and stop the drain loop.
              if (outcome._tag === 'failure') {
                return
              }
            }
          } finally {
            inFlight = false
          }
        }),
      )

    const waitForMicrotask = (): Effect.Effect<void, never, never> =>
      Effect.promise(
        () =>
          new Promise<void>((resolve) => {
            if (typeof queueMicrotask === 'function') {
              queueMicrotask(resolve)
              return
            }
            Promise.resolve().then(resolve)
          }),
      )

    const enqueueAndAwait = (req: BatchedStateWritebackRequest): Effect.Effect<void, never, any> =>
      Effect.gen(function* () {
        pending.push(req)
        if (!inFlight) {
          yield* waitForMicrotask()
        }
        yield* flushInFlight()
        const outcome = yield* Deferred.await(req.done)
        if (outcome._tag === 'failure') {
          return yield* Effect.die(outcome.cause)
        }
      })

    const coordinator: BatchedStateWritebackCoordinator = {
      enqueueUpdate: (update) =>
        Effect.gen(function* () {
          const done = yield* Deferred.make<BatchedStateWritebackOutcome>()
          yield* enqueueAndAwait({ kind: 'update', update, done })
        }),
      enqueueMutate: (mutate) =>
        Effect.gen(function* () {
          const done = yield* Deferred.make<BatchedStateWritebackOutcome>()
          yield* enqueueAndAwait({ kind: 'mutate', mutate, done })
        }),
    }

    batchedStateWritebackCoordinator = coordinator
    return coordinator
  }

  const stateApi: BoundApi<Sh, R>['state'] = {
    read: runtime.getState,
    update: (f) =>
      markDirectStateWriteEffect<Sh, Effect.Effect<void, never, any>>(
        Effect.gen(function* () {
          const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)
          if (inTxn) {
            const prev = yield* runtime.getState
            return yield* runtime.setState(f(prev))
          }

          const body = () => Effect.flatMap(runtime.getState, (prev) => runtime.setState(f(prev)))

          if (runtimeInternals && !isDevEnv()) {
            return yield* getOrCreateBatchedStateWritebackCoordinator().enqueueUpdate(f as any)
          }

          return yield* runtimeInternals
            ? runtimeInternals.txn.runWithStateTransaction({ kind: 'state', name: 'update' } as any, body)
            : body()
        }),
        { kind: 'update', run: f as any },
      ),
    mutate: (f) =>
      markDirectStateWriteEffect<Sh, Effect.Effect<void, never, any>>(
        Effect.gen(function* () {
          const recordPatch = runtimeInternals?.txn.recordStatePatch
          const updateDraft = runtimeInternals?.txn.updateDraft

          const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)
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

          if (runtimeInternals && !isDevEnv()) {
            return yield* getOrCreateBatchedStateWritebackCoordinator().enqueueMutate(f as any)
          }

          return yield* runtimeInternals
            ? runtimeInternals.txn.runWithStateTransaction({ kind: 'state', name: 'mutate' } as any, body)
            : body()
        }),
        { kind: 'mutate', run: f as any },
      ),
    ref: runtime.ref,
  }


  const actions = shape.actionMap as BoundApi<Sh, R>['actions']

  const dispatchers = makeDispatchers(actions as any, runtime) as BoundApi<Sh, R>['dispatchers']
  const dispatch = makeDispatch(runtime) as BoundApi<Sh, R>['dispatch']

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
        return yield* Effect.die(new Error('[BoundApi.effect] token must be an ActionToken'))
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
    imports: {
      get: (tag: any) => {
        guardRunOnly('imports_get_in_setup', '$.imports.get')
        return resolveModuleRuntime(tag, 'logic.$.imports.get').pipe(
          Effect.map((rt: Logix.ModuleRuntime<any, any>) => getOrBuildModuleHandle(tag, rt)),
        ) as unknown as Logic.Of<Sh, R, any, never>
      },
    },
    state: stateApi,
    actions,
    dispatchers,
    dispatch,
    flow: flowApi,
    match: matchApi,
    matchTag: matchTagApi,
    readyAfter,
    fields: Object.assign(
      (fields: ModuleFields.FieldSpec) => {
        declareFields(fields)
      },
      {
        computed: fieldComputed,
        source: Object.assign(fieldSource, {
          refresh: (fieldPath: string, options?: { readonly force?: boolean }) =>
            Effect.gen(function* () {
              const handler = runtimeInternals.fields.getSourceRefreshHandler(fieldPath) as
                | ((state: Logix.StateOf<Sh>) => Effect.Effect<void, never, any>)
                | undefined
              if (!handler) {
                return yield* Effect.void
              }

              const force = options?.force === true
              const runHandler = (state: Logix.StateOf<Sh>) =>
                force ? Effect.provideService(handler(state), TaskRunner.forceSourceRefresh, true) : handler(state)

              const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)
              if (inTxn) {
                const state = (yield* runtime.getState) as Logix.StateOf<Sh>
                return yield* runHandler(state)
              }

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
        }),
        external: fieldExternalStore,
      },
    ),
    reducer,
    effect,
    use: new Proxy(() => {}, {
      apply: (_target, _thisArg, [arg]) => {
        guardRunOnly('use_in_setup', '$.use')
        if (isModuleLike(arg)) {
          const domain = arg
          const tag = domain.tag as unknown as ServiceMap.Key<any, Logix.ModuleRuntime<any, any>>

          const resolveAndBuild = resolveModuleRuntime(tag, 'logic.$.use').pipe(
            Effect.map((rt) => getOrBuildModuleHandle(tag, rt)),
          )

          const resolveWithDescriptor = resolveModuleRuntime(tag, 'logic.$.use').pipe(
            Effect.tap((rt) => emitModuleDescriptorOnce(domain, rt)),
            Effect.map((rt) => getOrBuildModuleHandle(tag, rt)),
          )

          const detectAndSelect = Effect.service(Debug.currentDiagnosticsLevel).pipe(
            Effect.map((level) => {
              cachedDiagnosticsLevel = level
              return level
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
        if (ServiceMap.isKey(arg)) {
          const candidate = arg as { _kind?: unknown }

          // Module: return a read-only ModuleHandle view.
          if (candidate._kind === 'ModuleTag') {
            return resolveModuleRuntime(arg as any, 'logic.$.use').pipe(
              Effect.map((rt: Logix.ModuleRuntime<any, any>) => getOrBuildModuleHandle(arg as any, rt)),
            ) as unknown as Logic.Of<Sh, R, any, never>
          }

          // Regular service tag: read the service from Env.
          return Effect.service(arg as ServiceMap.Key<any, any>).pipe(Effect.orDie) as unknown as Logic.Of<Sh, R, any, never>
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
          return createIntentBuilder(actionStreamByTag(tag).pipe(Stream.map((action: any) => action.payload)), tag)
        }
        if (Schema.isSchema(arg)) {
          const decode = Schema.decodeUnknownSync(arg as any)
          return createIntentBuilder(
            runtime.actions$.pipe(
              Stream.filter((a: any) => {
                try {
                  decode(a)
                  return true
                } catch {
                  return false
                }
              }),
            ),
          )
        }
        if (typeof arg === 'function') {
          return createIntentBuilder(runtime.actions$.pipe(Stream.filter(arg)))
        }
        if (typeof arg === 'string') {
          return createIntentBuilder(actionStreamByTag(arg), arg)
        }
        if (typeof arg === 'object' && arg !== null) {
          if ('_tag' in arg) {
            const tag = String((arg as any)._tag)
            return createIntentBuilder(actionStreamByTag(tag), tag)
          }
        }
        return createIntentBuilder(runtime.actions$)
      },
      get: (_target, prop) => {
        guardRunOnly('use_in_setup', '$.onAction')
        if (typeof prop === 'string') {
          return createIntentBuilder(actionStreamByTag(prop), prop)
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
