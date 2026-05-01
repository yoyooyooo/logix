import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createOperationAcceptedEvent, createOperationCompletedEvent } from '@logixjs/core/repo-internal/reflection-api'
import { PlaygroundPage } from '../src/Playground.js'
import type { ProjectSnapshotRuntimeInvoker } from '../src/internal/runner/projectSnapshotRuntimeInvoker.js'
import { createRuntimeEvidenceEnvelope } from '../src/internal/runner/runtimeEvidence.js'
import { ProgramSessionRunnerProvider } from '../src/internal/runner/programSessionRunnerContext.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('runtime reflection UI', () => {
  beforeEach(() => {
    window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ = true
  })

  afterEach(() => {
    delete window.__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__
  })

  it('renders action buttons from runtime reflection evidence', async () => {
    const runtimeInvoker: ProjectSnapshotRuntimeInvoker = {
      reflect: async (snapshot) => createRuntimeEvidenceEnvelope({
        snapshot,
        operationKind: 'reflect',
        opSeq: 1,
        minimumActionManifest: {
          manifestVersion: 'program-action-manifest@167A',
          programId: snapshot.projectId,
          moduleId: 'FixtureCounter',
          revision: snapshot.revision,
          digest: 'manifest:counter',
          actions: [{ actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' }],
        },
        operationEvents: [],
        artifactRefs: [],
        evidenceGaps: [],
      }),
      run: async (snapshot) => createRuntimeEvidenceEnvelope({ snapshot, operationKind: 'run', opSeq: 2, operationEvents: [], artifactRefs: [], evidenceGaps: [] }),
      dispatch: async (input) => {
        const actionTag = input.actions[input.actions.length - 1]?._tag
        return createRuntimeEvidenceEnvelope({
          snapshot: input.snapshot,
          operationKind: 'dispatch',
          opSeq: input.operationSeq,
          runtimeOutput: {
            kind: 'runtimeOutput',
            operation: 'dispatch',
            state: { count: input.actions.length },
            logs: [],
            traces: [],
          },
          operationEvents: [
            createOperationAcceptedEvent({
              instanceId: `${input.snapshot.projectId}:r${input.snapshot.revision}`,
              txnSeq: input.snapshot.revision,
              opSeq: input.operationSeq,
              operationKind: 'dispatch',
              ...(actionTag ? { actionTag } : {}),
            }),
            createOperationCompletedEvent({
              instanceId: `${input.snapshot.projectId}:r${input.snapshot.revision}`,
              txnSeq: input.snapshot.revision,
              opSeq: input.operationSeq,
              operationKind: 'dispatch',
              ...(actionTag ? { actionTag } : {}),
            }),
          ],
          artifactRefs: [],
          evidenceGaps: [],
        })
      },
      check: async (snapshot) => createRuntimeEvidenceEnvelope({ snapshot, operationKind: 'check', opSeq: 3, operationEvents: [], artifactRefs: [], evidenceGaps: [] }),
      trialStartup: async (snapshot) => createRuntimeEvidenceEnvelope({ snapshot, operationKind: 'trialStartup', opSeq: 4, operationEvents: [], artifactRefs: [], evidenceGaps: [] }),
    }

    render(
      <ProgramSessionRunnerProvider runtimeInvoker={runtimeInvoker}>
        <PlaygroundPage registry={[localCounterProjectFixture]} projectId="logix-react.local-counter" />
      </ProgramSessionRunnerProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Dispatch increment' })).toBeTruthy()
    })
    expect(screen.getByRole('region', { name: 'Runtime inspector' }).textContent).not.toContain('fallback-source-regex')
    expect(screen.getByRole('region', { name: 'Workbench bottom console' }).textContent).not.toContain('playground-missing-action-manifest')

    fireEvent.click(screen.getByRole('button', { name: 'Dispatch increment' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Action workbench state preview').textContent).toContain('"count": 1')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Trace' }))
    await waitFor(() => {
      const traceText = screen.getByLabelText('Trace detail').textContent ?? ''
      expect(traceText).toContain('operation.accepted')
      expect(traceText).toContain('operation.completed')
    })
  })
})
