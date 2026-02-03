import type { Span } from '../span.js'

export type RewriterMode = 'report' | 'write'

export type PropertyWrite = {
  readonly name: string
  readonly valueCode: string
}

export type PatchOperationKind = 'AddObjectProperty'

export type PatchOperationDecision = 'write' | 'skip' | 'fail'

export type PatchOperationInput = {
  readonly file: string
  readonly kind: PatchOperationKind
  readonly targetSpan: Span
  readonly property: PropertyWrite
  readonly reasonCodes?: ReadonlyArray<string>
}

export type PatchOperationV1 = {
  readonly opKey: string
  readonly file: string
  readonly kind: PatchOperationKind
  readonly targetSpan: Span
  readonly property: PropertyWrite
  readonly expectedFileDigest?: string
  readonly decision: PatchOperationDecision
  readonly reasonCodes: ReadonlyArray<string>
}

export type PatchPlanV1 = {
  readonly schemaVersion: 1
  readonly kind: 'PatchPlan'
  readonly mode: RewriterMode
  readonly operations: ReadonlyArray<PatchOperationV1>
  readonly summary: {
    readonly operationsTotal: number
    readonly writableTotal: number
    readonly skippedTotal: number
    readonly failedTotal: number
  }
}

export type WriteBackResultV1 = {
  readonly schemaVersion: 1
  readonly kind: 'WriteBackResult'
  readonly mode: RewriterMode
  readonly modifiedFiles: ReadonlyArray<{
    readonly file: string
    readonly changeKind: 'updated' | 'created'
  }>
  readonly skipped: ReadonlyArray<{
    readonly opKey: string
    readonly reasonCodes: ReadonlyArray<string>
  }>
  readonly failed: ReadonlyArray<{
    readonly opKey: string
    readonly reasonCodes: ReadonlyArray<string>
  }>
}

