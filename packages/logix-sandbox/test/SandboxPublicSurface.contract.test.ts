import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as SandboxNS from '@logixjs/sandbox'

const sourceFiles = [
  '../src/index.ts',
  '../src/Client.ts',
  '../src/Protocol.ts',
  '../src/Service.ts',
  '../src/Types.ts',
  '../src/Vite.ts',
] as const

const readPackageJson = () => JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const readPublicSource = (): string =>
  sourceFiles.map((file) => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n')

describe('sandbox public surface stays transport-only', () => {
  it('keeps root exports limited to sandbox client layer and tag', () => {
    expect(Object.keys(SandboxNS).sort()).toEqual(['SandboxClientLayer', 'SandboxClientTag'])
  })

  it('keeps package exports limited to root, package metadata, vite, and blocked internals', () => {
    const pkg = readPackageJson()

    expect(Object.keys(pkg.exports).sort()).toEqual(['.', './internal/*', './package.json', './vite'])
    expect(pkg.exports['./internal/*']).toBeNull()
    expect(Object.keys(pkg.publishConfig.exports).sort()).toEqual(['.', './internal/*', './package.json', './vite'])
    expect(pkg.publishConfig.exports['./internal/*']).toBeNull()
  })

  it('does not export Playground product vocabulary or result contracts', () => {
    const text = `${readPublicSource()}\n${JSON.stringify(readPackageJson())}`

    for (const forbidden of [
      'Playground',
      'PlaygroundProject',
      'PlaygroundRunResult',
      'PreviewHost',
      'SourceTab',
      'RUN_EXAMPLE',
      'RUNTIME_CHECK',
      'RUNTIME_TRIAL',
      'programExport',
      'mainExport',
    ]) {
      expect(text).not.toContain(forbidden)
    }
  })
})
