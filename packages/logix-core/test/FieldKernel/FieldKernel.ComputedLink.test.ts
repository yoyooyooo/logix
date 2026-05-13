import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('FieldKernel DSL (computed & link)', () => {
  const StateSchema = Schema.Struct({
    a: Schema.Number,
    b: Schema.Number,
    sum: Schema.Number,
    source: Schema.Struct({
      name: Schema.String,
    }),
    target: Schema.String,
  })

  type State = Schema.Schema.Type<typeof StateSchema>

  // Helper: minimal path getter for tests (not part of production runtime code).
  const getByPath = (state: State, path: string): unknown =>
    path.split('.').reduce((acc: any, key) => (acc == null ? acc : acc[key]), state)

  it('should create computed entry with derive function that can be used to recompute value', () => {
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      sum: FieldContracts.fieldComputed({
        deps: ['a', 'b'],
        get: (a, b) => a + b,
      }),
    })

    const entry = fieldSpec.sum as FieldContracts.FieldEntry<State, 'sum'>
    if (!entry || entry.kind !== 'computed') {
      throw new Error('expected computed entry for sum')
    }

    const state: State = {
      a: 1,
      b: 2,
      sum: 0,
      source: { name: 'Alice' },
      target: '',
    }

    const next = entry.meta.derive(state)
    expect(next).toEqual(3)
  })

  it('should create link entry whose meta.from can drive simple link behavior', () => {
    const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
      // target follows source.name
      target: FieldContracts.fieldLink({
        from: 'source.name',
      }),
    })

    const entry = fieldSpec.target as FieldContracts.FieldEntry<State, 'target'>
    if (!entry || entry.kind !== 'link') {
      throw new Error('expected link entry for target')
    }

    const state: State = {
      a: 0,
      b: 0,
      sum: 0,
      source: { name: 'Bob' },
      target: '',
    }

    const sourceValue = getByPath(state, entry.meta.from)
    const next: State = {
      ...state,
      target: String(sourceValue),
    }

    expect(next.target).toEqual('Bob')
  })
})
