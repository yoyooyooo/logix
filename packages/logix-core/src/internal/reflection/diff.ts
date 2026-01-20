import { stableStringify } from '../digest.js'
import type { JsonValue } from '../observability/jsonValue.js'
import type { ModuleManifest, ModuleManifestLogicUnit } from './manifest.js'

export type ManifestDiffSeverity = 'BREAKING' | 'RISKY' | 'INFO'
export type ManifestDiffVerdict = 'PASS' | 'WARN' | 'FAIL'

export interface ModuleManifestDiffChange {
  readonly severity: ManifestDiffSeverity
  readonly code: string
  readonly message?: string
  readonly pointer?: string
  readonly details?: JsonValue
}

export interface ModuleManifestDiffSummary {
  readonly breaking: number
  readonly risky: number
  readonly info: number
}

export interface ModuleManifestDiff {
  readonly version: string
  readonly moduleId: string
  readonly before: {
    readonly digest: string
    readonly manifestVersion?: string
  }
  readonly after: {
    readonly digest: string
    readonly manifestVersion?: string
  }
  readonly verdict: ManifestDiffVerdict
  readonly changes: ReadonlyArray<ModuleManifestDiffChange>
  readonly summary: ModuleManifestDiffSummary
}

export interface DiffManifestOptions {
  /**
   * metaAllowlist：
   * - When omitted: diff all meta keys (defaults to treating all changes as RISKY).
   * - When provided: only diff allowlisted keys (others are ignored).
   */
  readonly metaAllowlist?: ReadonlyArray<string>
}

const SEVERITY_RANK: Record<ManifestDiffSeverity, number> = {
  BREAKING: 0,
  RISKY: 1,
  INFO: 2,
}

const uniqSorted = (input: ReadonlyArray<string>): ReadonlyArray<string> => {
  const out = Array.from(new Set(input.filter((x) => typeof x === 'string' && x.length > 0)))
  out.sort()
  return out
}

const diffStringKeys = (
  before: ReadonlyArray<string> | undefined,
  after: ReadonlyArray<string> | undefined,
): { readonly removed: ReadonlyArray<string>; readonly added: ReadonlyArray<string> } => {
  const beforeSet = new Set(uniqSorted(before ?? []))
  const afterSet = new Set(uniqSorted(after ?? []))

  const removed: string[] = []
  for (const k of beforeSet) {
    if (!afterSet.has(k)) removed.push(k)
  }
  removed.sort()

  const added: string[] = []
  for (const k of afterSet) {
    if (!beforeSet.has(k)) added.push(k)
  }
  added.sort()

  return { removed, added }
}

const eqJsonValue = (a: unknown, b: unknown): boolean => stableStringify(a) === stableStringify(b)

const indexLogicUnits = (
  input: ReadonlyArray<ModuleManifestLogicUnit> | undefined,
): ReadonlyMap<string, ModuleManifestLogicUnit> => {
  const map = new Map<string, ModuleManifestLogicUnit>()
  for (const unit of input ?? []) {
    if (!unit || typeof unit !== 'object') continue
    const id = (unit as any).id
    if (typeof id !== 'string' || id.length === 0) continue
    map.set(id, unit)
  }
  return map
}

