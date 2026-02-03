import { stableStringify } from '../digest.js'
import type { JsonValue } from '../observability/jsonValue.js'
import type {
  ModuleManifest,
  ModuleManifestLogicUnit,
  ModuleManifestServicePort,
  ModuleManifestSlotDef,
  ModuleManifestSlotFills,
  ModuleManifestSlots,
} from './manifest.js'

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

const indexSlots = (input: ModuleManifestSlots | undefined): ReadonlyMap<string, ModuleManifestSlotDef> => {
  const map = new Map<string, ModuleManifestSlotDef>()
  if (!input || typeof input !== 'object') return map
  for (const slotName of Object.keys(input).sort()) {
    const def = (input as any)[slotName]
    if (!slotName || !def || typeof def !== 'object') continue
    map.set(slotName, def as ModuleManifestSlotDef)
  }
  return map
}

const asJsonSlotDef = (def: ModuleManifestSlotDef): JsonValue => {
  const out: Record<string, JsonValue> = {}
  if (def.required === true) out.required = true
  if (def.unique === true) out.unique = true
  if (def.kind) out.kind = def.kind
  return out
}

const indexSlotFills = (input: ModuleManifestSlotFills | undefined): ReadonlyMap<string, ReadonlyArray<string>> => {
  const map = new Map<string, ReadonlyArray<string>>()
  if (!input || typeof input !== 'object') return map
  for (const slotName of Object.keys(input).sort()) {
    const ids = (input as any)[slotName]
    if (!slotName || !Array.isArray(ids)) continue
    map.set(slotName, ids.filter((x: unknown) => typeof x === 'string' && x.length > 0))
  }
  return map
}

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

const indexServicePorts = (
  input: ReadonlyArray<ModuleManifestServicePort> | undefined,
): ReadonlyMap<string, ModuleManifestServicePort> => {
  const map = new Map<string, ModuleManifestServicePort>()
  for (const port of input ?? []) {
    if (!port || typeof port !== 'object') continue
    const key = (port as any).port
    if (typeof key !== 'string' || key.length === 0) continue
    map.set(key, port)
  }
  return map
}

