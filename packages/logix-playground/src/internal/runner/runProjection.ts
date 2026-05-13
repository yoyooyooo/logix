export interface InternalRunProjection {
  readonly runId: string
  readonly status: 'passed'
  readonly value: unknown
  readonly valueKind: 'json' | 'null' | 'undefined' | 'void' | 'stringified' | 'truncated'
  readonly lossy: boolean
  readonly lossReasons?: ReadonlyArray<string>
  readonly truncated?: boolean
}

export interface InternalRunFailure {
  readonly runId: string
  readonly status: 'failed'
  readonly failure: {
    readonly kind: 'compile' | 'runtime' | 'timeout' | 'serialization' | 'worker' | 'unavailable'
    readonly message: string
  }
}

export type InternalRunResult = InternalRunProjection | InternalRunFailure

const toJsonSafeValue = (
  value: unknown,
  budget: { readonly depth: number; readonly stringLength: number; readonly arrayLength: number },
): { readonly value: unknown; readonly truncated: boolean; readonly lossReasons: ReadonlyArray<string> } => {
  if (budget.depth < 0) return { value: '[Truncated]', truncated: true, lossReasons: ['depth-truncated'] }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return { value, truncated: false, lossReasons: [] }
  }
  if (typeof value === 'string') {
    if (value.length <= budget.stringLength) return { value, truncated: false, lossReasons: [] }
    return { value: value.slice(0, budget.stringLength), truncated: true, lossReasons: ['string-truncated'] }
  }
  if (typeof value === 'undefined') {
    return { value: null, truncated: false, lossReasons: ['undefined-to-null'] }
  }
  if (Array.isArray(value)) {
    let truncated = value.length > budget.arrayLength
    const lossReasons = new Set<string>(truncated ? ['array-truncated'] : [])
    const out = value.slice(0, budget.arrayLength).map((item) => {
      const projected = toJsonSafeValue(item, { ...budget, depth: budget.depth - 1 })
      truncated = truncated || projected.truncated
      for (const reason of projected.lossReasons) lossReasons.add(reason)
      return projected.value
    })
    return { value: out, truncated, lossReasons: Array.from(lossReasons).sort() }
  }
  if (typeof value === 'object') {
    let truncated = false
    const lossReasons = new Set<string>()
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const projected = toJsonSafeValue(item, { ...budget, depth: budget.depth - 1 })
      truncated = truncated || projected.truncated
      for (const reason of projected.lossReasons) lossReasons.add(reason)
      out[key] = projected.value
    }
    return { value: out, truncated, lossReasons: Array.from(lossReasons).sort() }
  }
  return {
    value: String(value),
    truncated: true,
    lossReasons: [typeof value === 'function' ? 'function-stringified' : typeof value === 'symbol' ? 'symbol-stringified' : 'serialization-fallback'],
  }
}

export const projectRunValue = (runId: string, value: unknown): InternalRunProjection => {
  const projected = toJsonSafeValue(value, { depth: 8, stringLength: 10_000, arrayLength: 100 })
  const valueKind =
    projected.truncated
      ? 'truncated'
      : value === null
        ? 'null'
        : typeof value === 'undefined'
          ? 'undefined'
          : typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint'
            ? 'stringified'
            : 'json'
  const lossReasons = Array.from(new Set(projected.lossReasons)).sort()
  return {
    runId,
    status: 'passed',
    value: projected.value,
    valueKind,
    lossy: lossReasons.length > 0,
    ...(lossReasons.length > 0 ? { lossReasons } : null),
    truncated: projected.truncated ? true : undefined,
  }
}

export const projectRunFailure = (
  runId: string,
  kind: InternalRunFailure['failure']['kind'],
  error: unknown,
): InternalRunFailure => ({
  runId,
  status: 'failed',
  failure: {
    kind,
    message: error instanceof Error ? error.message : String(error),
  },
})
