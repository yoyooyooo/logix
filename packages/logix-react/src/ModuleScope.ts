import React from 'react'
import * as Logix from '@logixjs/core'
import type { ModuleRef, ModuleRefOfModule, ModuleRefOfTag } from './internal/store/ModuleRef.js'
import { useModule } from './internal/hooks/useModule.js'
import { RuntimeProvider } from './internal/provider/RuntimeProvider.js'
import { useRuntime } from './internal/hooks/useRuntime.js'

export type ModuleScopeOptions =
  | {
      readonly deps?: React.DependencyList
      /**
       * scopeId: stable identifier for this Scope (domain boundary id).
       *
       * Typical: route:${routeId} / route:${routeId}:tab:${tabId}
       *
       * - Same scopeId reuses the same Host instance (and its imported child modules).
       * - Changing scopeId creates a new isolated instance.
       */
      readonly scopeId?: string
      readonly suspend?: false | undefined
      readonly initTimeoutMs?: number
      readonly gcTime?: number
      readonly label?: string
    }
  | {
      readonly deps?: React.DependencyList
      readonly scopeId: string
      readonly suspend: true
      readonly initTimeoutMs?: number
      readonly gcTime?: number
      readonly label?: string
    }

export type ModuleScope<Ref> = {
  readonly Provider: React.FC<{
    readonly children: React.ReactNode
    readonly options?: ModuleScopeOptions
  }>
  readonly use: () => Ref
  /**
   * useImported: sugar for the route Host(imports) use case.
   *
   * Equivalent to:
   * - const host = scope.use()
   * - const child = host.imports.get(Child.tag)
   */
  readonly useImported: <Id extends string, Sh extends Logix.AnyModuleShape>(
    module: Logix.ModuleTagType<Id, Sh>,
  ) => ModuleRefOfTag<Id, Sh>
  readonly Context: React.Context<Ref | null>
  /**
   * Bridge: reuse the same scope across React subtrees / separate roots.
   *
   * - Precondition: within the same runtime tree, some Provider (typically a route/page boundary)
   *   has already registered the scope with a stable scopeId.
   * - Behavior: retrieves the registered runtime + module runtime from ScopeRegistry and re-provides them in this subtree.
   */
  readonly Bridge: React.FC<{
    readonly scopeId: string
    readonly children: React.ReactNode
  }>
}

const makeModuleScope = <Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
  handle: Logix.ModuleImpl<Id, Sh, R>,
  defaults?: ModuleScopeOptions,
): ModuleScope<ModuleRefOfTag<Id, Sh>> => {
  type Ref = ModuleRefOfTag<Id, Sh>

  const Context = React.createContext<Ref | null>(null)

  const toUseModuleOptions = (options: ModuleScopeOptions): unknown => {
    const { scopeId, ...rest } = options as any
    return scopeId != null ? ({ ...rest, key: scopeId } as any) : (rest as any)
  }

  const getRegistryOrThrow = (runtime: unknown, where: string): Logix.ScopeRegistry.ScopeRegistry => {
    try {
      const registry = (runtime as any).runSync(Logix.ScopeRegistry.ScopeRegistryTag) as
        | Logix.ScopeRegistry.ScopeRegistry
        | undefined
      if (!registry) {
        throw new Error('ScopeRegistry service is undefined')
      }
      return registry
    } catch {
      throw new Error(
        `${where} Missing Logix.ScopeRegistry in current runtime. ` +
          'If you are using Logix.Runtime.make, it should be provided by default. ' +
          'If you are using ManagedRuntime.make, include Logix.ScopeRegistry.layer() in your Layer.',
      )
    }
  }

  const moduleToken = Logix.Module.hasImpl(handle) ? (handle as any).tag : (handle as any).module

  const Provider: ModuleScope<Ref>['Provider'] = ({ children, options }) => {
    const runtime = useRuntime()
    const merged = defaults || options ? ({ ...(defaults ?? {}), ...(options ?? {}) } as ModuleScopeOptions) : undefined

    const ref = (merged ? useModule(handle, toUseModuleOptions(merged) as any) : useModule(handle)) as Ref

    const scopeId = merged?.scopeId

    React.useEffect(() => {
      if (!scopeId) return

      const registry = getRegistryOrThrow(runtime, '[ModuleScope]')

      // 1) Register the runtime for this scope (to reuse Env/Scope/FiberRef across subtrees)
      const leaseRuntime = registry.register(scopeId, Logix.ScopeRegistry.ScopedRuntimeTag as any, runtime as any)

      // 2) Register the module runtime for this ModuleScope (token is module.tag)
      const leaseModule = registry.register(scopeId, moduleToken, ref.runtime)

      return () => {
        leaseModule.release()
        leaseRuntime.release()
      }
    }, [runtime, scopeId, ref.runtime])

    return React.createElement(Context.Provider, { value: ref as Ref }, children)
  }

  const use = (): Ref => {
    const ref = React.useContext(Context)
    if (!ref) {
      throw new Error('[ModuleScope] Provider not found')
    }
    return ref
  }

  const useImported: ModuleScope<Ref>['useImported'] = (module) => {
    const host = use() as unknown as ModuleRef<any, any>
    return host.imports.get(module)
  }

  const Bridge: ModuleScope<Ref>['Bridge'] = ({ scopeId, children }) => {
    const runtime = useRuntime()

    const registry = getRegistryOrThrow(runtime, '[ModuleScope.Bridge]')
    const scopedRuntime = registry.get(scopeId, Logix.ScopeRegistry.ScopedRuntimeTag as any)
    const moduleRuntime = registry.get<Logix.ModuleRuntimeOfShape<Sh>>(scopeId, moduleToken as any)

    if (!scopedRuntime || !moduleRuntime) {
      throw new Error(
        `[ModuleScope.Bridge] Scope "${scopeId}" is not registered (or has been disposed). ` +
          'Ensure you have a corresponding <ModuleScope.Provider options={{ scopeId }}> mounted.',
      )
    }

    return React.createElement(
      RuntimeProvider as any,
      { runtime: scopedRuntime },
      React.createElement(BridgeInner, { moduleRuntime, Context }, children),
    )
  }

  const BridgeInner = ({
    moduleRuntime,
    Context,
    children,
  }: {
    readonly moduleRuntime: Logix.ModuleRuntimeOfShape<Sh>
    readonly Context: React.Context<Ref | null>
    readonly children?: React.ReactNode
  }) => {
    const ref = useModule(moduleRuntime) as Ref
    return React.createElement(Context.Provider, { value: ref }, children)
  }

  return { Provider, use, useImported, Context, Bridge }
}

export const ModuleScope = {
  make: makeModuleScope as unknown as {
    <Id extends string, Sh extends Logix.AnyModuleShape, R = never>(
      handle: Logix.ModuleImpl<Id, Sh, R>,
      defaults?: ModuleScopeOptions,
    ): ModuleScope<ModuleRefOfTag<Id, Sh>>

    <Id extends string, Sh extends Logix.AnyModuleShape, Ext extends object, R = never>(
      handle: Logix.Module.Module<Id, Sh, Ext, R>,
      defaults?: ModuleScopeOptions,
    ): ModuleScope<ModuleRefOfModule<Id, Sh, Ext, R>>
  },
} as const
