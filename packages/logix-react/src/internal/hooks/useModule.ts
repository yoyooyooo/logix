import React from 'react'
import * as Logix from '@logixjs/core'
import { Context, Effect, Layer, Scope } from 'effect'
import type { ActionOfHandle, ReactModuleHandle, StateOfHandle } from './useModuleRuntime.js'
import { useModuleRuntime } from './useModuleRuntime.js'
import { useSelector } from './useSelector.js'
import { useRuntime } from './useRuntime.js'
import { isDevEnv } from '../provider/env.js'
import { getModuleCache, type ModuleCacheFactory, stableHash } from '../store/ModuleCache.js'
import { RuntimeContext } from '../provider/ReactContext.js'
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
  type ModuleRefOfModule,
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
  ModuleRefOfDef,
  ModuleRefOfModule,
  ModuleRefOfTag,
} from '../store/ModuleRef.js'

// Sync mode options: default behavior; does not trigger React Suspense.
interface ModuleImplSyncOptions {
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
interface ModuleImplSuspendOptions {
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

type ModuleImplOptions = ModuleImplSyncOptions | ModuleImplSuspendOptions

const isModuleImpl = (handle: unknown): handle is Logix.ModuleImpl<string, Logix.AnyModuleShape, unknown> =>
  Boolean(handle) && typeof handle === 'object' && (handle as { readonly _tag?: unknown })._tag === 'ModuleImpl'

type ModuleDef<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object = {}> = Logix.Module.ModuleDef<
  Id,
  Sh,
  Ext
>

const isModule = (handle: unknown): handle is Logix.Module.Module<string, Logix.AnyModuleShape, any, unknown> =>
  Logix.Module.hasImpl(handle)

const isModuleDef = (handle: unknown): handle is ModuleDef<string, Logix.AnyModuleShape, any> =>
  Logix.Module.is(handle) && (handle as { readonly _kind?: unknown })._kind === 'ModuleDef'

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
): ModuleRefOfTag<Id, Sh>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
  options: ModuleImplOptions,
): ModuleRefOfTag<Id, Sh>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object, R = never>(
  handle: Logix.Module.Module<Id, Sh, Ext, R>,
): ModuleRefOfModule<Id, Sh, Ext, R>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object, R = never>(
  handle: Logix.Module.Module<Id, Sh, Ext, R>,
  options: ModuleImplOptions,
): ModuleRefOfModule<Id, Sh, Ext, R>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object = {}>(
  handle: ModuleDef<Id, Sh, Ext>,
): ModuleRefOfDef<Id, Sh, Ext>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape>(
  handle: Logix.ModuleTagType<Id, Sh>,
): ModuleRefOfTag<Id, Sh>

