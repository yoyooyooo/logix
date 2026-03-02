import type { SerializableErrorSummary } from './errors.js'

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | { readonly [k: string]: JsonValue }
  | ReadonlyArray<JsonValue>

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
  readonly mode?: 'report' | 'write'
  readonly ok: boolean
  readonly exitCode?: 0 | 1 | 2 | 3 | 4 | 5
  readonly artifacts: ReadonlyArray<ArtifactOutput>
  readonly error?: SerializableErrorSummary
}

type MakeCommandResultInput =
  | {
      readonly runId: string
      readonly command: string
      readonly mode?: 'report' | 'write'
      readonly ok: true
      readonly exitCode?: 0 | 1 | 2 | 3 | 4 | 5
      readonly artifacts: ReadonlyArray<ArtifactOutput>
    }
  | {
      readonly runId: string
      readonly command: string
      readonly mode?: 'report' | 'write'
      readonly ok: false
      readonly exitCode?: 0 | 1 | 2 | 3 | 4 | 5
      readonly artifacts: ReadonlyArray<ArtifactOutput>
      readonly error: SerializableErrorSummary
    }

export const sortArtifactsByOutputKey = (artifacts: ReadonlyArray<ArtifactOutput>): ReadonlyArray<ArtifactOutput> =>
  Array.from(artifacts).sort((a, b) => (a.outputKey < b.outputKey ? -1 : a.outputKey > b.outputKey ? 1 : 0))

export const makeCommandResult = (input: MakeCommandResultInput): CommandResult => ({
  schemaVersion: 1,
  kind: 'CommandResult',
  runId: input.runId,
  command: input.command,
  ...(input.mode ? { mode: input.mode } : null),
  ok: input.ok,
  ...(typeof input.exitCode === 'number' ? { exitCode: input.exitCode } : null),
  artifacts: input.artifacts,
  ...(input.ok ? null : { error: input.error }),
})

export const makeErrorCommandResult = (args: {
  readonly runId: string
  readonly command: string
  readonly error: SerializableErrorSummary
}): CommandResult =>
  makeCommandResult({
    runId: args.runId,
    command: args.command,
    ok: false,
    artifacts: [],
    error: args.error,
  })

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
