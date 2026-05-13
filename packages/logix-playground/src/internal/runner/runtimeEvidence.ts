import type {
  MinimumProgramActionManifest,
  RuntimeOperationEvent,
  RuntimeReflectionManifest,
  RuntimeReflectionSourceRef,
} from '@logixjs/core/repo-internal/reflection-api'
import { digestText } from '@logixjs/core/repo-internal/workbench-api'
import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { BoundedLogEntry } from '../session/logs.js'
import type { ProgramSessionTraceRef } from '../session/programSession.js'

export type PlaygroundRuntimeOperationKind = 'reflect' | 'run' | 'dispatch' | 'check' | 'trialStartup'

export interface PlaygroundRuntimeOperationCoordinate {
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
}

export interface PlaygroundRuntimeArtifactRef {
  readonly outputKey: string
  readonly kind: string
  readonly digest: string
}

export interface ProjectSnapshotRuntimeOutput {
  readonly kind: 'runtimeOutput'
  readonly operation: 'run' | 'dispatch'
  readonly status?: 'passed' | 'failed'
  readonly runId?: string
  readonly value?: unknown
  readonly valueKind?: 'json' | 'null' | 'undefined' | 'void' | 'stringified' | 'truncated'
  readonly lossy?: boolean
  readonly lossReasons?: ReadonlyArray<string>
  readonly failure?: {
    readonly kind: 'compile' | 'runtime' | 'timeout' | 'serialization' | 'worker' | 'unavailable'
    readonly message: string
  }
  readonly state?: unknown
  readonly logs?: ReadonlyArray<BoundedLogEntry>
  readonly traces?: ReadonlyArray<ProgramSessionTraceRef>
}

export interface PlaygroundRuntimeEvidenceEnvelope {
  readonly kind: 'runtimeEvidence'
  readonly sourceDigest: string
  readonly sourceRevision: number
  readonly operationKind: PlaygroundRuntimeOperationKind
  readonly operationCoordinate: PlaygroundRuntimeOperationCoordinate
  readonly runtimeOutput?: ProjectSnapshotRuntimeOutput
  readonly controlPlaneReport?: VerificationControlPlaneReport
  readonly reflectionManifest?: RuntimeReflectionManifest
  readonly minimumActionManifest?: MinimumProgramActionManifest
  readonly operationEvents: ReadonlyArray<RuntimeOperationEvent>
  readonly sourceRefs: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly artifactRefs: ReadonlyArray<PlaygroundRuntimeArtifactRef>
  readonly evidenceGaps: ReadonlyArray<RuntimeOperationEvent>
}

export const snapshotSourceDigest = (snapshot: ProjectSnapshot): string =>
  `playground-source:${digestText(JSON.stringify(
    Array.from(snapshot.files.values())
      .map((file) => [file.path, file.hash])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  ))}`

export const sourceRefsForSnapshot = (snapshot: ProjectSnapshot): ReadonlyArray<RuntimeReflectionSourceRef> => {
  const digest = snapshotSourceDigest(snapshot)
  return Array.from(snapshot.files.values())
    .map((file) => ({ kind: 'source' as const, path: file.path, digest }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

export const operationCoordinateForSnapshot = (
  snapshot: ProjectSnapshot,
  opSeq: number,
): PlaygroundRuntimeOperationCoordinate => ({
  instanceId: `${snapshot.projectId}:r${snapshot.revision}`,
  txnSeq: snapshot.revision,
  opSeq,
})

export const createRuntimeEvidenceEnvelope = (input: {
  readonly snapshot: ProjectSnapshot
  readonly operationKind: PlaygroundRuntimeOperationKind
  readonly opSeq: number
  readonly runtimeOutput?: ProjectSnapshotRuntimeOutput
  readonly controlPlaneReport?: VerificationControlPlaneReport
  readonly reflectionManifest?: RuntimeReflectionManifest
  readonly minimumActionManifest?: MinimumProgramActionManifest
  readonly operationEvents: ReadonlyArray<RuntimeOperationEvent>
  readonly sourceRefs?: ReadonlyArray<RuntimeReflectionSourceRef>
  readonly artifactRefs: ReadonlyArray<PlaygroundRuntimeArtifactRef>
  readonly evidenceGaps: ReadonlyArray<RuntimeOperationEvent>
}): PlaygroundRuntimeEvidenceEnvelope => ({
  kind: 'runtimeEvidence',
  sourceDigest: snapshotSourceDigest(input.snapshot),
  sourceRevision: input.snapshot.revision,
  operationKind: input.operationKind,
  operationCoordinate: operationCoordinateForSnapshot(input.snapshot, input.opSeq),
  ...(input.runtimeOutput ? { runtimeOutput: input.runtimeOutput } : {}),
  ...(input.controlPlaneReport ? { controlPlaneReport: input.controlPlaneReport } : {}),
  ...(input.reflectionManifest ? { reflectionManifest: input.reflectionManifest } : {}),
  ...(input.minimumActionManifest ? { minimumActionManifest: input.minimumActionManifest } : {}),
  operationEvents: input.operationEvents,
  sourceRefs: input.sourceRefs ?? sourceRefsForSnapshot(input.snapshot),
  artifactRefs: input.artifactRefs,
  evidenceGaps: input.evidenceGaps,
})
