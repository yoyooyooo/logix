import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageJsonPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json')

describe('@logixjs/playground public surface', () => {
  it('exposes only shell-first public subpaths', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      readonly exports: Record<string, unknown>
    }

    expect(Object.keys(packageJson.exports).sort()).toEqual([
      '.',
      './Playground',
      './Project',
      './internal/*',
      './package.json',
    ])
    expect(packageJson.exports['./internal/*']).toBeNull()
  })

  it('does not export internal product nouns from root', async () => {
    const root = await import('../src/index.js')
    const keys = Object.keys(root).sort()

    expect(keys).toContain('PlaygroundPage')
    expect(keys).toContain('definePlaygroundProject')
    expect(keys).toContain('definePlaygroundRegistry')
    expect(keys).toContain('resolvePlaygroundProject')
    expect(keys).not.toContain('FileModel')
    expect(keys).not.toContain('ProgramEngine')
    expect(keys).not.toContain('PreviewAdapter')
    expect(keys).not.toContain('Evidence')
    expect(keys).not.toContain('PlaygroundRunResult')
    expect(keys).not.toContain('Driver')
    expect(keys).not.toContain('Scenario')
    expect(keys).not.toContain('ProgramSession')
    expect(keys).not.toContain('RawDispatch')
    expect(keys).not.toContain('RuntimeEvidence')
    expect(keys).not.toContain('ProjectSnapshotRuntimeInvoker')
    expect(keys).not.toContain('createProjectSnapshotRuntimeInvoker')
  }, 10_000)

  it('keeps driver, scenario, session and runtime evidence workbench nouns out of package exports', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      readonly exports: Record<string, unknown>
    }
    const exportsText = JSON.stringify(packageJson.exports)

    expect(exportsText).not.toContain('Driver')
    expect(exportsText).not.toContain('Scenario')
    expect(exportsText).not.toContain('ProgramSession')
    expect(exportsText).not.toContain('RawDispatch')
    expect(exportsText).not.toContain('RuntimeEvidence')
    expect(exportsText).not.toContain('RuntimeInvoker')
    expect(exportsText).not.toContain('ProjectSnapshotRuntimeInvoker')
  })
})
