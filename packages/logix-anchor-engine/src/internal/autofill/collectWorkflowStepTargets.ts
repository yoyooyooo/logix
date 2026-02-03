import type { AnchorEntry, AutofillTargetEntry } from '../entries.js'
import type { Span } from '../span.js'

export type WorkflowStepKeyTarget = {
  readonly file: string
  readonly workflowLocalId: string
  readonly argsObjectStartOffset: number
  readonly insertSpan: Span
}

const parseArgsObjectStartOffset = (entryKey: string): number | undefined => {
  // entryKey: `autofillTarget:workflow:<localId>:<offset>`
  const parts = entryKey.split(':')
  const raw = parts[parts.length - 1]
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

export const collectWorkflowStepTargets = (entries: ReadonlyArray<AnchorEntry>): ReadonlyArray<WorkflowStepKeyTarget> => {
  const out: WorkflowStepKeyTarget[] = []

  for (const e of entries) {
    if (e.kind !== 'AutofillTarget') continue
    const t = e as AutofillTargetEntry
    if (t.target.kind !== 'workflow') continue
    if (!t.missing.workflowStepKey) continue
    const offset = parseArgsObjectStartOffset(t.entryKey)
    if (offset === undefined) continue
    out.push({
      file: t.file,
      workflowLocalId: t.target.workflowLocalIdLiteral,
      argsObjectStartOffset: offset,
      insertSpan: t.missing.workflowStepKey.insertSpan,
    })
  }

  return out
}

