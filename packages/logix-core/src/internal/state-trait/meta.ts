import type { JsonValue } from '../observability/jsonValue.js'

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

export type TraitMetaSanitizeReport = Readonly<{
  /**
   * invalidInput:
   * - Input was not a plain object (e.g. string/array/function/etc).
   */
  readonly invalidInput?: boolean
  /**
   * unknownKeys:
   * - Top-level keys that are ignored (not part of TraitMeta, and not `x-*` legacy annotations).
   */
  readonly unknownKeys?: ReadonlyArray<string>
  readonly unknownKeyCount?: number
  /**
   * droppedKeys:
   * - Known keys that exist but are dropped due to invalid value type (e.g. tags is not string/array).
   */
  readonly droppedKeys?: ReadonlyArray<string>
  /**
   * droppedTagItems:
   * - Number of non-string/empty tag items dropped during normalization.
   */
  readonly droppedTagItems?: number
  /**
   * annotations:
   * - Only accepts `x-*` keys; invalid keys/values are dropped.
   */
  readonly ignoredAnnotationKeys?: ReadonlyArray<string>
  readonly ignoredAnnotationKeyCount?: number
  readonly droppedAnnotationKeys?: ReadonlyArray<string>
  readonly droppedAnnotationKeyCount?: number
  readonly droppedAnnotationValues?: number
  readonly droppedAnnotationNonSerializable?: number
  readonly droppedAnnotationDepthExceeded?: number
  readonly droppedAnnotationNonFiniteNumber?: number
}>

export type TraitMetaConflict = Readonly<{
  readonly origin: string
  readonly meta: TraitMeta
}>

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

type SanitizeJsonValueStats = {
  dropped: number
  nonSerializable: number
  depthExceeded: number
  nonFiniteNumber: number
}

const sanitizeJsonValue = (input: unknown, depth: number, stats: SanitizeJsonValueStats): JsonValue | undefined => {
  if (input === null) return null

  if (typeof input === 'string') return input
  if (typeof input === 'boolean') return input
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      stats.dropped += 1
      stats.nonSerializable += 1
      stats.nonFiniteNumber += 1
      return undefined
    }
    return input
  }

  if (depth >= 6) {
    stats.dropped += 1
    stats.depthExceeded += 1
    return undefined
  }

  if (Array.isArray(input)) {
    const out: Array<JsonValue> = []
    for (const item of input) {
      const v = sanitizeJsonValue(item, depth + 1, stats)
      if (v !== undefined) out.push(v)
    }
    return out
  }

  if (isPlainRecord(input)) {
    const keys = Object.keys(input).sort()
    const out: Record<string, JsonValue> = {}
    for (const key of keys) {
      const v = sanitizeJsonValue(input[key], depth + 1, stats)
      if (v !== undefined) out[key] = v
    }
    return out
  }

  stats.dropped += 1
  stats.nonSerializable += 1
  return undefined
}

const pushSample = (target: Array<string>, value: string, limit: number): void => {
  if (target.length >= limit) return
  target.push(value)
}

