export type TraitMeta = Readonly<{
  readonly label?: string
  readonly description?: string
  readonly tags?: ReadonlyArray<string>
  readonly group?: string
  readonly docsUrl?: string
  readonly cacheGroup?: string
  /**
   * 语义提示：当同一实体（例如同一 resourceId）出现多处 meta 声明且不一致时，
   * canonical=true 的声明优先成为“展示用 canonical”；其他声明会记录为 conflicts。
   */
  readonly canonical?: boolean
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
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

export const sanitize = (input: unknown): TraitMeta | undefined => {
  if (input === null || input === undefined) return undefined
  if (typeof input !== "object" || Array.isArray(input)) return undefined

  const record = input as Record<string, unknown>
  const out: Record<string, unknown> = {}

  const pickString = (key: keyof TraitMeta): void => {
    const value = record[key as string]
    if (typeof value !== "string") return
    const trimmed = value.trim()
    if (!trimmed) return
    out[key] = trimmed
  }

  pickString("label")
  pickString("description")
  pickString("group")
  pickString("docsUrl")
  pickString("cacheGroup")

  const canonical = record.canonical
  if (typeof canonical === "boolean") {
    out.canonical = canonical
  }

  const tagsRaw = record.tags
  if (typeof tagsRaw === "string") {
    const tags = uniqSortedStrings([tagsRaw])
    if (tags.length > 0) out.tags = tags
  } else if (Array.isArray(tagsRaw)) {
    const tags = uniqSortedStrings(tagsRaw.filter((x): x is string => typeof x === "string"))
    if (tags.length > 0) out.tags = tags
  }

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

  const conflicts: Array<TraitMetaConflict> = [
    ...((current.conflicts ?? []) as ReadonlyArray<TraitMetaConflict>),
  ]

  const push = (conflict: TraitMetaConflict): void => {
    const exists = conflicts.some(
      (c) => c.origin === conflict.origin && equals(c.meta, conflict.meta),
    )
    if (!exists) conflicts.push(conflict)
  }

  const existingCanonical = existing.canonical === true
  const incomingCanonical = incoming.meta.canonical === true

  if (!existingCanonical && incomingCanonical) {
    push({
      origin: current.origin ?? "unknown",
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
