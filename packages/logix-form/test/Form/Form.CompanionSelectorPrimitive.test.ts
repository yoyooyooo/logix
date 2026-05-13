import { describe, expect, it } from 'vitest'
import * as Form from '../../src/index.js'

describe('Form companion selector primitive', () => {
  it('exposes Form.Companion.field(path) as the companion selector entry', () => {
    expect(typeof Form.Companion.field).toBe('function')
  })

  it('returns an opaque non-executable descriptor', () => {
    const descriptor = Form.Companion.field('profileResource') as Record<string, unknown>

    expect(typeof descriptor).toBe('object')
    expect(descriptor).not.toBeNull()
    expect(Array.isArray(descriptor)).toBe(false)
    expect(typeof descriptor).not.toBe('function')
    expect(Object.keys(descriptor)).toEqual([])
    expect(JSON.stringify(descriptor)).toBe('{}')
    expect('path' in descriptor).toBe(false)
    expect('availability' in descriptor).toBe(false)
    expect('candidates' in descriptor).toBe(false)
    expect('sourceRef' in descriptor).toBe(false)
  })

  it('exposes Form.Companion.byRowId(listPath, rowId, fieldPath) as the row-owner selector entry', () => {
    expect(typeof Form.Companion.byRowId).toBe('function')
  })

  it('returns an opaque non-executable row-owner descriptor', () => {
    const descriptor = Form.Companion.byRowId('items', 'row-2', 'warehouseId') as Record<string, unknown>

    expect(typeof descriptor).toBe('object')
    expect(descriptor).not.toBeNull()
    expect(Array.isArray(descriptor)).toBe(false)
    expect(typeof descriptor).not.toBe('function')
    expect(Object.keys(descriptor)).toEqual([])
    expect(JSON.stringify(descriptor)).toBe('{}')
    expect('listPath' in descriptor).toBe(false)
    expect('rowId' in descriptor).toBe(false)
    expect('fieldPath' in descriptor).toBe(false)
    expect('sourceRef' in descriptor).toBe(false)
  })
})
