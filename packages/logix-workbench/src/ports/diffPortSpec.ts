import type { ModulePortSpecPayload } from './types.js'

export type PortSpecDiffChange = {
  readonly code: string
  readonly message: string
}

export type PortSpecDiff = {
  readonly verdict: 'PASS' | 'WARN' | 'FAIL'
  readonly breaking: boolean
  readonly changes: ReadonlyArray<PortSpecDiffChange>
}

const uniqSorted = (values: Iterable<string>): ReadonlyArray<string> => Array.from(new Set(values)).sort()

const index = (items: ReadonlyArray<{ readonly key: string }>): ReadonlySet<string> => new Set(items.map((x) => x.key))

const indexExports = (items: ReadonlyArray<{ readonly path: string }>): ReadonlySet<string> => new Set(items.map((x) => x.path))

const diffKeys = (
  kind: string,
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  out: PortSpecDiffChange[],
): boolean => {
  const removed = uniqSorted(Array.from(before).filter((k) => !after.has(k)))
  const added = uniqSorted(Array.from(after).filter((k) => !before.has(k)))

  let breaking = false

  for (const key of removed) {
    breaking = true
    out.push({ code: `portspec::removed_${kind}`, message: `${kind} removed: ${key}` })
  }

  for (const key of added) {
    out.push({ code: `portspec::added_${kind}`, message: `${kind} added: ${key}` })
  }

  return breaking
}

export const diffPortSpec = (before: ModulePortSpecPayload, after: ModulePortSpecPayload): PortSpecDiff => {
  const changes: Array<PortSpecDiffChange> = []

  const moduleChange = before.moduleId !== after.moduleId
  if (moduleChange) {
    changes.push({
      code: 'portspec::module_id_changed',
      message: `moduleId changed: ${before.moduleId} -> ${after.moduleId}`,
    })
  }

  let breaking = moduleChange

  breaking =
    diffKeys('action', index(before.actions), index(after.actions), changes) ||
    breaking ||
    diffKeys('event', index(before.events), index(after.events), changes) ||
    diffKeys('output', index(before.outputs), index(after.outputs), changes) ||
    diffKeys('export', indexExports(before.exports), indexExports(after.exports), changes)

  changes.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : a.message < b.message ? -1 : a.message > b.message ? 1 : 0))

  return {
    verdict: breaking ? 'FAIL' : changes.length > 0 ? 'WARN' : 'PASS',
    breaking,
    changes,
  }
}

