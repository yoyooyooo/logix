import { describe, expect, it } from 'vitest'
import * as Query from '../../src/index.js'

describe('Query output mode boundary', () => {
  it('should expose query public entries directly without metadata shell', () => {
    const legacyFieldsKey = ['tr', 'aits'].join('')
    expect(Object.keys(Query).sort()).toEqual(['Engine', 'make'])
    expect(typeof Query.make).toBe('function')
    expect(legacyFieldsKey in (Query as any)).toBe(false)
    expect('source' in (Query as any)).toBe(false)
    expect(Query.Engine).toBeDefined()
    expect(Query.TanStack).toBeUndefined()
    expect('querySurface' in (Query as any)).toBe(false)
  })
})
