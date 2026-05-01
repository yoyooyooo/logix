import type { VerificationControlPlaneReport } from '@logixjs/core/ControlPlane'
import { createWorkbenchReflectionBridgeBundle } from '@logixjs/core/repo-internal/reflection-api'
import {
  deriveRuntimeWorkbenchProjectionIndex,
  digestText,
  type RuntimeWorkbenchAuthorityBundle,
  type RuntimeWorkbenchContextRef,
  type RuntimeWorkbenchProjectionIndex,
  type RuntimeWorkbenchTruthInput,
} from '@logixjs/core/repo-internal/workbench-api'

import type { InternalRunResult } from '../runner/runProjection.js'
import type { ScenarioExecutionState } from '../scenario/scenarioModel.js'
import type { ProgramSessionState } from '../session/programSession.js'
import type { ProjectSnapshot } from '../snapshot/projectSnapshot.js'
import type { DriverExecutionState, RuntimeEvidenceState } from '../state/workbenchTypes.js'
import type { PlaygroundRuntimeEvidenceEnvelope } from '../runner/runtimeEvidence.js'
import type { ProjectSnapshotRuntimeOutput } from '../runner/runtimeEvidence.js'

export interface PlaygroundWorkbenchProjectionInput {
  readonly snapshot: ProjectSnapshot
  readonly programRun?: InternalRunResult
  readonly programSession?: ProgramSessionState
  readonly checkReport?: VerificationControlPlaneReport
  readonly trialStartupReport?: VerificationControlPlaneReport
  readonly runtimeEvidence?: RuntimeEvidenceState
  readonly driverExecution?: DriverExecutionState
  readonly scenarioExecution?: ScenarioExecutionState
  readonly compileFailure?: { readonly message: string }
  readonly previewFailure?: { readonly message: string }
}

const sessionTruthInput = (
  session: ProgramSessionState | undefined,
  sourceDigest: string,
): RuntimeWorkbenchTruthInput | undefined => {
  if (!session || session.state === undefined || session.status === 'running') return undefined
  const failure = session.error
    ? { code: session.error.kind, message: session.error.message }
    : undefined

  return {
    kind: 'run-result',
    runId: `${session.sessionId}:op${session.operationSeq}`,
    status: failure ? 'failed' : 'passed',
    ...(failure ? { failure } : { value: session.state }),
    sourceDigest,
  }
}

const snapshotDigest = (snapshot: ProjectSnapshot): string =>
  digestText(
    JSON.stringify(
      Array.from(snapshot.files.values())
        .map((file) => [file.path, file.hash])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
    ),
  )

const runTruthInput = (
  run: InternalRunResult | undefined,
  sourceDigest: string,
): RuntimeWorkbenchTruthInput | undefined => {
  if (!run) return undefined
  if (run.status === 'passed') {
    return {
      kind: 'run-result',
      runId: run.runId,
      status: 'passed',
      value: run.value,
      valueKind: run.valueKind,
      lossy: run.lossy,
      ...(run.lossReasons ? { lossReasons: run.lossReasons } : null),
      sourceDigest,
    }
  }
  return {
    kind: 'run-result',
    runId: run.runId,
    status: 'failed',
    failure: {
      code: run.failure.kind,
      message: run.failure.message,
    },
    sourceDigest,
  }
}

const explicitGapTruthInput = (
  snapshot: ProjectSnapshot,
  sourceDigest: string,
  code: string,
  summary: string,
  severity: 'info' | 'warning' | 'error' = 'warning',
): RuntimeWorkbenchTruthInput => ({
  kind: 'evidence-gap',
  gapId: `${snapshot.projectId}:r${snapshot.revision}:${code}`,
  code,
  owner: 'bundle',
  summary,
  severity,
  sourceDigest,
})

const evidenceLanes = (
  state: RuntimeEvidenceState | undefined,
): ReadonlyArray<PlaygroundRuntimeEvidenceEnvelope> =>
  state
    ? [
        state.reflect,
        state.run,
        state.dispatch,
        state.check,
        state.trialStartup,
      ].filter((evidence): evidence is PlaygroundRuntimeEvidenceEnvelope => Boolean(evidence))
    : []

const runtimeEvidenceBridgeBundle = (
  evidence: PlaygroundRuntimeEvidenceEnvelope,
): RuntimeWorkbenchAuthorityBundle =>
  createWorkbenchReflectionBridgeBundle({
    manifest: evidence.reflectionManifest ?? evidence.minimumActionManifest,
    sourceRefs: evidence.sourceRefs,
    operationEvents: evidence.operationEvents,
    evidenceGaps: evidence.evidenceGaps,
  })

