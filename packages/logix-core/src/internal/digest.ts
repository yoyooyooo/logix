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
  const stack = new WeakSet<object>()

  const loop = (input: unknown): string => {
    if (input === null) return 'null'
    const t = typeof input
    if (t === 'string') return JSON.stringify(input)
    if (t === 'number') return Number.isFinite(input) ? String(input) : 'null'
    if (t === 'boolean') return input ? 'true' : 'false'

    if (Array.isArray(input)) {
      if (stack.has(input)) return JSON.stringify('[Circular]')
      stack.add(input)
      const out = `[${input.map(loop).join(',')}]`
      stack.delete(input)
      return out
    }

    if (t === 'object') {
      const record = input as Record<string, unknown>
      if (stack.has(record)) return JSON.stringify('[Circular]')
      stack.add(record)
      const keys = Object.keys(record).sort()
      const out = `{${keys.map((k) => `${JSON.stringify(k)}:${loop(record[k])}`).join(',')}}`
      stack.delete(record)
      return out
    }

    return 'null'
  }

  return loop(value)
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
