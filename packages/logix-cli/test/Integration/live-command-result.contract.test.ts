import { describe, expect, it } from 'vitest'

import { makeLiveCommandResult } from '../../src/internal/liveResult.js'

describe('LiveCommandResult transport contract', () => {
  const liveArtifactKinds = [
    'LiveTargetList',
    'LiveInspectArtifact',
    'LiveOperationFacet',
    'LiveCapture',
    'CanonicalEvidencePackage',
    'EvidenceGap',
    'LiveStatus',
  ] as const

  it('keeps live output separate from verification CommandResult authority', () => {
    const result = makeLiveCommandResult({
      runId: 'live-r1',
      command: 'live targets',
      ok: true,
      inputCoordinate: { command: 'live', task: 'targets', runId: 'live-r1' },
      primaryLiveOutputKey: 'liveTargets',
      artifacts: [
        {
          outputKey: 'liveTargets',
          kind: 'LiveTargetList',
          ok: true,
          inline: { targets: [] },
        },
      ],
    })

    expect(result.kind).toBe('LiveCommandResult')
    expect(result.primaryLiveOutputKey).toBe('liveTargets')
    expect(result).not.toHaveProperty('primaryReportOutputKey')
    expect(result).not.toHaveProperty('repairHints')
    expect(result).not.toHaveProperty('nextRecommendedStage')
    expect(result).not.toHaveProperty('verdict')
  })

  it('requires primaryLiveOutputKey to reference artifacts output keys', () => {
    expect(() =>
      makeLiveCommandResult({
        runId: 'live-r2',
        command: 'live targets',
        ok: true,
        inputCoordinate: { command: 'live', task: 'targets', runId: 'live-r2' },
        primaryLiveOutputKey: 'missing',
        artifacts: [{ outputKey: 'liveTargets', kind: 'LiveTargetList', ok: true }],
      }),
    ).toThrow(/primaryLiveOutputKey|outputKey/)
  })

  it('rejects verification report fields from every live artifact family', () => {
    for (const kind of liveArtifactKinds) {
      expect(() =>
        makeLiveCommandResult({
          runId: `live-forbidden-${kind}`,
          command: 'live inspect',
          ok: true,
          inputCoordinate: { command: 'live', task: 'inspect', runId: `live-forbidden-${kind}` },
          primaryLiveOutputKey: 'liveOutput',
          artifacts: [
            {
              outputKey: 'liveOutput',
              kind,
              ok: true,
              inline: {
                evidence: {
                  verdict: 'PASS',
                  repairHints: [],
                  nextRecommendedStage: 'trial',
                  primaryReportOutputKey: 'checkReport',
                },
              },
            },
          ],
        }),
      ).toThrow(/LiveCommandResult.*verification field/)
    }
  })

  it('keeps all live artifact families consumable through primaryLiveOutputKey', () => {
    for (const kind of liveArtifactKinds) {
      const result = makeLiveCommandResult({
        runId: `live-family-${kind}`,
        command: 'live inspect',
        ok: true,
        inputCoordinate: { command: 'live', task: 'inspect', runId: `live-family-${kind}` },
        primaryLiveOutputKey: 'liveOutput',
        artifacts: [
          {
            outputKey: 'liveOutput',
            kind,
            ok: true,
            inline: { kind, evidenceRole: 'diagnosis-only' },
          },
        ],
      })

      expect(result.primaryLiveOutputKey).toBe('liveOutput')
      expect(result.artifacts[0]?.kind).toBe(kind)
      expect(JSON.stringify(result)).not.toMatch(/primaryReportOutputKey|repairHints|nextRecommendedStage|verdict/)
    }
  })
})
