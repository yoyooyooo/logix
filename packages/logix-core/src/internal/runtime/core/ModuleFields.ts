import { fnv1a32, stableStringify } from '../../digest.js'

export type FieldId = string

export type FieldOriginType = 'module' | 'logicUnit'
export type FieldOriginIdKind = 'explicit' | 'derived'

export interface FieldProvenance {
  readonly originType: FieldOriginType
  readonly originId: string
  readonly originIdKind: FieldOriginIdKind
  /**
   * Human-readable label for Devtools/error messages (e.g. "logicUnit:Profile#1").
   */
  readonly originLabel: string
  /**
   * Optional location summary (e.g. file path / callsite); for navigation only and not used for semantic decisions.
   */
  readonly path?: string
}

/**
 * FieldSpec：
 * - Minimal representation of "field declarations": a record keyed by fieldId.
 * - The concrete value shape is defined by the specific field system (e.g. FieldSpec).
 * - Value serializability is not constrained here (runtime install may depend on functions), but snapshots/evidence exports
 *   must only include serializable subsets.
 */
export type FieldSpec = object

export interface FieldContribution {
  readonly fields: FieldSpec
  readonly provenance: FieldProvenance
}

export interface ModuleFieldItem {
  readonly fieldId: FieldId
  readonly name: string
  readonly description?: string
}

export type FieldConflictKind = 'duplicate_fieldId' | 'missing_requires' | 'excludes_violation'

export interface FieldConflict {
  readonly kind: FieldConflictKind
  readonly fieldId: FieldId
  readonly sources: ReadonlyArray<FieldProvenance>
  readonly missing?: ReadonlyArray<FieldId>
  readonly present?: ReadonlyArray<FieldId>
}

export class ModuleFieldsConflictError extends Error {
  readonly _tag = 'ModuleFieldsConflictError'

  constructor(
    readonly moduleId: string,
    readonly conflicts: ReadonlyArray<FieldConflict>,
  ) {
    super(
      [
        `[ModuleFieldsConflictError] Conflicting fieldIds found (moduleId=${moduleId}).`,
        ...conflicts.map((c) =>
          c.kind === 'duplicate_fieldId'
            ? `- duplicate ${c.fieldId}: ${c.sources.map((s) => `${s.originType}:${s.originId}`).join(', ')}`
            : c.kind === 'missing_requires'
              ? `- missing requires for ${c.fieldId}: ${(c.missing ?? []).join(', ')}; sources=${c.sources
                  .map((s) => `${s.originType}:${s.originId}`)
                  .join(', ')}`
              : `- excludes violation for ${c.fieldId}: present=${(c.present ?? []).join(', ')}; sources=${c.sources
                  .map((s) => `${s.originType}:${s.originId}`)
                  .join(', ')}`,
        ),
      ].join('\n'),
    )
  }
}

export interface ModuleFieldsSnapshot {
  readonly moduleId: string
  readonly digest: string
  readonly fields: ReadonlyArray<ModuleFieldItem>
  readonly provenanceIndex: Record<FieldId, FieldProvenance>
}

const toProvenanceKey = (p: FieldProvenance): string =>
  `${p.originType}:${p.originId}:${p.originIdKind}:${p.originLabel}:${p.path ?? ''}`

const compareString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const compareProvenance = (a: FieldProvenance, b: FieldProvenance): number => {
  const type = compareString(a.originType, b.originType)
  if (type !== 0) return type
  const id = compareString(a.originId, b.originId)
  if (id !== 0) return id
  const kind = compareString(a.originIdKind, b.originIdKind)
  if (kind !== 0) return kind
  const label = compareString(a.originLabel, b.originLabel)
  if (label !== 0) return label
  return compareString(String(a.path ?? ''), String(b.path ?? ''))
}

const originTypeOrder = (t: FieldOriginType): number => (t === 'module' ? 0 : 1)

const compareFieldIdByProvenance = (
  a: { readonly fieldId: FieldId; readonly provenance: FieldProvenance },
  b: { readonly fieldId: FieldId; readonly provenance: FieldProvenance },
): number => {
  const ta = originTypeOrder(a.provenance.originType) - originTypeOrder(b.provenance.originType)
  if (ta !== 0) return ta
  const oa = compareString(a.provenance.originId, b.provenance.originId)
  if (oa !== 0) return oa
  return compareString(a.fieldId, b.fieldId)
}

const extractStringArray = (value: unknown): ReadonlyArray<string> => {
  if (!Array.isArray(value)) return []
  const out: Array<string> = []
  for (const v of value) {
    if (typeof v !== 'string') continue
    const s = v.trim()
    if (!s) continue
    out.push(s)
  }
  return out
}

const getFieldRequires = (value: unknown): ReadonlyArray<FieldId> => {
  if (!value || typeof value !== 'object') return []
  const direct = extractStringArray((value as any).requires)
  return direct
}

const getFieldExcludes = (value: unknown): ReadonlyArray<FieldId> => {
  if (!value || typeof value !== 'object') return []
  const direct = extractStringArray((value as any).excludes)
  return direct
}

