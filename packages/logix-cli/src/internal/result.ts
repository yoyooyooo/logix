import type {
  JsonValue,
  VerificationControlPlaneArtifactRef as ControlPlaneArtifactRef,
  VerificationControlPlaneMode as ControlPlaneMode,
  VerificationControlPlaneRepairHint as ControlPlaneRepairHint,
  VerificationControlPlaneReport as ControlPlaneReport,
  VerificationControlPlaneStage as ControlPlaneStage,
  VerificationControlPlaneVerdict as ControlPlaneVerdict,
} from '@logixjs/core/ControlPlane'
import { isVerificationControlPlaneReport, makeVerificationControlPlaneReport } from '@logixjs/core/ControlPlane'

import type { SerializableErrorSummary } from './errors.js'
import type { CommandInputCoordinate } from './inputCoordinate.js'
import { makeInputCoordinate } from './inputCoordinate.js'

export type {
  JsonValue,
  ControlPlaneArtifactRef,
  ControlPlaneMode,
  ControlPlaneRepairHint,
  ControlPlaneReport,
  ControlPlaneStage,
  ControlPlaneVerdict,
}

export interface ArtifactOutput {
  readonly outputKey: string
  readonly kind: string
  readonly schemaVersion?: number
  readonly ok: boolean
  readonly file?: string
  readonly inline?: JsonValue
  readonly truncated?: boolean
  readonly budgetBytes?: number
  readonly actualBytes?: number
  readonly digest?: string
  readonly reasonCodes?: ReadonlyArray<string>
  readonly error?: SerializableErrorSummary
}

export interface CommandResult {
  readonly schemaVersion: 1
  readonly kind: 'CommandResult'
  readonly runId: string
  readonly command: string
  readonly ok: boolean
  readonly inputCoordinate: CommandInputCoordinate
  readonly artifacts: ReadonlyArray<ArtifactOutput>
  readonly primaryReportOutputKey: string
  readonly error?: SerializableErrorSummary
}

export const toArtifactRefs = (artifacts: ReadonlyArray<ArtifactOutput>): ReadonlyArray<ControlPlaneArtifactRef> =>
  artifacts.map((artifact) => ({
    outputKey: artifact.outputKey,
    kind: artifact.kind,
    ...(artifact.file ? { file: artifact.file } : null),
    ...(artifact.digest ? { digest: artifact.digest } : null),
    ...(artifact.reasonCodes ? { reasonCodes: artifact.reasonCodes } : null),
  }))

export const makeControlPlaneReport = makeVerificationControlPlaneReport

export const assertArtifactLinks = (
  artifacts: ReadonlyArray<Pick<ArtifactOutput, 'outputKey'>>,
  outputKeys: ReadonlyArray<string>,
): void => {
  const keys = new Set(artifacts.map((artifact) => artifact.outputKey))
  for (const outputKey of outputKeys) {
    if (outputKey.includes('://') || !keys.has(outputKey)) {
      throw new Error(`[Logix][CLI] artifact links must reference artifacts[].outputKey: ${outputKey}`)
    }
  }
}

const isReportArtifact = (artifact: ArtifactOutput | undefined): boolean => {
  if (!artifact) return false
  if (artifact.kind !== 'VerificationControlPlaneReport') return false
  if (artifact.truncated === true && artifact.file) return true
  if (artifact.inline !== undefined && !isVerificationControlPlaneReport(artifact.inline)) return false
  return true
}

type MakeCommandResultInput =
  | {
      readonly runId: string
      readonly command: string
      readonly ok: true
      readonly inputCoordinate: CommandInputCoordinate
      readonly primaryReportOutputKey: string
      readonly artifacts: ReadonlyArray<ArtifactOutput>
    }
  | {
      readonly runId: string
      readonly command: string
      readonly ok: false
      readonly inputCoordinate: CommandInputCoordinate
      readonly primaryReportOutputKey: string
      readonly artifacts: ReadonlyArray<ArtifactOutput>
      readonly error: SerializableErrorSummary
    }

export const sortArtifactsByOutputKey = (artifacts: ReadonlyArray<ArtifactOutput>): ReadonlyArray<ArtifactOutput> =>
  Array.from(artifacts).sort((a, b) => (a.outputKey < b.outputKey ? -1 : a.outputKey > b.outputKey ? 1 : 0))

