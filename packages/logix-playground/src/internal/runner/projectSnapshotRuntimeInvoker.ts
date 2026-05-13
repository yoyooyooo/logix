import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import {
  createOperationAcceptedEvent,
  createOperationCompletedEvent,
  createOperationFailedEvent,
  createRuntimeOperationEvidenceGap,
  type MinimumProgramActionManifest,
  type RuntimeOperationEvent,
  type RuntimeOperationKind,
  type RuntimeReflectionManifest,
} from '@logixjs/core/repo-internal/reflection-api'
import { makeRunId } from '../snapshot/identity.js'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import { createControlPlaneRunner } from './controlPlaneRunner.js'
import type { ProgramSessionDispatchInput } from './programSessionRunner.js'
import { createProgramSessionRunner } from './programSessionRunner.js'
import type { InternalRunFailure, InternalRunProjection } from './runProjection.js'
import { projectRunFailure } from './runProjection.js'
import { createRuntimeReflectionWrapperSource } from './runtimeReflectionWrapper.js'
import {
  createRuntimeEvidenceEnvelope,
  operationCoordinateForSnapshot,
  type PlaygroundRuntimeArtifactRef,
  type PlaygroundRuntimeEvidenceEnvelope,
  type PlaygroundRuntimeOperationKind,
  type ProjectSnapshotRuntimeOutput,
} from './runtimeEvidence.js'
import {
  assertRunnerSnapshotBoundary,
  createSandboxBackedRunner,
  type InternalSandboxTransport,
} from './sandboxRunner.js'

export type ProjectSnapshotRuntimeInvokerFailureKind =
  | 'compile'
  | 'runtime'
  | 'worker'
  | 'serialization'
  | 'timeout'
  | 'unavailable'

export interface ProjectSnapshotControlPlaneReport {
  readonly kind: 'controlPlaneReport'
  readonly operation: 'check' | 'trialStartup'
  readonly report: VerificationControlPlaneReport
}

export interface ProjectSnapshotTransportFailure {
  readonly kind: 'transportFailure'
  readonly operation: 'run' | 'dispatch' | 'check' | 'trialStartup'
  readonly failure: {
    readonly kind: ProjectSnapshotRuntimeInvokerFailureKind
    readonly message: string
  }
}

export interface ProjectSnapshotEvidenceGap {
  readonly kind: 'evidenceGap'
  readonly operation: 'run' | 'dispatch' | 'check' | 'trialStartup'
  readonly message: string
}

export type { ProjectSnapshotRuntimeOutput }

export type ProjectSnapshotRuntimeInvokerOutput = PlaygroundRuntimeEvidenceEnvelope

export interface ProjectSnapshotRuntimeInvoker {
  readonly reflect: (snapshot: ProjectSnapshot, seq?: number) => Promise<ProjectSnapshotRuntimeInvokerOutput>
  readonly run: (snapshot: ProjectSnapshot, seq?: number) => Promise<ProjectSnapshotRuntimeInvokerOutput>
  readonly dispatch: (input: ProgramSessionDispatchInput) => Promise<ProjectSnapshotRuntimeInvokerOutput>
  readonly check: (snapshot: ProjectSnapshot, seq?: number) => Promise<ProjectSnapshotRuntimeInvokerOutput>
  readonly trialStartup: (snapshot: ProjectSnapshot, seq?: number) => Promise<ProjectSnapshotRuntimeInvokerOutput>
}

const toFailure = (
  operation: ProjectSnapshotTransportFailure['operation'],
  kind: ProjectSnapshotRuntimeInvokerFailureKind,
  error: unknown,
): ProjectSnapshotTransportFailure => ({
  kind: 'transportFailure',
  operation,
  failure: {
    kind,
    message: error instanceof Error ? error.message : String(error),
  },
})

