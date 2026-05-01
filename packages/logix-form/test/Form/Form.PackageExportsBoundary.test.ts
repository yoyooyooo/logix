import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('@logixjs/form package exports boundary', () => {
  it('keeps subpaths minimal and exposes locales through an optional subpath', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
    expect(pkg.exports['./*']).toBeUndefined()
    expect(pkg.exports['./Field']).toBeUndefined()
    expect(pkg.exports['./locales']).toBeDefined()
    expect(pkg.publishConfig.exports['./locales']).toBeDefined()
  })
})
