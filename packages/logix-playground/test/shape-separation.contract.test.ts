import { ControlPlane } from '@logixjs/core'
import { describe, expect, it } from 'vitest'
import { projectRunFailure, projectRunValue } from '../src/internal/runner/runProjection.js'
import { createRuntimeEvidenceEnvelope } from '../src/internal/runner/runtimeEvidence.js'
import { derivePlaygroundWorkbenchProjection } from '../src/internal/summary/workbenchProjection.js'
import { makeControlPlaneReport } from './support/controlPlaneFixtures.js'
import { createInitialProgramSession, recordProgramSessionOperation } from '../src/internal/session/programSession.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Run and Trial shape separation', () => {
  it('keeps Run projection and Trial report machine-distinguishable', () => {
    const runProjection = projectRunValue('run-1', { count: 1 })
    const trialReport = makeControlPlaneReport('trial', 'startup')

    expect(ControlPlane.isVerificationControlPlaneReport(runProjection)).toBe(false)
    expect(ControlPlane.isVerificationControlPlaneReport(trialReport)).toBe(true)

    const projection = derivePlaygroundWorkbenchProjection({
      snapshot: createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture)),
      programRun: runProjection,
      trialStartupReport: trialReport,
    })

    expect(projection.sessions.map((session) => session.inputKind)).toContain('run-result')
    expect(projection.sessions.map((session) => session.inputKind)).toContain('control-plane-report')
    expect(projection.sessions[0]?.artifactRefs).toContain('artifact:run-result:run-1')
    expect(ControlPlane.isVerificationControlPlaneReport(projection.indexes?.artifactsById['artifact:run-result:run-1']?.preview)).toBe(false)
  })

  it('projects Program session output as run-result shape', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const programSession = recordProgramSessionOperation(
      createInitialProgramSession({ projectId: snapshot.projectId, revision: snapshot.revision, seq: 1 }),
      {
        operation: { kind: 'dispatch', actionTag: 'increment' },
        state: { count: 1 },
        logs: [],
        traces: [],
      },
    )
    const projection = derivePlaygroundWorkbenchProjection({
      snapshot,
      programSession,
      trialStartupReport: makeControlPlaneReport('trial', 'startup'),
    })

    expect(projection.sessions.map((session) => session.inputKind)).toContain('run-result')
    expect(projection.sessions.map((session) => session.inputKind)).toContain('control-plane-report')
    expect(projection.sessions[0]?.artifactRefs).toContain('artifact:run-result:logix-react.local-counter:r0:s1:op1')
    expect(ControlPlane.isVerificationControlPlaneReport(
      projection.indexes?.artifactsById['artifact:run-result:logix-react.local-counter:r0:s1:op1']?.preview,
    )).toBe(false)
  })

  it('projects failed Run as run-failure facet without fabricating Trial report', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const runFailure = projectRunFailure('run-failed', 'runtime', new Error('boom'))
    const runEvidence = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'run',
      opSeq: 1,
      runtimeOutput: {
        kind: 'runtimeOutput',
        operation: 'run',
        runId: runFailure.runId,
        status: 'failed',
        failure: runFailure.failure,
      } as any,
      operationEvents: [],
      artifactRefs: [],
      evidenceGaps: [],
    })

    const projection = derivePlaygroundWorkbenchProjection({
      snapshot,
      runtimeEvidence: { run: runEvidence },
    })

    const sessions = projection.sessions.map((session) => session.inputKind)
    const runFailureFacet = Object.values(projection.indexes?.findingsById ?? {}).find((finding) => finding.class === 'run-failure-facet')
    const reports = projection.sessions.filter((session) => session.inputKind === 'control-plane-report')

    expect(sessions).toContain('run-result')
    expect(runFailureFacet).toMatchObject({ code: 'runtime', summary: 'boom' })
    expect(reports).toEqual([])
  })
})
