import { describe, expect, it } from 'vitest'
import {
  createRuntimeEvidenceEnvelope,
  snapshotSourceDigest,
} from '../src/internal/runner/runtimeEvidence.js'
import { createPlaygroundWorkspace } from '../src/internal/session/workspace.js'
import { createProjectSnapshot } from '../src/internal/snapshot/projectSnapshot.js'
import { localCounterProjectFixture } from './support/projectFixtures.js'

describe('Playground runtime evidence envelope', () => {
  it('creates stable source digest and operation coordinate for a snapshot operation', () => {
    const snapshot = createProjectSnapshot(createPlaygroundWorkspace(localCounterProjectFixture))
    const digest = snapshotSourceDigest(snapshot)
    const envelope = createRuntimeEvidenceEnvelope({
      snapshot,
      operationKind: 'reflect',
      opSeq: 1,
      sourceRefs: [{ kind: 'source', path: '/src/main.program.ts', digest }],
      operationEvents: [],
      evidenceGaps: [],
      artifactRefs: [],
    })

    expect(digest).toMatch(/^playground-source:/)
    expect(envelope).toMatchObject({
      sourceDigest: digest,
      sourceRevision: 0,
      operationKind: 'reflect',
      operationCoordinate: {
        instanceId: 'logix-react.local-counter:r0',
        txnSeq: 0,
        opSeq: 1,
      },
      sourceRefs: [{ kind: 'source', path: '/src/main.program.ts', digest }],
      artifactRefs: [],
      operationEvents: [],
      evidenceGaps: [],
    })
  })
})
