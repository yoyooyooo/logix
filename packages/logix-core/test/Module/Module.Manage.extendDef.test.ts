import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Module.Manage.make (factory) forwards extend def', () => {
  it.scoped('custom factory can extend actions + override reducers', () => {
    const State = Schema.Struct({
      total: Schema.Number,
      error: Schema.String,
    })
    type S = Schema.Schema.Type<typeof State>

    const BaseActions = {
      clearError: Schema.Void,
    } as const

    const ExtActions = {
      setTotal: Schema.Number,
    } as const

    const baseReducers = {
      clearError: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
        draft.error = 'base'
      }),
    } satisfies Logix.ReducersFromMap<typeof State, typeof BaseActions>

    type Spec = { readonly initialTotal: number }

    const Factory = Logix.Module.Manage.make({
      kind: 'test-manage',
      define: (
        id: string,
        spec: Spec,
        extend: Logix.Module.MakeExtendDef<typeof State, typeof BaseActions, typeof ExtActions>,
      ) => {
        const def = {
          state: State,
          actions: BaseActions,
          reducers: baseReducers,
          meta: { kind: 'test-manage' },
        }

        const module = Logix.Module.make(id, def, extend)

        return module.implement({
          initial: { total: spec.initialTotal, error: 'init' },
        })
      },
    })

    const M = Factory.make('Module.Manage.extend.custom', { initialTotal: 0 }, {
      actions: ExtActions,
      reducers: {
        setTotal: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>, total) => {
          draft.total = total
        }),
        clearError: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
          draft.error = 'cleared'
        }),
      },
    } satisfies Logix.Module.MakeExtendDef<typeof State, typeof BaseActions, typeof ExtActions>)

    return Effect.gen(function* () {
      expect(Logix.Module.is(M)).toBe(true)
      expect(Logix.Module.hasImpl(M)).toBe(true)

      const rt = yield* M.tag
      const desc = Logix.Module.descriptor(M as any, rt as any)
      expect(desc.actionKeys.slice().sort()).toEqual(['clearError', 'setTotal'])

      yield* rt.dispatch({ _tag: 'setTotal', payload: 42 } as any)
      const s1: any = yield* rt.getState
      expect(s1.total).toBe(42)

      yield* rt.dispatch({ _tag: 'clearError', payload: undefined } as any)
      const s2: any = yield* rt.getState
      expect(s2.error).toBe('cleared')
    }).pipe(Effect.provide(M.impl.layer))
  })
})