const toRunOutput = (
  result: InternalRunProjection | InternalRunFailure,
): ProjectSnapshotRuntimeOutput => {
  if (result.status === 'passed') {
    return {
      kind: 'runtimeOutput',
      operation: 'run',
      status: 'passed',
      runId: result.runId,
      value: result.value,
      valueKind: result.valueKind,
      lossy: result.lossy,
      ...(result.lossReasons ? { lossReasons: result.lossReasons } : null),
    }
  }

  return {
    kind: 'runtimeOutput',
    operation: 'run',
    status: 'failed',
    runId: result.runId,
    failure: result.failure,
  }
}

const runtimeOperationKindOf = (
  operation: PlaygroundRuntimeOperationKind,
): RuntimeOperationKind | undefined => {
  if (operation === 'trialStartup') return 'trial'
  if (operation === 'reflect') return undefined
  return operation
}

const acceptedEvent = (
  snapshot: ProjectSnapshot,
  operationKind: PlaygroundRuntimeOperationKind,
  opSeq: number,
  actionTag?: string,
  runId?: string,
): RuntimeOperationEvent =>
  createOperationAcceptedEvent({
    ...operationCoordinateForSnapshot(snapshot, opSeq),
    ...(runtimeOperationKindOf(operationKind) ? { operationKind: runtimeOperationKindOf(operationKind) } : {}),
    ...(actionTag ? { actionTag } : {}),
    ...(runId ? { runId } : {}),
  })

const completedEvent = (
  snapshot: ProjectSnapshot,
  operationKind: PlaygroundRuntimeOperationKind,
  opSeq: number,
  actionTag?: string,
  runId?: string,
): RuntimeOperationEvent =>
  createOperationCompletedEvent({
    ...operationCoordinateForSnapshot(snapshot, opSeq),
    ...(runtimeOperationKindOf(operationKind) ? { operationKind: runtimeOperationKindOf(operationKind) } : {}),
    ...(actionTag ? { actionTag } : {}),
    ...(runId ? { runId } : {}),
  })

const failedEvent = (
  snapshot: ProjectSnapshot,
  operationKind: PlaygroundRuntimeOperationKind,
  opSeq: number,
  failure: { readonly kind?: string; readonly message: string },
  actionTag?: string,
  runId?: string,
): RuntimeOperationEvent =>
  createOperationFailedEvent({
    ...operationCoordinateForSnapshot(snapshot, opSeq),
    ...(runtimeOperationKindOf(operationKind) ? { operationKind: runtimeOperationKindOf(operationKind) } : {}),
    ...(actionTag ? { actionTag } : {}),
    ...(runId ? { runId } : {}),
    failure: {
      ...(failure.kind ? { code: failure.kind } : {}),
      message: failure.message,
    },
  })

const gapEvent = (
  snapshot: ProjectSnapshot,
  operationKind: PlaygroundRuntimeOperationKind,
  opSeq: number,
  code: string,
  message: string,
  actionTag?: string,
): RuntimeOperationEvent =>
  createRuntimeOperationEvidenceGap({
    ...operationCoordinateForSnapshot(snapshot, opSeq),
    ...(runtimeOperationKindOf(operationKind) ? { operationKind: runtimeOperationKindOf(operationKind) } : {}),
    ...(actionTag ? { actionTag } : {}),
    code,
    message,
  })

const manifestArtifactRefs = (input: {
  readonly reflectionManifest?: RuntimeReflectionManifest
  readonly minimumActionManifest?: MinimumProgramActionManifest
}): ReadonlyArray<PlaygroundRuntimeArtifactRef> => [
  ...(input.reflectionManifest
    ? [{
        outputKey: 'reflectionManifest',
        kind: 'RuntimeReflectionManifest',
        digest: input.reflectionManifest.digest,
      }]
    : []),
  ...(input.minimumActionManifest
    ? [{
        outputKey: 'minimumActionManifest',
        kind: 'MinimumProgramActionManifest',
        digest: input.minimumActionManifest.digest,
      }]
    : []),
]

