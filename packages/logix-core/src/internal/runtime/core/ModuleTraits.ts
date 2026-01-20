import { fnv1a32, stableStringify } from '../../digest.js'

export type TraitId = string

export type TraitOriginType = 'module' | 'logicUnit'
export type TraitOriginIdKind = 'explicit' | 'derived'

export interface TraitProvenance {
  readonly originType: TraitOriginType
  readonly originId: string
  readonly originIdKind: TraitOriginIdKind
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
 * TraitSpec：
 * - Minimal representation of "trait declarations": a record keyed by traitId.
 * - The concrete value shape is defined by the specific trait system (e.g. StateTraitSpec).
 * - Value serializability is not constrained here (runtime install may depend on functions), but snapshots/evidence exports
 *   must only include serializable subsets.
 */
export type TraitSpec = object

export interface TraitContribution {
  readonly traits: TraitSpec
  readonly provenance: TraitProvenance
}

export interface ModuleTraitItem {
  readonly traitId: TraitId
  readonly name: string
  readonly description?: string
}

export type TraitConflictKind = 'duplicate_traitId' | 'missing_requires' | 'excludes_violation'

export interface TraitConflict {
  readonly kind: TraitConflictKind
  readonly traitId: TraitId
  readonly sources: ReadonlyArray<TraitProvenance>
  readonly missing?: ReadonlyArray<TraitId>
  readonly present?: ReadonlyArray<TraitId>
}

export class ModuleTraitsConflictError extends Error {
  readonly _tag = 'ModuleTraitsConflictError'

