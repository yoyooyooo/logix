import { describe, expect, it } from 'vitest'
import { createOperationAcceptedEvent, createOperationCompletedEvent, createRuntimeOperationEvidenceGap } from '@logixjs/core/repo-internal/reflection-api'
import { createInitialProgramSession, recordProgramSessionOperation } from '../session/programSession.js'
import type { ScenarioExecutionState } from '../scenario/scenarioModel.js'
import { createPlaygroundWorkspace } from '../session/workspace.js'
import { createProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from '../../../test/support/projectFixtures.js'
import { createRuntimeEvidenceEnvelope } from '../runner/runtimeEvidence.js'
import { buildPlaygroundRuntimeWorkbenchAuthorityBundle, derivePlaygroundWorkbenchProjection } from './workbenchProjection.js'

describe('Playground workbench projection', () => {
  it('projects runtime evidence operation events without using driver or scenario declarations as truth', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const session = recordProgramSessionOperation(
      createInitialProgramSession({ projectId: snapshot.projectId, revision: snapshot.revision, seq: 1 }),
      {
        operation: { kind: 'dispatch', actionTag: 'increment' },
        state: { count: 1 },
        logs: [],
        traces: [],
      },
    )
    const runtimeEvidence = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'dispatch',
      opSeq: 1,
      minimumActionManifest: {
        manifestVersion: 'program-action-manifest@167A',
        programId: snapshot.projectId,
        moduleId: 'FixtureCounter',
        revision: snapshot.revision,
        digest: 'manifest:counter',
        actions: [{ actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' }],
      },
      operationEvents: [
        createOperationAcceptedEvent({
          instanceId: `${snapshot.projectId}:r${snapshot.revision}`,
          txnSeq: snapshot.revision,
          opSeq: 1,
          operationKind: 'dispatch',
          actionTag: 'increment',
        }),
        createOperationCompletedEvent({
          instanceId: `${snapshot.projectId}:r${snapshot.revision}`,
          txnSeq: snapshot.revision,
          opSeq: 1,
          operationKind: 'dispatch',
          actionTag: 'increment',
        }),
      ],
      artifactRefs: [],
      evidenceGaps: [],
    })
    const scenarioExecution: ScenarioExecutionState = {
      status: 'passed',
      scenarioRunId: 'scenario-run-1',
      scenarioId: 'counter-demo',
      durationMs: 4,
      stepResults: [
        { stepId: 'increase-once', kind: 'driver', status: 'passed', durationMs: 3 },
      ],
    }

    const bundle = buildPlaygroundRuntimeWorkbenchAuthorityBundle({
      snapshot,
      programSession: session,
      runtimeEvidence: { dispatch: runtimeEvidence },
      driverExecution: { status: 'passed', driverId: 'increase' },
      scenarioExecution,
    })

    expect(bundle.truthInputs.map((input) => input.kind)).toContain('run-result')
    expect(bundle.truthInputs.map((input) => input.kind)).toContain('debug-event-batch')
    expect(JSON.stringify(bundle.truthInputs)).not.toContain('"drivers"')
    expect(JSON.stringify(bundle.truthInputs)).not.toContain('"scenarios"')
    expect(JSON.stringify(bundle.truthInputs)).not.toContain('"steps"')

    const debugBatch = bundle.truthInputs.find((input) => input.kind === 'debug-event-batch')
    expect(debugBatch).toMatchObject({
      kind: 'debug-event-batch',
      batchId: 'runtime-operation-events:logix-react.local-counter',
    })
    expect(JSON.stringify(debugBatch)).toContain('operation.accepted')
    expect(JSON.stringify(debugBatch)).toContain('operation.completed')
    expect(JSON.stringify(debugBatch)).not.toContain('driver:increase')
    expect(JSON.stringify(debugBatch)).not.toContain('scenario:counter-demo:increase-once')
  })

  it('emits runtime bridge evidence gaps from runtime evidence envelopes', () => {
    const workspace = createPlaygroundWorkspace(localCounterProjectFixture)
    const snapshot = createProjectSnapshot(workspace)
    const reflectEvidence = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'reflect',
      opSeq: 1,
      operationEvents: [],
      artifactRefs: [],
      evidenceGaps: [
        createRuntimeOperationEvidenceGap({
          instanceId: `${snapshot.projectId}:r${snapshot.revision}`,
          txnSeq: snapshot.revision,
          opSeq: 1,
          code: 'runtime-reflection-unavailable',
          message: 'Runtime reflection manifest is unavailable.',
        }),
      ],
    })

    const projection = derivePlaygroundWorkbenchProjection({
      snapshot,
      runtimeEvidence: { reflect: reflectEvidence },
    })

    const gapCodes = Object.values(projection.indexes?.gapsById ?? {}).map((gap) => gap.code)

    expect(gapCodes).toContain('runtime-reflection-unavailable')
    expect(gapCodes).toContain('playground-unavailable-check-report')
    expect(gapCodes).toContain('playground-unavailable-trial-startup-report')
  })

  it('demotes host compile and preview-only failures out of run-result truth', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const projection = derivePlaygroundWorkbenchProjection({
      snapshot,
      compileFailure: { message: 'Cannot resolve service import' },
      previewFailure: { message: 'Preview adapter unavailable' },
    })

    const findingCodes = Object.values(projection.indexes?.findingsById ?? {}).map((finding) => finding.code)
    const runFailures = Object.values(projection.indexes?.findingsById ?? {}).filter((finding) => finding.class === 'run-failure-facet')

    expect(runFailures).toEqual([])
    expect(findingCodes).toContain('compile-failure')
    expect(findingCodes).toContain('preview-only-host-error')
  })

  it('projects runtime evidence Run failure as run-failure facet', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const runEvidence = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'run',
      opSeq: 1,
      runtimeOutput: {
        kind: 'runtimeOutput',
        operation: 'run',
        status: 'failed',
        runId: 'run-failed',
        failure: { kind: 'runtime', message: 'boom' },
      } as any,
      operationEvents: [],
      artifactRefs: [],
      evidenceGaps: [],
    })

    const projection = derivePlaygroundWorkbenchProjection({
      snapshot,
      runtimeEvidence: { run: runEvidence },
    })

    const runFailure = Object.values(projection.indexes?.findingsById ?? {}).find((finding) => finding.class === 'run-failure-facet')
    expect(runFailure).toMatchObject({
      class: 'run-failure-facet',
      code: 'runtime',
      summary: 'boom',
    })
  })
})