export const sanitizeWithReport = (input: unknown): Readonly<{
  readonly meta?: TraitMeta
  readonly report?: TraitMetaSanitizeReport
}> => {
  if (input === null || input === undefined) return {}
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { report: { invalidInput: true } }
  }

  const record = input as Record<string, unknown>
  const out: Record<string, unknown> = {}

  const reportUnknownKeys: Array<string> = []
  let unknownKeyCount = 0
  const reportDroppedKeys: Array<string> = []
  let droppedTagItems = 0

  const reportIgnoredAnnotationKeys: Array<string> = []
  let ignoredAnnotationKeyCount = 0
  const reportDroppedAnnotationKeys: Array<string> = []
  let droppedAnnotationKeyCount = 0
  const stats: SanitizeJsonValueStats = { dropped: 0, nonSerializable: 0, depthExceeded: 0, nonFiniteNumber: 0 }

  const allowed = new Set([
    'label',
    'description',
    'group',
    'docsUrl',
    'cacheGroup',
    'canonical',
    'tags',
    'annotations',
  ])

  for (const key of Object.keys(record)) {
    if (allowed.has(key) || key.startsWith('x-')) continue
    unknownKeyCount += 1
    pushSample(reportUnknownKeys, key, 8)
  }

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
  if (canonical !== undefined && canonical !== null && typeof canonical !== 'boolean') {
    pushSample(reportDroppedKeys, 'canonical', 8)
  } else if (typeof canonical === 'boolean') {
    out.canonical = canonical
  }

  const tagsRaw = record.tags
  if (typeof tagsRaw === 'string') {
    const tags = uniqSortedStrings([tagsRaw])
    if (tags.length > 0) out.tags = tags
  } else if (Array.isArray(tagsRaw)) {
    const raw = tagsRaw.filter((x): x is string => typeof x === 'string')
    droppedTagItems += tagsRaw.length - raw.length
    const tags = uniqSortedStrings(raw)
    if (tags.length > 0) out.tags = tags
    // count empty/whitespace tags dropped by uniqSortedStrings
    droppedTagItems += raw.length - tags.length
  } else if (tagsRaw !== undefined && tagsRaw !== null) {
    pushSample(reportDroppedKeys, 'tags', 8)
  }

  const annotations: Record<string, JsonValue> = {}

  // legacy: allow passing `x-*` keys at the top-level (untyped input), then normalize into `annotations`.
  const annotationKeys = Object.keys(record)
    .filter((k) => k.startsWith('x-'))
    .sort()
  for (const key of annotationKeys) {
    const v = sanitizeJsonValue(record[key], 0, stats)
    if (v !== undefined) {
      annotations[key] = v
    } else {
      droppedAnnotationKeyCount += 1
      pushSample(reportDroppedAnnotationKeys, key, 8)
    }
  }

  // preferred: typed `annotations` field (only accepts `x-*` keys).
  const annotationsRaw = record.annotations
  if (annotationsRaw !== undefined && annotationsRaw !== null && !isPlainRecord(annotationsRaw)) {
    pushSample(reportDroppedKeys, 'annotations', 8)
  } else if (isPlainRecord(annotationsRaw)) {
    const keys = Object.keys(annotationsRaw)
      .sort()
    for (const key of keys) {
      if (!key.startsWith('x-')) {
        ignoredAnnotationKeyCount += 1
        pushSample(reportIgnoredAnnotationKeys, key, 8)
        continue
      }

      const v = sanitizeJsonValue(annotationsRaw[key], 0, stats)
      if (v !== undefined) {
        annotations[key] = v
      } else {
        droppedAnnotationKeyCount += 1
        pushSample(reportDroppedAnnotationKeys, key, 8)
      }
    }
  }

  if (Object.keys(annotations).length > 0) out.annotations = annotations

  // Dropped keys for invalid string fields (only track invalid types; empty string is ignored as low-signal).
  for (const key of ['label', 'description', 'group', 'docsUrl', 'cacheGroup'] as const) {
    const value = record[key]
    if (value !== undefined && value !== null && typeof value !== 'string') {
      pushSample(reportDroppedKeys, key, 8)
    }
  }

  const meta = Object.keys(out).length > 0 ? (out as TraitMeta) : undefined

  const report: TraitMetaSanitizeReport | undefined = (() => {
    const hasUnknownKeys = unknownKeyCount > 0
    const hasDroppedKeys = reportDroppedKeys.length > 0
    const hasDroppedTagItems = droppedTagItems > 0
    const hasIgnoredAnnotationKeys = ignoredAnnotationKeyCount > 0
    const hasDroppedAnnotations = droppedAnnotationKeyCount > 0 || stats.dropped > 0

    if (
      !hasUnknownKeys &&
      !hasDroppedKeys &&
      !hasDroppedTagItems &&
      !hasIgnoredAnnotationKeys &&
      !hasDroppedAnnotations
    ) {
      return undefined
    }

    return {
      ...(hasUnknownKeys ? { unknownKeys: reportUnknownKeys, unknownKeyCount } : {}),
      ...(hasDroppedKeys ? { droppedKeys: uniqSortedStrings(reportDroppedKeys) } : {}),
      ...(hasDroppedTagItems ? { droppedTagItems } : {}),
      ...(hasIgnoredAnnotationKeys
        ? { ignoredAnnotationKeys: uniqSortedStrings(reportIgnoredAnnotationKeys), ignoredAnnotationKeyCount }
        : {}),
      ...(hasDroppedAnnotations
        ? {
            droppedAnnotationKeys: uniqSortedStrings(reportDroppedAnnotationKeys),
            droppedAnnotationKeyCount,
            droppedAnnotationValues: stats.dropped,
            droppedAnnotationNonSerializable: stats.nonSerializable,
            droppedAnnotationDepthExceeded: stats.depthExceeded,
            droppedAnnotationNonFiniteNumber: stats.nonFiniteNumber,
          }
        : {}),
    } satisfies TraitMetaSanitizeReport
  })()

  return report ? { meta, report } : { meta }
}

export const sanitize = (input: unknown): TraitMeta | undefined => sanitizeWithReport(input).meta

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