  constructor(
    readonly moduleId: string,
    readonly conflicts: ReadonlyArray<TraitConflict>,
  ) {
    super(
      [
        `[ModuleTraitsConflictError] Conflicting traitIds found (moduleId=${moduleId}).`,
        ...conflicts.map((c) =>
          c.kind === 'duplicate_traitId'
            ? `- duplicate ${c.traitId}: ${c.sources.map((s) => `${s.originType}:${s.originId}`).join(', ')}`
            : c.kind === 'missing_requires'
              ? `- missing requires for ${c.traitId}: ${(c.missing ?? []).join(', ')}; sources=${c.sources
                  .map((s) => `${s.originType}:${s.originId}`)
                  .join(', ')}`
              : `- excludes violation for ${c.traitId}: present=${(c.present ?? []).join(', ')}; sources=${c.sources
                  .map((s) => `${s.originType}:${s.originId}`)
                  .join(', ')}`,
        ),
      ].join('\n'),
    )
  }
}

export interface ModuleTraitsSnapshot {
  readonly moduleId: string
  readonly digest: string
  readonly traits: ReadonlyArray<ModuleTraitItem>
  readonly provenanceIndex: Record<TraitId, TraitProvenance>
}

const toProvenanceKey = (p: TraitProvenance): string =>
  `${p.originType}:${p.originId}:${p.originIdKind}:${p.originLabel}:${p.path ?? ''}`

const compareString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

const compareProvenance = (a: TraitProvenance, b: TraitProvenance): number => {
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

const originTypeOrder = (t: TraitOriginType): number => (t === 'module' ? 0 : 1)

const compareTraitIdByProvenance = (
  a: { readonly traitId: TraitId; readonly provenance: TraitProvenance },
  b: { readonly traitId: TraitId; readonly provenance: TraitProvenance },
): number => {
  const ta = originTypeOrder(a.provenance.originType) - originTypeOrder(b.provenance.originType)
  if (ta !== 0) return ta
  const oa = compareString(a.provenance.originId, b.provenance.originId)
  if (oa !== 0) return oa
  return compareString(a.traitId, b.traitId)
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

const getTraitRequires = (value: unknown): ReadonlyArray<TraitId> => {
  if (!value || typeof value !== 'object') return []
  const direct = extractStringArray((value as any).requires)
  return direct
}

const getTraitExcludes = (value: unknown): ReadonlyArray<TraitId> => {
  if (!value || typeof value !== 'object') return []
  const direct = extractStringArray((value as any).excludes)
  return direct
}

const getTraitName = (traitId: TraitId, value: unknown): string => {
  if (value && typeof value === 'object') {
    const n = (value as any).name
    if (typeof n === 'string' && n.trim().length > 0) return n.trim()
  }
  return traitId
}

const getTraitDescription = (value: unknown): string | undefined => {
  if (value && typeof value === 'object') {
    const d = (value as any).description
    if (typeof d === 'string' && d.trim().length > 0) return d.trim()
  }
  return undefined
}

export const finalizeTraitContributions = (args: {
  readonly moduleId: string
  readonly contributions: ReadonlyArray<TraitContribution>
}): { readonly merged: TraitSpec; readonly snapshot: ModuleTraitsSnapshot } => {
  const traitById = new Map<TraitId, { readonly value: unknown; readonly provenance: TraitProvenance }>()

  const duplicateSources = new Map<TraitId, Array<TraitProvenance>>()

  const contributions = [...args.contributions].sort((a, b) => compareProvenance(a.provenance, b.provenance))

  for (const c of contributions) {
    const traits = c.traits
    if (!traits || typeof traits !== 'object') continue
    for (const traitId of Object.keys(traits).sort()) {
      const value = (traits as Record<string, unknown>)[traitId]
      if (value === undefined) continue

      const prev = traitById.get(traitId)
      if (!prev) {
        traitById.set(traitId, { value, provenance: c.provenance })
        continue
      }

      const sources = duplicateSources.get(traitId) ?? [prev.provenance]
      sources.push(c.provenance)
      duplicateSources.set(traitId, sources)
    }
  }

  const conflicts: Array<TraitConflict> = []
  const registerConflict = (conflict: TraitConflict) => {
    const unique = new Map<string, TraitProvenance>()
    for (const s of conflict.sources) {
      unique.set(toProvenanceKey(s), s)
    }
    conflicts.push({
      ...conflict,
      sources: Array.from(unique.values()).sort(compareProvenance),
    })
  }

  // 1) duplicate traitId conflicts
  for (const traitId of Array.from(duplicateSources.keys()).sort()) {
    registerConflict({
      kind: 'duplicate_traitId',
      traitId,
      sources: duplicateSources.get(traitId) ?? [],
    })
  }

  const merged: Record<string, unknown> = {}
  const provenanceIndex: Record<string, TraitProvenance> = {}
  const traits: Array<ModuleTraitItem> = []

  const entries: Array<{ readonly traitId: TraitId; readonly value: unknown; readonly provenance: TraitProvenance }> =
    []
  for (const traitId of traitById.keys()) {
    const entry = traitById.get(traitId)
    if (!entry) continue
    entries.push({ traitId, value: entry.value, provenance: entry.provenance })
  }

  const ids = entries
    .slice()
    .sort(compareTraitIdByProvenance)
    .map((e) => e.traitId)

  for (const traitId of ids) {
    const entry = traitById.get(traitId)
    if (!entry) continue
    merged[traitId] = entry.value
    provenanceIndex[traitId] = entry.provenance
    traits.push({
      traitId,
      name: getTraitName(traitId, entry.value),
      description: getTraitDescription(entry.value),
    })
  }

  // 2) consistency checks (FR-007): requires / excludes
  const present = new Set(ids)

  for (const traitId of ids) {
    const entry = traitById.get(traitId)
    if (!entry) continue

    const requires = getTraitRequires(entry.value)
    if (requires.length > 0) {
      const missing = requires.filter((r) => !present.has(r))
      if (missing.length > 0) {
        registerConflict({
          kind: 'missing_requires',
          traitId,
          missing: Array.from(new Set(missing)).sort(),
          sources: [entry.provenance],
        })
      }
    }

    const excludes = getTraitExcludes(entry.value)
    if (excludes.length > 0) {
      const presentExcluded = excludes.filter((e) => present.has(e))
      if (presentExcluded.length > 0) {
        const otherSources: Array<TraitProvenance> = []
        for (const otherId of presentExcluded) {
          const other = traitById.get(otherId)
          if (other) otherSources.push(other.provenance)
        }
        registerConflict({
          kind: 'excludes_violation',
          traitId,
          present: Array.from(new Set(presentExcluded)).sort(),
          sources: [entry.provenance, ...otherSources],
        })
      }
    }
  }

  if (conflicts.length > 0) {
    const kindOrder: Record<TraitConflictKind, number> = {
      duplicate_traitId: 0,
      missing_requires: 1,
      excludes_violation: 2,
    }
    conflicts.sort((a, b) => {
      const k = kindOrder[a.kind] - kindOrder[b.kind]
      if (k !== 0) return k
      return compareString(a.traitId, b.traitId)
    })
    throw new ModuleTraitsConflictError(args.moduleId, conflicts)
  }

  const digestBase = {
    moduleId: args.moduleId,
    traits,
    provenanceIndex,
  } as const

  const digest = `mtraits:023:${fnv1a32(stableStringify(digestBase))}`

  return {
    merged,
    snapshot: {
      moduleId: args.moduleId,
      digest,
      traits,
      provenanceIndex,
    },
  }
}
