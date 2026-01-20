export type TraitMeta = Readonly<{
  readonly label?: string
  readonly description?: string
  readonly tags?: ReadonlyArray<string>
  readonly group?: string
  readonly docsUrl?: string
  readonly cacheGroup?: string
  /**
   * Extension annotations: only accepts `x-*` keys (anchors for capabilities like Phantom Source / Drift Detection).
   *
   * Constraints:
   * - Must be serializable (JSON values).
   * - Must be slim (keep only a few key hints; don't stuff large objects).
   */
  readonly annotations?: Readonly<Record<string, JsonValue>>
  /**
   * Semantic hint: when the same entity (e.g. the same resourceId) has multiple inconsistent meta declarations,
   * the one with canonical=true becomes the "display canonical", and others are recorded as conflicts.
   */
  readonly canonical?: boolean
}>

export type TraitMetaConflict = Readonly<{
  readonly origin: string
  readonly meta: TraitMeta
}>

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue }

const uniqSortedStrings = (input: ReadonlyArray<string>): ReadonlyArray<string> => {
  const set = new Set<string>()
  for (const item of input) {
    const v = item.trim()
    if (!v) continue
    set.add(v)
  }
  return Array.from(set).sort()
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const sanitizeJsonValue = (input: unknown, depth: number): JsonValue | undefined => {
  if (input === null) return null

  if (typeof input === 'string') return input
  if (typeof input === 'boolean') return input
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : undefined
  }

  if (depth >= 6) return undefined

  if (Array.isArray(input)) {
    const out: Array<JsonValue> = []
    for (const item of input) {
      const v = sanitizeJsonValue(item, depth + 1)
      if (v !== undefined) out.push(v)
    }
    return out
  }

  if (isPlainRecord(input)) {
    const keys = Object.keys(input).sort()
    const out: Record<string, JsonValue> = {}
    for (const key of keys) {
      const v = sanitizeJsonValue(input[key], depth + 1)
      if (v !== undefined) out[key] = v
    }
    return out
  }

  return undefined
}

export const sanitize = (input: unknown): TraitMeta | undefined => {
  if (input === null || input === undefined) return undefined
  if (typeof input !== 'object' || Array.isArray(input)) return undefined

  const record = input as Record<string, unknown>
  const out: Record<string, unknown> = {}

  const pickString = (key: keyof TraitMeta): void => {
    const value = record[key as string]
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (!trimmed) return
    out[key] = trimmed
  }

  pickString('label')
  pickString('description')
  pickString('group')
  pickString('docsUrl')
  pickString('cacheGroup')

  const canonical = record.canonical
  if (typeof canonical === 'boolean') {
    out.canonical = canonical
  }

  const tagsRaw = record.tags
  if (typeof tagsRaw === 'string') {
    const tags = uniqSortedStrings([tagsRaw])
    if (tags.length > 0) out.tags = tags
  } else if (Array.isArray(tagsRaw)) {
    const tags = uniqSortedStrings(tagsRaw.filter((x): x is string => typeof x === 'string'))
    if (tags.length > 0) out.tags = tags
  }

  const annotations: Record<string, JsonValue> = {}

  // legacy: allow passing `x-*` keys at the top-level (untyped input), then normalize into `annotations`.
  const annotationKeys = Object.keys(record)
    .filter((k) => k.startsWith('x-'))
    .sort()
  for (const key of annotationKeys) {
    const v = sanitizeJsonValue(record[key], 0)
    if (v !== undefined) annotations[key] = v
  }

  // preferred: typed `annotations` field (only accepts `x-*` keys).
  const annotationsRaw = record.annotations
  if (isPlainRecord(annotationsRaw)) {
    const keys = Object.keys(annotationsRaw)
      .filter((k) => k.startsWith('x-'))
      .sort()
    for (const key of keys) {
      const v = sanitizeJsonValue(annotationsRaw[key], 0)
      if (v !== undefined) annotations[key] = v
    }
  }

  if (Object.keys(annotations).length > 0) out.annotations = annotations

  return Object.keys(out).length > 0 ? (out as TraitMeta) : undefined
}

const stableStringify = (meta: TraitMeta): string => {
  const out: Record<string, unknown> = {}
  const keys = Object.keys(meta).sort()
  for (const k of keys) {
    out[k] = (meta as any)[k]
  }
  return JSON.stringify(out)
}

export const equals = (a: TraitMeta | undefined, b: TraitMeta | undefined): boolean => {
  if (a === b) return true
  if (!a || !b) return false
  return stableStringify(a) === stableStringify(b)
}

export type CanonicalMergeInput = Readonly<{
  readonly meta?: TraitMeta
  readonly origin?: string
  readonly conflicts?: ReadonlyArray<TraitMetaConflict>
}>

export type CanonicalMergeResult = Readonly<{
  readonly meta?: TraitMeta
  readonly origin?: string
  readonly conflicts?: ReadonlyArray<TraitMetaConflict>
}>

export const mergeCanonical = (
  current: CanonicalMergeInput,
  incoming: Readonly<{ readonly origin: string; readonly meta: TraitMeta }>,
): CanonicalMergeResult => {
  const existing = current.meta
  if (!existing) {
    return {
      meta: incoming.meta,
      origin: incoming.origin,
      conflicts: current.conflicts,
    }
  }

  if (equals(existing, incoming.meta)) {
    return current
  }

  const conflicts: Array<TraitMetaConflict> = [...((current.conflicts ?? []) as ReadonlyArray<TraitMetaConflict>)]

  const push = (conflict: TraitMetaConflict): void => {
    const exists = conflicts.some((c) => c.origin === conflict.origin && equals(c.meta, conflict.meta))
    if (!exists) conflicts.push(conflict)
  }

  const existingCanonical = existing.canonical === true
  const incomingCanonical = incoming.meta.canonical === true

  if (!existingCanonical && incomingCanonical) {
    push({
      origin: current.origin ?? 'unknown',
      meta: existing,
    })
    return {
      meta: incoming.meta,
      origin: incoming.origin,
      conflicts,
    }
  }

  push({
    origin: incoming.origin,
    meta: incoming.meta,
  })

  return {
    meta: existing,
    origin: current.origin ?? incoming.origin,
    conflicts,
  }
}
