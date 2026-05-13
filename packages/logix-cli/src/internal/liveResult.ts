import type { JsonValue } from './result.js'
import type { SerializableErrorSummary } from './errors.js'

export type LiveArtifactKind =
  | 'LiveTargetList'
  | 'LiveInspectArtifact'
  | 'LiveOperationFacet'
  | 'LiveCapture'
  | 'CanonicalEvidencePackage'
  | 'EvidenceGap'
  | 'LiveStatus'

export interface LiveArtifactOutput {
  readonly outputKey: string
  readonly kind: LiveArtifactKind
  readonly ok: boolean
  readonly inline?: JsonValue
  readonly file?: string
  readonly digest?: string
  readonly reasonCodes?: ReadonlyArray<string>
}

export interface LiveInputCoordinate {
  readonly command: 'live'
  readonly task: string
  readonly runId: string
  readonly target?: string
  readonly attachmentId?: string
  readonly action?: string
  readonly from?: string
  readonly path?: string
  readonly field?: string
  readonly kind?: string
  readonly limit?: number
}

export interface LiveCommandResult {
  readonly schemaVersion: 1
  readonly kind: 'LiveCommandResult'
  readonly runId: string
  readonly command: string
  readonly ok: boolean
  readonly inputCoordinate: LiveInputCoordinate
  readonly artifacts: ReadonlyArray<LiveArtifactOutput>
  readonly primaryLiveOutputKey: string
  readonly error?: SerializableErrorSummary
}

const forbiddenVerificationFields = new Set([
  'primaryReportOutputKey',
  'repairHints',
  'nextRecommendedStage',
  'verdict',
])

const findForbiddenVerificationField = (value: unknown): string | undefined => {
  if (value === null || typeof value !== 'object') return undefined
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findForbiddenVerificationField(item)
      if (found) return found
    }
    return undefined
  }

  for (const [key, child] of Object.entries(value)) {
    if (forbiddenVerificationFields.has(key)) return key
    const found = findForbiddenVerificationField(child)
    if (found) return found
  }
  return undefined
}

const assertNoVerificationFields = (artifacts: ReadonlyArray<LiveArtifactOutput>): void => {
  for (const artifact of artifacts) {
    const found = findForbiddenVerificationField(artifact.inline)
    if (found) {
      throw new Error(`[Logix][CLI] LiveCommandResult artifact cannot contain verification field: ${found}`)
    }
  }
}

type MakeLiveCommandResultInput =
  | {
      readonly runId: string
      readonly command: string
      readonly ok: true
      readonly inputCoordinate: LiveInputCoordinate
      readonly primaryLiveOutputKey: string
      readonly artifacts: ReadonlyArray<LiveArtifactOutput>
    }
  | {
      readonly runId: string
      readonly command: string
      readonly ok: false
      readonly inputCoordinate: LiveInputCoordinate
      readonly primaryLiveOutputKey: string
      readonly artifacts: ReadonlyArray<LiveArtifactOutput>
      readonly error: SerializableErrorSummary
    }

export const makeLiveCommandResult = (input: MakeLiveCommandResultInput): LiveCommandResult => {
  const keys = new Set(input.artifacts.map((artifact) => artifact.outputKey))
  if (!keys.has(input.primaryLiveOutputKey)) {
    throw new Error(`[Logix][CLI] primaryLiveOutputKey must reference artifacts[].outputKey: ${input.primaryLiveOutputKey}`)
  }
  assertNoVerificationFields(input.artifacts)

  return {
    schemaVersion: 1,
    kind: 'LiveCommandResult',
    runId: input.runId,
    command: input.command,
    ok: input.ok,
    inputCoordinate: input.inputCoordinate,
    artifacts: input.artifacts,
    primaryLiveOutputKey: input.primaryLiveOutputKey,
    ...(input.ok ? null : { error: input.error }),
  }
}

export const sortLiveArtifactsByOutputKey = (
  artifacts: ReadonlyArray<LiveArtifactOutput>,
): ReadonlyArray<LiveArtifactOutput> =>
  Array.from(artifacts).sort((a, b) => (a.outputKey < b.outputKey ? -1 : a.outputKey > b.outputKey ? 1 : 0))
