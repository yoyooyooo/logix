import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as Crud from '../../src/Crud.js'
import type { CrudProgram } from '../../src/Crud.js'
import * as Domain from '../../src/index.js'

type CrudProgramSmoke = CrudProgram<'Domain.CrudProgramSmoke', { id: string }, { pageSize: number }, string>
const _crudProgramSmoke: CrudProgramSmoke | null = null

describe('Domain pattern-kit boundary', () => {
  it('should keep the root barrel empty and move CRUD contract to ./Crud', () => {
    expect(typeof Crud.make).toBe('function')
    expect(Object.keys(Domain)).toEqual([])
    expect('crudPatternKitSurface' in (Domain as any)).toBe(false)
    expect('Crud' in Domain).toBe(false)
    expect('make' in Domain).toBe(false)
    expect(_crudProgramSmoke).toBeNull()
  })

  it('should describe the package as program-first pattern kits instead of domain modules', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(typeof pkg.description).toBe('string')
    expect(pkg.description).toContain('pattern kits')
    expect(pkg.description).not.toContain('Domain modules')
    expect(pkg.description).not.toContain('Module.Manage')
    expect(pkg.exports['.']).toBeNull()
    expect(pkg.exports['./*']).toBeUndefined()
    expect(pkg.exports['./Crud']).toBe('./src/Crud.ts')
  })
})
