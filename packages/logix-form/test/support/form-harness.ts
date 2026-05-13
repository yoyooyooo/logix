import * as Logix from '@logixjs/core'
import { Effect, Layer } from 'effect'
import { getAtPath } from '../../src/internal/form/path.js'

const HANDLE_EXTEND = Symbol.for('logix.module.handle.extend')

const makeActionsProxy = <A>(dispatch: (action: A) => Effect.Effect<void>) =>
  new Proxy(
    {},
    {
      get: (_target, prop) => (payload: unknown) =>
        dispatch({
          _tag: prop as string,
          payload,
        } as A),
    },
  )

export const materializeExtendedHandle = <S, A>(
  tag: unknown,
  runtime: Logix.ModuleRuntime<S, A>,
  options?: {
    readonly legacyCompat?: boolean
  },
): Record<string, unknown> => {
  const base = {
    read: <V>(selector: (state: S) => V) => Effect.map(runtime.getState, selector),
    changes: runtime.changes,
    dispatch: runtime.dispatch,
    actions$: runtime.actions$,
    actions: makeActionsProxy(runtime.dispatch),
  }

  const extend = (tag as Record<PropertyKey, unknown> | undefined)?.[HANDLE_EXTEND]
  if (typeof extend !== 'function') return base

  const next = (extend as (rt: Logix.ModuleRuntime<S, A>, baseHandle: Record<string, unknown>) => unknown)(runtime, base)
  if (!next || typeof next !== 'object') return base
  const merged = {
    ...base,
    ...(next as Record<string, unknown>),
  }

  if (options?.legacyCompat === false) {
    return merged
  }

  const withLegacyCompat = {
    ...merged,
    getState: runtime.getState,
  } as Record<string, unknown>

  const rawField = withLegacyCompat.field
  if (typeof rawField === 'function') {
    withLegacyCompat.field = (path: string) => {
      const field = (rawField as (path: string) => Record<string, unknown>)(path)
      return {
        ...field,
        get: Effect.map(runtime.getState, (state: any) => getAtPath(state, path)),
      }
    }
  }

  const rawFieldArray = withLegacyCompat.fieldArray
  if (typeof rawFieldArray === 'function') {
    withLegacyCompat.fieldArray = (path: string) => {
      const fieldArray = (rawFieldArray as (path: string) => Record<string, unknown>)(path)
      return {
        ...fieldArray,
        get: Effect.map(runtime.getState, (state: any) => {
          const value = getAtPath(state, path)
          return Array.isArray(value) ? value : []
        }),
      }
    }
  }

  return withLegacyCompat
}

export const runWithFormHandle = <Result>(
  form: { readonly tag: unknown },
  verify: (handle: Record<string, unknown>, runtime: Logix.ModuleRuntime<any, any>) => Effect.Effect<Result, any, any>,
): Effect.Effect<Result, any, any> => {
  const runtime = Logix.Runtime.make(form as any, {
    layer: Layer.empty as Layer.Layer<any, never, never>,
  })

  const program = Effect.gen(function* () {
    const moduleRuntime = yield* Effect.service(form.tag as never).pipe(Effect.orDie)
    const handle = materializeExtendedHandle(form.tag, moduleRuntime as Logix.ModuleRuntime<any, any>, {
      legacyCompat: false,
    })
    return yield* verify(handle, moduleRuntime as Logix.ModuleRuntime<any, any>)
  })

  return Effect.promise(() => runtime.runPromise(program as Effect.Effect<Result, any, any>))
}
