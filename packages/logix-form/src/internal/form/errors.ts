import { setAtPath } from './path.js'

type ErrorValueLeafObject = {
  readonly message: string
  readonly code?: string
  readonly details?: unknown
}

const isErrorValueLeafObject = (value: unknown): value is ErrorValueLeafObject => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const anyValue = value as Record<string, unknown>
  const msg = anyValue.message
  if (typeof msg !== 'string' || msg.length === 0) return false
  for (const key of Object.keys(anyValue)) {
    if (key !== 'message' && key !== 'code' && key !== 'details') return false
  }
  const code = anyValue.code
  if (code !== undefined && (typeof code !== 'string' || code.length === 0)) return false
  return true
}

/**
 * countErrorLeaves：
 * - Only does incremental counting at the boundary where we "write back into the errors tree", avoiding UI-layer scans.
 * - Recognizes ErrorValue leaf nodes by the contracts/error-value shape.
 * - `$rowId` is not an error value and is excluded from counting.
 */
export const countErrorLeaves = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'string') return value.length > 0 ? 1 : 0
  if (Array.isArray(value)) return value.reduce((acc, v) => acc + countErrorLeaves(v), 0)

  if (typeof value === 'object') {
    if (isErrorValueLeafObject(value)) return 1
    let acc = 0
    for (const [k, v] of Object.entries(value as any)) {
      if (k === '$rowId') continue
      acc += countErrorLeaves(v)
    }
    return acc
  }

  return 1
}

export const readErrorCount = (state: unknown): number => {
  const form = state && typeof state === 'object' && !Array.isArray(state) ? (state as any).$form : undefined
  const v = form && typeof form === 'object' && !Array.isArray(form) ? (form as any).errorCount : undefined
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

export const writeErrorCount = <S>(state: S, nextCount: number): S =>
  setAtPath(state, '$form.errorCount', Math.max(0, nextCount)) as S
