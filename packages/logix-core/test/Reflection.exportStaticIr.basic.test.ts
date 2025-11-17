import { describe, it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import * as Logix from '../src/index.js'

describe('Reflection.exportStaticIr (basic)', () => {
  it('should return undefined when module has no traits', () => {
    const Root = Logix.Module.make('Reflection.StaticIr.None', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    const program = Root.implement({ initial: { value: 0 }, logics: [] })
    expect(Logix.Reflection.exportStaticIr(program)).toBeUndefined()
  })

  it('should export deterministic StaticIR when module has StateTrait program', () => {
    const StateSchema = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
      sum: Schema.Number,
    })
    const Root = Logix.Module.make('Reflection.StaticIr.Basic', {
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

    const a = Logix.Reflection.exportStaticIr(program)
    const b = Logix.Reflection.exportStaticIr(program)

    expect(a).toBeDefined()
    expect(a).toEqual(b)
    expect(a?.moduleId).toBe('Reflection.StaticIr.Basic')
    expect(a?.digest).toMatch(/^stir:/)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
