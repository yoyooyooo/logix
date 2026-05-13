import { describe, expect, it } from 'vitest'
import {
  makeLiveCaptureFacet,
  makeLiveTargetCoordinate,
} from '@logixjs/core/repo-internal/live-bridge-api'

describe('live profile summary evidence contract', () => {
  it('packages profile summary as bounded local-only live capture evidence', () => {
    const target = makeLiveTargetCoordinate({
      runtimeId: 'runtime-profile',
      moduleId: 'ProfileFixture',
      instanceId: 'default',
    })

    const facet = makeLiveCaptureFacet({
      captureId: 'profile:summary',
      captureKind: 'profile',
      target,
      stageClass: 'host-harness',
      budget: { maxEvents: 4, maxInlineBytes: 512 },
      localOnly: true,
      profileSummary: {
        authority: 'react-host-adjunct',
        source: 'local-browser',
        sampleCount: 0,
        targetRef: target,
        attachmentId: 'browser:profile',
        linkRefs: ['link:profile-summary'],
      },
      redacted: [{ category: 'profile', reason: 'local-summary-only' }],
      artifactRef: { outputKey: 'live-profile-summary', kind: 'LiveCapture' },
    })

    expect(facet).toMatchObject({
      kind: 'live.capture',
      captureKind: 'profile',
      localOnly: true,
      budget: { maxEvents: 4, maxInlineBytes: 512 },
      profileSummary: {
        authority: 'react-host-adjunct',
        source: 'local-browser',
        targetRef: target,
        linkRefs: ['link:profile-summary'],
      },
      redacted: [{ category: 'profile', reason: 'local-summary-only' }],
    })
    expect(JSON.stringify(facet)).not.toMatch(/verdict|repairHints|nextRecommendedStage|stateAfter|timeline ordering/)
  })
})
