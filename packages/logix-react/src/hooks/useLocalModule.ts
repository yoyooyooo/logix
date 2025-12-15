import React, { useEffect, useMemo } from "react"
import * as Logix from "@logix/core"
import { Context, Effect, Layer, Scope } from "effect"
import { useRuntime } from "../components/RuntimeProvider.js"
import {
  getModuleCache,
  type ModuleCacheFactory,
  stableHash,
} from "../internal/ModuleCache.js"
import { RuntimeContext } from "../internal/ReactContext.js"
import { makeModuleActions, type ModuleRef } from "../internal/ModuleRef.js"
import { resolveImportedModuleRef } from "../internal/resolveImportedModuleRef.js"

type LocalModuleFactory = () => Effect.Effect<
  Logix.ModuleRuntime<any, any>,
  any,
  any
>

interface ModuleInstanceOptions<Sh extends Logix.AnyModuleShape = Logix.AnyModuleShape> {
  readonly initial: Logix.StateOf<Sh>
  readonly logics?: ReadonlyArray<Logix.ModuleLogic<Sh, any, any>>
  readonly deps?: React.DependencyList
  readonly key?: string
}

function isModuleInstance(
  source: unknown,
): source is Logix.ModuleInstance<any, Logix.AnyModuleShape> {
  if (!source || typeof source !== "object") {
    return false
  }
  const candidate = source as { _kind?: unknown }
  return candidate._kind === "Module"
}

export function useLocalModule(
  factory: LocalModuleFactory,
  deps?: React.DependencyList,
): ModuleRef<any, any>

export function useLocalModule<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleInstance<any, Sh>,
  options: ModuleInstanceOptions<Sh>,
): ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useLocalModule(
  source: LocalModuleFactory | Logix.ModuleInstance<any, Logix.AnyModuleShape>,
  second?: React.DependencyList | ModuleInstanceOptions,
): ModuleRef<any, any> {
  const runtime = useRuntime()
  const runtimeContext = React.useContext(RuntimeContext)

  if (!runtimeContext) {
    throw new Error("RuntimeProvider not found")
  }

  const cache = useMemo(
    () =>
      getModuleCache(
        runtime,
        runtimeContext.reactConfigSnapshot,
        runtimeContext.configVersion,
      ),
    [runtime, runtimeContext.reactConfigSnapshot, runtimeContext.configVersion],
  )
  const componentId = React.useId()

  const isModule = isModuleInstance(source)
  const moduleOptions = (isModule ? (second as ModuleInstanceOptions) : undefined)
  const deps = (isModule
    ? moduleOptions?.deps ?? []
    : (second as React.DependencyList) ?? []) as React.DependencyList

  const { key, ownerId } = useMemo(() => {
    const depsHash = stableHash(deps)
    if (isModule) {
      const module = source as Logix.ModuleInstance<any, Logix.AnyModuleShape>
      const baseKey = moduleOptions?.key ?? module.id ?? "module"
      return {
        key: `${baseKey}:${componentId}:${depsHash}`,
        ownerId: module.id ?? "Module",
      }
    }
    return {
      key: `factory:${componentId}:${depsHash}`,
      ownerId: undefined as string | undefined,
    }
  }, [isModule, source, moduleOptions?.key, deps, componentId])

  const factory = useMemo<ModuleCacheFactory>(() => {
    if (isModule) {
      return createModuleInstanceFactory(
        source as Logix.ModuleInstance<any, Logix.AnyModuleShape>,
        moduleOptions,
      )
    }
    const factoryFn = source as LocalModuleFactory
    return (scope: Scope.Scope) => factoryFn().pipe(Scope.extend(scope))
  }, [isModule, source, moduleOptions])

  const moduleRuntime = cache.read(key, factory, undefined, ownerId)

  useEffect(() => cache.retain(key), [cache, key])

  const dispatch = useMemo(
    () => (action: any) => {
      runtime.runFork((moduleRuntime.dispatch as (a: any) => any)(action))
    },
    [runtime, moduleRuntime],
  )

  const actions = useMemo(() => makeModuleActions(dispatch), [dispatch])

  return useMemo(
    () =>
      ({
        runtime: moduleRuntime,
        dispatch,
        actions,
        imports: {
          get: (module: any) =>
            resolveImportedModuleRef(runtime, moduleRuntime as any, module),
        },
        getState: moduleRuntime.getState,
        setState: moduleRuntime.setState,
        actions$: moduleRuntime.actions$,
        changes: moduleRuntime.changes,
        ref: moduleRuntime.ref,
      }) satisfies ModuleRef<any, any>,
    [runtime, moduleRuntime, dispatch, actions],
  )
}

function createModuleInstanceFactory<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleInstance<any, Sh>,
  options?: ModuleInstanceOptions<Sh>,
): ModuleCacheFactory {
  if (!options || options.initial === undefined) {
    throw new Error("useLocalModule(module, options) 需要提供 initial 状态")
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
