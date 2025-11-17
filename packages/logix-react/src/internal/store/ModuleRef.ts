import type * as Logix from '@logix/core'

export type Dispatch<A> = ((action: A) => void) & {
  readonly batch: (actions: ReadonlyArray<A>) => void
  readonly lowPriority: (action: A) => void
}

type ActionArgs<P> = [P] extends [void] ? [] | [P] : [P]
type ActionFn<P, Out> = (...args: ActionArgs<P>) => Out

type ActionTag<A> =
  A extends { readonly _tag: infer T } ? T : A extends { readonly type: infer T } ? T : never
type ActionTags<A> = Extract<ActionTag<A>, string>
type ActionPayload<A, K> =
  Extract<A, { readonly _tag: K } | { readonly type: K }> extends {
    readonly payload?: infer P
  }
    ? P
    : never

export type ModuleActions<A, Tags extends string = ActionTags<A>> = {
  readonly dispatch: Dispatch<A>
} & ([ActionTags<A>] extends [never]
  ? {}
  : {
      readonly [K in Tags & ActionTags<A>]: ActionFn<ActionPayload<A, K>, void>
    })

export interface ModuleImports {
  readonly get: <Id extends string, Sh extends Logix.AnyModuleShape>(
    module: Logix.ModuleTagType<Id, Sh>,
  ) => ModuleRef<
    Logix.StateOf<Sh>,
    Logix.ActionOf<Sh>,
    keyof Sh['actionMap'] & string,
    Logix.ModuleTagType<Id, Sh>
  >
}

export interface ModuleRef<S, A, Tags extends string = ActionTags<A>, Def = unknown> {
  /**
   * 定义侧锚点（通常是 ModuleTag），用于反射 actions/reducers/source 等信息。
   * - DX：当 runtime.actions.* 无法跳转时，可通过 `ref.def?.reducers?.xxx` / `ref.def?.actions.xxx` 快速定位定义。
   */
  readonly def?: Def
  readonly runtime: Logix.ModuleRuntime<S, A>
  readonly dispatch: Dispatch<A>
  readonly actions: ModuleActions<A, Tags>
  /**
   * Fractal module imports sugar:
   * - host.imports.get(ChildModule) resolves a child module instance within the host instance scope.
   * - strict by default: throws when scope is missing, avoiding accidentally routing to a global instance.
   */
  readonly imports: ModuleImports
  readonly getState: Logix.ModuleRuntime<S, A>['getState']
  readonly setState: Logix.ModuleRuntime<S, A>['setState']
  readonly actions$: Logix.ModuleRuntime<S, A>['actions$']
  readonly changes: Logix.ModuleRuntime<S, A>['changes']
  readonly ref: Logix.ModuleRuntime<S, A>['ref']
}

export const isModuleRef = (value: unknown): value is ModuleRef<unknown, unknown> =>
  typeof value === 'object' && value !== null && 'runtime' in value && 'actions' in value && 'dispatch' in value

export const makeModuleActions = <A, Tags extends string = ActionTags<A>>(
  dispatch: Dispatch<A>,
): ModuleActions<A, Tags> => {
  const cache = new Map<PropertyKey, unknown>()

  const api = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (cache.has(prop)) {
          return cache.get(prop)
        }

        if (prop === 'dispatch') {
          cache.set(prop, dispatch)
          return dispatch
        }

        // Prevent Promise-like (thenable) misdetection: actions should not be absorbed by await/Promise.resolve.
        if (prop === 'then' || typeof prop !== 'string') {
          return undefined
        }

        const fn = (...args: readonly [unknown?]) => {
          const payload = args[0]
          dispatch({ _tag: prop, payload } as unknown as A)
        }

        cache.set(prop, fn)
        return fn
      },
    },
  )

  return api as ModuleActions<A, Tags>
}

const HANDLE_EXTEND = Symbol.for('logix.module.handle.extend')

type ObjectLike = object | ((...args: unknown[]) => unknown)

const isObjectLike = (value: unknown): value is ObjectLike =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

export const applyHandleExtend = <S, A, Tags extends string, Def>(
  tag: unknown,
  runtime: Logix.ModuleRuntime<S, A>,
  base: ModuleRef<S, A, Tags, Def>,
): ModuleRef<S, A, Tags, Def> & Record<string, unknown> => {
  if (!isObjectLike(tag)) {
    return base as ModuleRef<S, A, Tags, Def> & Record<string, unknown>
  }

  const extend = (tag as Record<PropertyKey, unknown>)[HANDLE_EXTEND] as unknown

  if (typeof extend !== 'function') {
    return base as ModuleRef<S, A, Tags, Def> & Record<string, unknown>
  }

  const next = (extend as (runtime: Logix.ModuleRuntime<S, A>, base: ModuleRef<S, A, Tags, Def>) => unknown)(
    runtime,
    base,
  )
  if (!next || typeof next !== 'object') {
    return base as ModuleRef<S, A, Tags, Def> & Record<string, unknown>
  }

  return { ...base, ...(next as Record<string, unknown>) }
}
