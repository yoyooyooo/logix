import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('@logixjs/query package exports boundary', () => {
  it('keeps only explicit public subpaths', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(Object.keys(pkg.exports).sort()).toEqual(['.', './internal/*', './package.json'])
    expect(pkg.exports['./*']).toBeUndefined()
    expect(pkg.exports['./Fields']).toBeUndefined()
    expect(pkg.exports['./TanStack']).toBeUndefined()
  })
})
