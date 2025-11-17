import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import * as Form from '../../src/index.js'

describe('Form.Rule.merge', () => {
  it('fails on duplicate ruleName (stable)', () => {
    const a = Form.Rule.make<string>({ validate: { a: () => 'a' } })
    const b = Form.Rule.make<string>({ validate: { a: () => 'b' } })
    expect(() => Form.Rule.merge(a, b)).toThrow(/Duplicate rule name/)
  })

  it('keeps deterministic execution order (sorted by ruleName)', () => {
    const a = Form.Rule.make<string>({ validate: { c: () => 'c', a: () => 'a' } })
    const b = Form.Rule.make<string>({ validate: { b: () => 'b' } })

    const merged1 = Form.Rule.merge(a, b)
    const merged2 = Form.Rule.merge(b, a)

    expect(Object.keys(merged1)).toEqual(['a', 'b', 'c'])
    expect(Object.keys(merged2)).toEqual(['a', 'b', 'c'])
  })
})
