import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import { describe, it, expect } from '@effect/vitest'

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

type Expect<T extends true> = T

type IsEffect<T> = T extends Effect.Effect<any, any, any> ? true : false
type NotEffect<T> = IsEffect<T> extends true ? false : true

const State = Schema.Struct({ value: Schema.Number })

const M = Logix.Module.make('Types.ActionSurface', {
  state: State,
  actions: {
    inc: Schema.Void,
    add: Schema.Number,
  } as const,
})

M.logic(($) =>
  Effect.gen(function* () {
    const a1 = $.actions.add(1)
    const e1 = $.dispatchers.add(1)

    type _a1_is_action = Expect<Equal<typeof a1, { readonly _tag: 'add'; readonly payload: number }>>
    type _a1_not_effect = Expect<NotEffect<typeof a1>>
    type _e1_is_effect = Expect<IsEffect<typeof e1>>

    // @ts-expect-error payload type should be inferred from schema (number)
    $.actions.add('x')
    // @ts-expect-error payload type should be inferred from schema (number)
    $.dispatchers.add('x')

    const incAction = $.actions.inc()
    const incEff = $.dispatchers.inc()

    type _inc_not_effect = Expect<NotEffect<typeof incAction>>
    type _inc_eff_is_effect = Expect<IsEffect<typeof incEff>>

    // @ts-expect-error void action should not accept payload
    $.actions.inc(1)
    // @ts-expect-error void dispatcher should not accept payload
    $.dispatchers.inc(1)

    yield* $.onAction($.actions.add).run((payload) => {
      type _payload_is_number = Expect<Equal<typeof payload, number>>
      return Effect.void
    })
  }),
)

describe('types: ActionSurface', () => {
  it('compiles', () => {
    expect(true).toBe(true)
  })
})
