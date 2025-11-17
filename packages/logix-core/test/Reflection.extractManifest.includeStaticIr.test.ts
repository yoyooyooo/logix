import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../src/index.js'

describe('Reflection.extractManifest (includeStaticIr)', () => {
  it('should embed StaticIR when includeStaticIr=true', () => {
    const StateSchema = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
      sum: Schema.Number,
    })
    const Root = Logix.Module.make('Reflection.Manifest.IncludeStaticIr', {
      state: StateSchema,
      actions: { noop: Schema.Void },
      traits: Logix.StateTrait.from(StateSchema)({
        sum: Logix.StateTrait.computed({
          deps: ['a', 'b'],
          get: (a, b) => a + b,
        }),
      }),
    })

    const program = Root.implement({ initial: { a: 1, b: 2, sum: 0 }, logics: [] })
    const manifest = Logix.Reflection.extractManifest(program, { includeStaticIr: true })

    expect(manifest.staticIr).toBeDefined()
    expect(manifest.staticIr?.moduleId).toBe('Reflection.Manifest.IncludeStaticIr')
    expect(manifest.staticIr?.digest).toMatch(/^stir:/)
  })
})
