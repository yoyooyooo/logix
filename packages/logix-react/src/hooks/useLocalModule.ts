import React, { useEffect, useMemo, useRef } from "react"
import { Logix } from "@logix/core"
import { Context, Effect, Layer, Scope, Exit } from "effect"
import { useRuntime } from "../components/RuntimeProvider.js"

type LocalModuleFactory = () => Effect.Effect<
  Logix.ModuleRuntime<any, any>,
  never,
  any
>

interface ModuleInstanceOptions<Sh extends Logix.AnyModuleShape = Logix.AnyModuleShape> {
  readonly initial: Logix.StateOf<Sh>
  readonly logics?: ReadonlyArray<Logix.ModuleLogic<Sh, any, any>>
  readonly deps?: React.DependencyList
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

export function useLocalModule<Sh extends Logix.AnyModuleShape>(
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
  const factoryRef = useRef<LocalModuleFactory | null>(null)

  const isModule = isModuleInstance(source)
  const moduleOptions = (isModule ? (second as ModuleInstanceOptions) : undefined)
  const deps = (isModule
    ? moduleOptions?.deps ?? []
    : (second as React.DependencyList) ?? []) as React.DependencyList

  if (!isModule) {
    factoryRef.current = source as LocalModuleFactory
  }

  const memoDeps = isModule
    ? ([runtime, source, ...deps] as React.DependencyList)
    : ([runtime, ...deps] as React.DependencyList)

  const resource = useMemo(() => {
    const scope = runtime.runSync(Scope.make())
    const buildEffect = isModule
      ? createModuleInstanceEffect(
          source as Logix.ModuleInstance<any, Logix.AnyModuleShape>,
          moduleOptions
        )
      : createFactoryEffect(factoryRef)
    try {
      const moduleRuntime = runtime.runSync(buildEffect(scope))
      return { scope, moduleRuntime }
    } catch (error) {
      runtime.runSync(Scope.close(scope, Exit.fail(error as unknown)))
      throw error
    }
  }, memoDeps)

  useEffect(() => {
    return () => {
      runtime.runFork(Scope.close(resource.scope, Exit.void))
    }
  }, [runtime, resource.scope])

  return resource.moduleRuntime
}

function createFactoryEffect(
  ref: React.MutableRefObject<LocalModuleFactory | null>
) {
  return (scope: Scope.Scope) => {
    if (!ref.current) {
      throw new Error("useLocalModule 需要有效的 factory 函数")
    }
    return ref.current().pipe(Scope.extend(scope))
  }
}

function createModuleInstanceEffect<Sh extends Logix.AnyModuleShape>(
  module: Logix.ModuleInstance<any, Sh>,
  options?: ModuleInstanceOptions<Sh>
): (scope: Scope.Scope) => Effect.Effect<
  Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
  any,
  Scope.Scope
> {
  if (!options || options.initial === undefined) {
    throw new Error("useLocalModule(module, options) 需要提供 initial 状态")
  }
  const logics = options.logics ?? []
  return (scope: Scope.Scope) =>
    Layer.buildWithScope(module.live(options.initial, ...logics), scope).pipe(
      Effect.map((context) => Context.get(context, module))
    )
}

