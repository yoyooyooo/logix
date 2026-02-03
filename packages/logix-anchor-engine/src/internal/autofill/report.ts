import type { AutofillMode, AutofillReportV1, Decision, FileChange, ReasonCode } from './model.js'

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const normalizeId = (id: string | undefined): string => id ?? ''

export const buildAutofillReport = (args: {
  readonly mode: AutofillMode
  readonly runId: string
  readonly ok: boolean
  readonly changes: ReadonlyArray<FileChange>
}): AutofillReportV1 => {
  const changesSorted = Array.from(args.changes)
    .map((c) => ({
      file: c.file,
      ...(c.moduleId ? { moduleId: c.moduleId } : null),
      decisions: Array.from(c.decisions).sort((a, b) => compare(a.kind, b.kind)),
    }))
    .sort((a, b) => {
      const c = compare(a.file, b.file)
      if (c !== 0) return c
      return compare(normalizeId(a.moduleId), normalizeId(b.moduleId))
    })

  const filesTouched = new Set(changesSorted.map((c) => c.file)).size

  let modulesWritten = 0
  let modulesSkipped = 0

  const reasonCounts = new Map<ReasonCode, number>()

  for (const c of changesSorted) {
    const hasWritten = c.decisions.some((d) => d.status === 'written')
    if (hasWritten) modulesWritten += 1
    else modulesSkipped += 1

    for (const d of c.decisions) {
      if (d.status !== 'skipped') continue
      const prev = reasonCounts.get(d.reason.code) ?? 0
      reasonCounts.set(d.reason.code, prev + 1)
    }
  }

  const reasons = Array.from(reasonCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => compare(a.code, b.code))

  return {
    schemaVersion: 1,
    kind: 'AutofillReport',
    mode: args.mode,
    runId: args.runId,
    ok: args.ok,
    summary: {
      filesTouched,
      modulesWritten,
      modulesSkipped,
      reasons,
    },
    changes: changesSorted,
  }
}

export const groupDecisionsByFileAndTarget = (decisions: ReadonlyArray<{ readonly file: string; readonly targetId: string; readonly decision: Decision }>): ReadonlyArray<FileChange> => {
  const byKey = new Map<string, { readonly file: string; readonly targetId: string; decisions: Decision[] }>()
  for (const d of decisions) {
    const key = `${d.file}::${d.targetId}`
    const existing = byKey.get(key)
    if (existing) existing.decisions.push(d.decision)
    else byKey.set(key, { file: d.file, targetId: d.targetId, decisions: [d.decision] })
  }

  return Array.from(byKey.values()).map((v) => ({
    file: v.file,
    moduleId: v.targetId,
    decisions: v.decisions,
  }))
}

