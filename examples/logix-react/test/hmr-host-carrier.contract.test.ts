import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  getInstalledLogixDevLifecycleCarrier,
  installLogixDevLifecycleCarrier,
} from '@logixjs/react/dev/lifecycle'
import { logixReactDevLifecycle } from '@logixjs/react/dev/vite'
import {
  makeHmrWitnessArtifact,
  writeHmrWitnessArtifact,
} from './support/hmrWitnessArtifacts.js'

const root = resolve(import.meta.dirname, '..')

describe('example HMR host carrier setup', () => {
  it('installs a Vitest carrier once through the example test setup', () => {
    const installed = getInstalledLogixDevLifecycleCarrier()

    expect(installed?.carrierId).toBe('@logixjs/react:vitest-dev-lifecycle')
    expect(installed?.hostKind).toBe('vitest')
    expect(installLogixDevLifecycleCarrier()).toBe(installed)
  })

  it('keeps host activation in Vite and Vitest boundaries', () => {
    const viteConfig = readFileSync(resolve(root, 'vite.config.ts'), 'utf8')
    const vitestConfig = readFileSync(resolve(root, 'vitest.config.ts'), 'utf8')
    const vitestSetup = readFileSync(resolve(root, 'test/setup/logix-dev-lifecycle.ts'), 'utf8')

    expect(viteConfig).toContain('logixReactDevLifecycle()')
    expect(vitestConfig).toContain('test/setup/logix-dev-lifecycle.ts')
    expect(vitestSetup).toContain('installLogixDevLifecycleForVitest()')
  })

  it('provides a Vite serve plugin that injects the browser carrier bootstrap', () => {
    const plugin = logixReactDevLifecycle({ carrierId: 'example-vite-carrier' })
    const html = plugin.transformIndexHtml?.('<html><head></head><body></body></html>')

    expect(plugin.name).toBe('logix-react-dev-lifecycle')
    expect(plugin.apply).toBe('serve')
    expect(html).toContain('@logixjs/react/dev/lifecycle')
    expect(html).toContain('example-vite-carrier')
    expect(html).toContain('hostKind: "vite"')
  })

  it('writes stable carrier witness artifact for the feature perf directory', () => {
    writeHmrWitnessArtifact(
      makeHmrWitnessArtifact({
        command:
          'pnpm -C examples/logix-react exec vitest run test/hmr-host-carrier.contract.test.ts test/browser/hmr-active-demo-reset.contract.test.tsx test/browser/hmr-module-invalidation-carrier.contract.test.tsx test/browser/hmr-repeated-reset.contract.test.tsx',
        environment: {
          host: 'vitest',
          carrier: '@logixjs/react:vitest-dev-lifecycle',
          browserProject: 'chromium',
        },
        witnesses: [
          {
            name: 'host-carrier-setup',
            eventCount: 0,
            residualActiveCounts: [],
            verdict: 'PASS',
          },
          {
            name: 'active-demo-reset',
            eventCount: 1,
            residualActiveCounts: [0],
            verdict: 'PASS',
          },
          {
            name: 'module-invalidation-carrier',
            eventCount: 1,
            residualActiveCounts: [0],
            verdict: 'PASS',
          },
          {
            name: 'repeated-reset-20',
            eventCount: 20,
            residualActiveCounts: Array.from({ length: 20 }, () => 0),
            verdict: 'PASS',
          },
        ],
        perf: {
          comparable: false,
          conclusion: 'Functional carrier evidence only; no production steady-state overhead claim.',
        },
      }),
    )
  })
})
