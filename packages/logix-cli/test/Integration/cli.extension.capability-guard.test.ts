import { describe, expect, it } from 'vitest'

import {
  ExtensionHotReloadController,
  migrateExtensionState,
  revalidateBeforeSwap,
  ResourceBudgetExecutor,
  type ExtensionHostRuntime,
} from '../../src/internal/extension-host/index.js'

const makeRuntime = (args: {
  readonly revision: string
  readonly hostApis?: ReadonlyArray<string>
  readonly net?: boolean
  readonly fs?: boolean
  readonly entry?: string
}): ExtensionHostRuntime => ({
  manifest: {
    manifestVersion: 'ext.v1',
    extensionId: 'demo-extension',
    revision: args.revision,
    runtime: {
      apiVersion: 'v1',
      entry: args.entry ?? './extension-entry.js',
      hooks: ['setup', 'healthcheck', 'teardown'],
    },
    capabilities: {
      hostApis: args.hostApis ?? ['emit-control-event'],
      ...(typeof args.net === 'boolean' ? { net: args.net } : null),
      ...(typeof args.fs === 'boolean' ? { fs: args.fs } : null),
    },
    limits: {
      timeoutMs: 20,
      maxQueueSize: 8,
    },
  },
  hooks: {
    healthcheck: async () => true,
  },
})

describe('logix-cli integration (extension capability guard)', () => {
  it('rejects host api overreach and keeps active revision unchanged', async () => {
    const controller = new ExtensionHotReloadController(makeRuntime({ revision: 'r1' }))

    const result = await controller.reload({
      baseContext: {
        runId: 'capability-guard-1',
        instanceId: 'capability-guard-1',
        command: 'verify-loop',
      },
      loadShadow: async () => makeRuntime({ revision: 'r2', hostApis: ['forbidden-api'] }),
      budget: new ResourceBudgetExecutor({ timeoutMs: 50, maxQueueSize: 8 }),
      resolvePolicy: async () => ({ hostApis: ['emit-control-event'] }),
      migrateState: migrateExtensionState,
      revalidate: revalidateBeforeSwap,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')

    expect(result.reasonCode).toBe('EXT_MANIFEST_INVALID')
    expect(controller.getActiveRuntime().manifest.revision).toBe('r1')
    expect(result.error.message).toContain('allowlist')
  })

  it('rejects internal import and capability drift before swap', async () => {
    const controller = new ExtensionHotReloadController(makeRuntime({ revision: 'r1' }))

    const result = await controller.reload({
      baseContext: {
        runId: 'capability-guard-2',
        instanceId: 'capability-guard-2',
        command: 'verify-loop',
      },
      loadShadow: async () =>
        makeRuntime({
          revision: 'r2',
          entry: '@logixjs/cli/internal/secret',
          net: true,
        }),
      budget: new ResourceBudgetExecutor({ timeoutMs: 50, maxQueueSize: 8 }),
      resolvePolicy: async () => ({
        hostApis: ['emit-control-event'],
        net: false,
        fs: false,
      }),
      migrateState: migrateExtensionState,
      revalidate: revalidateBeforeSwap,
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected failure')

    expect(result.reasonCode).toBe('EXT_MANIFEST_INVALID')
    expect(controller.getActiveRuntime().manifest.revision).toBe('r1')
    expect(result.error.message.toLowerCase()).toContain('internal')
  })
})
