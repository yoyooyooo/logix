import React, { useEffect, useMemo } from 'react'
import * as Logix from '@logixjs/core'
import { Context, Effect, Layer, Scope } from 'effect'
import { useRuntime } from './useRuntime.js'
import { getModuleCache, type ModuleCacheFactory, stableHash } from '../store/ModuleCache.js'
import { RuntimeContext } from '../provider/ReactContext.js'
import { RuntimeProviderNotFoundError } from '../provider/errors.js'
import { makeModuleActions, makeModuleDispatchers, type Dispatch, type ModuleRef } from '../store/ModuleRef.js'
import { resolveImportedModuleRef } from '../store/resolveImportedModuleRef.js'
import { useStableId } from './useStableId.js'

type LocalModuleFactory<S, A> = () => Effect.Effect<Logix.ModuleRuntime<S, A>, unknown, unknown>

type ModuleDef<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object = {}> = Logix.Module.ModuleDef<
  Id,
  Sh,
  Ext
>

interface ModuleTagOptions<Sh extends Logix.AnyModuleShape = Logix.AnyModuleShape> {
  readonly initial: Logix.StateOf<Sh>
  readonly logics?: ReadonlyArray<Logix.ModuleLogic<Sh>>
  readonly deps?: React.DependencyList
  readonly key?: string
}

function isModuleTag(source: unknown): source is Logix.ModuleTagType<string, Logix.AnyModuleShape> {
  if (!source || (typeof source !== 'object' && typeof source !== 'function')) {
    return false
  }
  const candidate = source as { _kind?: unknown }
  return candidate._kind === 'ModuleTag'
}

export function useLocalModule<S, A>(factory: LocalModuleFactory<S, A>, deps?: React.DependencyList): ModuleRef<S, A>

export function useLocalModule<Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object = {}>(
  module: ModuleDef<Id, Sh, Ext>,
  options: ModuleTagOptions<Sh>,
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>, keyof Sh['actionMap'] & string, ModuleDef<Id, Sh, Ext>> & Ext

export function useLocalModule<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleTagType<string, Sh>,
  options: ModuleTagOptions<Sh>,
): ModuleRef<
  Logix.StateOf<Sh>,
  Logix.ActionOf<Sh>,
  keyof Sh['actionMap'] & string,
  Logix.ModuleTagType<string, Sh>
>

export function useLocalModule(source: unknown, second?: unknown): ModuleRef<unknown, unknown> {
  const runtime = useRuntime()
  const runtimeContext = React.useContext(RuntimeContext)

  if (!runtimeContext) {
    throw new RuntimeProviderNotFoundError('useLocalModule')
  }

  const cache = useMemo(
    () => getModuleCache(runtime, runtimeContext.reactConfigSnapshot, runtimeContext.configVersion),
    [runtime, runtimeContext.reactConfigSnapshot, runtimeContext.configVersion],
  )
  const componentId = useStableId()

  const moduleTag = React.useMemo(() => {
    if (Logix.Module.is(source)) {
      return source.tag as unknown as Logix.ModuleTagType<string, Logix.AnyModuleShape>
    }
    if (isModuleTag(source)) {
      return source
    }
    return null
  }, [source])

  const def = React.useMemo(() => {
    if (Logix.Module.is(source) || isModuleTag(source)) {
      return source
    }
    return undefined
  }, [source])

  const isModule = moduleTag !== null
  const moduleOptions = isModule ? (second as ModuleTagOptions) : undefined
  const deps = (
    isModule ? (moduleOptions?.deps ?? []) : ((second as React.DependencyList) ?? [])
  ) as React.DependencyList

  const { key, ownerId } = useMemo(() => {
    const depsHash = stableHash(deps)
    if (isModule) {
      const module = moduleTag as Logix.ModuleTagType<string, Logix.AnyModuleShape>
      const baseKey = moduleOptions?.key ?? module.id ?? 'module'
      return {
        key: `local:${baseKey}:${componentId}:${depsHash}`,
        ownerId: module.id ?? 'Module',
      }
    }
    return {
      key: `local:factory:${componentId}:${depsHash}`,
      ownerId: undefined as string | undefined,
    }
  }, [isModule, moduleTag, moduleOptions?.key, deps, componentId])

  const factory = useMemo<ModuleCacheFactory>(() => {
    if (isModule) {
      return createModuleTagFactory(moduleTag as Logix.ModuleTagType<string, Logix.AnyModuleShape>, moduleOptions)
    }
    const factoryFn = source as unknown as LocalModuleFactory<unknown, unknown>
    return (scope: Scope.Scope) => factoryFn().pipe(Scope.extend(scope))
  }, [isModule, moduleTag, source, moduleOptions])

  const moduleRuntime = cache.readSync(key, factory, undefined, ownerId, {
    entrypoint: 'react.useLocalModule',
    policyMode: runtimeContext.policy.mode,
    warnSyncBlockingThresholdMs: 5,
  }) as unknown as Logix.ModuleRuntime<unknown, unknown>

  useEffect(() => cache.retain(key), [cache, key])

  const dispatch = useMemo((): Dispatch<unknown> => {
    const base = (action: unknown) => {
      runtime.runFork(moduleRuntime.dispatch(action))
    }

    return Object.assign(base, {
      batch: (actions: ReadonlyArray<unknown>) => {
        runtime.runFork(moduleRuntime.dispatchBatch(actions))
      },
      lowPriority: (action: unknown) => {
        runtime.runFork(moduleRuntime.dispatchLowPriority(action))
      },
    })
  }, [runtime, moduleRuntime])

  type AnyActionToken = Logix.Action.ActionToken<string, any, any>
  const tokens = useMemo(() => {
    if (!def || (typeof def !== 'object' && typeof def !== 'function')) {
      return undefined
    }
    const candidate = def as { readonly actions?: unknown }
    if (!candidate.actions || typeof candidate.actions !== 'object') {
      return undefined
    }
    return candidate.actions as Record<string, AnyActionToken>
  }, [def])

  const actions = useMemo(() => makeModuleActions(dispatch), [dispatch])

  const dispatchers = useMemo(
    () => (tokens ? makeModuleDispatchers(dispatch, tokens) : makeModuleDispatchers(dispatch)),
    [dispatch, tokens],
  )

  return useMemo(
    () =>
      ({
        def,
        runtime: moduleRuntime,
        dispatch,
        actions,
        dispatchers,
        imports: {
          get: <Id extends string, Sh extends Logix.AnyModuleShape>(module: Logix.ModuleTagType<Id, Sh>) =>
            resolveImportedModuleRef(runtime, moduleRuntime, module),
        },
        getState: moduleRuntime.getState,
        setState: moduleRuntime.setState,
        actions$: moduleRuntime.actions$,
        changes: moduleRuntime.changes,
        ref: moduleRuntime.ref,
      }) satisfies ModuleRef<unknown, unknown>,
    [runtime, moduleRuntime, dispatch, actions, dispatchers, def],
  )
}

function createModuleTagFactory<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleTagType<string, Sh>,
  options?: ModuleTagOptions<Sh>,
): ModuleCacheFactory {
  if (!options || options.initial === undefined) {
    throw new Error('useLocalModule(module, options) 需要提供 initial 状态')
  }
  const logics = options.logics ?? []
  return (scope: Scope.Scope) =>
    Layer.buildWithScope(module.live(options.initial, ...logics), scope).pipe(
      Effect.map((context) => {
        const runtime = Context.get(context, module)
        return runtime
      }),
    )
}
