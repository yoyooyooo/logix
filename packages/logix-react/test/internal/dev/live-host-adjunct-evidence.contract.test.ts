import { describe, expect, it } from 'vitest'
import {
  makeLiveCaptureFacet,
  makeLiveEvidenceGap,
  makeLiveTargetCoordinate,
} from '@logixjs/core/repo-internal/live-bridge-api'

describe('live host adjunct evidence contract', () => {
  it('uses existing live capture or gap families for host adjunct refs', () => {
    const target = makeLiveTargetCoordinate({
      runtimeId: 'runtime-host',
      moduleId: 'HostFixture',
      instanceId: 'default',
    })
    const selectorRoute = makeLiveCaptureFacet({
      captureId: 'selector-route:count',
      captureKind: 'selector-route',
      target,
      stageClass: 'host-harness',
      budget: { maxEvents: 1, maxInlineBytes: 512 },
      degraded: { reason: 'selector-route-unavailable' },
      artifactRef: { outputKey: 'live-capture:selector-route', kind: 'LiveCapture' },
    })
    const hostGap = makeLiveEvidenceGap({
      gapId: 'host:render-boundary:missing',
      code: 'missing-render-boundary-ref',
      summary: 'No render boundary ref was available for the runtime target.',
      severity: 'info',
      target,
    })

    expect(selectorRoute).toMatchObject({
      kind: 'live.capture',
      captureKind: 'selector-route',
      stageClass: 'host-harness',
      artifactRef: { outputKey: 'live-capture:selector-route', kind: 'LiveCapture' },
    })
    expect(hostGap).toMatchObject({
      kind: 'evidence.gap',
      code: 'missing-render-boundary-ref',
      target,
    })
    expect(JSON.stringify({ selectorRoute, hostGap })).not.toMatch(/HostEvidence|HostAdjunctEvidence|verdict|repairHints/)
  })
})
