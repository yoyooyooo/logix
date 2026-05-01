import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../src/index.js'

describe('Reflection.extractManifest (composed module)', () => {
  it('should not depend on AST and work for composed/trait modules', () => {
    const StateSchema = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
      sum: Schema.Number,
    })
    const Root = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('Reflection.Manifest.Composed', {
  state: StateSchema,
  actions: { noop: Schema.Void },
  schemas: {
        SomeSchema: Schema.String,
      }
}), FieldContracts.fieldFrom(StateSchema)({
        sum: FieldContracts.fieldComputed({
          deps: ['a', 'b'],
          get: (a, b) => a + b,
        }),
      }))

    const program = Logix.Program.make(Root, { initial: { a: 1, b: 2, sum: 0 }, logics: [] })
    const manifest = CoreReflection.extractManifest(program)

    expect(manifest.moduleId).toBe('Reflection.Manifest.Composed')
    expect(manifest.actionKeys).toEqual(['noop'])
    expect(manifest.schemaKeys).toEqual(['SomeSchema'])
  })
})
