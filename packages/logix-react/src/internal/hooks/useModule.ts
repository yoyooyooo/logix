import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import React from 'react'
import * as Logix from '@logixjs/core'
import { Effect, Layer, Scope, ServiceMap } from 'effect'
import type { ActionOfHandle, ReactModuleHandle, StateOfHandle } from './useModuleRuntime.js'
import { useModuleRuntime } from './useModuleRuntime.js'
import { useRuntime } from './useRuntime.js'
import { isDevEnv } from '../provider/env.js'
import { getModuleCache, type ModuleCacheFactory, stableHash } from '../store/ModuleCache.js'
import { RuntimeContext } from '../provider/ReactContext.js'
import { emitRuntimeDebugEventBestEffort, readRuntimeDiagnosticsLevel } from '../provider/runtimeDebugBridge.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'
import {
  applyHandleExtend,
  isModuleRef,
  makeModuleActions,
  makeModuleDispatchers,
  type Dispatch,
  type ModuleDispatchersOfShape,
  type ModuleRef,
  type ModuleRefOfDef,
  type ModuleRefOfProgram,
  type ModuleRefOfTag,
} from '../store/ModuleRef.js'
import { resolveImportedModuleRef } from '../store/resolveImportedModuleRef.js'
import { useStableId } from './useStableId.js'

export type {
  ModuleActions,
  ModuleDispatchers,
  ModuleDispatchersOfShape,
  ModuleActionTagsOfShape,
  ModuleRef,
  ModuleRefOfShape,
  ModuleRefOfModule,
  ModuleRefOfDef,
  ModuleRefOfProgram,
  ModuleRefOfTag,
} from '../store/ModuleRef.js'

type ProgramRuntimeBlueprint<Id extends string, Sh extends Logix.AnyModuleShape, R = unknown> =
  RuntimeContracts.ProgramRuntimeBlueprint<Id, Sh, R>

// Sync mode options: default behavior; does not trigger React Suspense.
interface ProgramInstanceSyncOptions {
  readonly deps?: React.DependencyList
  readonly key?: string
  readonly suspend?: false | undefined
  readonly initTimeoutMs?: number
  /**
   * Keep-alive time (ms) after this ModuleRuntime has no holders (refCount=0).
   * - Defaults to ModuleCache's default (~500ms) to absorb StrictMode jitter.
   * - For session-level use cases, you can set a longer time, e.g. 5 minutes.
   */
  readonly gcTime?: number
  /**
   * (Optional) instance label: a friendly name for DevTools / debugging views.
   * - If omitted, when DevTools is enabled it falls back to key or auto numbering (Instance #1/#2).
   * - Recommended for multi-instance scenarios like sessions/shards, e.g. "Session A" / "Session B".
   */
  readonly label?: string
}

// Suspense mode options: when suspend: true, you must provide a stable key explicitly.
interface ProgramInstanceSuspendOptions {
  readonly deps?: React.DependencyList
  readonly key: string
  readonly suspend: true
  readonly gcTime?: number
  /**
   * Max pending time (ms) allowed for module initialization (including async Layer building).
   * - Only applies when suspend:true.
   * - If it still hasn't finished after this time, it fails via Effect.timeoutFail and the caller's ErrorBoundary
   *   (or upper-layer logic) decides retry/degrade strategy.
   * - Does not change gcTime semantics: gcTime still only describes keep-alive time after there are no holders.
   */
  readonly initTimeoutMs?: number
  /**
   * (Optional) instance label: a friendly name for DevTools / debugging views.
   * - If omitted, when DevTools is enabled it falls back to key or auto numbering.
   */
  readonly label?: string
}

type ProgramInstanceOptions = ProgramInstanceSyncOptions | ProgramInstanceSuspendOptions
const isProgramRuntimeBlueprint = (
  handle: unknown,
): handle is ProgramRuntimeBlueprint<string, Logix.AnyModuleShape, unknown> =>
  Boolean(handle) &&
  typeof handle === 'object' &&
  (handle as { readonly _tag?: unknown })._tag === 'ProgramRuntimeBlueprint'

