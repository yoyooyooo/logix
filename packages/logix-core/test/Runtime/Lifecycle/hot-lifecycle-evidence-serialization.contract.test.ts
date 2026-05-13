import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import {
  createHotLifecycleOwner,
  createHotLifecycleResourceRegistry,
  makeHotLifecycleEvidence,
  makeHotLifecycleObservationEnvelope,
} from '../../../src/internal/runtime/core/hotLifecycle/index.js'
import { importEvidencePackage, exportEvidencePackage } from '../../../src/internal/verification/evidence.js'
import * as Debug from '../../../src/internal/debug-api.js'

describe('hot lifecycle evidence serialization', () => {
  it('round-trips through the existing evidence envelope without non-serializable payloads', () => {
    const registry = createHotLifecycleResourceRegistry({ ownerId: 'serial-owner' })
    registry.register({ ownerId: 'serial-owner', resourceId: 'timer:1', category: 'timer' })
    registry.markClosed('timer:1')

    const event = makeHotLifecycleEvidence({
      ownerId: 'serial-owner',
      eventSeq: 1,
      decision: 'reset',
      reason: 'hot-update',
      previousRuntimeInstanceId: 'runtime:1',
      nextRuntimeInstanceId: 'runtime:2',
      cleanupId: 'serial-owner::cleanup:1',
      resourceSummary: registry.summary(),
      hostCleanupSummary: {
        'provider-layer-overlay': { closed: 1, failed: 0 },
      },
      errors: [new Error('bounded')],
    })

    const text = JSON.stringify(event)
    expect(text).toContain('runtime.hot-lifecycle')
    expect(text).not.toContain('Effect')
    expect(text).not.toContain('function')

    const pkg = exportEvidencePackage({
      runId: 'hmr-serialization',
      source: { host: 'vitest', label: 'hmr' },
      createdAt: 1,
      events: [
        makeHotLifecycleObservationEnvelope({
          runId: 'hmr-serialization',
          seq: 1,
          timestamp: 1,
          event,
        }),
      ],
    })
    const imported = importEvidencePackage(JSON.parse(JSON.stringify(pkg)))

    expect(imported.events[0]?.type).toBe('runtime.hot-lifecycle')
    expect((imported.events[0]?.payload as any).hostCleanupSummary['provider-layer-overlay']).toEqual({
      closed: 1,
      failed: 0,
    })
    expect((imported.events[0]?.payload as any).errors).toEqual(['bounded'])
  })

  it('emits lifecycle transitions through the existing debug event adapter', async () => {
    const events: Debug.Event[] = []
    const owner = createHotLifecycleOwner({
      ownerId: 'debug-adapter-owner',
      runtimeInstanceId: 'runtime:1',
    })

    await Effect.runPromise(
      owner.reset({ nextRuntimeInstanceId: 'runtime:2' }).pipe(
        Effect.provide(
          Debug.replace([
            {
              record: (event) =>
                Effect.sync(() => {
                  events.push(event)
                }),
            },
          ]),
        ),
      ),
    )

    expect(events).toHaveLength(1)
    expect(events[0]?.type).toBe('runtime.hot-lifecycle')
    expect((events[0] as any).event.ownerId).toBe('debug-adapter-owner')
    expect((events[0] as any).event.decision).toBe('reset')
  })
})
