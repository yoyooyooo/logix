import type { Span } from '../span.js'

export type JsonValue = null | boolean | number | string | { readonly [k: string]: JsonValue } | ReadonlyArray<JsonValue>

export type AutofillMode = 'report' | 'write'

export type ReasonCode =
  | 'already_declared'
  | 'unsafe_to_patch'
  | 'unsupported_shape'
  | 'no_confident_usage'
  | 'dynamic_or_ambiguous_usage'
  | 'unresolvable_service_id'
  | 'missing_location'
  | 'duplicate_step_key'
  | 'unresolvable_step_key'

export type SkipReason = {
  readonly code: ReasonCode
  readonly message: string
  readonly details?: JsonValue
}

export type DecisionWritten = {
  readonly kind: string
  readonly status: 'written'
  readonly changes: JsonValue
}

export type DecisionSkipped = {
  readonly kind: string
  readonly status: 'skipped'
  readonly reason: SkipReason
}

export type Decision = DecisionWritten | DecisionSkipped

export type FileChange = {
  readonly file: string
  readonly moduleId?: string
  readonly decisions: ReadonlyArray<Decision>
}

export type SummaryReasonCount = {
  readonly code: ReasonCode
  readonly count: number
}

export type AutofillReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'AutofillReport'
  readonly mode: AutofillMode
  readonly runId: string
  readonly ok: boolean
  readonly summary: {
    readonly filesTouched: number
    readonly modulesWritten: number
    readonly modulesSkipped: number
    readonly reasons: ReadonlyArray<SummaryReasonCount>
  }
  readonly changes: ReadonlyArray<FileChange>
}

export type TargetRef = {
  readonly file: string
  readonly targetId: string
}

export type AutofillAnchorKind = 'services' | 'dev.source' | 'workflow.stepKey'

export type PlannedOpMeta = {
  readonly target: TargetRef
  readonly anchorKind: AutofillAnchorKind
  readonly insertSpan: Span
  readonly propertyName: string
}

