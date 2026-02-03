import { createHash } from 'node:crypto'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype

export const stableSortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableSortJson)
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = stableSortJson(value[key])
    }
    return out
  }
  return value
}

export const stableStringifyJson = (value: unknown, space?: number): string => JSON.stringify(stableSortJson(value), null, space)

export const sha256DigestOfJson = (value: unknown): string =>
  `sha256:${createHash('sha256').update(stableStringifyJson(value)).digest('hex')}`

