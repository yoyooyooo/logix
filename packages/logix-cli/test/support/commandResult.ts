import type { JsonValue } from '../../src/internal/result.js'
import type { CommandResult } from '../../src/internal/result.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeJson)
  if (!isRecord(value)) return value

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    if (key === 'runId') continue
    if (key === 'file') continue
    if (key === 'outDir') continue
    out[key] = normalizeJson(value[key])
  }
  return out
}

export const primaryArtifact = (result: CommandResult) =>
  result.artifacts.find((artifact) => artifact.outputKey === result.primaryReportOutputKey)

export const primaryReportInline = (result: CommandResult): JsonValue | undefined => primaryArtifact(result)?.inline

export const normalizeCommandResultForRepeatability = (result: CommandResult): unknown =>
  normalizeJson({
    ...result,
    runId: '<ignored>',
    artifacts: result.artifacts.map((artifact) => ({
      ...artifact,
      file: artifact.file ? '<ignored>' : undefined,
    })),
  })

export const argvFromCoordinate = (result: CommandResult): ReadonlyArray<string> => {
  const tokens = result.inputCoordinate.argvSnapshot?.tokens
  if (!tokens || tokens.length === 0) {
    throw new Error('CommandResult.inputCoordinate.argvSnapshot.tokens is required')
  }
  return tokens
}
