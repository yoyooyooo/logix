import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Module.make extend def (actions/reducers)', () => {
  it.scoped('merges base + extension actions/reducers', () => {
    const State = Schema.Struct({ count: Schema.Number })
    type S = Schema.Schema.Type<typeof State>

    const BaseActions = { inc: Schema.Void } as const

    const baseReducers = {
      inc: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
        draft.count += 1
      }),
    } satisfies Logix.ReducersFromMap<typeof State, typeof BaseActions>

    const ExtActions = { dec: Schema.Void } as const

    const extend = {
      actions: ExtActions,
      reducers: {
        dec: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
          draft.count -= 1
        }),
      },
    } satisfies Logix.Module.MakeExtendDef<typeof State, typeof BaseActions, typeof ExtActions>

    const M = Logix.Module.make(
      'Module.make.extend.merge',
      {
        state: State,
        actions: BaseActions,
        reducers: baseReducers,
      },
      extend,
    )

    return Effect.gen(function* () {
      const rt = yield* M.tag

      const desc = Logix.Module.descriptor(M as any, rt as any)
      expect(desc.actionKeys.slice().sort()).toEqual(['dec', 'inc'])

      yield* rt.dispatch({ _tag: 'inc', payload: undefined } as any)
      yield* rt.dispatch({ _tag: 'dec', payload: undefined } as any)
      expect(yield* rt.getState).toEqual({ count: 0 })
    }).pipe(Effect.provide(M.live({ count: 0 })))
  })

  it.scoped('allows overriding base reducers', () => {
    const State = Schema.Struct({ count: Schema.Number })
    type S = Schema.Schema.Type<typeof State>

    const Actions = { inc: Schema.Void } as const

    const M = Logix.Module.make(
      'Module.make.extend.overrideReducer',
      {
        state: State,
        actions: Actions,
        reducers: {
          inc: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
            draft.count += 1
          }),
        },
      },
      {
        reducers: {
          inc: Logix.Module.Reducer.mutate((draft: Logix.Logic.Draft<S>) => {
            draft.count += 2
          }),
        },
      },
    )

    return Effect.gen(function* () {
      const rt = yield* M.tag
      yield* rt.dispatch({ _tag: 'inc', payload: undefined } as any)
      expect(yield* rt.getState).toEqual({ count: 2 })
    }).pipe(Effect.provide(M.live({ count: 0 })))
  })

  it('rejects overriding action schemas', () => {
    const State = Schema.Struct({ count: Schema.Number })
    const Actions = { inc: Schema.Void } as const

    expect(() =>
      Logix.Module.make('Module.make.extend.actionConflict', { state: State, actions: Actions }, {
        actions: { inc: Schema.Number },
      } as any),
    ).toThrow(/action key \"inc\" already exists/)
  })

  it('rejects reducers for unknown action keys', () => {
    const State = Schema.Struct({ count: Schema.Number })
    const Actions = { inc: Schema.Void } as const

    expect(() =>
      Logix.Module.make('Module.make.extend.reducerUnknownAction', { state: State, actions: Actions }, {
        reducers: { boom: (_s: any) => ({ count: 0 }) },
      } as any),
    ).toThrow(/reducer key \"boom\"/)
  })
})