const firstActionTag = (input: ProgramSessionDispatchInput): string | undefined =>
  input.actions[input.actions.length - 1]?._tag

const failureEnvelope = (input: {
  readonly snapshot: ProjectSnapshot
  readonly operationKind: PlaygroundRuntimeOperationKind
  readonly opSeq: number
  readonly code: string
  readonly message: string
  readonly actionTag?: string
  readonly runId?: string
  readonly runtimeOutput?: ProjectSnapshotRuntimeOutput
}): PlaygroundRuntimeEvidenceEnvelope => {
  const failed = failedEvent(
    input.snapshot,
    input.operationKind,
    input.opSeq,
    { kind: input.code, message: input.message },
    input.actionTag,
    input.runId,
  )
  const gap = gapEvent(input.snapshot, input.operationKind, input.opSeq, input.code, input.message, input.actionTag)
  return createRuntimeEvidenceEnvelope({
    snapshot: input.snapshot,
    operationKind: input.operationKind,
    opSeq: input.opSeq,
    ...(input.runtimeOutput ? { runtimeOutput: input.runtimeOutput } : null),
    operationEvents: [failed],
    artifactRefs: [],
    evidenceGaps: [gap],
  })
}

export const createProjectSnapshotRuntimeInvoker = (
  options: { readonly transport: InternalSandboxTransport },
): ProjectSnapshotRuntimeInvoker => {
  const runRunner = createSandboxBackedRunner(options)
  const sessionRunner = createProgramSessionRunner(options)
  const controlPlaneRunner = createControlPlaneRunner(options)

  return {
    reflect: async (snapshot, seq = 1) => {
      const runId = makeRunId(snapshot.projectId, snapshot.revision, 'reflect', seq)
      try {
        assertRunnerSnapshotBoundary(snapshot)
        const wrapper = createRuntimeReflectionWrapperSource(snapshot)
        await options.transport.init()
        const compiled = await options.transport.compile(wrapper, snapshot.programEntry?.entry)
        if (!compiled.success) {
          return failureEnvelope({
            snapshot,
            operationKind: 'reflect',
            opSeq: seq,
            code: 'compile',
            message: compiled.errors?.join('\n') ?? 'compile failed',
            runId,
          })
        }
        const result = await options.transport.run({ runId })
        const reflected = result.stateSnapshot as {
          readonly reflectionManifest?: RuntimeReflectionManifest
          readonly minimumActionManifest?: MinimumProgramActionManifest
        }
        const operationEvents = [
          acceptedEvent(snapshot, 'reflect', seq, undefined, runId),
          completedEvent(snapshot, 'reflect', seq, undefined, runId),
        ]
        return createRuntimeEvidenceEnvelope({
          snapshot,
          operationKind: 'reflect',
          opSeq: seq,
          reflectionManifest: reflected.reflectionManifest,
          minimumActionManifest: reflected.minimumActionManifest,
          operationEvents,
          artifactRefs: manifestArtifactRefs(reflected),
          evidenceGaps: reflected.reflectionManifest || reflected.minimumActionManifest
            ? []
            : [gapEvent(
                snapshot,
                'reflect',
                seq,
                'runtime-reflection-unavailable',
                'Runtime reflection manifest is unavailable.',
              )],
        })
      } catch (error) {
        return failureEnvelope({
          snapshot,
          operationKind: 'reflect',
          opSeq: seq,
          code: 'runtime-reflection-unavailable',
          message: error instanceof Error ? error.message : String(error),
          runId,
        })
      }
    },
    run: async (snapshot, seq = 1) => {
      const runId = makeRunId(snapshot.projectId, snapshot.revision, 'run', seq)
      try {
        const output = toRunOutput(await runRunner.runProgram(snapshot, seq))
        if (output.status !== 'failed') {
          return createRuntimeEvidenceEnvelope({
            snapshot,
            operationKind: 'run',
            opSeq: seq,
            runtimeOutput: output,
            operationEvents: [
              acceptedEvent(snapshot, 'run', seq, undefined, output.runId ?? runId),
              completedEvent(snapshot, 'run', seq, undefined, output.runId ?? runId),
            ],
            artifactRefs: [],
            evidenceGaps: [],
          })
        }
        return failureEnvelope({
          snapshot,
          operationKind: 'run',
          opSeq: seq,
          code: output.failure?.kind ?? 'runtime',
          message: output.failure?.message ?? 'Runtime.run failed',
          runId: output.runId ?? runId,
          runtimeOutput: output,
        })
      } catch (error) {
        const output = toRunOutput(projectRunFailure(runId, 'runtime', error))
        return failureEnvelope({
          snapshot,
          operationKind: 'run',
          opSeq: seq,
          code: output.failure?.kind ?? 'runtime',
          message: output.failure?.message ?? 'Runtime.run failed',
          runId: output.runId ?? runId,
          runtimeOutput: output,
        })
      }
    },
    dispatch: async (input) => {
      const actionTag = firstActionTag(input)
      try {
        assertRunnerSnapshotBoundary(input.snapshot)
        const result = await sessionRunner.dispatch(input)
        const output: ProjectSnapshotRuntimeOutput = {
          kind: 'runtimeOutput',
          operation: 'dispatch',
          state: result.state,
          logs: result.logs,
          traces: result.traces,
        }
        return createRuntimeEvidenceEnvelope({
          snapshot: input.snapshot,
          operationKind: 'dispatch',
          opSeq: input.operationSeq,
          runtimeOutput: output,
          operationEvents: [
            acceptedEvent(input.snapshot, 'dispatch', input.operationSeq, actionTag),
            completedEvent(input.snapshot, 'dispatch', input.operationSeq, actionTag),
          ],
          artifactRefs: [],
          evidenceGaps: [],
        })
      } catch (error) {
        const failure = error && typeof error === 'object' && 'kind' in error
          ? error as { readonly kind: ProjectSnapshotRuntimeInvokerFailureKind; readonly message?: string }
          : undefined
        const output = toFailure('dispatch', failure?.kind ?? 'runtime', failure?.message ?? error)
        return failureEnvelope({
          snapshot: input.snapshot,
          operationKind: 'dispatch',
          opSeq: input.operationSeq,
          code: output.failure.kind,
          message: output.failure.message,
          actionTag,
        })
      }
    },
    check: async (snapshot, seq = 1) => {
      try {
        const report = await controlPlaneRunner.check(snapshot, seq)
        return createRuntimeEvidenceEnvelope({
          snapshot,
          operationKind: 'check',
          opSeq: seq,
          controlPlaneReport: report,
          operationEvents: [
            acceptedEvent(snapshot, 'check', seq),
            completedEvent(snapshot, 'check', seq),
          ],
          artifactRefs: [],
          evidenceGaps: [],
        })
      } catch (error) {
        const output = toFailure('check', 'runtime', error)
        return failureEnvelope({
          snapshot,
          operationKind: 'check',
          opSeq: seq,
          code: output.failure.kind,
          message: output.failure.message,
        })
      }
    },
    trialStartup: async (snapshot, seq = 1) => {
      try {
        const report = await controlPlaneRunner.trialStartup(snapshot, seq)
        return createRuntimeEvidenceEnvelope({
          snapshot,
          operationKind: 'trialStartup',
          opSeq: seq,
          controlPlaneReport: report,
          operationEvents: [
            acceptedEvent(snapshot, 'trialStartup', seq),
            completedEvent(snapshot, 'trialStartup', seq),
          ],
          artifactRefs: [],
          evidenceGaps: [],
        })
      } catch (error) {
        const output = toFailure('trialStartup', 'runtime', error)
        return failureEnvelope({
          snapshot,
          operationKind: 'trialStartup',
          opSeq: seq,
          code: output.failure.kind,
          message: output.failure.message,
        })
      }
    },
  }
}
