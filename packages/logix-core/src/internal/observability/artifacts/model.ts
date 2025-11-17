import type { JsonValue } from '../jsonValue.js'
import type { SerializableErrorSummary } from '../../runtime/core/errorSummary.js'

export type ArtifactKey = string

export const artifactKeySchemaPattern = '^@[^\\s/]+\\/[^\\s@]+@v\\d+$' as const

export const isArtifactKey = (input: unknown): input is ArtifactKey =>
  typeof input === 'string' && /^@[^\s/]+\/[^\s@]+@v\d+$/.test(input)

type EnvelopeBase = {
  readonly artifactKey: ArtifactKey
  readonly truncated?: boolean
  readonly budgetBytes?: number
  readonly actualBytes?: number
  readonly digest?: string
  readonly notes?: JsonValue
}

export type ArtifactEnvelope =
  | (EnvelopeBase & {
      readonly ok: true
      readonly value: JsonValue
      readonly error?: never
    })
  | (EnvelopeBase & {
      readonly ok: false
      readonly error: SerializableErrorSummary
      readonly value?: never
    })

export type TrialRunArtifacts = Readonly<Record<ArtifactKey, ArtifactEnvelope>>
