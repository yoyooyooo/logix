import { describe, expect, it } from 'vitest'

import { ExtensionHotReloadController, migrateExtensionState, revalidateBeforeSwap, ResourceBudgetExecutor, type ExtensionHostRuntime } from '../../src/internal/extension-host/index.js'

const makeRuntime = (args: {
  readonly revision: string
  readonly hooks?: ExtensionHostRuntime['hooks']
  readonly entry?: string
}): ExtensionHostRuntime => ({
  manifest: {
    manifestVersion: 'ext.v1',
    extensionId: 'demo-extension',
    revision: args.revision,
    runtime: {
      apiVersion: 'v1',
      entry: args.entry ?? './extension-entry.js',
      hooks: ['setup', 'snapshot', 'restore', 'healthcheck', 'teardown'],
    },
    capabilities: {
      hostApis: ['emit-control-event'],
    },
    limits: {
      timeoutMs: 20,
      maxQueueSize: 8,
    },
  },
  hooks: args.hooks ?? {},
})

describe('logix-cli integration (extension reload rollback)', () => {
  it('rolls back to previous revision when observe-window fails after swap', async () => {
    let restoredPayload: unknown = undefined

    const current = makeRuntime({
      revision: 'r1',
      hooks: {
        snapshot: async () => ({ cursor: 7 }),
      },
    })

    const shadow = makeRuntime({
      revision: 'r2',
      hooks: {
        restore: async (context) => {
          restoredPayload = context.payload
        },
        healthcheck: async () => true,
      },
    })

    const controller = new ExtensionHotReloadController(current)
    const result = await controller.reload({
      baseContext: {
        runId: 'reload-rollback-1',
        instanceId: 'reload-rollback-1',
        command: 'verify-loop',
      },
      loadShadow: async () => shadow,
      budget: new ResourceBudgetExecutor({
        timeoutMs: 50,
        maxQueueSize: 8,
      }),
      resolvePolicy: async () => ({
        hostApis: ['emit-control-event'],
        net: false,
        fs: false,
      }),
      migrateState: migrateExtensionState,
      revalidate: revalidateBeforeSwap,
      observeAfterSwap: async () => {
        throw new Error('post-swap observe failure')
      },
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('expected hot reload failure')

    expect(result.failedStage).toBe('observe-window')
    expect(result.rollback.attempted).toBe(true)
    expect(result.rollback.succeeded).toBe(true)
    expect(controller.getActiveRuntime().manifest.revision).toBe('r1')

    expect((restoredPayload as { persistedState?: unknown })?.persistedState).toEqual({ cursor: 7 })

    const sawAtomicSwap = result.events.some(
      (event) => event.kind === 'ExtensionHotReloadEvent' && event.stage === 'atomic-swap' && event.status === 'succeeded',
    )
    const sawRollback = result.events.some(
      (event) => event.kind === 'ExtensionHotReloadEvent' && event.stage === 'rollback' && event.status === 'rolled-back',
    )

    expect(sawAtomicSwap).toBe(true)
    expect(sawRollback).toBe(true)
  })

  it('keeps host usable after a failed reload and accepts next successful reload', async () => {
    const current = makeRuntime({ revision: 'r1' })
    const controller = new ExtensionHotReloadController(current)

    const failed = await controller.reload({
      baseContext: {
        runId: 'reload-rollback-2',
        instanceId: 'reload-rollback-2',
        command: 'verify-loop',
      },
      loadShadow: async () =>
        makeRuntime({
          revision: 'r2',
          hooks: {
            healthcheck: async () => {
              throw new Error('boom')
            },
          },
        }),
      budget: new ResourceBudgetExecutor({ timeoutMs: 20, maxQueueSize: 4 }),
      resolvePolicy: async () => ({ hostApis: ['emit-control-event'] }),
      migrateState: migrateExtensionState,
      revalidate: revalidateBeforeSwap,
    })

    expect(failed.ok).toBe(false)
    expect(controller.getActiveRuntime().manifest.revision).toBe('r1')

    const recovered = await controller.reload({
      baseContext: {
        runId: 'reload-rollback-3',
        instanceId: 'reload-rollback-3',
        command: 'verify-loop',
      },
      loadShadow: async () =>
        makeRuntime({
          revision: 'r3',
          hooks: {
            healthcheck: async () => true,
          },
        }),
      budget: new ResourceBudgetExecutor({ timeoutMs: 50, maxQueueSize: 8 }),
      resolvePolicy: async () => ({ hostApis: ['emit-control-event'] }),
      migrateState: migrateExtensionState,
      revalidate: revalidateBeforeSwap,
    })

    expect(recovered.ok).toBe(true)
    expect(controller.getActiveRuntime().manifest.revision).toBe('r3')
  })
})
