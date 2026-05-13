import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('FieldKernel.computed deps-as-args', () => {
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
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      out: FieldContracts.fieldComputed({
        deps: ['b', 'a'],
        get: (b, a) => `${b}:${a}`,
      }),
    })

    const entry = fieldSpec.out as FieldContracts.FieldEntry<State, 'out'>
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

    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      items: FieldContracts.fieldList({
        item: FieldContracts.fieldNode<Item>({
          computed: {
            sum: FieldContracts.fieldComputed({
              deps: ['y', 'x'],
              get: getSum,
            }),
          },
        }),
      }),
    })

    const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)
    const entry = program.entries.find((e) => e.kind === 'computed' && e.fieldPath === 'items[].sum') as
      | FieldContracts.FieldEntry<any, any>
      | undefined

    if (!entry || entry.kind !== 'computed') {
      throw new Error('expected computed entry for items[].sum')
    }

    expect((entry.meta as any).deps).toEqual(['items[].y', 'items[].x'])
    expect(entry.meta.derive({ x: 1, y: 2 } as any)).toEqual('2:1')
  })

  it('does not expose (state) => ... in computed.get', () => {
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      out: FieldContracts.fieldComputed({
        deps: ['a', 'b'],
        // @ts-expect-error deps-as-args: get no longer exposes (state)=> to avoid implicit state access
        get: (state) => state.a + state.b,
      }),
    })

    expect(fieldSpec).toBeDefined()
  })
})
