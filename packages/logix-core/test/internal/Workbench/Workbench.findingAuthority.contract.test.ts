import { describe, expect, it } from 'vitest'
import { deriveRuntimeWorkbenchProjectionIndex } from '@logixjs/core/repo-internal/workbench-api'
import { makeWorkbenchReport } from './Workbench.testkit.js'

describe('Runtime Workbench finding authority contract', () => {
  it('projects only authority-backed finding classes', () => {
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [
        { kind: 'control-plane-report', report: makeWorkbenchReport(), sourceDigest: 'sha256:source-a' },
        { kind: 'run-result', runId: 'run-1', status: 'failed', failure: { code: 'RUN_FAILED', message: 'boom' }, sourceDigest: 'sha256:source-a' },
        { kind: 'debug-event-batch', batchId: 'debug-1', sourceDigest: 'sha256:source-a', events: [{ eventId: 'e1', degraded: true }] },
      ],
    })

    const classes = new Set(Object.values(index.indexes?.findingsById ?? {}).map((finding) => finding.class))
    expect(classes).toEqual(
      new Set(['control-plane-finding', 'run-failure-facet', 'degradation-notice', 'evidence-gap']),
    )
  })

  it('mirrors report repair hints without inventing scheduling actions', () => {
    const report = makeWorkbenchReport()
    const index = deriveRuntimeWorkbenchProjectionIndex({
      truthInputs: [{ kind: 'control-plane-report', report, sourceDigest: 'sha256:source-a' }],
    })

    const finding = Object.values(index.indexes?.findingsById ?? {}).find((item) => item.class === 'control-plane-finding')
    expect(finding?.repairMirror?.repairHints).toEqual(report.repairHints)
    expect(finding?.repairMirror?.nextRecommendedStage).toBe(report.nextRecommendedStage)
    expect((finding as any).repairPriority).toBeUndefined()
    expect((finding as any).agentSchedule).toBeUndefined()
  })
})
