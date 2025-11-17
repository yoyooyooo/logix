import { describe, expect, test } from 'vitest'
import { dirtyPathsToRootIds, makeFieldPathIdRegistry } from '../../../src/internal/field-path.js'

describe('field-path dirtyAll reason mapping', () => {
  test("wildcard '*' maps to unknownWrite", () => {
    const registry = makeFieldPathIdRegistry([['a'], ['b']])
    const out = dirtyPathsToRootIds({ dirtyPaths: ['*'], registry })
    expect(out.dirtyAll).toBe(true)
    expect(out.reason).toBe('unknownWrite')
    expect(out.rootIds).toEqual([])
  })

  test("wildcard '*' takes precedence over specific roots", () => {
    const registry = makeFieldPathIdRegistry([['a'], ['a', 'b']])
    const out = dirtyPathsToRootIds({ dirtyPaths: ['a.b', '*'], registry })
    expect(out.dirtyAll).toBe(true)
    expect(out.reason).toBe('unknownWrite')
    expect(out.rootIds).toEqual([])
  })

  test('empty dirtyPaths maps to unknownWrite', () => {
    const registry = makeFieldPathIdRegistry([['a']])
    const out = dirtyPathsToRootIds({ dirtyPaths: [], registry })
    expect(out.dirtyAll).toBe(true)
    expect(out.reason).toBe('unknownWrite')
    expect(out.rootIds).toEqual([])
  })

  test('invalid path maps to nonTrackablePatch', () => {
    const registry = makeFieldPathIdRegistry([['a']])
    const out = dirtyPathsToRootIds({ dirtyPaths: [['a[0][']], registry })
    expect(out.dirtyAll).toBe(true)
    expect(out.reason).toBe('nonTrackablePatch')
    expect(out.rootIds).toEqual([])
  })

  test('missing registry id maps to fallbackPolicy', () => {
    const registry = makeFieldPathIdRegistry([['a']])
    const out = dirtyPathsToRootIds({ dirtyPaths: ['b'], registry })
    expect(out.dirtyAll).toBe(true)
    expect(out.reason).toBe('fallbackPolicy')
    expect(out.rootIds).toEqual([])
  })

  test('string paths in registry use direct lookup and keep prefix canonicalization', () => {
    const registry = makeFieldPathIdRegistry([['a'], ['a', 'b'], ['b0']])
    const out = dirtyPathsToRootIds({ dirtyPaths: ['a.b', 'a', 'b0', 'a.b'], registry })
    expect(out.dirtyAll).toBe(false)
    expect(out.rootIds).toEqual([0, 2])
  })

  test("dot-path ambiguity between ['a','b'] and ['a.b'] maps string input to fallbackPolicy", () => {
    const registry = makeFieldPathIdRegistry([['a', 'b'], ['a.b']])
    const out = dirtyPathsToRootIds({ dirtyPaths: ['a.b'], registry })
    expect(out.dirtyAll).toBe(true)
    expect(out.reason).toBe('fallbackPolicy')
    expect(out.rootIds).toEqual([])
  })

  test('invalid path takes precedence over missing registry id', () => {
    const registry = makeFieldPathIdRegistry([['a']])
    const out = dirtyPathsToRootIds({ dirtyPaths: ['b', ['a[0][']], registry })
    expect(out.dirtyAll).toBe(true)
    expect(out.reason).toBe('nonTrackablePatch')
    expect(out.rootIds).toEqual([])
  })
})