export const makeCommandResult = (input: MakeCommandResultInput): CommandResult => {
  assertArtifactLinks(input.artifacts, [input.primaryReportOutputKey])
  const primaryReport = input.artifacts.find((artifact) => artifact.outputKey === input.primaryReportOutputKey)
  if (!isReportArtifact(primaryReport)) {
    throw new Error(`[Logix][CLI] primaryReportOutputKey must point to a VerificationControlPlaneReport artifact: ${input.primaryReportOutputKey}`)
  }

  return {
    schemaVersion: 1,
    kind: 'CommandResult',
    runId: input.runId,
    command: input.command,
    ok: input.ok,
    inputCoordinate: makeInputCoordinate(input.inputCoordinate),
    artifacts: input.artifacts,
    primaryReportOutputKey: input.primaryReportOutputKey,
    ...(input.ok ? null : { error: input.error }),
  }
}

export const getAgentSchedulingStage = (report: {
  readonly nextRecommendedStage: ControlPlaneStage | 'done' | null
  readonly repairHints?: ReadonlyArray<ControlPlaneRepairHint>
}): ControlPlaneStage | 'done' | null => report.nextRecommendedStage

const isUsageOrInputFailure = (code: string | undefined): boolean =>
  typeof code === 'string' &&
  (code === 'CLI_INVALID_ARGUMENT' ||
    code === 'CLI_INVALID_COMMAND' ||
    code === 'CLI_INVALID_EVIDENCE' ||
    code === 'CLI_INVALID_SELECTION' ||
    code === 'CLI_MISSING_RUNID' ||
    code === 'CLI_INVALID_INPUT' ||
    code === 'CLI_ENTRY_NO_EXPORT' ||
    code === 'CLI_ENTRY_NOT_PROGRAM' ||
    code === 'CLI_ENTRY_IMPORT_FAILED' ||
    code === 'CLI_SCENARIO_INPUT_REQUIRED' ||
    code === 'CLI_SCENARIO_NOT_IMPLEMENTED' ||
    code === 'CLI_HOST_MISSING_BROWSER_GLOBAL' ||
    code === 'CLI_HOST_MISMATCH')

export const makeErrorCommandResult = (args: {
  readonly runId: string
  readonly command: string
  readonly error: SerializableErrorSummary
  readonly inputCoordinate?: CommandInputCoordinate
}): CommandResult => {
  const stage: ControlPlaneStage = args.command === 'trial' ? 'trial' : args.command === 'compare' ? 'compare' : 'check'
  const mode: ControlPlaneMode = stage === 'trial' ? 'startup' : stage === 'compare' ? 'compare' : 'static'
  const nextRecommendedStage = args.command === 'unknown' || isUsageOrInputFailure(args.error.code) ? null : stage
  const report = makeVerificationControlPlaneReport({
    kind: 'VerificationControlPlaneReport',
    stage,
    mode,
    verdict: 'FAIL',
    errorCode: args.error.code ?? 'CLI_ERROR',
    summary: args.error.message,
    environment: { runId: args.runId, command: args.command },
    artifacts: [],
    repairHints: [],
    nextRecommendedStage,
  })
  return makeCommandResult({
    runId: args.runId,
    command: args.command,
    ok: false,
    inputCoordinate: args.inputCoordinate ?? { command: args.command },
    primaryReportOutputKey: 'errorReport',
    artifacts: [
      {
        outputKey: 'errorReport',
        kind: 'VerificationControlPlaneReport',
        schemaVersion: 1,
        ok: true,
        inline: JSON.parse(JSON.stringify(report)) as JsonValue,
      },
    ],
    error: args.error,
  })
}

export const makeOversizedInlineValue = (args: {
  readonly stableJson: string
  readonly bytes: number
  readonly budgetBytes: number
}): {
  readonly inline: JsonValue
  readonly truncated: true
  readonly actualBytes: number
  readonly budgetBytes: number
} => {
  const maxPreviewBytes = Math.max(0, Math.min(256, args.budgetBytes))
  const encoder = new TextEncoder()
  let preview = ''
  let usedBytes = 0
  for (const ch of args.stableJson) {
    const chBytes = encoder.encode(ch).length
    if (usedBytes + chBytes > maxPreviewBytes) break
    preview += ch
    usedBytes += chBytes
  }

  return {
    inline: { _tag: 'oversized', bytes: args.bytes, preview },
    truncated: true,
    actualBytes: args.bytes,
    budgetBytes: args.budgetBytes,
  }
}
