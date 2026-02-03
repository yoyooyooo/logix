import type { CollectedServiceUses } from './collectServiceUses.js'
import type { JsonValue, SkipReason } from './model.js'
import { makeSkipReason } from './policy.js'

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

type ResolvedPort = {
  readonly serviceId: string
  readonly tagName: string
  readonly origin: 'dollar.use' | 'workflow.callById'
}

const resolveUniqueTagName = (names: ReadonlySet<string> | undefined): string | undefined => {
  if (!names) return undefined
  const list = Array.from(names).filter((x) => typeof x === 'string' && x.length > 0)
  const uniq = Array.from(new Set(list)).sort(compare)
  return uniq.length === 1 ? uniq[0] : undefined
}

export const buildServicesPatch = (args: {
  readonly moduleId: string
  readonly uses: CollectedServiceUses
}):
  | { readonly ok: true; readonly valueCode: string; readonly changes: JsonValue }
  | { readonly ok: false; readonly reason: SkipReason } => {
  const entry = args.uses.byModuleId.get(args.moduleId)
  if (!entry) return { ok: false, reason: makeSkipReason('no_confident_usage') }

  const ports: ResolvedPort[] = []
  const unresolved: Array<{ readonly serviceId: string; readonly origin: ResolvedPort['origin']; readonly candidates?: ReadonlyArray<string> }> = []

  for (const [serviceId, tagNames] of entry.dollarUseServiceIds) {
    const tagName = resolveUniqueTagName(tagNames)
    if (!tagName) {
      unresolved.push({
        serviceId,
        origin: 'dollar.use',
        candidates: Array.from(tagNames).sort(compare),
      })
      continue
    }
    ports.push({ serviceId, tagName, origin: 'dollar.use' })
  }

  for (const serviceId of entry.workflowCallServiceIds) {
    if (entry.dollarUseServiceIds.has(serviceId)) continue

    const tagNames = args.uses.globalByServiceId.get(serviceId)
    const tagName = resolveUniqueTagName(tagNames)
    if (!tagName) {
      unresolved.push({
        serviceId,
        origin: 'workflow.callById',
        candidates: tagNames ? Array.from(tagNames).sort(compare) : undefined,
      })
      continue
    }
    ports.push({ serviceId, tagName, origin: 'workflow.callById' })
  }

  if (ports.length === 0) {
    if (unresolved.length > 0) {
      const missing = unresolved.filter((u) => !u.candidates || u.candidates.length === 0)
      const ambiguous = unresolved.filter((u) => (u.candidates?.length ?? 0) > 1)
      if (missing.length > 0) {
        return {
          ok: false,
          reason: makeSkipReason('unresolvable_service_id', {
            details: { missing },
          }),
        }
      }
      if (ambiguous.length > 0) {
        return {
          ok: false,
          reason: makeSkipReason('dynamic_or_ambiguous_usage', {
            details: { ambiguous },
          }),
        }
      }
    }
    return { ok: false, reason: makeSkipReason('no_confident_usage') }
  }

  const resolvedSorted = ports
    .map((p) => ({ ...p }))
    .sort((a, b) => (a.serviceId !== b.serviceId ? compare(a.serviceId, b.serviceId) : compare(a.tagName, b.tagName)))

  const pairs = resolvedSorted.map((p) => `${JSON.stringify(p.serviceId)}: ${p.tagName}`).join(', ')
  const valueCode = `{ ${pairs} }`

  const unresolvedSorted = unresolved
    .slice()
    .sort((a, b) => (a.serviceId !== b.serviceId ? compare(a.serviceId, b.serviceId) : compare(a.origin, b.origin)))

  return {
    ok: true,
    valueCode,
    changes: {
      ports: resolvedSorted.map((p) => ({ port: p.serviceId, serviceId: p.serviceId, tag: p.tagName, origin: p.origin })),
      ...(unresolvedSorted.length > 0 ? { unresolved: unresolvedSorted } : null),
    },
  }
}