const asJsonServicePort = (port: ModuleManifestServicePort): JsonValue =>
  port.optional === true
    ? {
        port: port.port,
        serviceId: port.serviceId,
        optional: true,
      }
    : {
        port: port.port,
        serviceId: port.serviceId,
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

  // servicePorts
  {
    const beforeByPort = indexServicePorts(before.servicePorts)
    const afterByPort = indexServicePorts(after.servicePorts)

    const removed: ModuleManifestServicePort[] = []
    const added: ModuleManifestServicePort[] = []

    for (const port of Array.from(beforeByPort.keys()).sort()) {
      if (!afterByPort.has(port)) {
        const value = beforeByPort.get(port)
        if (value) removed.push(value)
      }
    }
    for (const port of Array.from(afterByPort.keys()).sort()) {
      if (!beforeByPort.has(port)) {
        const value = afterByPort.get(port)
        if (value) added.push(value)
      }
    }

    if (removed.length > 0) {
      changes.push({
        severity: 'BREAKING',
        code: 'servicePorts.removed',
        message: `servicePorts removed: ${removed.map((p) => p.port).join(', ')}`,
        pointer: '/servicePorts',
        details: { removed: removed.map(asJsonServicePort) },
      })
    }

    if (added.length > 0) {
      changes.push({
        severity: 'INFO',
        code: 'servicePorts.added',
        message: `servicePorts added: ${added.map((p) => p.port).join(', ')}`,
        pointer: '/servicePorts',
        details: { added: added.map(asJsonServicePort) },
      })
    }

    const serviceIdChanged: Array<{
      readonly port: string
      readonly before: ModuleManifestServicePort
      readonly after: ModuleManifestServicePort
    }> = []

    const optionalChanged: Array<{
      readonly port: string
      readonly before: ModuleManifestServicePort
      readonly after: ModuleManifestServicePort
    }> = []

    for (const port of beforeByPort.keys()) {
      const b = beforeByPort.get(port)
      const a = afterByPort.get(port)
      if (!b || !a) continue
      if (b.serviceId !== a.serviceId) {
        serviceIdChanged.push({ port, before: b, after: a })
      } else if ((b.optional === true) !== (a.optional === true)) {
        optionalChanged.push({ port, before: b, after: a })
      }
    }

    serviceIdChanged.sort((x, y) => (x.port < y.port ? -1 : x.port > y.port ? 1 : 0))
    optionalChanged.sort((x, y) => (x.port < y.port ? -1 : x.port > y.port ? 1 : 0))

    if (serviceIdChanged.length > 0) {
      changes.push({
        severity: 'BREAKING',
        code: 'servicePorts.serviceIdChanged',
        message: `servicePorts serviceId changed: ${serviceIdChanged.map((x) => x.port).join(', ')}`,
        pointer: '/servicePorts',
        details: {
          changed: serviceIdChanged.map((x) => ({
            port: x.port,
            before: asJsonServicePort(x.before),
            after: asJsonServicePort(x.after),
          })),
        },
      })
    }

    if (optionalChanged.length > 0) {
      const becomesRequired = optionalChanged.some((x) => x.before.optional === true && x.after.optional !== true)
      changes.push({
        severity: becomesRequired ? 'BREAKING' : 'INFO',
        code: 'servicePorts.optionalChanged',
        message: `servicePorts optional changed: ${optionalChanged.map((x) => x.port).join(', ')}`,
        pointer: '/servicePorts',
        details: {
          changed: optionalChanged.map((x) => ({
            port: x.port,
            before: asJsonServicePort(x.before),
            after: asJsonServicePort(x.after),
          })),
        },
      })
    }
  }

  // slots
  {
    const beforeByName = indexSlots(before.slots)
    const afterByName = indexSlots(after.slots)

    const removed: string[] = []
    const added: string[] = []
    const changed: JsonValue[] = []
    const changedNames: string[] = []

    for (const name of Array.from(beforeByName.keys()).sort()) {
      if (!afterByName.has(name)) removed.push(name)
    }
    for (const name of Array.from(afterByName.keys()).sort()) {
      if (!beforeByName.has(name)) added.push(name)
    }

    for (const name of Array.from(beforeByName.keys()).sort()) {
      const b = beforeByName.get(name)
      const a = afterByName.get(name)
      if (!b || !a) continue
      if (!eqJsonValue(b, a)) {
        changedNames.push(name)
        changed.push({
          slotName: name,
          before: asJsonSlotDef(b),
          after: asJsonSlotDef(a),
        })
      }
    }

    if (removed.length > 0) {
      changes.push({
        severity: 'BREAKING',
        code: 'slots.removed',
        message: `slots removed: ${removed.join(', ')}`,
        pointer: '/slots',
        details: { removed },
      })
    }

    if (added.length > 0) {
      changes.push({
        severity: 'INFO',
        code: 'slots.added',
        message: `slots added: ${added.join(', ')}`,
        pointer: '/slots',
        details: { added },
      })
    }

    if (changed.length > 0) {
      changes.push({
        severity: 'RISKY',
        code: 'slots.changed',
        message: `slots changed: ${changedNames.join(', ')}`,
        pointer: '/slots',
        details: { changed },
      })
    }
  }

  // slotFills
  {
    const beforeByName = indexSlotFills(before.slotFills)
    const afterByName = indexSlotFills(after.slotFills)

    const changed: Array<{ readonly slotName: string; readonly before: ReadonlyArray<string>; readonly after: ReadonlyArray<string> }> =
      []

    const allNames = Array.from(new Set([...beforeByName.keys(), ...afterByName.keys()])).sort()
    for (const name of allNames) {
      const b = beforeByName.get(name) ?? []
      const a = afterByName.get(name) ?? []
      if (!eqJsonValue(b, a)) {
        changed.push({ slotName: name, before: b, after: a })
      }
    }

    if (changed.length > 0) {
      changes.push({
        severity: 'RISKY',
        code: 'slotFills.changed',
        message: `slotFills changed: ${changed.map((x) => x.slotName).join(', ')}`,
        pointer: '/slotFills',
        details: { changed },
      })
    }
  }

  // logicUnits
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
