const hasObjectShape = (value: unknown): value is object => typeof value === 'object' && value !== null

const hasIterator = (value: unknown): value is Iterable<unknown> =>
  hasObjectShape(value) && typeof (value as any)[Symbol.iterator] === 'function'

/**
 * `shallow`: a common `useSelector(..., equalityFn)` implementation.
 *
 * Semantics: shallow-compare Array / Object / Map / Set (uses `Object.is` for leaf values),
 * useful when a selector returns a "new object/array" with unchanged contents to skip meaningless re-renders.
 */
export const shallow = <T>(previous: T, next: T): boolean => {
  if (Object.is(previous, next)) return true

  if (!hasObjectShape(previous) || !hasObjectShape(next)) {
    return false
  }

  if (Array.isArray(previous) && Array.isArray(next)) {
    if (previous.length !== next.length) return false
    for (let i = 0; i < previous.length; i++) {
      if (!Object.is(previous[i], next[i])) return false
    }
    return true
  }

  if (previous instanceof Map && next instanceof Map) {
    if (previous.size !== next.size) return false
    for (const [key, value] of previous) {
      if (!next.has(key)) return false
      if (!Object.is(value, next.get(key))) return false
    }
    return true
  }

  if (previous instanceof Set && next instanceof Set) {
    if (previous.size !== next.size) return false
    for (const value of previous) {
      if (!next.has(value)) return false
    }
    return true
  }

  // Fallback: for other iterables, compare shallowly in iteration order (e.g. TypedArray).
  if (hasIterator(previous) && hasIterator(next)) {
    const a = previous[Symbol.iterator]()
    const b = next[Symbol.iterator]()
    while (true) {
      const ra = a.next()
      const rb = b.next()
      if (ra.done || rb.done) return ra.done === rb.done
      if (!Object.is(ra.value, rb.value)) return false
    }
  }

  const prevKeys = Object.keys(previous as any)
  const nextKeys = Object.keys(next as any)
  if (prevKeys.length !== nextKeys.length) return false

  for (const key of prevKeys) {
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false
    if (!Object.is((previous as any)[key], (next as any)[key])) return false
  }

  return true
}
