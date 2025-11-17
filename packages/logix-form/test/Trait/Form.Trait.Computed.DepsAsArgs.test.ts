import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import * as Form from '../../src/index.js'

describe('Form.Trait.computed deps-as-args', () => {
  type State = {
    readonly a: string
    readonly b: string
    readonly out: string
  }

  it('injects deps values in declared order', () => {
    const entry = Form.Trait.computed<State, 'out', ['b', 'a']>({
      deps: ['b', 'a'],
      get: (b, a) => `${b}:${a}`,
    })

    expect(entry.kind).toBe('computed')
    expect((entry as any).meta.derive({ a: 'A', b: 'B', out: '' })).toEqual('B:A')
  })

  it('does not expose (state) => ... in computed.get', () => {
    const entry = Form.Trait.computed<State, 'out', ['a', 'b']>({
      deps: ['a', 'b'],
      // @ts-expect-error deps-as-args: `get` no longer exposes `(state) => ...` to avoid implicit state access
      get: (state) => state.a + state.b,
    })

    expect(entry).toBeDefined()
  })
})
