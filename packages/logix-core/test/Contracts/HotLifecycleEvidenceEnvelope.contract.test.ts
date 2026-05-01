import { describe, expect, it } from 'vitest'
import {
  createHotLifecycleResourceRegistry,
  makeHotLifecycleEvidence,
  makeHotLifecycleObservationEnvelope,
} from '../../src/internal/runtime/core/hotLifecycle/index.js'
import { exportEvidencePackage, importEvidencePackage } from '../../src/internal/verification/evidence.js'

describe('hot lifecycle evidence envelope', () => {
  it('uses the existing observation envelope without a HMR-specific report protocol', () => {
    const registry = createHotLifecycleResourceRegistry({ ownerId: 'owner' })
    const event = makeHotLifecycleEvidence({
      ownerId: 'owner',
      eventSeq: 1,
      decision: 'dispose',
      reason: 'dispose-without-successor',
      previousRuntimeInstanceId: 'runtime:1',
      cleanupId: 'owner::cleanup:1',
      resourceSummary: registry.summary(),
    })

    const envelope = makeHotLifecycleObservationEnvelope({
      runId: 'hmr-run',
      seq: 1,
      timestamp: 1,
      event,
    })

    const pkg = exportEvidencePackage({
      runId: 'hmr-run',
      source: { host: 'vitest', label: 'hot-lifecycle' },
      events: [envelope],
      createdAt: 1,
    })
    const imported = importEvidencePackage(pkg)

    expect(imported.events).toHaveLength(1)
    expect(imported.events[0]?.type).toBe('runtime.hot-lifecycle')
    expect((imported.events[0]?.payload as any).decision).toBe('dispose')
  })
})
