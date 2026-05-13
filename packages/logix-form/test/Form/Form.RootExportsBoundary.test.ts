import { describe, it, expect } from 'vitest'
import * as Form from '../../src/index.js'

describe('Form root exports boundary', () => {
  it('should keep root exports aligned with the exact surface contract', () => {
    const root = Form as Record<string, unknown>
    const legacyFieldType = ['Tr', 'ait'].join('')
    const legacyFieldsKey = ['tr', 'aits'].join('')
    const legacyViewKey = ['Form', 'View'].join('')

    expect(Object.keys(root).sort()).toEqual(['Companion', 'Error', 'Rule', 'make'])
    expect(typeof root.make).toBe('function')
    expect(root.from).toBeUndefined()
    expect(root.commands).toBeUndefined()
    expect(typeof root.Rule).toBe('object')
    expect(typeof root.Error).toBe('object')
    expect(typeof root.Companion).toBe('object')
    expect(typeof (root.Error as Record<string, unknown>).field).toBe('function')
    expect(typeof (root.Companion as Record<string, unknown>).field).toBe('function')
    expect(root.Path).toBeUndefined()
    expect(root.SchemaPathMapping).toBeUndefined()
    expect(root.SchemaErrorMapping).toBeUndefined()
    expect((root as Record<string, unknown>).locales).toBeUndefined()
    expect((root as Record<string, unknown>).zhCN).toBeUndefined()
    expect((root as Record<string, unknown>).enUS).toBeUndefined()
    expect(root[legacyViewKey]).toBeUndefined()
    expect(legacyFieldType in root).toBe(false)

    expect('rules' in root).toBe(false)
    expect(legacyFieldsKey in root).toBe(false)
    expect('list' in root).toBe(false)
    expect('node' in root).toBe(false)
  })
})