export function useModule<H extends ReactModuleHandle>(handle: H): ModuleRef<StateOfHandle<H>, ActionOfHandle<H>>

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R, V>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, R, V>(
  handle: Logix.Module.Module<Id, Sh, any, R>,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, V>(
  handle: ModuleDef<Id, Sh, any>,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useModule<Id extends string, Sh extends Logix.AnyModuleShape, V>(
  handle: Logix.ModuleTagType<Id, Sh>,
  selector: (state: Logix.StateOf<Sh>) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useModule<H extends ReactModuleHandle, V>(
  handle: H,
  selector: (state: StateOfHandle<H>) => V,
  equalityFn?: (previous: V, next: V) => boolean,
): V

export function useModule(
  handle:
    | ReactModuleHandle
    | Logix.ModuleImpl<string, Logix.AnyModuleShape, unknown>
    | Logix.Module.Module<string, Logix.AnyModuleShape, any, unknown>
    | ModuleDef<string, Logix.AnyModuleShape, any>,
  selectorOrOptions?: ((state: unknown) => unknown) | ModuleImplOptions,
  equalityFn?: (previous: unknown, next: unknown) => boolean,
): unknown {
  const runtimeBase = useRuntime()
  const runtimeContext = React.useContext(RuntimeContext)

  if (!runtimeContext) {
    throw new RuntimeProviderNotFoundError('useModule')
  }

  const normalizedHandle: ReactModuleHandle | Logix.ModuleImpl<string, Logix.AnyModuleShape, unknown> = isModule(handle)
    ? handle.impl
    : isModuleDef(handle)
      ? handle.tag
      : handle

  let selector: ((state: unknown) => unknown) | undefined
  let options: ModuleImplOptions | undefined

  if (isModuleImpl(normalizedHandle)) {
    if (typeof selectorOrOptions === 'function') {
      selector = selectorOrOptions
    } else if (selectorOrOptions && typeof selectorOrOptions === 'object') {
      options = selectorOrOptions as ModuleImplOptions
    }
  } else {
    if (typeof selectorOrOptions === 'function' || selectorOrOptions === undefined) {
      selector = selectorOrOptions as ((state: unknown) => unknown) | undefined
    } else if (selectorOrOptions && typeof selectorOrOptions === 'object') {
      throw new Error('useModule(handle, options) 仅支持 ModuleImpl 句柄')
    }
  }

  let runtime: Logix.ModuleRuntime<unknown, unknown>

  if (isModuleImpl(normalizedHandle)) {
    // ModuleImpl: build a local ModuleRuntime from the current Runtime's resource cache
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
    const suspend =
      explicitSuspend || (options?.suspend !== false && runtimeContext.policy.moduleImplMode === 'suspend')

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
            '并在 useModule(Impl, { suspend: true, key }) 中传入该值。',
        )
      }
    }

    // Unified key strategy:
    // - If Provider preload (`defer`) hit, reuse the preloaded key to share the same instance across Provider/subtree.
    // - Else use `options.key` (for cross-component sharing / partitioning).
    // - Else, on the Suspense path with no explicit key, default to sharing by `moduleId` (avoid key churn on retries).
    // - Finally, for the sync path fall back to a component-scoped key (`useId`) for "private per component" semantics.
    const componentId = useStableId()
    const moduleId = normalizedHandle.module.id ?? 'ModuleImpl'
    const preloadKey = runtimeContext.policy.preload?.keysByModuleId.get(moduleId)
    const baseKey = preloadKey ?? options?.key ?? (suspend ? `impl:${moduleId}` : `impl:${moduleId}:${componentId}`)
    const key = depsHash ? `${baseKey}:${depsHash}` : baseKey
    const ownerId = moduleId

    const baseFactory = React.useMemo<ModuleCacheFactory>(
      () => (scope: Scope.Scope) =>
        Layer.buildWithScope(normalizedHandle.layer, scope).pipe(
          Effect.map(
            (context) => Context.get(context, normalizedHandle.module) as Logix.ModuleRuntime<unknown, unknown>,
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
          Effect.timeoutFail({
            duration: initTimeoutMs,
            onTimeout: () =>
              new Error(`[useModule] Module "${ownerId}" initialization timed out after ${initTimeoutMs}ms`),
          }),
        )
    }, [baseFactory, suspend, initTimeoutMs, ownerId])

    const moduleRuntime = (suspend
      ? cache.read(key, factory, gcTime, ownerId, {
          entrypoint: 'react.useModule',
          policyMode: runtimeContext.policy.mode,
          yield: runtimeContext.policy.yield,
        })
      : cache.readSync(key, factory, gcTime, ownerId, {
          entrypoint: 'react.useModule',
          policyMode: runtimeContext.policy.mode,
          warnSyncBlockingThresholdMs: 5,
        })) as unknown as Logix.ModuleRuntime<unknown, unknown>

    React.useEffect(() => cache.retain(key), [cache, key])

    runtime = moduleRuntime
  } else {
    // ModuleTag | ModuleRuntime: use useModuleRuntime to get/reuse the runtime.
    runtime = useModuleRuntime(normalizedHandle)
  }

  // Provide an instance label for DevTools: bind key/label to runtime.instanceId via a Debug trace event,
  // then downstream DevTools sinks can parse and render it.
  React.useEffect(() => {
    if (!isModuleImpl(normalizedHandle)) {
      return
    }
    // Only infer instance labels on the ModuleImpl path.
    const opt = options as ModuleImplOptions | undefined
    const label = (opt && 'label' in opt && opt.label) || (opt && opt.key)
    if (!label) {
      return
    }

    const effect = Logix.Debug.record({
      type: 'trace:instanceLabel',
      moduleId: normalizedHandle.module.id,
      instanceId: runtime.instanceId,
      data: { label },
    })

    runtimeBase.runFork(effect)
  }, [runtimeBase, runtime, normalizedHandle, options])

  // Component-level render trace: record once per commit per component (each useModule call),
  // avoiding renderCount inflation by the number of useSelector calls.
  React.useEffect(() => {
    if (!isDevEnv() && !Logix.Debug.isDevtoolsEnabled()) {
      return
    }
    if (!runtime.instanceId) {
      return
    }

    const effect = Logix.Debug.record({
      type: 'trace:react-render',
      moduleId: runtime.moduleId,
      instanceId: runtime.instanceId,
      data: {
        componentLabel: 'useModule',
        strictModePhase: 'commit',
      },
    })

    runtimeBase.runFork(effect)
  }, [runtimeBase, runtime])

  if (selector) {
    // ModuleImpl path: selector is explicitly based on StateOf<Sh>; subscribe via runtime directly.
    if (isModuleImpl(normalizedHandle)) {
      return useSelector(runtime as never, selector as never, equalityFn as never)
    }

    // Non-ModuleImpl: let useSelector infer state type from the original handle (also supports ModuleRef handles).
    return useSelector(normalizedHandle, selector as never, equalityFn as never)
  }

  const def = React.useMemo(() => {
    if (isModule(handle) || isModuleDef(handle)) {
      return handle
    }
    if (isModuleRef(handle)) {
      return handle.def
    }
    if (isModuleImpl(handle)) {
      return handle.module
    }
    if (
      handle &&
      (typeof handle === 'object' || typeof handle === 'function') &&
      (handle as { readonly _kind?: unknown })._kind === 'ModuleTag'
    ) {
      return handle
    }
    if (isModuleImpl(normalizedHandle)) {
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

  type AnyActionToken = Logix.Action.ActionToken<string, any, any>
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
    if (isModuleImpl(normalizedHandle)) {
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
    const base: ModuleRef<unknown, unknown> = {
      def,
      runtime,
      dispatch,
      actions,
      dispatchers,
      imports: {
        get: <Id extends string, Sh extends Logix.AnyModuleShape>(module: Logix.ModuleTagType<Id, Sh>) =>
          resolveImportedModuleRef(runtimeBase, runtime, module),
      },
      getState: runtime.getState,
      setState: runtime.setState,
      actions$: runtime.actions$,
      changes: runtime.changes,
      ref: runtime.ref,
    }

    return applyHandleExtend(extendTag, runtime, base)
  }, [runtimeBase, runtime, dispatch, actions, dispatchers, extendTag, def])
}