const isProgram = (handle: unknown): handle is Logix.Program.Program<string, Logix.AnyModuleShape, any, unknown> =>
  RuntimeContracts.hasProgramRuntimeBlueprint(handle)

const isModuleSource = (handle: unknown): handle is Logix.Module.Module<string, Logix.AnyModuleShape, any> =>
  Boolean(handle) &&
  typeof handle === 'object' &&
  (handle as { readonly _kind?: unknown })._kind === 'Module' &&
  Boolean((handle as { readonly tag?: unknown }).tag)

type ModuleRefIdentityHandle = {
  readonly runtime: unknown
  readonly dispatch: unknown
  readonly actions: unknown
  readonly dispatchers: unknown
  readonly imports: unknown
}

function useModuleInternal(
  handle:
    | ReactModuleHandle
    | ProgramRuntimeBlueprint<string, Logix.AnyModuleShape, unknown>
    | Logix.Program.Program<string, Logix.AnyModuleShape, any, unknown>,
  selectorOrOptions?: ProgramInstanceOptions,
  allowProgramRuntimeBlueprint = false,
): unknown {
  const runtimeBase = useRuntime()
  const runtimeContext = React.useContext(RuntimeContext)
  const legacySecondArg = selectorOrOptions as unknown

  if (!runtimeContext) {
    throw new RuntimeProviderNotFoundError('useModule')
  }

  if (isModuleSource(handle)) {
    throw new Error(
      '[useModule] module-object input is removed from the public route; use useModule(ModuleTag) for shared instances or useModule(Program, options) for local instances.',
    )
  }

  if (isProgramRuntimeBlueprint(handle) && !allowProgramRuntimeBlueprint) {
    throw new Error(
      '[useModule] ProgramRuntimeBlueprint input is internal-only; create a Program and call useModule(Program, options) instead.',
    )
  }

  const normalizedHandle: ReactModuleHandle | ProgramRuntimeBlueprint<string, Logix.AnyModuleShape, unknown> =
    isProgram(handle) ? RuntimeContracts.getProgramRuntimeBlueprint(handle) : handle

  if (typeof legacySecondArg === 'function') {
    throw new Error('[useModule] selector route moved to useSelector(handle, selector)')
  }

  let options: ProgramInstanceOptions | undefined

  if (isProgramRuntimeBlueprint(normalizedHandle)) {
    if (selectorOrOptions && typeof selectorOrOptions === 'object') {
      options = selectorOrOptions as ProgramInstanceOptions
    }
  } else if (selectorOrOptions && typeof selectorOrOptions === 'object') {
    throw new Error('useModule(handle, options) 仅支持 Program 句柄')
  }

  let runtime: Logix.ModuleRuntime<unknown, unknown>
  const programResolveTraceRef = React.useRef<
    | {
        readonly moduleId: string
        readonly cacheMode: 'sync' | 'suspend'
        readonly durationMs: number
      }
    | undefined
  >(undefined)

  if (isProgramRuntimeBlueprint(normalizedHandle)) {
    // Program runtime blueprint: build a local ModuleRuntime from the current Runtime's resource cache
    // and bind its lifecycle to the component.
    //
    // - Default: use `readSync` (sync construction) to preserve existing behavior.
    // - When `options.suspend === true`: use `read` (Suspense path) to allow async Layers.
    const cache = React.useMemo(
      () => getModuleCache(runtimeBase, runtimeContext.reactConfigSnapshot, runtimeContext.configVersion),
      [runtimeBase, runtimeContext.reactConfigSnapshot, runtimeContext.configVersion],
    )

    const deps = (options?.deps ?? []) as React.DependencyList
    const depsHash = stableHash(deps)

    const explicitSuspend = options?.suspend === true
    const programMode = runtimeContext.policy.programMode
    const suspend =
      explicitSuspend || (options?.suspend !== false && programMode === 'suspend')

    // 1) Resolve `gcTime`: callsite > Config(logix.react.gc_time) > default 500ms.
    const gcTime = options?.gcTime ?? runtimeContext.reactConfigSnapshot.gcTime

    // 2) Resolve `initTimeoutMs` (only effective in suspend mode):
    //    callsite > Config(logix.react.init_timeout_ms) > default undefined (timeout disabled).
    let initTimeoutMs: number | undefined = suspend ? options?.initTimeoutMs : undefined
    if (suspend && initTimeoutMs === undefined) {
      initTimeoutMs = runtimeContext.reactConfigSnapshot.initTimeoutMs
    }

    if (explicitSuspend && (!options || !options.key)) {
      // To avoid resource key churn in Suspense mode, when the callsite explicitly sets `suspend: true`,
      // require a stable `key`.
      // If suspension is triggered by the Provider's default policy (i.e. not explicitly `suspend: true`),
      // we automatically use a component-scoped key to avoid boilerplate explosion.
      if (isDevEnv()) {
        throw new Error(
          '[useModule] suspend:true 模式必须显式提供 options.key；' +
            '请在 Suspense 边界外生成稳定 ID（例如 useId() 或业务 id），' +
            '并在 useModule(Program, { suspend: true, key }) 中传入该值。',
        )
      }
    }

    // Unified key strategy:
    // - If Provider preload (`defer`) hit, reuse the preloaded key to share the same instance across Provider/subtree.
    // - Else use `options.key` (for cross-component sharing / partitioning).
    // - Else fall back to a component-scoped key (`useId`) for "private per component" semantics.
    //   This also covers provider-driven suspend mode; only an explicit key opts into cross-component reuse.
    const componentId = useStableId()
    const moduleId = normalizedHandle.module.id ?? 'ProgramRuntimeBlueprint'
    const blueprintId =
      (isProgram(handle) ? RuntimeContracts.getProgramBlueprintId(handle) : undefined) ??
      RuntimeContracts.getProgramBlueprintId(normalizedHandle) ??
      moduleId
    const preloadKey = runtimeContext.policy.preload?.keysByModuleId.get(blueprintId)
    const explicitKey = options?.key ? `program:${blueprintId}:${options.key}` : undefined
    const baseKey = preloadKey ?? explicitKey ?? `program:${blueprintId}:${componentId}`
    const key = depsHash ? `${baseKey}:${depsHash}` : baseKey
    const ownerId = blueprintId

    const baseFactory = React.useMemo<ModuleCacheFactory>(
      () => (scope: Scope.Scope) =>
        Layer.buildWithScope(Layer.fresh(normalizedHandle.layer), scope).pipe(
          Effect.map(
            (context) => ServiceMap.get(context, normalizedHandle.module) as Logix.ModuleRuntime<unknown, unknown>,
          ),
        ),
      [normalizedHandle],
    )

    const factory = React.useMemo<ModuleCacheFactory>(() => {
      if (!suspend || initTimeoutMs === undefined) {
        return baseFactory
      }

      // In Suspense mode, put an upper bound on the whole initialization:
      // - includes `Layer.buildWithScope` and ModuleRuntime construction;
      // - on timeout we throw an error and let the caller's ErrorBoundary handle it.
      return (scope: Scope.Scope) =>
        baseFactory(scope).pipe(
          Effect.timeoutOption(initTimeoutMs),
          Effect.flatMap((maybe) =>
            maybe._tag === 'Some'
              ? Effect.succeed(maybe.value)
              : Effect.die(new Error(`[useModule] Module "${ownerId}" initialization timed out after ${initTimeoutMs}ms`)),
          ),
        )
    }, [baseFactory, suspend, initTimeoutMs, ownerId])

    const moduleResolveStartedAt = performance.now()
    const moduleRuntime = (suspend
      ? cache.read(key, factory, gcTime, ownerId, {
          entrypoint: 'react.useModule',
          policyMode: runtimeContext.policy.mode,
          yield: runtimeContext.policy.yield,
          optimisticSyncBudgetMs: runtimeContext.policy.syncBudgetMs,
        })
      : cache.readSync(key, factory, gcTime, ownerId, {
          entrypoint: 'react.useModule',
          policyMode: runtimeContext.policy.mode,
          warnSyncBlockingThresholdMs: 5,
        })) as unknown as Logix.ModuleRuntime<unknown, unknown>
    programResolveTraceRef.current = {
      moduleId,
      cacheMode: suspend ? 'suspend' : 'sync',
      durationMs: Math.round((performance.now() - moduleResolveStartedAt) * 100) / 100,
    }

    React.useEffect(() => cache.retain(key), [cache, key])

    runtime = moduleRuntime
  } else {
    // ModuleTag | ModuleRuntime: use useModuleRuntime to get/reuse the runtime.
    runtime = useModuleRuntime(normalizedHandle)
  }

  // Provide an instance label for DevTools: bind key/label to runtime.instanceId via a Debug trace event,
  // then downstream DevTools sinks can parse and render it.
  React.useEffect(() => {
    if (!isProgramRuntimeBlueprint(normalizedHandle)) {
      return
    }
    const diagnosticsLevel = readRuntimeDiagnosticsLevel(runtimeBase)
    if (diagnosticsLevel === 'off') {
      return
    }
    const trace = programResolveTraceRef.current
    if (!trace) {
      return
    }
    const effect = CoreDebug.record({
      type: 'trace:react.program.resolve',
      moduleId: trace.moduleId,
      instanceId: runtime.instanceId,
      data: {
        cacheMode: trace.cacheMode,
        durationMs: trace.durationMs,
      },
    })

    emitRuntimeDebugEventBestEffort(runtimeBase, effect)
  }, [runtimeBase, runtime, normalizedHandle])

  React.useEffect(() => {
    if (!isProgramRuntimeBlueprint(normalizedHandle)) {
      return
    }
    // Only infer instance labels on the program runtime blueprint path.
    const opt = options as ProgramInstanceOptions | undefined
    const label = (opt && 'label' in opt && opt.label) || (opt && opt.key)
    if (!label) {
      return
    }

    const effect = CoreDebug.record({
      type: 'trace:instanceLabel',
      moduleId: normalizedHandle.module.id,
      instanceId: runtime.instanceId,
      data: { label },
    })

    emitRuntimeDebugEventBestEffort(runtimeBase, effect)
  }, [runtimeBase, runtime, normalizedHandle, options])

  // Component-level render trace: record once per commit per component (each useModule call),
  // avoiding renderCount inflation by the number of useSelector calls.
  React.useEffect(() => {
    if (!isDevEnv() && !CoreDebug.isDevtoolsEnabled()) {
      return
    }
    if (!runtime.instanceId) {
      return
    }

    const effect = CoreDebug.record({
      type: 'trace:react-render',
      moduleId: runtime.moduleId,
      instanceId: runtime.instanceId,
      data: {
        componentLabel: 'useModule',
        strictModePhase: 'commit',
      },
    })

    runtimeBase.runFork(effect)
  })

  const def = React.useMemo(() => {
    if (isProgram(handle) || isModuleSource(handle)) {
      return handle
    }
    if (isModuleRef(handle)) {
      return handle.def
    }
    if (isProgramRuntimeBlueprint(handle)) {
      return handle.module
    }
    if (
      handle &&
      (typeof handle === 'object' || typeof handle === 'function') &&
      (handle as { readonly _kind?: unknown })._kind === 'ModuleTag'
    ) {
      return handle
    }
    if (isProgramRuntimeBlueprint(normalizedHandle)) {
      return normalizedHandle.module
    }
    if (isModuleRef(normalizedHandle)) {
      return normalizedHandle.def
    }
    if (
      normalizedHandle &&
      (typeof normalizedHandle === 'object' || typeof normalizedHandle === 'function') &&
      (normalizedHandle as { readonly _kind?: unknown })._kind === 'ModuleTag'
    ) {
      return normalizedHandle
    }
    return undefined
  }, [handle, normalizedHandle])

  type AnyActionToken = ((...args: ReadonlyArray<unknown>) => unknown) & {
    readonly _kind: 'ActionToken'
    readonly tag: string
  }
  const tokens = React.useMemo(() => {
    if (!def || (typeof def !== 'object' && typeof def !== 'function')) {
      return undefined
    }
    const candidate = def as { readonly actions?: unknown }
    if (!candidate.actions || typeof candidate.actions !== 'object') {
      return undefined
    }
    return candidate.actions as Record<string, AnyActionToken>
  }, [def])

  const dispatch = React.useMemo((): Dispatch<unknown> => {
    const base = (action: unknown) => {
      runtimeBase.runFork(runtime.dispatch(action))
    }

    return Object.assign(base, {
      batch: (actions: ReadonlyArray<unknown>) => {
        runtimeBase.runFork(runtime.dispatchBatch(actions))
      },
      lowPriority: (action: unknown) => {
        runtimeBase.runFork(runtime.dispatchLowPriority(action))
      },
    })
  }, [runtimeBase, runtime])

  const extendTag = React.useMemo(() => {
    if (isProgramRuntimeBlueprint(normalizedHandle)) {
      return normalizedHandle.module
    }
    return normalizedHandle
  }, [normalizedHandle])

  const actions = React.useMemo(() => makeModuleActions(dispatch), [dispatch])

  const dispatchers = React.useMemo(
    () => (tokens ? makeModuleDispatchers(dispatch, tokens) : makeModuleDispatchers(dispatch)),
    [dispatch, tokens],
  )

  return React.useMemo(() => {
    if (isModuleRef(handle)) {
      return handle
    }

    const base: ModuleRef<unknown, unknown> = {
      def,
      runtime,
      dispatch,
      actions,
      dispatchers,
      imports: {
        get: <Id extends string, Sh extends Logix.AnyModuleShape>(module: Logix.Module.ModuleTag<Id, Sh>) =>
          resolveImportedModuleRef(runtimeBase, runtime, module),
      },
      getState: runtime.getState,
      setState: runtime.setState,
      actions$: runtime.actions$,
      changes: runtime.changes,
      ref: runtime.ref,
    }

    return applyHandleExtend(extendTag, runtime, base)
  }, [runtimeBase, runtime, dispatch, actions, dispatchers, extendTag, def, handle])
}

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object, R = never>(
  handle: Logix.Program.Program<Id, Sh, Ext, R>,
): ModuleRefOfProgram<Id, Sh, Ext, R>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object, R = never>(
  handle: Logix.Program.Program<Id, Sh, Ext, R>,
  options: ProgramInstanceOptions,
): ModuleRefOfProgram<Id, Sh, Ext, R>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  handle: Logix.Module.ModuleTag<Id, Sh>,
): ModuleRefOfTag<Id, Sh>

