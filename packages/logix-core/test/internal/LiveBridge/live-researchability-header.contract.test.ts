import { describe, expect, it } from 'vitest'

import { makeLiveResearchabilityHeader, makeLiveTargetCoordinate } from '../../../src/internal/live-bridge-api.js'

describe('live researchability header', () => {
  it('exposes comparable evidence refs without adoption authority', () => {
    const header = makeLiveResearchabilityHeader({
      evidenceSummaryDigest: 'sha256:evidence',
      captureWindow: { fromSeq: 1, toSeq: 5 },
      stageClass: 'drilldown-only',
      runtimeCoordinate: makeLiveTargetCoordinate({ runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' }),
      manifestDigest: 'manifest:current',
      envFingerprintRef: 'env:local',
      budgetProfileRef: 'budget:default',
      samplingProfileRef: 'sampling:default',
      redactionPolicyRef: 'redaction:default',
      proofCommandRefs: ['pnpm test -- live'],
      metricRefs: [{ owner: 'runtime', unit: 'count', ref: 'operation-count' }],
      dropped: false,
      degraded: false,
      redacted: true,
      gaps: [{ code: 'trace-redacted', summary: 'Trace was redacted.' }],
      authorityRef: 'canonical-evidence',
    })

    expect(header.evidenceSummaryDigest).toBe('sha256:evidence')
    expect(header.metricRefs).toEqual([{ owner: 'runtime', unit: 'count', ref: 'operation-count' }])
    expect(JSON.stringify(header)).not.toMatch(/adopt|discard|decisionTrace|merge|publish|release/i)
  })
})
