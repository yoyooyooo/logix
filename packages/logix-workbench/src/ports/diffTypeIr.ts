import type { TypeIrPayload } from './types.js'

export type TypeIrDiffChange = {
  readonly code: string
  readonly message: string
}

export type TypeIrDiff = {
  readonly verdict: 'PASS' | 'WARN' | 'FAIL'
  readonly breaking: boolean
  readonly changes: ReadonlyArray<TypeIrDiffChange>
}

const uniqSorted = (values: Iterable<string>): ReadonlyArray<string> => Array.from(new Set(values)).sort()

export const diffTypeIr = (before: TypeIrPayload | undefined, after: TypeIrPayload | undefined): TypeIrDiff => {
  if (!before || !after) {
    return {
      verdict: 'WARN',
      breaking: false,
      changes: [{ code: 'typeir::unavailable', message: 'TypeIr unavailable; falling back to key-level checks.' }],
    }
  }

  if (before.truncated === true || after.truncated === true) {
    return {
      verdict: 'WARN',
      breaking: false,
      changes: [{ code: 'typeir::truncated', message: 'TypeIr truncated; detailed diff degraded.' }],
    }
  }

  const beforeIds = new Map(before.types.map((n) => [n.id, n]))
  const afterIds = new Map(after.types.map((n) => [n.id, n]))

  const removed = uniqSorted(Array.from(beforeIds.keys()).filter((id) => !afterIds.has(id)))
  const added = uniqSorted(Array.from(afterIds.keys()).filter((id) => !beforeIds.has(id)))

  const changes: Array<TypeIrDiffChange> = []
  let breaking = false

  for (const id of removed) {
    breaking = true
    changes.push({ code: 'typeir::removed_type', message: `type removed: ${id}` })
  }
  for (const id of added) {
    changes.push({ code: 'typeir::added_type', message: `type added: ${id}` })
  }

  const common = uniqSorted(Array.from(beforeIds.keys()).filter((id) => afterIds.has(id)))
  for (const id of common) {
    const b = beforeIds.get(id)!
    const a = afterIds.get(id)!
    if (b.kind !== a.kind) {
      breaking = true
      changes.push({ code: 'typeir::kind_changed', message: `kind changed: ${id} ${b.kind} -> ${a.kind}` })
    }
    if (b.digest && a.digest && b.digest !== a.digest) {
      changes.push({ code: 'typeir::digest_changed', message: `digest changed: ${id}` })
    }
  }

  changes.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : a.message < b.message ? -1 : a.message > b.message ? 1 : 0))

  return {
    verdict: breaking ? 'FAIL' : changes.length > 0 ? 'WARN' : 'PASS',
    breaking,
    changes,
  }
}

