/**
 * internal/digest：
 * - Minimal "stable digest" utilities for Runtime / Static IR / Traits, etc.
 * - Goal: stable output across runs/processes while staying lightweight (no extra dependencies).
 *
 * Note: stableStringify does not aim for full JSON equivalence; it only covers the subset needed by this repo:
 * - Stable key ordering (object fields sorted lexicographically).
 * - Non-finite numbers (NaN/±Infinity) degrade to null.
 * - Other non-representable values (undefined/function/symbol, etc.) degrade to null.
 * - undefined inside objects is not omitted; it is encoded as null (differs from JSON.stringify).
 */

export const stableStringify = (value: unknown): string => {
  if (value === null) return 'null'
  const t = typeof value
  if (t === 'string') return JSON.stringify(value)
  if (t === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (t === 'boolean') return value ? 'true' : 'false'

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }

  if (t === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`).join(',')}}`
  }

  return 'null'
}

/**
 * fnv1a32：
 * - 32-bit FNV-1a hash (for short digests); outputs fixed 8-char hex.
 */
export const fnv1a32 = (input: string): string => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
