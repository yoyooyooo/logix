import { describe, it, expect } from 'vitest'
import { fnv1a32, stableStringify } from '../../../src/internal/digest.js'

describe('internal/digest · stableStringify', () => {
  it('should sort object keys (stable)', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
    expect(stableStringify({ a: { y: 1, x: 2 }, b: [2, 1] })).toBe('{"a":{"x":2,"y":1},"b":[2,1]}')
  })

  it('should normalize non-JSON values into null', () => {
    expect(stableStringify(undefined)).toBe('null')
    expect(stableStringify(Number.NaN)).toBe('null')
    expect(stableStringify(Number.POSITIVE_INFINITY)).toBe('null')
    expect(stableStringify({ a: undefined })).toBe('{"a":null}')
    expect(stableStringify([undefined, 1])).toBe('[null,1]')
    expect(stableStringify({ a: () => {} })).toBe('{"a":null}')
  })
})

describe('internal/digest · fnv1a32', () => {
  it('should be stable for known inputs', () => {
    expect(fnv1a32('')).toBe('811c9dc5')
    expect(fnv1a32('hello')).toBe('a82fb4a1')
  })
})
