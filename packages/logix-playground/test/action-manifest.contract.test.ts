import { describe, expect, it } from 'vitest'
import type { MinimumProgramActionManifest } from '@logixjs/core/repo-internal/reflection-api'
import {
  projectActionManifestFromRuntimeEvidence,
  projectReflectedActionManifest,
  unavailableActionManifest,
} from '../src/internal/action/actionManifest.js'
import { createRuntimeEvidenceEnvelope } from '../src/internal/runner/runtimeEvidence.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Playground action manifest', () => {
  it('projects actions only from runtime-backed evidence', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const evidence = createRuntimeEvidenceEnvelope({
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
    })

    expect(projectActionManifestFromRuntimeEvidence(snapshot, evidence)).toMatchObject({
      authorityStatus: 'runtime-reflection',
      manifestDigest: 'manifest:counter',
      actions: [{ actionTag: 'increment', payloadKind: 'void', authority: 'runtime-reflection' }],
      evidenceGaps: [],
    })
  })

  it('does not derive runnable actions from source when evidence is missing', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const manifest = unavailableActionManifest(snapshot, 'Runtime reflection manifest is unavailable.')

    expect(manifest.authorityStatus).toBe('unavailable')
    expect(manifest.actions).toEqual([])
    expect(manifest.evidenceGaps[0]).toMatchObject({
      kind: 'missing-action-manifest',
      source: 'runtime-reflection',
    })
  })

  it('projects 167A minimum manifest input into the UI action view model without fallback evidence gaps', () => {
    const manifest = {
      manifestVersion: 'program-action-manifest@167A',
      programId: 'logix-react.local-counter',
      revision: 3,
      digest: 'manifest:fixture',
      moduleId: 'FixtureCounter',
      actions: [
        { actionTag: 'setCount', payload: { kind: 'nonVoid', summary: 'number' }, authority: 'runtime-reflection' },
        { actionTag: 'increment', payload: { kind: 'void' }, authority: 'manifest' },
      ],
    } satisfies MinimumProgramActionManifest

    const viewModel = projectReflectedActionManifest({
      projectId: 'logix-react.local-counter',
      manifest,
    })

    expect(viewModel).toEqual({
      projectId: 'logix-react.local-counter',
      revision: 3,
      moduleId: 'FixtureCounter',
      manifestDigest: 'manifest:fixture',
      authorityStatus: 'manifest',
      evidenceGaps: [],
      actions: [
        { actionTag: 'increment', payloadKind: 'void', authority: 'manifest' },
        { actionTag: 'setCount', payloadKind: 'nonVoid', payloadSummary: 'number', authority: 'runtime-reflection' },
      ],
    })
  })
})
