import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../src/index.js'

describe('Reflection.exportStaticIr (basic)', () => {
  it('should return undefined when module has no field declarations', () => {
    const Root = Logix.Module.make('Reflection.StaticIr.None', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const program = Logix.Program.make(Root, { initial: { value: 0 }, logics: [] })
    expect(CoreReflection.exportStaticIr(program)).toBeUndefined()
  })

  it('should export deterministic StaticIR when module has a field program', () => {
    const StateSchema = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
      sum: Schema.Number,
    })
    const Root = FieldContracts.withModuleFieldDeclarations(
      Logix.Module.make('Reflection.StaticIr.Basic', {
        state: StateSchema,
        actions: { noop: Schema.Void },
      }),
      FieldContracts.fieldFrom(StateSchema)({
        sum: FieldContracts.fieldComputed({
          deps: ['a', 'b'],
          get: (a, b) => a + b,
        }),
      }),
    )

    const program = Logix.Program.make(Root, { initial: { a: 1, b: 2, sum: 0 }, logics: [] })

    const a = CoreReflection.exportStaticIr(program)
    const b = CoreReflection.exportStaticIr(program)

    expect(a).toBeDefined()
    expect(a).toEqual(b)
    expect(a?.moduleId).toBe('Reflection.StaticIr.Basic')
    expect(a?.digest).toMatch(/^stir:/)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
