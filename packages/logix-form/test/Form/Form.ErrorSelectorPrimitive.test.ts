import { describe, expect, it } from 'vitest'
import * as Form from '../../src/index.js'

describe('Form.Error selector primitive', () => {
  it('exposes Form.Error.field(path) as the field error selector entry', () => {
    expect(typeof Form.Error.field).toBe('function')
  })

  it('returns an opaque non-executable descriptor', () => {
    const descriptor = Form.Error.field('profile.name') as Record<string, unknown>

    expect(typeof descriptor).toBe('object')
    expect(descriptor).not.toBeNull()
    expect(Array.isArray(descriptor)).toBe(false)
    expect(typeof descriptor).not.toBe('function')
    expect(Object.keys(descriptor)).toEqual([])
    expect('path' in descriptor).toBe(false)
    expect('order' in descriptor).toBe(false)
    expect('reasonSlotId' in descriptor).toBe(false)
    expect('blockingBasis' in descriptor).toBe(false)
  })
})
