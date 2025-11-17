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
    const Root = Logix.Module.make('Reflection.Manifest.Composed', {
      state: StateSchema,
      actions: { noop: Schema.Void },
      traits: Logix.StateTrait.from(StateSchema)({
        sum: Logix.StateTrait.computed({
          deps: ['a', 'b'],
          get: (a, b) => a + b,
        }),
      }),
      schemas: {
        SomeSchema: Schema.String,
      },
    })

    const program = Root.implement({ initial: { a: 1, b: 2, sum: 0 }, logics: [] })
    const manifest = Logix.Reflection.extractManifest(program)

    expect(manifest.moduleId).toBe('Reflection.Manifest.Composed')
    expect(manifest.actionKeys).toEqual(['noop'])
    expect(manifest.schemaKeys).toEqual(['SomeSchema'])
  })
})
