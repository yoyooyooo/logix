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

type AnyActionToken = Logix.Action.ActionToken<string, any, any>
type ActionTokenPayload<T> = T extends Logix.Action.ActionToken<any, infer P, any> ? P : never

export type ModuleDispatchersOfShape<Sh extends Logix.AnyModuleShape> = Sh['actionMap']

export type ModuleActions<A, Tags extends string = ActionTags<A>> = {
  readonly dispatch: Dispatch<A>
} & ([ActionTags<A>] extends [never]
  ? {}
  : {
      readonly [K in Tags & ActionTags<A>]: ActionFn<ActionPayload<A, K>, void>
    })

type ActionMapOfDef<Def> = Def extends { readonly actions: infer ActionMap } ? ActionMap : never

export type ModuleDispatchers<A, Tags extends string = ActionTags<A>, Def = unknown> = [ActionMapOfDef<Def>] extends [
  never,
]
  ? [ActionTags<A>] extends [never]
    ? {}
    : {
        readonly [K in Tags & ActionTags<A>]: ActionFn<ActionPayload<A, K>, Extract<A, { readonly _tag: K } | { readonly type: K }>>
      }
  : ActionMapOfDef<Def> extends Record<string, AnyActionToken>
    ? ActionMapOfDef<Def>
    : [ActionTags<A>] extends [never]
      ? {}
      : {
          readonly [K in Tags & ActionTags<A>]: ActionFn<
            ActionPayload<A, K>,
            Extract<A, { readonly _tag: K } | { readonly type: K }>
          >
        }

export interface ModuleImports {
  readonly get: <Id extends string, Sh extends Logix.AnyModuleShape>(
    module: Logix.ModuleTagType<Id, Sh>,
  ) => ModuleRef<
    Logix.StateOf<Sh>,
    Logix.ActionOf<Sh>,
    keyof Sh['actionMap'] & string,
    Logix.ModuleTagType<Id, Sh>,
    ModuleDispatchersOfShape<Sh>
  >
}

export interface ModuleRef<
  S,
  A,
  Tags extends string = ActionTags<A>,
  Def = unknown,
  Dispatchers = ModuleDispatchers<A, Tags, Def>,
> {
  /**
   * Definition anchor (typically a ModuleTag) for reflecting actions/reducers/source and other metadata.
   * - DX: when `runtime.actions.*` can't jump to source, use `ref.def?.reducers?.xxx` / `ref.def?.actions.xxx` to locate definitions quickly.
   */
  readonly def?: Def
  readonly runtime: Logix.ModuleRuntime<S, A>
  readonly dispatch: Dispatch<A>
  readonly actions: ModuleActions<A, Tags>
  readonly dispatchers: Dispatchers
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

export function makeModuleDispatchers<A, Tokens extends Record<string, AnyActionToken>>(
  dispatch: Dispatch<A>,
  tokens: Tokens,
): Tokens
export function makeModuleDispatchers<A, Tags extends string = ActionTags<A>>(
  dispatch: Dispatch<A>,
): ModuleDispatchers<A, Tags>
export function makeModuleDispatchers<A>(dispatch: Dispatch<A>, tokens?: Record<string, AnyActionToken>): unknown {
  const cache = new Map<PropertyKey, unknown>()

  if (tokens) {
    const out: Record<string, AnyActionToken> = {}

    for (const [key, token] of Object.entries(tokens)) {
      const fn: AnyActionToken = Object.assign(
        ((...args: readonly [unknown?]) => {
          const action = token(...args)
          dispatch(action as unknown as A)
          return action
        }) as unknown as AnyActionToken,
        token,
      )

      out[key] = fn
    }

    return out
  }

  const api = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (cache.has(prop)) {
          return cache.get(prop)
        }

        // Prevent Promise-like (thenable) misdetection: dispatchers should not be absorbed by await/Promise.resolve.
        if (prop === 'then' || prop === 'dispatch' || typeof prop !== 'string') {
          return undefined
        }

        const fn = (...args: readonly [unknown?]) => {
          const payload = args[0]
          const action = { _tag: prop, payload } as unknown as A
          dispatch(action)
          return action
        }

        cache.set(prop, fn)
        return fn
      },
    },
  )

  return api
}

const HANDLE_EXTEND = Symbol.for('logix.module.handle.extend')

type ObjectLike = object | ((...args: unknown[]) => unknown)

const isObjectLike = (value: unknown): value is ObjectLike =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

export const applyHandleExtend = <S, A, Tags extends string, Def, Dispatchers>(
  tag: unknown,
  runtime: Logix.ModuleRuntime<S, A>,
  base: ModuleRef<S, A, Tags, Def, Dispatchers>,
): ModuleRef<S, A, Tags, Def, Dispatchers> & Record<string, unknown> => {
  if (!isObjectLike(tag)) {
    return base as ModuleRef<S, A, Tags, Def, Dispatchers> & Record<string, unknown>
  }

  const extend = (tag as Record<PropertyKey, unknown>)[HANDLE_EXTEND] as unknown

  if (typeof extend !== 'function') {
    return base as ModuleRef<S, A, Tags, Def, Dispatchers> & Record<string, unknown>
  }

  const next = (
    extend as (runtime: Logix.ModuleRuntime<S, A>, base: ModuleRef<S, A, Tags, Def, Dispatchers>) => unknown
  )(
    runtime,
    base,
  )
  if (!next || typeof next !== 'object') {
    return base as ModuleRef<S, A, Tags, Def, Dispatchers> & Record<string, unknown>
  }

  return { ...base, ...(next as Record<string, unknown>) }
}
