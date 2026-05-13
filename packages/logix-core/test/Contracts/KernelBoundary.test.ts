import * as CoreKernel from '@logixjs/core/repo-internal/kernel-api'
import * as CoreEvidence from '@logixjs/core/repo-internal/evidence-api'
import { describe, expect, it } from '@effect/vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Schema } from 'effect'
import * as Logix from '../../src/index.js'

const kernelSurfacePath = resolve(fileURLToPath(new URL('../../src/internal/kernel-api.ts', import.meta.url)))
const runtimeSurfacePath = resolve(fileURLToPath(new URL('../../src/Runtime.ts', import.meta.url)))
const moduleSurfacePath = resolve(fileURLToPath(new URL('../../src/Module.ts', import.meta.url)))
const logicSurfacePath = resolve(fileURLToPath(new URL('../../src/Logic.ts', import.meta.url)))
const logixTestRoot = resolve(fileURLToPath(new URL('../../../logix-test/test', import.meta.url)))
const sandboxBrowserRoot = resolve(fileURLToPath(new URL('../../../logix-sandbox/test/browser', import.meta.url)))

const collectTsFiles = (root: string): ReadonlyArray<string> => {
  const files: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath)
      }
    }
  }
  walk(root)
  return files.sort()
}

describe('contracts: Kernel boundary surface', () => {
  it('Kernel/runtime/module/program should expose direct public APIs without metadata shells', () => {
    expect(typeof CoreKernel.evaluateFullCutoverGate).toBe('function')
    expect(typeof CoreKernel.kernelLayer).toBe('function')
    expect('boundarySurface' in (CoreKernel as any)).toBe(false)

    expect(typeof Logix.Runtime.make).toBe('function')
    expect(typeof Logix.Runtime.openProgram).toBe('function')
    expect(typeof Logix.Runtime.run).toBe('function')
    expect('runtimeShellSurface' in (Logix.Runtime as any)).toBe(false)

    expect(typeof Logix.Module.make).toBe('function')
    expect(typeof Logix.Module.is).toBe('function')
    expect('moduleSurface' in (Logix.Module as any)).toBe(false)

    expect('Process' in (Logix as any)).toBe(false)
    expect('Workflow' in (Logix as any)).toBe(false)
    expect('Logic' in (Logix as any)).toBe(false)
    expect('ModuleTag' in (Logix as any)).toBe(false)
    expect('Bound' in (Logix as any)).toBe(false)
    expect('Handle' in (Logix as any)).toBe(false)
    expect('State' in (Logix as any)).toBe(false)
    expect('Actions' in (Logix as any)).toBe(false)

    expect(typeof Logix.Program.make).toBe('function')
    expect('programSurface' in (Logix.Program as any)).toBe(false)
    expect('trialRun' in (CoreEvidence as any)).toBe(false)
    expect('trialRunModule' in (CoreEvidence as any)).toBe(false)
  })

  it('package exports should keep only canonical public subpaths plus explicit repo-only bridges', () => {
    const packageJsonPath = resolve(fileURLToPath(new URL('../../package.json', import.meta.url)))
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { exports: Record<string, unknown> }

    expect(pkg.exports['./Module']).toBeDefined()
    expect(pkg.exports['./Program']).toBeDefined()
    expect(pkg.exports['./Runtime']).toBeDefined()
    expect(pkg.exports['./ControlPlane']).toBeDefined()
    expect(pkg.exports['./repo-internal/InternalContracts']).toBeDefined()
    expect(pkg.exports['./repo-internal/debug-api']).toBeDefined()
    expect(pkg.exports['./repo-internal/evidence-api']).toBeDefined()
    expect(pkg.exports['./repo-internal/reflection-api']).toBeDefined()
    expect(pkg.exports['./repo-internal/kernel-api']).toBeDefined()
    expect(pkg.exports['./repo-internal/effect-op']).toBeDefined()
    expect(pkg.exports['./repo-internal/*']).toBeUndefined()
    expect(pkg.exports['./Logic']).toBeUndefined()
    expect(pkg.exports['./ModuleTag']).toBeUndefined()
    expect(pkg.exports['./Bound']).toBeUndefined()
    expect(pkg.exports['./Handle']).toBeUndefined()
    expect(pkg.exports['./State']).toBeUndefined()
    expect(pkg.exports['./Actions']).toBeUndefined()
  })

  it('Module public surface should hide legacy implement wrapper from the canonical definition object', () => {
    const Root = Logix.Module.make('KernelBoundary.LegacyImplementSurface', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { noop: Schema.Void },
    })

    expect('implement' in (Root as any)).toBe(false)
    expect(typeof Logix.Program.make).toBe('function')
  })

  it('kernel repo-internal surface should not depend on deleted root observability/reflection/process modules', () => {
    const source = readFileSync(kernelSurfacePath, 'utf8')

    expect(source.includes('../Observability')).toBe(false)
    expect(source.includes('../Reflection')).toBe(false)
    expect(source.includes('../Process')).toBe(false)
  })

  it('Runtime and module-facing surfaces should stay out of reflection internals', () => {
    const runtimeSource = readFileSync(runtimeSurfacePath, 'utf8')
    const moduleSource = readFileSync(moduleSurfacePath, 'utf8')
    const logicSource = readFileSync(logicSurfacePath, 'utf8')

    expect(runtimeSource.includes('./internal/reflection/')).toBe(false)
    expect(moduleSource.includes('./internal/reflection/')).toBe(false)
    expect(logicSource.includes('./internal/reflection/')).toBe(false)
  })

  it('logix-test and sandbox browser examples should not keep Module.implement as the default program authoring path', () => {
    const candidateFiles = [...collectTsFiles(logixTestRoot), ...collectTsFiles(sandboxBrowserRoot)]
    const pattern = ['.implement', '('].join('')
    const offenders = candidateFiles.filter((file) => readFileSync(file, 'utf8').includes(pattern))

    expect(offenders).toEqual([])
  })

})
