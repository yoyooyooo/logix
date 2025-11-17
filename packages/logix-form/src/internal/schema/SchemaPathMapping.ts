export type FieldPath = string

export type SchemaError = unknown

export interface SchemaPathMappingOptions {
  /**
   * errorMap: an escape hatch for complex transform cases (explicitly assigns an error to a set of field paths).
   */
  readonly errorMap?: (schemaError: SchemaError) => ReadonlyArray<FieldPath>
  /**
   * rename: a common rename mapping (domainPath -> viewPath).
   */
  readonly rename?: Readonly<Record<FieldPath, FieldPath>>
}

type Segment = string | number

const isNumericSegment = (seg: string): boolean => /^[0-9]+$/.test(seg)

const parseSegmentsFromString = (path: string): ReadonlyArray<Segment> => {
  if (!path) return []
  return path
    .split('.')
    .filter(Boolean)
    .map((seg) => (isNumericSegment(seg) ? Number(seg) : seg))
}

const asSegments = (value: unknown): ReadonlyArray<Segment> | undefined => {
  if (typeof value === 'string') return parseSegmentsFromString(value)
  if (Array.isArray(value)) {
    const parts: Array<Segment> = []
    for (const x of value) {
      if (typeof x === 'number' && Number.isFinite(x)) {
        parts.push(Math.floor(x))
        continue
      }
      if (typeof x === 'string' && x.length > 0) {
        parts.push(isNumericSegment(x) ? Number(x) : x)
      }
    }
    return parts.length ? parts : undefined
  }
  return undefined
}

const toConcretePath = (segments: ReadonlyArray<Segment>): string => segments.map(String).join('.')

const toPatternPath = (
  segments: ReadonlyArray<Segment>,
): { readonly pattern: string; readonly indices: ReadonlyArray<number> } => {
  const out: Array<string> = []
  const indices: Array<number> = []
  for (const seg of segments) {
    if (typeof seg === 'number') {
      out.push('[]')
      indices.push(seg)
    } else {
      out.push(seg)
    }
  }
  const pattern = out.join('.').replace(/\.\[\]/g, '[]')
  return { pattern, indices }
}

const applyIndicesToPattern = (pattern: string, indices: ReadonlyArray<number>): string | undefined => {
  if (!pattern) return pattern
  const raw = pattern.split('.').filter(Boolean)
  const out: Array<string> = []

  let cursor = 0
  for (const part of raw) {
    if (part === '[]') {
      const idx = indices[cursor++]
      if (idx === undefined) return undefined
      out.push(String(idx))
      continue
    }
    if (part.endsWith('[]') && part.length > 2) {
      const base = part.slice(0, -2)
      out.push(base)
      const idx = indices[cursor++]
      if (idx === undefined) return undefined
      out.push(String(idx))
      continue
    }
    out.push(part)
  }
  return out.join('.')
}

const concatPaths = (prefix: string, rest: string): string => {
  if (!prefix) return rest
  if (!rest) return prefix
  return `${prefix}.${rest}`
}

const mapByRename = (
  segments: ReadonlyArray<Segment>,
  rename: Readonly<Record<FieldPath, FieldPath>>,
): string | undefined => {
  const concrete = toConcretePath(segments)
  const direct = rename[concrete]
  if (direct !== undefined) {
    return direct
  }

  const { pattern, indices } = toPatternPath(segments)
  const patternDirect = rename[pattern]
  if (patternDirect !== undefined) {
    return applyIndicesToPattern(patternDirect, indices)
  }

  const keys = Object.keys(rename).sort((a, b) => b.length - a.length)
  for (const from of keys) {
    const to = rename[from]!

    const isPattern = from.includes('[]')
    const target = isPattern ? pattern : concrete

    if (target === from || target.startsWith(`${from}.`)) {
      const rawRest = target.slice(from.length)
      const rest = rawRest.startsWith('.') ? rawRest.slice(1) : rawRest
      const mapped = concatPaths(to, rest)
      return isPattern ? applyIndicesToPattern(mapped, indices) : mapped
    }
  }

  // Segment-level rename: only enabled when both from/to are single segments, to avoid accidental "path rewrites".
  const segMap: Record<string, string> = {}
  for (const [from, to] of Object.entries(rename)) {
    if (from.includes('.') || from.includes('[]')) continue
    if (to.includes('.') || to.includes('[]')) continue
    if (!to) continue
    segMap[from] = to
  }
  if (Object.keys(segMap).length === 0) return undefined

  const mappedSegments = segments.map((seg) => (typeof seg === 'string' ? (segMap[seg] ?? seg) : seg))
  return toConcretePath(mappedSegments)
}

const extractRawPaths = (schemaError: SchemaError): ReadonlyArray<unknown> => {
  const out: Array<unknown> = []

  if (schemaError && typeof schemaError === 'object') {
    const anyErr = schemaError as any
    if (Array.isArray(anyErr.errors)) {
      for (const e of anyErr.errors) {
        if (e && typeof e === 'object' && 'path' in (e as any)) {
          out.push((e as any).path)
        }
      }
    }
    if (Array.isArray(anyErr.issues)) {
      for (const e of anyErr.issues) {
        if (e && typeof e === 'object' && 'path' in (e as any)) {
          out.push((e as any).path)
        }
      }
    }
    if ('path' in anyErr) {
      out.push(anyErr.path)
    }
  }

  return out
}

/**
 * mapSchemaErrorToFieldPaths：
 * - Phase 3: provides a minimal, usable default mapping, and allows `errorMap` to override.
 * - In a later phase (US3), we will raise the coverage goal to ">= 80% common mappings" and fill the test matrix.
 */
export const mapSchemaErrorToFieldPaths = (
  schemaError: SchemaError,
  options?: SchemaPathMappingOptions,
): ReadonlyArray<FieldPath> => {
  const fromEscapeHatch = options?.errorMap?.(schemaError)
  if (fromEscapeHatch && fromEscapeHatch.length) {
    return Array.from(new Set(fromEscapeHatch.filter((p) => typeof p === 'string' && p.length > 0)))
  }

  const rename = options?.rename
  const results: Array<string> = []

  for (const rawPath of extractRawPaths(schemaError)) {
    const segments = asSegments(rawPath)
    if (!segments || segments.length === 0) continue

    const mapped = rename ? mapByRename(segments, rename) : undefined

    const path = mapped ?? toConcretePath(segments)
    if (path) results.push(path)
  }

  return Array.from(new Set(results))
}