const getFieldName = (fieldId: FieldId, value: unknown): string => {
  if (value && typeof value === 'object') {
    const n = (value as any).name
    if (typeof n === 'string' && n.trim().length > 0) return n.trim()
  }
  return fieldId
}

const getFieldDescription = (value: unknown): string | undefined => {
  if (value && typeof value === 'object') {
    const d = (value as any).description
    if (typeof d === 'string' && d.trim().length > 0) return d.trim()
  }
  return undefined
}

export const finalizeFieldContributions = (args: {
  readonly moduleId: string
  readonly contributions: ReadonlyArray<FieldContribution>
}): { readonly merged: FieldSpec; readonly snapshot: ModuleFieldsSnapshot } => {
  const fieldById = new Map<FieldId, { readonly value: unknown; readonly provenance: FieldProvenance }>()

  const duplicateSources = new Map<FieldId, Array<FieldProvenance>>()

  const contributions = [...args.contributions].sort((a, b) => compareProvenance(a.provenance, b.provenance))

  for (const c of contributions) {
    const fields = c.fields
    if (!fields || typeof fields !== 'object') continue
    for (const fieldId of Object.keys(fields).sort()) {
      const value = (fields as Record<string, unknown>)[fieldId]
      if (value === undefined) continue

      const prev = fieldById.get(fieldId)
      if (!prev) {
        fieldById.set(fieldId, { value, provenance: c.provenance })
        continue
      }

      const sources = duplicateSources.get(fieldId) ?? [prev.provenance]
      sources.push(c.provenance)
      duplicateSources.set(fieldId, sources)
    }
  }

  const conflicts: Array<FieldConflict> = []
  const registerConflict = (conflict: FieldConflict) => {
    const unique = new Map<string, FieldProvenance>()
    for (const s of conflict.sources) {
      unique.set(toProvenanceKey(s), s)
    }
    conflicts.push({
      ...conflict,
      sources: Array.from(unique.values()).sort(compareProvenance),
    })
  }

  // 1) duplicate fieldId conflicts
  for (const fieldId of Array.from(duplicateSources.keys()).sort()) {
    registerConflict({
      kind: 'duplicate_fieldId',
      fieldId,
      sources: duplicateSources.get(fieldId) ?? [],
    })
  }

  const merged: Record<string, unknown> = {}
  const provenanceIndex: Record<string, FieldProvenance> = {}
  const fields: Array<ModuleFieldItem> = []

  const entries: Array<{ readonly fieldId: FieldId; readonly value: unknown; readonly provenance: FieldProvenance }> =
    []
  for (const fieldId of fieldById.keys()) {
    const entry = fieldById.get(fieldId)
    if (!entry) continue
    entries.push({ fieldId, value: entry.value, provenance: entry.provenance })
  }

  const ids = entries
    .slice()
    .sort(compareFieldIdByProvenance)
    .map((e) => e.fieldId)

  for (const fieldId of ids) {
    const entry = fieldById.get(fieldId)
    if (!entry) continue
    merged[fieldId] = entry.value
    provenanceIndex[fieldId] = entry.provenance
    fields.push({
      fieldId,
      name: getFieldName(fieldId, entry.value),
      description: getFieldDescription(entry.value),
    })
  }

  // 2) consistency checks (FR-007): requires / excludes
  const present = new Set(ids)

  for (const fieldId of ids) {
    const entry = fieldById.get(fieldId)
    if (!entry) continue

    const requires = getFieldRequires(entry.value)
    if (requires.length > 0) {
      const missing = requires.filter((r) => !present.has(r))
      if (missing.length > 0) {
        registerConflict({
          kind: 'missing_requires',
          fieldId,
          missing: Array.from(new Set(missing)).sort(),
          sources: [entry.provenance],
        })
      }
    }

    const excludes = getFieldExcludes(entry.value)
    if (excludes.length > 0) {
      const presentExcluded = excludes.filter((e) => present.has(e))
      if (presentExcluded.length > 0) {
        const otherSources: Array<FieldProvenance> = []
        for (const otherId of presentExcluded) {
          const other = fieldById.get(otherId)
          if (other) otherSources.push(other.provenance)
        }
        registerConflict({
          kind: 'excludes_violation',
          fieldId,
          present: Array.from(new Set(presentExcluded)).sort(),
          sources: [entry.provenance, ...otherSources],
        })
      }
    }
  }

  if (conflicts.length > 0) {
    const kindOrder: Record<FieldConflictKind, number> = {
      duplicate_fieldId: 0,
      missing_requires: 1,
      excludes_violation: 2,
    }
    conflicts.sort((a, b) => {
      const k = kindOrder[a.kind] - kindOrder[b.kind]
      if (k !== 0) return k
      return compareString(a.fieldId, b.fieldId)
    })
    throw new ModuleFieldsConflictError(args.moduleId, conflicts)
  }

  const digestBase = {
    moduleId: args.moduleId,
    fields,
    provenanceIndex,
  } as const

  const digest = `mfields:023:${fnv1a32(stableStringify(digestBase))}`

  return {
    merged,
    snapshot: {
      moduleId: args.moduleId,
      digest,
      fields,
      provenanceIndex,
    },
  }
}