const runtimeOutputTruthInput = (
  output: ProjectSnapshotRuntimeOutput | undefined,
  sourceDigest: string,
): RuntimeWorkbenchTruthInput | undefined => {
  if (!output || output.operation !== 'run' || !output.runId) return undefined
  if (output.status === 'failed') {
    return {
      kind: 'run-result',
      runId: output.runId,
      status: 'failed',
      failure: {
        code: output.failure?.kind ?? 'runtime',
        message: output.failure?.message ?? 'Runtime.run failed',
      },
      sourceDigest,
    }
  }
  return {
    kind: 'run-result',
    runId: output.runId,
    status: 'passed',
    value: output.value,
    ...(output.valueKind ? { valueKind: output.valueKind } : null),
    ...(output.lossy !== undefined ? { lossy: output.lossy } : null),
    ...(output.lossReasons ? { lossReasons: output.lossReasons } : null),
    sourceDigest,
  }
}

const pushTruthInput = (
  truthInputs: RuntimeWorkbenchTruthInput[],
  input: RuntimeWorkbenchTruthInput | undefined,
  seenRunIds: Set<string>,
): void => {
  if (!input) return
  if (input.kind === 'run-result') {
    if (seenRunIds.has(input.runId)) return
    seenRunIds.add(input.runId)
  }
  truthInputs.push(input)
}

export const buildPlaygroundRuntimeWorkbenchAuthorityBundle = (
  input: PlaygroundWorkbenchProjectionInput,
): RuntimeWorkbenchAuthorityBundle => {
  const digest = snapshotDigest(input.snapshot)
  const truthInputs: RuntimeWorkbenchTruthInput[] = []
  const seenRunIds = new Set<string>()
  const contextRefs: RuntimeWorkbenchContextRef[] = [
    {
      kind: 'source-snapshot',
      projectId: input.snapshot.projectId,
      digest,
      spans: Array.from(input.snapshot.files.values()).map((file) => ({
        path: file.path,
        startLine: 1,
      })),
    },
  ]
  const run = runTruthInput(input.programRun, digest)
  const session = sessionTruthInput(input.programSession, digest)
  pushTruthInput(truthInputs, run, seenRunIds)
  pushTruthInput(truthInputs, session, seenRunIds)
  for (const evidence of evidenceLanes(input.runtimeEvidence)) {
    pushTruthInput(truthInputs, runtimeOutputTruthInput(evidence.runtimeOutput, digest), seenRunIds)
    const bridge = runtimeEvidenceBridgeBundle(evidence)
    truthInputs.push(...bridge.truthInputs)
    contextRefs.push(...(bridge.contextRefs ?? []))
  }
  if (input.checkReport) truthInputs.push({ kind: 'control-plane-report', report: input.checkReport, sourceDigest: digest })
  else if (input.snapshot.diagnostics.check) {
    truthInputs.push(explicitGapTruthInput(
      input.snapshot,
      digest,
      'playground-unavailable-check-report',
      'Runtime.check is available but no check report has been captured.',
    ))
  }
  if (input.trialStartupReport) {
    truthInputs.push({ kind: 'control-plane-report', report: input.trialStartupReport, sourceDigest: digest })
  } else if (input.snapshot.diagnostics.trialStartup) {
    truthInputs.push(explicitGapTruthInput(
      input.snapshot,
      digest,
      'playground-unavailable-trial-startup-report',
      'Runtime.trial(mode=startup) is available but no startup trial report has been captured.',
    ))
  }
  if (input.compileFailure) {
    truthInputs.push(explicitGapTruthInput(input.snapshot, digest, 'compile-failure', input.compileFailure.message, 'error'))
  }
  if (input.previewFailure) {
    truthInputs.push(explicitGapTruthInput(input.snapshot, digest, 'preview-only-host-error', input.previewFailure.message))
  }

  return {
    truthInputs,
    contextRefs,
  }
}

export const derivePlaygroundWorkbenchProjection = (
  input: PlaygroundWorkbenchProjectionInput,
): RuntimeWorkbenchProjectionIndex =>
  deriveRuntimeWorkbenchProjectionIndex(buildPlaygroundRuntimeWorkbenchAuthorityBundle(input))
