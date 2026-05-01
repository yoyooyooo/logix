import { describe, it, expect } from 'vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicFields - conflicts & consistency checks', () => {
  it('should hard-fail on duplicate fieldId and include all sources', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicFieldsConflictDuplicate', {
      state: State,
      actions: Actions,
    })

    const dup = FieldContracts.fieldFrom(State)({
      sum: FieldContracts.fieldComputed({
        deps: ['value'],
        get: (value) => value,
      }),
    })

    const L1 = M.logic('L#1', ($) => {
      $.fields(dup)
      return Effect.void
    })

    const L2 = M.logic('L#2', ($) => {
      $.fields(dup)
      return Effect.void
    })

    expect(() =>
      Logix.Program.make(M, {
        initial: { value: 1, sum: 0 },
        logics: [L1, L2],
      }),
    ).toThrowError(/\[ModuleFieldsConflictError\]/)
    expect(() =>
      Logix.Program.make(M, {
        initial: { value: 1, sum: 0 },
        logics: [L1, L2],
      }),
    ).toThrowError(/logicUnit:L#1/)
    expect(() =>
      Logix.Program.make(M, {
        initial: { value: 1, sum: 0 },
        logics: [L1, L2],
      }),
    ).toThrowError(/logicUnit:L#2/)
  })

  it('should hard-fail when requires is missing', async () => {
    const State = Schema.Struct({
      a: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicFieldsConflictMissingRequires', {
      state: State,
      actions: Actions,
    })

    const badFields = {
      a: { requires: ['b'] },
    }

    const L = M.logic('L#req', ($) => {
      $.fields(badFields as any)
      return Effect.void
    })

    expect(() =>
      Logix.Program.make(M, {
        initial: { a: 1 },
        logics: [L],
      }),
    ).toThrowError(/missing requires/)
    expect(() =>
      Logix.Program.make(M, {
        initial: { a: 1 },
        logics: [L],
      }),
    ).toThrowError(/logicUnit:L#req/)
  })

  it('should hard-fail on excludes violation and include both sources', async () => {
    const State = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicFieldsConflictExcludes', {
      state: State,
      actions: Actions,
    })

    const L1 = M.logic('L#A', ($) => {
      $.fields({ a: { excludes: ['b'] } } as any)
      return Effect.void
    })

    const L2 = M.logic('L#B', ($) => {
      $.fields({ b: {} } as any)
      return Effect.void
    })

    expect(() =>
      Logix.Program.make(M, {
        initial: { a: 1, b: 2 },
        logics: [L1, L2],
      }),
    ).toThrowError(/excludes violation/)
    expect(() =>
      Logix.Program.make(M, {
        initial: { a: 1, b: 2 },
        logics: [L1, L2],
      }),
    ).toThrowError(/logicUnit:L#A/)
    expect(() =>
      Logix.Program.make(M, {
        initial: { a: 1, b: 2 },
        logics: [L1, L2],
      }),
    ).toThrowError(/logicUnit:L#B/)
  })
})
