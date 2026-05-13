import { ManagedRuntime } from 'effect'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
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

const productionRootFiles = [
  'packages/logix-react/src/index.ts',
  'packages/logix-react/src/RuntimeProvider.ts',
  'packages/logix-react/src/Hooks.ts',
  'packages/logix-react/src/FormProjection.ts',
  'packages/logix-react/src/internal/provider/RuntimeProvider.tsx',
  'packages/logix-react/src/internal/hooks/useModule.ts',
  'packages/logix-react/src/internal/hooks/useModuleRuntime.ts',
] as const

describe('React dev lifecycle entrypoint boundary', () => {
  it('keeps dev lifecycle names out of the root React package surface', () => {
    for (const key of forbiddenRootExports) {
      expect(key in ReactLogix).toBe(false)
    }
  })

  it('publishes dev lifecycle entrypoints as explicit package subpaths', () => {
    expect(pkg.exports['./dev/lifecycle' as keyof typeof pkg.exports]).toBe('./src/dev/lifecycle.ts')
    expect(pkg.exports['./dev/live' as keyof typeof pkg.exports]).toBe('./src/dev/live.ts')
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
    expect(exportsMap['./dev/live' as keyof typeof exportsMap]).toEqual({
      types: './dist/dev/live.d.ts',
      import: './dist/dev/live.js',
      require: './dist/dev/live.cjs',
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

  it('declares only the live dev entrypoint as package-level side-effectful', () => {
    expect(pkg.sideEffects).toEqual(['./src/dev/live.ts', './dist/dev/live.js', './dist/dev/live.cjs'])
  })

  it('keeps production React entrypoints from importing heavy dev/live modules directly', () => {
    const forbiddenImports = [
      /from\s+['"][^'"]*\/dev\/lifecycle(?:\.js)?['"]/,
      /from\s+['"][^'"]*\/dev\/live(?:\.js)?['"]/,
      /from\s+['"][^'"]*internal\/dev\/lifecycleCarrier(?:\.js)?['"]/,
      /from\s+['"][^'"]*internal\/dev\/liveBrowserAdapter(?:\.js)?['"]/,
      /from\s+['"][^'"]*runtimeDevLifecycleBridge(?:\.js)?['"]/,
    ]

    for (const path of productionRootFiles) {
      const source = readRepoFile(path)
      for (const pattern of forbiddenImports) {
        expect(source, `${path} must not import heavy dev/live modules`).not.toMatch(pattern)
      }
    }
  })

  it('keeps production roots on a neutral host lifecycle bridge', () => {
    const source = readRepoFile('packages/logix-react/src/internal/provider/runtimeHostLifecycleBridge.ts')

    expect(source).toContain('@logixjs/react/runtime-host-lifecycle-binder')
    expect(source).not.toContain('@logixjs/react/dev-lifecycle-carrier')
    expect(source).not.toContain('LogixDevLifecycleCarrier')
    expect(source).not.toContain("from '../../dev/lifecycle.js'")
    expect(source).not.toContain("from '../internal/dev/lifecycleCarrier.js'")
  })

  it('installs the dev lifecycle carrier through the host lifecycle bridge only from dev code', () => {
    const bridgeSource = readRepoFile('packages/logix-react/src/internal/provider/runtimeDevLifecycleBridge.ts')
    const carrierSource = readRepoFile('packages/logix-react/src/internal/dev/lifecycleCarrier.ts')

    expect(bridgeSource).toContain("from '../../dev/lifecycle.js'")
    expect(bridgeSource).toContain('installRuntimeHostLifecycleBinder')
    expect(carrierSource).toContain('installDevLifecycleRuntimeHostBinder()')
    expect(carrierSource).toContain('clearDevLifecycleRuntimeHostBinder()')
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
    expect(binding.owner).toBe(carrier.getOwner('demo-runtime'))

    const resolved = binding.owner.getStatus()
    expect(resolved.runtimeInstanceId).toBe('runtime:A')
    expect(runtime.runSync(RuntimeContracts.getCurrentRuntimeHotLifecycleOwner())?.ownerId).toBe('demo-runtime')

    const event = await runtime.runPromise(
      binding.reset({
        nextRuntimeInstanceId: 'runtime:B',
      }),
    )

    expect(event.decision).toBe('reset')
    expect(event.previousRuntimeInstanceId).toBe('runtime:A')
    expect(event.nextRuntimeInstanceId).toBe('runtime:B')
    await runtime.dispose()
  })

  it('keeps runtimeOwnership out of target discovery snapshots', () => {
    const carrier = createLogixDevLifecycleCarrier({ carrierId: 'test-carrier', hostKind: 'vitest' })
    const runtime = ManagedRuntime.make(carrier.layerForRuntime({ ownerId: 'snapshot-runtime' }))
    carrier.bindRuntime({
      runtime,
      ownerId: 'snapshot-runtime',
      runtimeOwnership: 'owned',
    })

    const [binding] = carrier.listRuntimeBindings()
    expect(binding).toBeDefined()
    expect(binding).not.toHaveProperty('runtimeOwnership')

    void runtime.dispose()
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
