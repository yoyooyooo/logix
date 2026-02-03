import type { AnchorEntry } from '../entries.js'

export type CollectedServiceUses = {
  readonly globalByServiceId: ReadonlyMap<string, ReadonlySet<string>>
  readonly byModuleId: ReadonlyMap<
    string,
    {
      readonly dollarUseServiceIds: ReadonlyMap<string, ReadonlySet<string>>
      readonly workflowCallServiceIds: ReadonlySet<string>
    }
  >
}

const addToNestedSet = (map: Map<string, Map<string, Set<string>>>, a: string, b: string, value: string): void => {
  const inner = map.get(a)
  if (!inner) {
    map.set(a, new Map([[b, new Set([value])]]))
    return
  }
  const set = inner.get(b)
  if (!set) inner.set(b, new Set([value]))
  else set.add(value)
}

export const collectServiceUses = (entries: ReadonlyArray<AnchorEntry>): CollectedServiceUses => {
  const global = new Map<string, Set<string>>()
  const moduleDollar = new Map<string, Map<string, Set<string>>>()
  const moduleWorkflowCalls = new Map<string, Set<string>>()

  for (const e of entries) {
    if (e.kind === 'ServiceUse') {
      const sid = e.serviceIdLiteral
      const tagName = e.tagSymbol.name
      if (sid && tagName) {
        const g = global.get(sid)
        if (g) g.add(tagName)
        else global.set(sid, new Set([tagName]))
      }
      if (e.moduleIdLiteral) addToNestedSet(moduleDollar, e.moduleIdLiteral, sid, tagName)
    }

    if (e.kind === 'WorkflowCallUse') {
      if (!e.moduleIdLiteral) continue
      const set = moduleWorkflowCalls.get(e.moduleIdLiteral)
      if (set) set.add(e.serviceIdLiteral)
      else moduleWorkflowCalls.set(e.moduleIdLiteral, new Set([e.serviceIdLiteral]))
    }
  }

  const globalOut = new Map<string, ReadonlySet<string>>()
  for (const [sid, set] of global) globalOut.set(sid, new Set(set))

  const byModuleId = new Map<string, { readonly dollarUseServiceIds: ReadonlyMap<string, ReadonlySet<string>>; readonly workflowCallServiceIds: ReadonlySet<string> }>()
  const moduleIds = new Set([...moduleDollar.keys(), ...moduleWorkflowCalls.keys()])

  for (const moduleId of moduleIds) {
    const dollarRaw = moduleDollar.get(moduleId) ?? new Map()
    const workflowRaw = moduleWorkflowCalls.get(moduleId) ?? new Set()

    const dollarOut = new Map<string, ReadonlySet<string>>()
    for (const [sid, set] of dollarRaw) dollarOut.set(sid, new Set(set))

    byModuleId.set(moduleId, {
      dollarUseServiceIds: dollarOut,
      workflowCallServiceIds: new Set(workflowRaw),
    })
  }

  return {
    globalByServiceId: globalOut,
    byModuleId,
  }
}

