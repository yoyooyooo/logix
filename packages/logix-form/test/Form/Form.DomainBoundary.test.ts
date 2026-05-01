import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as Form from '../../src/index.js'

describe('Form domain boundary', () => {
  it('should expose only the surviving exact root surface', () => {
    const legacyFieldsKey = ['tr', 'aits'].join('')
    const legacyFieldType = ['Tr', 'ait'].join('')
    const legacyViewKey = ['Form', 'View'].join('')
    const root = Form as any

    expect(Object.keys(root).sort()).toEqual(['Companion', 'Error', 'Rule', 'make'])
    expect('derived' in root).toBe(false)
    expect('computed' in root).toBe(false)
    expect('link' in root).toBe(false)
    expect('source' in root).toBe(false)
    expect('companion' in root).toBe(false)
    expect(typeof root.make).toBe('function')
    expect(root.from).toBeUndefined()
    expect(root.commands).toBeUndefined()
    expect(root[legacyViewKey]).toBeUndefined()
    expect(root.Rule).toBeDefined()
    expect(root.Error).toBeDefined()
    expect(root.Companion).toBeDefined()
    expect(root.Path).toBeUndefined()
    expect(root.SchemaPathMapping).toBeUndefined()
    expect(root.SchemaErrorMapping).toBeUndefined()
    expect('rules' in root).toBe(false)
    expect(legacyFieldsKey in root).toBe(false)
    expect('list' in root).toBe(false)
    expect('node' in root).toBe(false)
    expect(root[legacyFieldType]).toBeUndefined()
    expect('formDomainSurface' in root).toBe(false)
  })

  it('should not expose the legacy react subpath from package exports', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as {
      exports?: Record<string, unknown>
      publishConfig?: { exports?: Record<string, unknown> }
    }

    expect(packageJson.exports?.['./react']).toBeUndefined()
    expect(packageJson.publishConfig?.exports?.['./react']).toBeUndefined()
  })

  it('keeps declaration authority above field-kernel install/build', () => {
    const kernelInstall = readFileSync(
      new URL('../../../logix-core/src/internal/field-kernel/install.ts', import.meta.url),
      'utf8',
    )
    const kernelBuild = readFileSync(
      new URL('../../../logix-core/src/internal/field-kernel/build.ts', import.meta.url),
      'utf8',
    )

    expect(kernelInstall).toMatch(/declaration-authority boundary/i)
    expect(kernelInstall).toMatch(/compiled field program/i)
    expect(kernelBuild).toMatch(/declaration-authority boundary/i)
    expect(kernelBuild).toMatch(/already-declared field specs/i)
  })
})