export function useModule<S, A>(
  handle: Logix.ModuleRuntime<S, A>,
): ModuleRef<S, A>

export function useModule<M extends ModuleRefIdentityHandle>(handle: M): M

export function useModule<H extends ReactModuleHandle>(handle: H): ModuleRef<StateOfHandle<H>, ActionOfHandle<H>>

export function useModule(
  handle: ReactModuleHandle | Logix.Program.Program<string, Logix.AnyModuleShape, any, unknown>,
  selectorOrOptions?: ProgramInstanceOptions,
): unknown {
  return useModuleInternal(handle, selectorOrOptions)
}

export function useProgramRuntimeBlueprintInternal<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: ProgramRuntimeBlueprint<Id, Sh, R>,
): ModuleRefOfTag<Id, Sh>

export function useProgramRuntimeBlueprintInternal<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: ProgramRuntimeBlueprint<Id, Sh, R>,
  options: ProgramInstanceOptions,
): ModuleRefOfTag<Id, Sh>

export function useProgramRuntimeBlueprintInternal(
  handle: ProgramRuntimeBlueprint<string, Logix.AnyModuleShape, unknown>,
  selectorOrOptions?: ProgramInstanceOptions,
): unknown {
  return useModuleInternal(handle, selectorOrOptions, true)
}

export type { ProgramInstanceOptions, ProgramInstanceSuspendOptions, ProgramInstanceSyncOptions, ProgramRuntimeBlueprint }
