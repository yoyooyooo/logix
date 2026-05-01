import type { ProjectSnapshotRuntimeInvoker } from '../../src/internal/runner/projectSnapshotRuntimeInvoker.js'
import { createRuntimeEvidenceEnvelope } from '../../src/internal/runner/runtimeEvidence.js'
import { makeControlPlaneReport } from './controlPlaneFixtures.js'

export const makeRuntimeInvokerWithCounterReflection = (
  overrides: Partial<ProjectSnapshotRuntimeInvoker> = {},
): ProjectSnapshotRuntimeInvoker => ({
  reflect: async (snapshot) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'reflect',
    opSeq: 1,
    minimumActionManifest: {
      manifestVersion: 'program-action-manifest@167A',
      programId: snapshot.projectId,
      moduleId: 'FixtureCounter',
      revision: snapshot.revision,
      digest: `manifest:${snapshot.projectId}:r${snapshot.revision}`,
      actions: [
        { actionTag: 'decrement', payload: { kind: 'void' }, authority: 'runtime-reflection' },
        { actionTag: 'increment', payload: { kind: 'void' }, authority: 'runtime-reflection' },
        { actionTag: 'setCount', payload: { kind: 'nonVoid', summary: 'number' }, authority: 'runtime-reflection' },
      ],
    },
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  run: async (snapshot, seq = 1) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'run',
    opSeq: seq,
    runtimeOutput: {
      kind: 'runtimeOutput',
      operation: 'run',
      runId: `${snapshot.projectId}:run:r${snapshot.revision}:op${seq}`,
      value: { count: 1 },
    },
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  dispatch: async (input) => createRuntimeEvidenceEnvelope({
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
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  check: async (snapshot, seq = 1) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'check',
    opSeq: seq,
    controlPlaneReport: makeControlPlaneReport('check', 'static'),
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  trialStartup: async (snapshot, seq = 1) => createRuntimeEvidenceEnvelope({
    snapshot,
    operationKind: 'trialStartup',
    opSeq: seq,
    controlPlaneReport: makeControlPlaneReport('trial', 'startup'),
    operationEvents: [],
    artifactRefs: [],
    evidenceGaps: [],
  }),
  ...overrides,
})
