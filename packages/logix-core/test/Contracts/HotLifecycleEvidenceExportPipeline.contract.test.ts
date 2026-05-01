import { describe, expect, it } from 'vitest'
import {
  createHotLifecycleResourceRegistry,
  makeHotLifecycleEvidence,
} from '../../src/internal/runtime/core/hotLifecycle/index.js'
import {
  collectEvidenceExport,
  summarizeEvidenceExport,
} from '../../src/internal/verification/evidenceExportPipeline.js'

describe('hot lifecycle evidence export pipeline', () => {
  it('summarizes hot lifecycle events inside the existing export summary', () => {
    const registry = createHotLifecycleResourceRegistry({ ownerId: 'pipeline-owner' })
    const event = makeHotLifecycleEvidence({
      ownerId: 'pipeline-owner',
      eventSeq: 1,
      decision: 'reset',
      reason: 'hot-update',
      previousRuntimeInstanceId: 'runtime:1',
      nextRuntimeInstanceId: 'runtime:2',
      cleanupId: 'pipeline-owner::cleanup:1',
      resourceSummary: registry.summary(),
    })

    const summary = summarizeEvidenceExport(
      collectEvidenceExport({
        convergeStaticIrByDigest: new Map(),
        hotLifecycleEvents: [event],
      }),
    )

    expect((summary.summary as any)['runtime.hot-lifecycle'].events).toEqual([
      {
        ownerId: 'pipeline-owner',
        eventId: 'pipeline-owner::hmr:1',
        cleanupId: 'pipeline-owner::cleanup:1',
        decision: 'reset',
        reason: 'hot-update',
        previousRuntimeInstanceId: 'runtime:1',
        nextRuntimeInstanceId: 'runtime:2',
        cleanupStatus: 'closed',
        residualActiveCount: 0,
      },
    ])
  })
})
