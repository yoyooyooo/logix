import { describe, expect, it } from 'vitest'
import * as Query from '../../src/index.js'

describe('Query root surface boundary', () => {
  it('should keep only the program-first root entries on package root', () => {
    const root = Query as Record<string, unknown>
    const legacyFieldsKey = ['tr', 'aits'].join('')

    expect(typeof root.make).toBe('function')
    expect(root.Engine).toBeDefined()
    expect((root.Engine as Record<string, unknown>).Resource).toBeDefined()
    expect(root.TanStack).toBeUndefined()

    expect(legacyFieldsKey in root).toBe(false)
    expect('source' in root).toBe(false)
    expect('querySurface' in root).toBe(false)
  })
})
