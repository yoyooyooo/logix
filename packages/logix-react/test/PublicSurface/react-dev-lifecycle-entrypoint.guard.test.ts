import { ManagedRuntime } from 'effect'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import pkg from '../../package.json' with { type: 'json' }
import * as ReactLogix from '../../src/index.js'
import {
  clearInstalledLogixDevLifecycleCarrier,
  createLogixDevLifecycleCarrier,
  getInstalledLogixDevLifecycleCarrier,
  installLogixDevLifecycleCarrier,
} from '../../src/dev/lifecycle.js'
import { logixDevLifecycleVitePlugin } from '../../src/dev/vite.js'
import { installLogixDevLifecycleForVitest } from '../../src/dev/vitest.js'

const forbiddenRootExports = [
  'createLogixDevLifecycleCarrier',
  'installLogixDevLifecycleCarrier',
  'getInstalledLogixDevLifecycleCarrier',
  'clearInstalledLogixDevLifecycleCarrier',
  'logixDevLifecycleVitePlugin',
  'installLogixDevLifecycleForVitest',
] as const

const repoRoot = resolve(import.meta.dirname, '../../../..')

const readRepoFile = (path: string): string => readFileSync(resolve(repoRoot, path), 'utf8')

describe('React dev lifecycle entrypoint boundary', () => {
  it('keeps dev lifecycle names out of the root React package surface', () => {
    for (const key of forbiddenRootExports) {
      expect(key in ReactLogix).toBe(false)
    }
  })

  it('publishes dev lifecycle entrypoints as explicit package subpaths', () => {
    expect(pkg.exports['./dev/lifecycle' as keyof typeof pkg.exports]).toBe('./src/dev/lifecycle.ts')
    expect(pkg.exports['./dev/vite' as keyof typeof pkg.exports]).toBe('./src/dev/vite.ts')
    expect(pkg.exports['./dev/vitest' as keyof typeof pkg.exports]).toBe('./src/dev/vitest.ts')
    expect(pkg.exports['./internal/*' as keyof typeof pkg.exports]).toBe(null)
  })

  it('keeps published dev lifecycle entrypoints out of the root barrel', () => {
    const exportsMap = pkg.publishConfig.exports

    expect(exportsMap['./dev/lifecycle' as keyof typeof exportsMap]).toEqual({
      types: './dist/dev/lifecycle.d.ts',
      import: './dist/dev/lifecycle.js',
      require: './dist/dev/lifecycle.cjs',
    })
    expect(exportsMap['./dev/vite' as keyof typeof exportsMap]).toEqual({
      types: './dist/dev/vite.d.ts',
      import: './dist/dev/vite.js',
      require: './dist/dev/vite.cjs',
    })
    expect(exportsMap['./dev/vitest' as keyof typeof exportsMap]).toEqual({
      types: './dist/dev/vitest.d.ts',
      import: './dist/dev/vitest.js',
      require: './dist/dev/vitest.cjs',
    })
    expect(exportsMap['./internal/*' as keyof typeof exportsMap]).toBe(null)
  })

  it('keeps the Vite dev entrypoint safe for Vite config loading', () => {
    const source = readRepoFile('packages/logix-react/src/dev/vite.ts')

    expect(source).toContain('transformIndexHtml')
    expect(source).toContain('@logixjs/react/dev/lifecycle')
    expect(source).not.toMatch(/^import\s/m)
    expect(source).not.toContain("from './lifecycle.js'")
    expect(source).not.toContain('configResolved')
  })

  it('keeps docs examples on host-only dev lifecycle imports', () => {
    const docsWithDevCarrierImports = [
      'apps/docs/content/docs/guide/recipes/react-integration.md',
      'apps/docs/content/docs/guide/recipes/react-integration.cn.md',
    ]

    for (const path of docsWithDevCarrierImports) {
      const source = readRepoFile(path)
      expect(source).toContain('@logixjs/react/dev/vite')
      expect(source).not.toContain('@logixjs/react/dev/lifecycle')
      expect(source).not.toContain('createLogixDevLifecycleCarrier')
    }

    const reactIntegrationDocs = [
      'apps/docs/content/docs/guide/essentials/react-integration.md',
      'apps/docs/content/docs/guide/essentials/react-integration.cn.md',
      'apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.md',
      'apps/docs/content/docs/guide/advanced/scope-and-resource-lifetime.cn.md',
    ]

    for (const path of reactIntegrationDocs) {
      const source = readRepoFile(path)
      expect(source).toContain('RuntimeProvider')
      expect(source).not.toContain('@logixjs/react/dev/lifecycle')
      expect(source).not.toContain('createLogixDevLifecycleCarrier')
    }
  })

  it('creates a carrier that supplies one lifecycle layer and reset decision per owner', async () => {
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vitest' })
    const runtime = ManagedRuntime.make(
      carrier.layerForRuntime({
        ownerId: 'demo-runtime',
        runtimeInstanceId: 'runtime:A',
      }),
    )
    const binding = carrier.bindRuntime({
      runtime,
      ownerId: 'demo-runtime',
      runtimeInstanceId: 'runtime:A',
    })

    expect(carrier.carrierId).toBe('test-carrier')
    expect(carrier.hostKind).toBe('vitest')
    expect(binding.runtimeInstanceId).toBe('runtime:A')

    const resolved = binding.owner.getStatus()
    expect(resolved.runtimeInstanceId).toBe('runtime:A')

    const event = await runtime.runPromise(
      binding.reset({
        nextRuntimeInstanceId: 'runtime:B',
      }),
    )

    expect(event.decision).toBe('reset')
    expect(event.previousRuntimeInstanceId).toBe('runtime:A')
    expect(event.nextRuntimeInstanceId).toBe('runtime:B')
  })

  it('keeps Vite carrier activation in the injected browser bootstrap and installs Vitest through setup', () => {
    clearInstalledLogixDevLifecycleCarrier()

    const plugin = logixDevLifecycleVitePlugin({ carrierId: 'vite-carrier' })
    const html = plugin.transformIndexHtml?.('<html><head></head><body></body></html>')

    expect(plugin.name).toBe('logix-react-dev-lifecycle')
    expect(getInstalledLogixDevLifecycleCarrier()).toBeUndefined()
    expect(html).toContain('@logixjs/react/dev/lifecycle')
    expect(html).toContain('vite-carrier')
    expect(html).toContain('hostKind: "vite"')

    clearInstalledLogixDevLifecycleCarrier()
    const vitestCarrier = installLogixDevLifecycleForVitest({ carrierId: 'vitest-carrier' })
    expect(vitestCarrier.carrierId).toBe('vitest-carrier')
    expect(getInstalledLogixDevLifecycleCarrier()?.hostKind).toBe('vitest')

    clearInstalledLogixDevLifecycleCarrier()
    const explicit = createLogixDevLifecycleCarrier({ carrierId: 'explicit' })
    installLogixDevLifecycleCarrier(explicit)
    expect(getInstalledLogixDevLifecycleCarrier()).toBe(explicit)
  })
})
