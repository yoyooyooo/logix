import { ControlPlane } from '@logixjs/core'
import { describe, expect, it } from 'vitest'
import { classifyError } from '../src/internal/session/errors.js'
import { appendBoundedLog, type BoundedLogEntry } from '../src/internal/session/logs.js'
import {
  createInitialProgramSession,
  recordProgramSessionOperation,
} from '../src/internal/session/programSession.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { derivePlaygroundSummary } from '../src/internal/summary/derivedSummary.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

const makeTrialReport = () =>
  ControlPlane.makeVerificationControlPlaneReport({
    kind: 'VerificationControlPlaneReport',
    stage: 'trial',
    mode: 'startup',
    verdict: 'PASS',
    errorCode: null,
    summary: 'startup trial passed',
    environment: { runId: 'trial-1' },
    artifacts: [],
    repairHints: [],
    nextRecommendedStage: null,
  })

describe('DerivedPlaygroundSummary contract', () => {
  it('derives changed files and JSON-safe status from current snapshot', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    workspace.editFile('/src/logic/localCounter.logic.ts', 'export const delta = 2')

    const summary = derivePlaygroundSummary({
      snapshot: createProjectSnapshot(workspace),
      preview: { status: 'ready' },
      programRun: { status: 'passed', runId: 'run-1' },
      trialStartup: { status: 'passed', report: makeTrialReport() },
    })

    expect(summary.changedFiles).toEqual(['/src/logic/localCounter.logic.ts'])
    expect(summary.preview).toEqual({ status: 'ready', errorCount: 0 })
    expect(summary.programRun).toEqual({ status: 'passed', runId: 'run-1' })
    expect(summary.trialStartup).toEqual({ status: 'passed', verdict: 'PASS' })
    expect(summary.projection.sessions.map((session) => session.authorityRef.kind)).toContain('run-result')
    expect(summary.projection.sessions.map((session) => session.authorityRef.kind)).toContain('control-plane-report')
    expect(() => JSON.stringify(summary)).not.toThrow()
  })

  it('summarizes Program session output without inventing a control-plane report', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    const snapshot = createProjectSnapshot(workspace)
    const programSession = recordProgramSessionOperation(
      createInitialProgramSession({
        projectId: snapshot.projectId,
        revision: snapshot.revision,
        seq: 1,
      }),
      {
        operation: { kind: 'dispatch', actionTag: 'increment' },
        state: { count: 1 },
        logs: [{ level: 'info', message: 'dispatch increment', source: 'runner' }],
        traces: [],
      },
    )

    const summary = derivePlaygroundSummary({
      snapshot,
      programSession,
    })

    expect(summary.programSession?.status).toBe('ready')
    expect(summary.programSession?.lastActionTag).toBe('increment')
    expect(summary.programSession?.operationSeq).toBe(1)
    expect(summary.projection.sessions.map((session) => session.inputKind)).toContain('run-result')
    expect(JSON.stringify(summary.programSession)).not.toContain('VerificationControlPlaneReport')
  })

  it('classifies preview, compile, Run and startup Trial failures separately', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    const summary = derivePlaygroundSummary({
      snapshot: createProjectSnapshot(workspace),
      preview: {
        status: 'failed',
        errors: [classifyError('preview', new Error('preview crashed'))],
      },
      programRun: {
        status: 'failed',
        failure: classifyError('run', new Error('run failed')),
      },
      check: {
        status: 'failed',
        failure: classifyError('compile', new Error('compile failed')),
      },
      trialStartup: {
        status: 'failed',
        failure: classifyError('trialStartup', new Error('trial failed')),
      },
    })

    expect(summary.errors.map((error) => error.kind)).toEqual(['preview', 'run', 'compile', 'trialStartup'])
  })

  it('truncates logs and errors deterministically', () => {
    const logs = Array.from({ length: 3 }).reduce<ReadonlyArray<BoundedLogEntry>>(
      (acc, _, index) =>
        appendBoundedLog(acc, { level: 'info', message: `log-${index}`, source: 'runner' }, 2),
      [],
    )
    expect(logs.map((log) => log.message)).toEqual(['log-1', 'log-2'])

    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    const summary = derivePlaygroundSummary({
      snapshot: createProjectSnapshot(workspace),
      preview: {
        status: 'failed',
        errors: [
          classifyError('preview', 'first'),
          classifyError('preview', 'second'),
          classifyError('preview', 'third'),
        ],
      },
      maxErrors: 2,
    })

    expect(summary.errors.map((error) => error.message)).toEqual(['first', 'second'])
    expect(summary.truncated).toBe(true)
  })
})
