export type JsonValue =
  | null
  | boolean
  | number
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }

export type DowngradeReason = 'non_serializable' | 'oversized' | 'unknown'

export const isJsonValue = (input: unknown): input is JsonValue => {
  const seen = new WeakSet<object>()

  const loop = (value: unknown, depth: number): value is JsonValue => {
    if (depth > 64) return false
    if (value === null) return true

    switch (typeof value) {
      case 'string':
      case 'boolean':
        return true
      case 'number':
        return Number.isFinite(value)
      case 'object': {
        if (Array.isArray(value)) {
          if (seen.has(value)) return false
          seen.add(value)
          for (const item of value) {
            if (!loop(item, depth + 1)) return false
          }
          return true
        }

        if (!isPlainRecord(value)) return false
        if (seen.has(value)) return false
        seen.add(value)

        for (const v of Object.values(value)) {
          if (!loop(v, depth + 1)) return false
        }

        return true
      }
      default:
        return false
    }
  }

  return loop(input, 0)
}

export interface JsonValueProjectionStats {
  readonly dropped: number
  readonly oversized: number
  readonly nonSerializable: number
}

export interface JsonValueProjection {
  readonly value: JsonValue
  readonly stats: JsonValueProjectionStats
  readonly downgrade?: DowngradeReason
}

export interface JsonValueProjectOptions {
  readonly maxDepth?: number
  readonly maxObjectKeys?: number
  readonly maxArrayLength?: number
  readonly maxStringLength?: number
  readonly maxJsonBytes?: number
  readonly oversizedPreviewBytes?: number
}

const defaultOptions: Required<JsonValueProjectOptions> = {
  maxDepth: 6,
  maxObjectKeys: 32,
  maxArrayLength: 32,
  maxStringLength: 256,
  maxJsonBytes: 4 * 1024,
  oversizedPreviewBytes: 256,
}

const truncateString = (value: string, maxLen: number, stats: MutableStats): string => {
  if (value.length <= maxLen) return value
  stats.oversized += 1
  return value.slice(0, maxLen)
}

type MutableStats = {
  dropped: number
  oversized: number
  nonSerializable: number
}

const mergeDowngrade = (current: DowngradeReason | undefined, next: DowngradeReason): DowngradeReason => {
  if (!current) return next
  if (current === 'non_serializable' || next === 'non_serializable') return 'non_serializable'
  if (current === 'oversized' || next === 'oversized') return 'oversized'
  return 'unknown'
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const asNumber = (value: number, stats: MutableStats): JsonValue => {
  if (Number.isFinite(value)) return value
  stats.nonSerializable += 1
  return String(value)
}

const toJsonValueInternal = (
  input: unknown,
  options: Required<JsonValueProjectOptions>,
  stats: MutableStats,
  seen: WeakSet<object>,
  depth: number,
): JsonValue => {
  if (input === null) return null

  switch (typeof input) {
    case 'string':
      return truncateString(input, options.maxStringLength, stats)
    case 'number':
      return asNumber(input, stats)
    case 'boolean':
      return input
    case 'bigint':
      stats.nonSerializable += 1
      return truncateString(input.toString(), options.maxStringLength, stats)
    case 'symbol':
      stats.nonSerializable += 1
      return truncateString(input.toString(), options.maxStringLength, stats)
    case 'function':
      stats.nonSerializable += 1
      return '[Function]'
    case 'undefined':
      stats.dropped += 1
      return null
  }

  // object
  if (depth >= options.maxDepth) {
    stats.oversized += 1
    return '[Truncated]'
  }

  if (input instanceof Date) {
    return input.toISOString()
  }

  if (input instanceof Error) {
    stats.nonSerializable += 1
    return {
      name: truncateString(input.name, options.maxStringLength, stats),
      message: truncateString(input.message, options.maxStringLength, stats),
    }
  }

  if (typeof input === 'object') {
    if (seen.has(input)) {
      stats.nonSerializable += 1
      return '[Circular]'
    }
    seen.add(input)
  }

  if (Array.isArray(input)) {
    const out: Array<JsonValue> = []
    const limit = Math.min(input.length, options.maxArrayLength)
    for (let i = 0; i < limit; i++) {
      out.push(toJsonValueInternal(input[i], options, stats, seen, depth + 1))
    }
    if (input.length > limit) {
      stats.oversized += 1
      out.push(`[...${input.length - limit} more]`)
    }
    return out
  }

  if (!isPlainRecord(input)) {
    stats.nonSerializable += 1
    return truncateString(String(input), options.maxStringLength, stats)
  }

  const keys = Object.keys(input).sort()
  const limit = Math.min(keys.length, options.maxObjectKeys)
  const out: Record<string, JsonValue> = {}

  for (let i = 0; i < limit; i++) {
    const rawKey = keys[i]!
    const rawValue = (input as any)[rawKey]
    const key = truncateString(rawKey, options.maxStringLength, stats)
    if (rawValue === undefined) {
      stats.dropped += 1
      continue
    }
    out[key] = toJsonValueInternal(rawValue, options, stats, seen, depth + 1)
  }

  if (keys.length > limit) {
    stats.oversized += 1
    out.__truncatedKeys = keys.length - limit
  }

  return out
}

export const projectJsonValue = (input: unknown, options?: JsonValueProjectOptions): JsonValueProjection => {
  const resolved: Required<JsonValueProjectOptions> = { ...defaultOptions, ...(options ?? {}) }
  const stats: MutableStats = { dropped: 0, oversized: 0, nonSerializable: 0 }
  const seen = new WeakSet<object>()

  let downgrade: DowngradeReason | undefined
  const value = toJsonValueInternal(input, resolved, stats, seen, 0)

  if (stats.nonSerializable > 0) {
    downgrade = mergeDowngrade(downgrade, 'non_serializable')
  }
  if (stats.oversized > 0) {
    downgrade = mergeDowngrade(downgrade, 'oversized')
  }

  // Hard gate: ensure JSON.stringify never throws and respect the max byte budget.
  try {
    const json = JSON.stringify(value)
    if (json.length > resolved.maxJsonBytes) {
      downgrade = mergeDowngrade(downgrade, 'oversized')
      const preview = json.slice(0, Math.min(resolved.oversizedPreviewBytes, resolved.maxJsonBytes))
      return {
        value: {
          _tag: 'oversized',
          bytes: json.length,
          preview,
        },
        stats: {
          dropped: stats.dropped,
          oversized: stats.oversized + 1,
          nonSerializable: stats.nonSerializable,
        },
        downgrade,
      }
    }
  } catch {
    downgrade = mergeDowngrade(downgrade, 'non_serializable')
    return {
      value: '[Unserializable]',
      stats: {
        dropped: stats.dropped,
        oversized: stats.oversized,
        nonSerializable: stats.nonSerializable + 1,
      },
      downgrade,
    }
  }

  return {
    value,
    stats: {
      dropped: stats.dropped,
      oversized: stats.oversized,
      nonSerializable: stats.nonSerializable,
    },
    downgrade,
  }
}
