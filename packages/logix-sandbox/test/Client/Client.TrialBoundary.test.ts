import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as SandboxNS from '@logixjs/sandbox'

describe('Sandbox root trial boundary', () => {
  it('should only expose SandboxClientTag and SandboxClientLayer from root', () => {
    expect(Object.keys(SandboxNS).sort()).toEqual(['SandboxClientLayer', 'SandboxClientTag'])
  })

  it('keeps package exports limited to root, package metadata, vite, and blocked internals', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))

    expect(Object.keys(pkg.exports).sort()).toEqual(['.', './internal/*', './package.json', './vite'])
    expect(pkg.exports['./internal/*']).toBeNull()
    expect(Object.keys(pkg.publishConfig.exports).sort()).toEqual(['.', './internal/*', './package.json', './vite'])
    expect(pkg.publishConfig.exports['./internal/*']).toBeNull()
    expect(pkg.exports['./playground']).toBeUndefined()
    expect(pkg.exports['./runtime']).toBeUndefined()
    expect(pkg.exports['./*']).toBeUndefined()
  })

  it('does not export playground result types or worker action families from public source', () => {
    const publicFiles = [
      '../../src/index.ts',
      '../../src/Client.ts',
      '../../src/Protocol.ts',
      '../../src/Service.ts',
      '../../src/Types.ts',
      '../../src/Vite.ts',
    ]

    const text = publicFiles.map((file) => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n')

    expect(text).not.toContain('PlaygroundRunResult')
    expect(text).not.toContain('Runtime.playground')
    expect(text).not.toContain('RUN_EXAMPLE')
    expect(text).not.toContain('RUNTIME_CHECK')
    expect(text).not.toContain('RUNTIME_TRIAL')
  })
})
