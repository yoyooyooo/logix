import { describe, expect, it } from 'vitest'
import { makeVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import {
  buildCompareCompatibleCapturePair,
  captureRefFromRuntimeEvidence,
} from '../src/internal/runner/sessionCapture.js'
import { createRuntimeEvidenceEnvelope } from '../src/internal/runner/runtimeEvidence.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

const snapshot = () => createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))

const report = (stage: 'check' | 'trial') =>
  makeVerificationControlPlaneReport({
    kind: 'VerificationControlPlaneReport',
    stage,
    mode: stage === 'check' ? 'static' : 'startup',
    verdict: 'PASS',
    errorCode: null,
    summary: `${stage} passed`,
    environment: { runId: `run:${stage}` },
    artifacts: [{ outputKey: `${stage}Report`, kind: 'VerificationControlPlaneReport', digest: `digest:${stage}` }],
    repairHints: [],
    nextRecommendedStage: stage === 'check' ? 'trial' : null,
  })

describe('Playground session capture refs', () => {
  it('captures Check and Trial reports with authority refs and artifact refs', () => {
    const project = snapshot()
    const check = captureRefFromRuntimeEvidence(createRuntimeEvidenceEnvelope({
      snapshot: project,
      operationKind: 'check',
      opSeq: 1,
      controlPlaneReport: report('check'),
      operationEvents: [],
      artifactRefs: [{ outputKey: 'checkReport', kind: 'VerificationControlPlaneReport', digest: 'digest:check' }],
      evidenceGaps: [],
    }))
    const trial = captureRefFromRuntimeEvidence(createRuntimeEvidenceEnvelope({
      snapshot: project,
      operationKind: 'trialStartup',
      opSeq: 2,
      controlPlaneReport: report('trial'),
      operationEvents: [],
      artifactRefs: [{ outputKey: 'trialReport', kind: 'VerificationControlPlaneReport', digest: 'digest:trial' }],
      evidenceGaps: [],
    }))

    expect(check).toMatchObject({
      kind: 'check-report',
      authorityRef: 'report:check:static:run:check',
      artifactRefs: ['checkReport'],
      sourceDigest: expect.stringMatching(/^playground-source:/),
    })
    expect(trial).toMatchObject({
      kind: 'trial-report',
      authorityRef: 'report:trial:startup:run:trial',
      artifactRefs: ['trialReport'],
      sourceDigest: expect.stringMatching(/^playground-source:/),
    })
  })

  it('captures Run failure as a result-face authority ref', () => {
    const project = snapshot()
    const capture = captureRefFromRuntimeEvidence(createRuntimeEvidenceEnvelope({
      snapshot: project,
      operationKind: 'run',
      opSeq: 3,
      runtimeOutput: {
        kind: 'runtimeOutput',
        operation: 'run',
        status: 'failed',
        runId: 'run:failure',
        failure: { kind: 'runtime', message: 'Run failed' },
      },
      operationEvents: [],
      artifactRefs: [],
      evidenceGaps: [],
    }))

    expect(capture).toMatchObject({
      kind: 'run-failure',
      authorityRef: 'run-failure:run:failure',
      artifactRefs: [],
    })
  })

  it('builds compare-compatible before/after pairs only from captured authority refs', () => {
    const project = snapshot()
    const before = captureRefFromRuntimeEvidence(createRuntimeEvidenceEnvelope({
      snapshot: project,
      operationKind: 'check',
      opSeq: 1,
      controlPlaneReport: report('check'),
      operationEvents: [],
      artifactRefs: [{ outputKey: 'checkReport', kind: 'VerificationControlPlaneReport', digest: 'digest:check' }],
      evidenceGaps: [],
    }))
    const after = captureRefFromRuntimeEvidence(createRuntimeEvidenceEnvelope({
      snapshot: project,
      operationKind: 'trialStartup',
      opSeq: 2,
      controlPlaneReport: report('trial'),
      operationEvents: [],
      artifactRefs: [{ outputKey: 'trialReport', kind: 'VerificationControlPlaneReport', digest: 'digest:trial' }],
      evidenceGaps: [],
    }))

    expect(before).toBeDefined()
    expect(after).toBeDefined()
    const pair = buildCompareCompatibleCapturePair(before!, after!)

    expect(pair).toEqual({
      beforeReportRef: before!.authorityRef,
      afterReportRef: after!.authorityRef,
      beforeArtifactRefs: ['checkReport'],
      afterArtifactRefs: ['trialReport'],
      sourceDigest: before!.sourceDigest,
    })
    expect(() => buildCompareCompatibleCapturePair(undefined, after!)).toThrow(/captured reports/)
  })
})
