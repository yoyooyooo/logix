import { describe, it, expect } from 'vitest'
import { shallow } from '../../src/index.js'

describe('shallow', () => {
  it('compares arrays by items', () => {
    expect(shallow([1, 2], [1, 2])).toBe(true)
    expect(shallow([1, 2], [2, 1])).toBe(false)
    expect(shallow([1], [1, 2])).toBe(false)
  })

  it('compares objects by own enumerable keys', () => {
    expect(shallow({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
    expect(shallow({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(shallow({ a: 1 }, { a: 2 })).toBe(false)
  })

  it('compares Map by entries (key identity + value Object.is)', () => {
    const a = new Map<any, any>([
      ['k1', 1],
      ['k2', { v: 1 }],
    ])
    const b = new Map<any, any>([
      ['k1', 1],
      ['k2', { v: 1 }],
    ])
    expect(shallow(a, b)).toBe(false) // value 引用不同
    b.set('k2', a.get('k2'))
    expect(shallow(a, b)).toBe(true)
  })

  it('compares Set by values (value identity)', () => {
    expect(shallow(new Set([1, 2]), new Set([1, 2]))).toBe(true)
    expect(shallow(new Set([1, 2]), new Set([2, 3]))).toBe(false)
  })
})
