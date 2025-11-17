import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('StateTrait.computed deps-as-args', () => {
  const ItemSchema = Schema.Struct({
    x: Schema.Number,
    y: Schema.Number,
    sum: Schema.String,
  })

  type Item = Schema.Schema.Type<typeof ItemSchema>

  const StateSchema = Schema.Struct({
    a: Schema.String,
    b: Schema.String,
    out: Schema.String,
    items: Schema.Array(ItemSchema),
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  it('injects deps values in declared order', () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      out: Logix.StateTrait.computed({
        deps: ['b', 'a'],
        get: (b, a) => `${b}:${a}`,
      }),
    })

    const entry = traits.out as Logix.StateTrait.StateTraitEntry<State, 'out'>
    if (!entry || entry.kind !== 'computed') {
      throw new Error('expected computed entry for out')
    }

    const state: State = {
      a: 'A',
      b: 'B',
      out: '',
      items: [],
    }

    expect(entry.meta.derive(state)).toEqual('B:A')
  })

  it('keeps list.item order and prefixes deps in normalized entries', () => {
    const getSum: (y: number, x: number) => string = (y, x) => `${y}:${x}`

    const traits = Logix.StateTrait.from(StateSchema)({
      items: Logix.StateTrait.list({
        item: Logix.StateTrait.node<Item>({
          computed: {
            sum: Logix.StateTrait.computed({
              deps: ['y', 'x'],
              get: getSum,
            }),
          },
        }),
      }),
    })

    const program = Logix.StateTrait.build(StateSchema, traits)
    const entry = program.entries.find((e) => e.kind === 'computed' && e.fieldPath === 'items[].sum') as
      | Logix.StateTrait.StateTraitEntry<any, any>
      | undefined

    if (!entry || entry.kind !== 'computed') {
      throw new Error('expected computed entry for items[].sum')
    }

    expect((entry.meta as any).deps).toEqual(['items[].y', 'items[].x'])
    expect(entry.meta.derive({ x: 1, y: 2 } as any)).toEqual('2:1')
  })

  it('does not expose (state) => ... in computed.get', () => {
    const traits = Logix.StateTrait.from(StateSchema)({
      out: Logix.StateTrait.computed({
        deps: ['a', 'b'],
        // @ts-expect-error deps-as-args: get 不再暴露 (state)=>，避免隐式 state 访问
        get: (state) => state.a + state.b,
      }),
    })

    expect(traits).toBeDefined()
  })
})
