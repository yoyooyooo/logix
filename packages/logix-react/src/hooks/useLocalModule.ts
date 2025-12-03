import React, { useEffect, useMemo } from "react"
import { Logix } from "@logix/core"
import { Context, Effect, Layer, Scope } from "effect"
import { useRuntime } from "../components/RuntimeProvider.js"
import {
  getModuleResourceCache,
  type ModuleResourceFactory,
  stableHash,
} from "../internal/ModuleResourceCache.js"

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
  source: unknown
): source is Logix.ModuleInstance<any, Logix.AnyModuleShape> {
  if (!source || typeof source !== "object") {
    return false
  }
  const candidate = source as { _kind?: unknown }
  return candidate._kind === "Module"
}

export function useLocalModule(
  factory: LocalModuleFactory,
  deps?: React.DependencyList
): Logix.ModuleRuntime<any, any>

export function useLocalModule<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleInstance<any, Sh>,
  options: ModuleInstanceOptions<Sh>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>

export function useLocalModule(
  source: LocalModuleFactory | Logix.ModuleInstance<any, Logix.AnyModuleShape>,
  second?: React.DependencyList | ModuleInstanceOptions
): Logix.ModuleRuntime<any, any> {
  const runtime = useRuntime()
  const cache = useMemo(() => getModuleResourceCache(runtime), [runtime])

  const isModule = isModuleInstance(source)
  const moduleOptions = (isModule ? (second as ModuleInstanceOptions) : undefined)
  const deps = (isModule
    ? moduleOptions?.deps ?? []
    : (second as React.DependencyList) ?? []) as React.DependencyList

  const key = useMemo(() => {
    if (isModule) {
      const module = source as Logix.ModuleInstance<any, Logix.AnyModuleShape>
      const base = moduleOptions?.key ?? module.id ?? "module"
      return `${base}:${stableHash(deps)}`
    }
    return `factory:${stableHash(deps)}`
  }, [isModule, source, moduleOptions?.key, deps])

  const factory = useMemo<ModuleResourceFactory>(() => {
    if (isModule) {
      return createModuleInstanceFactory(
        source as Logix.ModuleInstance<any, Logix.AnyModuleShape>,
        moduleOptions,
      )
    }
    const factoryFn = source as LocalModuleFactory
    return (scope: Scope.Scope) => factoryFn().pipe(Scope.extend(scope))
  }, [isModule, source, moduleOptions])

  const moduleRuntime = cache.read(key, factory)

  useEffect(() => cache.retain(key), [cache, key])

  return moduleRuntime
}

function createModuleInstanceFactory<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleInstance<any, Sh>,
  options?: ModuleInstanceOptions<Sh>
): ModuleResourceFactory {
  if (!options || options.initial === undefined) {
    throw new Error("useLocalModule(module, options) 需要提供 initial 状态")
  }
  const logics = options.logics ?? []
  return (scope: Scope.Scope) =>
    Layer.buildWithScope(module.live(options.initial, ...logics), scope).pipe(
      Effect.map((context) => Context.get(context, module))
    )
}
