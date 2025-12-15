import type * as Logix from "@logix/core"

type ActionArgs<P> = [P] extends [void] ? [] | [P] : [P]
type ActionFn<P, Out> = (...args: ActionArgs<P>) => Out

type ActionTag<A> = A extends { readonly _tag: infer T } ? T : never
type ActionPayload<A, K> = Extract<A, { readonly _tag: K }> extends {
  readonly payload?: infer P
}
  ? P
  : never

export type ModuleActions<A> = {
  readonly dispatch: (action: A) => void
} & ([A] extends [{ readonly _tag: infer Tag }]
  ? {
      readonly [K in Extract<Tag, string>]: ActionFn<ActionPayload<A, K>, void>
    }
  : {})

export interface ModuleImports {
  readonly get: <Id extends string, Sh extends Logix.AnyModuleShape>(
    module: Logix.ModuleInstance<Id, Sh>,
  ) => ModuleRef<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
}

export interface ModuleRef<S, A> {
  readonly runtime: Logix.ModuleRuntime<S, A>
  readonly dispatch: (action: A) => void
  readonly actions: ModuleActions<A>
  /**
   * 分形模块 imports 语法糖：
   * - host.imports.get(ChildModule) 将在 host 实例 scope 下解析子模块实例；
   * - 默认 strict：缺失 scope 时抛错，避免串到全局实例。
   */
  readonly imports: ModuleImports
  readonly getState: Logix.ModuleRuntime<S, A>["getState"]
  readonly setState: Logix.ModuleRuntime<S, A>["setState"]
  readonly actions$: Logix.ModuleRuntime<S, A>["actions$"]
  readonly changes: Logix.ModuleRuntime<S, A>["changes"]
  readonly ref: Logix.ModuleRuntime<S, A>["ref"]
}

export const isModuleRef = (value: unknown): value is ModuleRef<any, any> =>
  typeof value === "object" &&
  value !== null &&
  "runtime" in value &&
  "actions" in value &&
  "dispatch" in value

export const makeModuleActions = <A>(
  dispatch: (action: A) => void,
): ModuleActions<A> => {
  const cache = new Map<PropertyKey, unknown>()

  const api = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (cache.has(prop)) {
          return cache.get(prop)
        }

        if (prop === "dispatch") {
          cache.set(prop, dispatch)
          return dispatch
        }

        const fn = (...args: readonly [unknown?]) => {
          const payload = args[0]
          dispatch({ _tag: prop as any, payload } as A)
        }

        cache.set(prop, fn)
        return fn
      },
    },
  )

  return api as ModuleActions<A>
}
