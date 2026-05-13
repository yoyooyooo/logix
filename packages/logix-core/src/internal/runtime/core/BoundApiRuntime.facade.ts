import { Effect, ServiceMap, Stream } from 'effect'
import * as Action from '../../action.js'
import type * as Logix from './module.js'
import type { BoundApi } from './module.js'

export const actionMatchesTag = (action: unknown, tag: string): boolean => {
  const actionTag = (action as any)?._tag
  if (actionTag === tag) {
    return true
  }
  const actionType = (action as any)?.type
  return actionType === tag
}

export const makeActionStreamByTag = <Sh extends Logix.AnyModuleShape>(
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
) =>
  (tag: string): Stream.Stream<Logix.ActionOf<Sh>> => {
    const topicSelector = runtime.actionsByTag$
    if (typeof topicSelector === 'function') {
      return topicSelector(tag)
    }
    return runtime.actions$.pipe(Stream.filter((action: unknown) => actionMatchesTag(action, tag)))
  }

export const buildModuleHandle = (
  tag: ServiceMap.Key<any, Logix.ModuleRuntime<any, any>>,
  rt: Logix.ModuleRuntime<any, any>,
): unknown => {
  const actionsProxy: Logix.ModuleHandle<any>['actions'] = new Proxy(
    {},
    {
      get: (_target, prop) => (payload: unknown) =>
        rt.dispatch({
          _tag: prop as string,
          payload,
        }),
    },
  ) as Logix.ModuleHandle<any>['actions']

  const handle: Logix.ModuleHandle<any> = {
    read: (selector) => Effect.map(rt.getState, selector),
    changes: rt.changes,
    dispatch: rt.dispatch,
    actions$: rt.actions$,
    actions: actionsProxy,
  }

  const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
  const extend = (tag as any)?.[EXTEND_HANDLE] as
    | ((runtime: Logix.ModuleRuntime<any, any>, base: Logix.ModuleHandle<any>) => unknown)
    | undefined

  return typeof extend === 'function' ? (extend(rt, handle) ?? handle) : handle
}

export const makeDispatchers = <Sh extends Logix.AnyModuleShape>(
  actions: BoundApi<Sh, never>['actions'],
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
): BoundApi<Sh, never>['dispatchers'] => {
  const dispatcherCache = new Map<string, (...args: any[]) => Effect.Effect<void, any, any>>()
  const hasAction = (key: string): boolean => Object.prototype.hasOwnProperty.call(actions as any, key)

  return new Proxy({} as any, {
    get: (_target, prop) => {
      if (typeof prop !== 'string') return undefined
      if (!hasAction(prop)) return undefined

      const cached = dispatcherCache.get(prop)
      if (cached) return cached

      const token = (actions as any)[prop] as Action.AnyActionToken
      const fn = (...args: any[]) => runtime.dispatch((token as any)(...args))

      dispatcherCache.set(prop, fn)
      return fn
    },
    has: (_target, prop) => typeof prop === 'string' && hasAction(prop),
    ownKeys: () => Object.keys(actions as any),
    getOwnPropertyDescriptor: (_target, prop) => {
      if (typeof prop !== 'string') return undefined
      if (!hasAction(prop)) return undefined
      return { enumerable: true, configurable: true }
    },
  }) as unknown as BoundApi<Sh, never>['dispatchers']
}

export const makeDispatch = <Sh extends Logix.AnyModuleShape>(
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>,
): BoundApi<Sh, never>['dispatch'] =>
  ((...args: any[]) => {
    const [first, second] = args

    if (typeof first === 'string') {
      return runtime.dispatch({ _tag: first, payload: second } as Logix.ActionOf<Sh>)
    }

    if (Action.isActionToken(first)) {
      return runtime.dispatch((first as any)(second))
    }

    return runtime.dispatch(first as Logix.ActionOf<Sh>)
  }) as BoundApi<Sh, never>['dispatch']
