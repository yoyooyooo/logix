import { Context } from 'effect'

export interface ServiceUseEvidence {
  readonly serviceId: string
  readonly moduleId?: string
  readonly logicKey?: string
  readonly occurrences: number
}

export interface RawModeEntry {
  readonly reasonCodes: ReadonlyArray<string>
  readonly moduleId?: string
  readonly tagName?: string
}

export interface SpyCollectorSnapshot {
  readonly usedServices: ReadonlyArray<ServiceUseEvidence>
  readonly rawMode: ReadonlyArray<RawModeEntry>
}

export interface SpyCollector {
  readonly recordServiceUse: (input: { readonly serviceId: string; readonly moduleId?: string; readonly logicKey?: string }) => void
  readonly recordRawMode: (input: { readonly reasonCodes: ReadonlyArray<string>; readonly moduleId?: string; readonly tagName?: string }) => void
  readonly snapshot: () => SpyCollectorSnapshot
}

export class SpyCollectorTag extends Context.Tag('@logixjs/SpyCollector')<SpyCollectorTag, SpyCollector>() {}

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const stableKey = (parts: ReadonlyArray<string | undefined>): string => parts.map((p) => p ?? '').join('\u0000')

export const makeSpyCollector = (): SpyCollector => {
  const uses = new Map<string, ServiceUseEvidence>()
  const raw = new Map<string, RawModeEntry>()

  const recordServiceUse: SpyCollector['recordServiceUse'] = (input) => {
    const serviceId = normalizeOptionalString(input.serviceId)
    if (!serviceId) return

    const moduleId = normalizeOptionalString(input.moduleId)
    const logicKey = normalizeOptionalString(input.logicKey)

    const key = stableKey([serviceId, moduleId, logicKey])
    const prev = uses.get(key)
    if (!prev) {
      uses.set(key, {
        serviceId,
        ...(moduleId ? { moduleId } : null),
        ...(logicKey ? { logicKey } : null),
        occurrences: 1,
      })
      return
    }

    uses.set(key, { ...prev, occurrences: (prev.occurrences ?? 0) + 1 })
  }

  const recordRawMode: SpyCollector['recordRawMode'] = (input) => {
    const reasonCodes = Array.from(new Set(input.reasonCodes.filter((c) => typeof c === 'string' && c.length > 0))).sort()
    if (reasonCodes.length === 0) return

    const moduleId = normalizeOptionalString(input.moduleId)
    const tagName = normalizeOptionalString(input.tagName)

    const key = stableKey([moduleId, tagName, reasonCodes.join(',')])
    if (!raw.has(key)) {
      raw.set(key, {
        reasonCodes,
        ...(moduleId ? { moduleId } : null),
        ...(tagName ? { tagName } : null),
      })
    }
  }

  const snapshot = (): SpyCollectorSnapshot => {
    const usedServices = Array.from(uses.values())
    usedServices.sort((a, b) => {
      if (a.serviceId !== b.serviceId) return a.serviceId < b.serviceId ? -1 : 1
      const am = a.moduleId ?? ''
      const bm = b.moduleId ?? ''
      if (am !== bm) return am < bm ? -1 : 1
      const al = a.logicKey ?? ''
      const bl = b.logicKey ?? ''
      if (al !== bl) return al < bl ? -1 : 1
      return 0
    })

    const rawMode = Array.from(raw.values())
    rawMode.sort((a, b) => {
      const am = a.moduleId ?? ''
      const bm = b.moduleId ?? ''
      if (am !== bm) return am < bm ? -1 : 1
      const at = a.tagName ?? ''
      const bt = b.tagName ?? ''
      if (at !== bt) return at < bt ? -1 : 1
      const ar = a.reasonCodes.join(',')
      const br = b.reasonCodes.join(',')
      if (ar !== br) return ar < br ? -1 : 1
      return 0
    })

    return { usedServices, rawMode }
  }

  return { recordServiceUse, recordRawMode, snapshot }
}