export const diffManifest = (
  before: ModuleManifest,
  after: ModuleManifest,
  options?: DiffManifestOptions,
): ModuleManifestDiff => {
  const changes: ModuleManifestDiffChange[] = []

  // Identity / protocol
  if (before.moduleId !== after.moduleId) {
    changes.push({
      severity: 'BREAKING',
      code: 'moduleId.changed',
      message: `moduleId changed (${before.moduleId} -> ${after.moduleId})`,
      pointer: '/moduleId',
      details: {
        before: before.moduleId,
        after: after.moduleId,
      },
    })
  }

  if (before.manifestVersion !== after.manifestVersion) {
    changes.push({
      severity: 'INFO',
      code: 'manifestVersion.changed',
      message: `manifestVersion changed (${before.manifestVersion} -> ${after.manifestVersion})`,
      pointer: '/manifestVersion',
      details: {
        before: before.manifestVersion,
        after: after.manifestVersion,
      },
    })
  }

  // actionKeys
  {
    const { removed, added } = diffStringKeys(before.actionKeys, after.actionKeys)
    if (removed.length > 0 || added.length > 0) {
      changes.push({
        severity: removed.length > 0 ? 'BREAKING' : 'INFO',
        code: 'actionKeys.changed',
        message:
          removed.length > 0 ? `actionKeys removed: ${removed.join(', ')}` : `actionKeys added: ${added.join(', ')}`,
        pointer: '/actionKeys',
        details: { removed, added },
      })
    }
  }

  // schemaKeys
  {
    const { removed, added } = diffStringKeys(before.schemaKeys, after.schemaKeys)
    if (removed.length > 0 || added.length > 0) {
      changes.push({
        severity: removed.length > 0 ? 'BREAKING' : 'INFO',
        code: 'schemaKeys.changed',
        message:
          removed.length > 0 ? `schemaKeys removed: ${removed.join(', ')}` : `schemaKeys added: ${added.join(', ')}`,
        pointer: '/schemaKeys',
        details: { removed, added },
      })
    }
  }

  // logicUnits (slots)
  {
    const beforeById = indexLogicUnits(before.logicUnits)
    const afterById = indexLogicUnits(after.logicUnits)

    const removed: string[] = []
    const added: string[] = []
    const kindChanged: Array<{ readonly id: string; readonly before: string; readonly after: string }> = []
    const riskyChanged: Array<{ readonly id: string; readonly fields: ReadonlyArray<string> }> = []

    for (const id of beforeById.keys()) {
      if (!afterById.has(id)) removed.push(id)
    }
    for (const id of afterById.keys()) {
      if (!beforeById.has(id)) added.push(id)
    }

    removed.sort()
    added.sort()

    for (const id of beforeById.keys()) {
      const b = beforeById.get(id)
      const a = afterById.get(id)
      if (!b || !a) continue

      const fields: string[] = []
      if (b.kind !== a.kind) {
        kindChanged.push({ id, before: b.kind, after: a.kind })
        continue
      }
      if (b.name !== a.name) fields.push('name')
      if (b.derived !== a.derived) fields.push('derived')
      if (fields.length > 0) riskyChanged.push({ id, fields })
    }

    kindChanged.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
    riskyChanged.sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))

    if (removed.length > 0) {
      changes.push({
        severity: 'BREAKING',
        code: 'logicUnits.removed',
        message: `logicUnits removed: ${removed.join(', ')}`,
        pointer: '/logicUnits',
        details: { removed },
      })
    }

    if (kindChanged.length > 0) {
      changes.push({
        severity: 'BREAKING',
        code: 'logicUnits.kindChanged',
        message: `logicUnits kind changed: ${kindChanged.map((x) => x.id).join(', ')}`,
        pointer: '/logicUnits',
        details: { kindChanged },
      })
    }

    if (added.length > 0) {
      changes.push({
        severity: 'INFO',
        code: 'logicUnits.added',
        message: `logicUnits added: ${added.join(', ')}`,
        pointer: '/logicUnits',
        details: { added },
      })
    }

    if (riskyChanged.length > 0) {
      changes.push({
        severity: 'RISKY',
        code: 'logicUnits.changed',
        message: `logicUnits changed: ${riskyChanged.map((x) => x.id).join(', ')}`,
        pointer: '/logicUnits',
        details: { changed: riskyChanged },
      })
    }
  }

  // staticIr.digest
  {
    const beforeDigest = before.staticIr?.digest
    const afterDigest = after.staticIr?.digest
    if (beforeDigest !== afterDigest) {
      changes.push({
        severity: 'RISKY',
        code: 'staticIr.digestChanged',
        message: 'staticIr.digest changed',
        pointer: '/staticIr/digest',
        details: {
          before: beforeDigest ?? null,
          after: afterDigest ?? null,
        },
      })
    }
  }

  // meta (default: RISKY, allowlist supported)
  {
    const metaBefore = before.meta ?? {}
    const metaAfter = after.meta ?? {}

    const allowlist = options?.metaAllowlist
    const keys =
      allowlist != null ? uniqSorted(allowlist) : uniqSorted([...Object.keys(metaBefore), ...Object.keys(metaAfter)])

    const changed: Array<{
      readonly key: string
      readonly before: JsonValue | null
      readonly after: JsonValue | null
    }> = []

    for (const key of keys) {
      const b = key in metaBefore ? (metaBefore as any)[key] : undefined
      const a = key in metaAfter ? (metaAfter as any)[key] : undefined
      if (!eqJsonValue(b, a)) {
        changed.push({
          key,
          before: (b ?? null) as JsonValue | null,
          after: (a ?? null) as JsonValue | null,
        })
      }
    }

    if (changed.length > 0) {
      changes.push({
        severity: 'RISKY',
        code: 'meta.changed',
        message: 'meta changed',
        pointer: '/meta',
        details: {
          keys: changed.map((x) => x.key),
          changed,
        },
      })
    }
  }

  // source (default: INFO)
  {
    const b = before.source
    const a = after.source
    if (!eqJsonValue(b ?? null, a ?? null)) {
      changes.push({
        severity: 'INFO',
        code: 'source.changed',
        message: 'source changed',
        pointer: '/source',
        details: {
          before: b ?? null,
          after: a ?? null,
        },
      })
    }
  }

  changes.sort((a, b) => {
    const ra = SEVERITY_RANK[a.severity]
    const rb = SEVERITY_RANK[b.severity]
    if (ra !== rb) return ra - rb
    if (a.code !== b.code) return a.code < b.code ? -1 : 1
    const pa = a.pointer ?? ''
    const pb = b.pointer ?? ''
    if (pa !== pb) return pa < pb ? -1 : 1
    return 0
  })

  const summary: ModuleManifestDiffSummary = {
    breaking: changes.filter((c) => c.severity === 'BREAKING').length,
    risky: changes.filter((c) => c.severity === 'RISKY').length,
    info: changes.filter((c) => c.severity === 'INFO').length,
  }

  const verdict: ManifestDiffVerdict = summary.breaking > 0 ? 'FAIL' : summary.risky > 0 ? 'WARN' : 'PASS'

  return {
    version: '025',
    moduleId: after.moduleId,
    before: {
      digest: before.digest,
      manifestVersion: before.manifestVersion,
    },
    after: {
      digest: after.digest,
      manifestVersion: after.manifestVersion,
    },
    verdict,
    changes,
    summary,
  }
}
