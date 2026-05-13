import { describe, expect, it } from 'vitest'

import { deriveRuntimeWorkbenchProjectionIndex } from '../../../src/internal/workbench-api.js'
import {
  makeLiveCaptureFacet,
  makeLiveEvidenceGap,
  makeLiveOperationDeniedFacet,
  makeLiveTargetCoordinate,
  toWorkbenchTruthInput,
} from '../../../src/internal/live-bridge-api.js'

const target = makeLiveTargetCoordinate({ runtimeId: 'runtime-1', moduleId: 'module-1', instanceId: 'instance-1' })

describe('live facets Workbench projection', () => {
  it('projects live operation facets without minting verification verdicts', () => {
    const input = toWorkbenchTruthInput(
      makeLiveOperationDeniedFacet({
        operationId: 'op-1',
        actorId: 'agent',
        operationKind: 'dispatch.declaredAction',
        target,
        reason: 'unauthorized-target',
      }),
    )

    const index = deriveRuntimeWorkbenchProjectionIndex({ truthInputs: [input] })
    const session = index.sessions[0]
    const artifacts = Object.values(index.indexes?.artifactsById ?? {})
    const findings = Object.values(index.indexes?.findingsById ?? {})

    expect(session?.inputKind).toBe('live-evidence')
    expect(session?.status).toBe('inconclusive')
    expect(artifacts.map((artifact) => artifact.artifactOutputKey)).toEqual(['live-operation:op-1'])
    expect(findings.some((finding) => finding.class === 'control-plane-finding')).toBe(false)
  })

  it('projects live capture artifacts and gaps through Workbench truth inputs', () => {
    const input = toWorkbenchTruthInput(
      makeLiveCaptureFacet({
        captureId: 'capture-1',
        captureKind: 'event-window',
        target,
        stageClass: 'host-harness',
        budget: { maxEvents: 16, maxInlineBytes: 1024 },
        artifactRef: { outputKey: 'live-capture-1', kind: 'LiveCapture' },
        degraded: { reason: 'sampled' },
      }),
    )

    const index = deriveRuntimeWorkbenchProjectionIndex({ truthInputs: [input] })
    const artifacts = Object.values(index.indexes?.artifactsById ?? {})
    const findings = Object.values(index.indexes?.findingsById ?? {})

    expect(artifacts.map((artifact) => artifact.artifactOutputKey)).toEqual(['live-capture-1'])
    expect(findings.some((finding) => finding.class === 'degradation-notice')).toBe(true)
    expect(findings.some((finding) => finding.class === 'control-plane-finding')).toBe(false)
  })

  it('keeps debug drilldown feeds behind canonical live facets or evidence gaps', () => {
    const captureInput = toWorkbenchTruthInput(
      makeLiveCaptureFacet({
        captureId: 'selector-route-1',
        captureKind: 'selector-route',
        target,
        stageClass: 'drilldown-only',
        budget: { maxEvents: 16, maxInlineBytes: 1024 },
        artifactRef: { outputKey: 'live-capture:selector-route', kind: 'LiveCapture' },
        degraded: { reason: 'selector-route-unavailable' },
      }),
    )
    const gapInput = toWorkbenchTruthInput(
      makeLiveEvidenceGap({
        gapId: 'gap-selector-route',
        code: 'missing-selector-route',
        summary: 'Selector route drilldown feed is unavailable.',
        severity: 'warning',
        target,
      }),
    )

    const index = deriveRuntimeWorkbenchProjectionIndex({ truthInputs: [captureInput, gapInput] })
    const artifacts = Object.values(index.indexes?.artifactsById ?? {})
    const gaps = Object.values(index.indexes?.gapsById ?? {})
    const findings = Object.values(index.indexes?.findingsById ?? {})

    expect(index.sessions.map((session) => session.inputKind)).toEqual(['live-evidence', 'evidence-gap'])
    expect(artifacts.map((artifact) => artifact.artifactOutputKey)).toContain('live-capture:selector-route')
    expect(gaps.map((gap) => gap.code)).toContain('missing-selector-route')
    expect(JSON.stringify(index)).not.toContain('raw-debug-feed')
    expect(findings.some((finding) => finding.class === 'control-plane-finding')).toBe(false)
  })
})
