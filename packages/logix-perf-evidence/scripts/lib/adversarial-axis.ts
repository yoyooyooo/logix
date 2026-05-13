export type AdversarialAxisScalar = string | number | boolean | null
export type AdversarialAxisValue =
  | AdversarialAxisScalar
  | ReadonlyArray<AdversarialAxisValue>
  | { readonly [key: string]: AdversarialAxisValue | undefined }

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const normalizeNumber = (value: number): number | string => {
  if (Number.isNaN(value)) return 'NaN'
  if (value === Number.POSITIVE_INFINITY) return 'Infinity'
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity'
  if (Object.is(value, -0)) return 0
  return value
}

export const normalizeAdversarialAxisValue = (value: unknown): AdversarialAxisValue => {
  if (value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return normalizeNumber(value)
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map((item) => normalizeAdversarialAxisValue(item))
  if (isPlainRecord(value)) {
    const out: Record<string, AdversarialAxisValue> = {}
    for (const key of Object.keys(value).sort()) {
      const item = value[key]
      if (typeof item === 'undefined' || typeof item === 'function' || typeof item === 'symbol') continue
      out[key] = normalizeAdversarialAxisValue(item)
    }
    return out
  }
  return String(value)
}

export const stableAdversarialJson = (value: unknown): string => JSON.stringify(normalizeAdversarialAxisValue(value))

export const normalizeAdversarialAxes = (axes: Record<string, unknown> | undefined): Record<string, AdversarialAxisValue> => {
  const out: Record<string, AdversarialAxisValue> = {}
  for (const key of Object.keys(axes ?? {}).sort()) {
    const value = axes?.[key]
    if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') continue
    out[key] = normalizeAdversarialAxisValue(value)
  }
  return out
}
