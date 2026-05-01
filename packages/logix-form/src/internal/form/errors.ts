import { token, type I18nMessageToken } from '@logixjs/i18n'
import { setAtPath } from './path.js'

export type CanonicalFormErrorLeaf = {
  readonly origin: 'rule' | 'decode' | 'manual' | 'submit'
  readonly severity: 'error' | 'warning'
  readonly message: I18nMessageToken
  readonly code?: string
}

export type FormSubmitBlockingBasis = 'none' | 'error' | 'decode' | 'pending'
export type FormSubmitAttemptVerdict = 'idle' | 'ok' | 'blocked'
export type FormDecodedVerdict = 'not-run' | 'valid' | 'invalid'
export type FormReasonFamily = 'none' | 'error' | 'decode' | 'pending'

export type FormSubmitEvidence = Readonly<{
  readonly reasonSlotId: string
  readonly sourceRef: '$form.submitAttempt'
  readonly family: FormReasonFamily
  readonly scope: 'submit'
  readonly blockingBasis: FormSubmitBlockingBasis
  readonly errorCount: number
  readonly pendingCount: number
}>

export type FormSubmitAttemptSummary = Readonly<{
  readonly verdict: FormSubmitAttemptVerdict
  readonly decodedVerdict: FormDecodedVerdict
  readonly blockingBasis: FormSubmitBlockingBasis
  readonly errorCount: number
  readonly pendingCount: number
  readonly evidence: FormSubmitEvidence
}>

export type FormSubmitAttemptCompareFeed = Readonly<
  FormSubmitAttemptSummary & {
    readonly reasonSlotId: string
  }
>

export type FormSubmitAttemptSnapshot = Readonly<{
  readonly seq: number
  readonly reasonSlotId: string
  readonly verdict: FormSubmitAttemptVerdict
  readonly decodedVerdict: FormDecodedVerdict
  readonly blockingBasis: FormSubmitBlockingBasis
  readonly errorCount: number
  readonly pendingCount: number
  readonly summary: FormSubmitAttemptSummary
  readonly compareFeed: FormSubmitAttemptCompareFeed
}>

const isI18nMessageToken = (value: unknown): value is I18nMessageToken => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const anyValue = value as Record<string, unknown>
  if (anyValue._tag !== 'i18n') return false
  if (typeof anyValue.key !== 'string' || anyValue.key.length === 0) return false
  if (anyValue.params !== undefined && (!anyValue.params || typeof anyValue.params !== 'object' || Array.isArray(anyValue.params))) {
    return false
  }
  return true
}

const isCanonicalFormErrorLeaf = (value: unknown): value is CanonicalFormErrorLeaf => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const anyValue = value as Record<string, unknown>
  if (
    anyValue.origin !== 'rule' &&
    anyValue.origin !== 'decode' &&
    anyValue.origin !== 'manual' &&
    anyValue.origin !== 'submit'
  ) {
    return false
  }
  if (anyValue.severity !== 'error' && anyValue.severity !== 'warning') return false
  if (!isI18nMessageToken(anyValue.message)) return false
  for (const key of Object.keys(anyValue)) {
    if (key !== 'origin' && key !== 'severity' && key !== 'message' && key !== 'code') return false
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
  if (typeof value === 'string') return 0
  if (Array.isArray(value)) return value.reduce((acc, v) => acc + countErrorLeaves(v), 0)

  if (typeof value === 'object') {
    if (isCanonicalFormErrorLeaf(value)) return value.severity === 'error' ? 1 : 0
    let acc = 0
    for (const [k, v] of Object.entries(value as any)) {
      if (k === '$rowId' || k === '$schema') continue
      acc += countErrorLeaves(v)
    }
    return acc
  }

  return 0
}

const isPendingSnapshot = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return (value as Record<string, unknown>).status === 'loading'
}

const toPatternPath = (path: string): string =>
  path
    .split('.')
    .filter(Boolean)
    .map((segment) => (/^[0-9]+$/.test(segment) ? '[]' : segment))
    .join('.')
    .replace(/\.\[\]/g, '[]')

export const countPendingLeaves = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (Array.isArray(value)) return value.reduce((acc, item) => acc + countPendingLeaves(item), 0)
  if (typeof value !== 'object') return 0
  if (isPendingSnapshot(value)) return 1

  let acc = 0
  for (const child of Object.values(value as Record<string, unknown>)) {
    acc += countPendingLeaves(child)
  }
  return acc
}

export const countPendingLeavesWithPolicy = (
  value: unknown,
  options?: {
    readonly observePaths?: ReadonlySet<string>
  },
  currentPath: string = '',
): number => {
  if (value === null || value === undefined) return 0

  if (Array.isArray(value)) {
    return value.reduce(
      (acc, item, index) =>
        acc + countPendingLeavesWithPolicy(item, options, currentPath ? `${currentPath}.${index}` : String(index)),
      0,
    )
  }

  if (typeof value !== 'object') return 0

  if (isPendingSnapshot(value)) {
    const observePaths = options?.observePaths
    if (!observePaths) return 1
    return observePaths.has(currentPath) || observePaths.has(toPatternPath(currentPath)) ? 0 : 1
  }

  let acc = 0
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = currentPath ? `${currentPath}.${key}` : key
    acc += countPendingLeavesWithPolicy(child, options, nextPath)
  }
  return acc
}

export const makeDecodeErrorLeaf = (schemaError: unknown): CanonicalFormErrorLeaf => {
  const code =
    schemaError && typeof schemaError === 'object' && typeof (schemaError as Record<string, unknown>).code === 'string'
      ? String((schemaError as Record<string, unknown>).code)
      : undefined

  return {
    origin: 'decode',
    severity: 'error',
    message: code ? token('form.schema.invalid', { code }) : token('form.schema.invalid'),
    ...(code ? { code } : null),
  }
}

export const makeInitialSubmitAttemptSnapshot = (): FormSubmitAttemptSnapshot =>
  makeSubmitAttemptSnapshot({
    seq: 0,
    verdict: 'idle',
    decodedVerdict: 'not-run',
    blockingBasis: 'none',
    errorCount: 0,
    pendingCount: 0,
  })

export const makeSubmitAttemptSnapshot = (params: {
  readonly seq: number
  readonly verdict: Exclude<FormSubmitAttemptVerdict, 'idle'> | 'idle'
  readonly decodedVerdict: FormDecodedVerdict
  readonly blockingBasis: FormSubmitBlockingBasis
  readonly errorCount: number
  readonly pendingCount: number
}): FormSubmitAttemptSnapshot => {
  const reasonSlotId = `submit:${params.seq}`
  const evidence: FormSubmitEvidence = {
    reasonSlotId,
    sourceRef: '$form.submitAttempt',
    family: params.blockingBasis,
    scope: 'submit',
    blockingBasis: params.blockingBasis,
    errorCount: params.errorCount,
    pendingCount: params.pendingCount,
  }

  const summary: FormSubmitAttemptSummary = {
    verdict: params.verdict,
    decodedVerdict: params.decodedVerdict,
    blockingBasis: params.blockingBasis,
    errorCount: params.errorCount,
    pendingCount: params.pendingCount,
    evidence,
  }

  return {
    seq: params.seq,
    reasonSlotId,
    verdict: params.verdict,
    decodedVerdict: params.decodedVerdict,
    blockingBasis: params.blockingBasis,
    errorCount: params.errorCount,
    pendingCount: params.pendingCount,
    summary,
    compareFeed: {
      reasonSlotId,
      ...summary,
    },
  }
}

export const readErrorCount = (state: unknown): number => {
  const form = state && typeof state === 'object' && !Array.isArray(state) ? (state as any).$form : undefined
  const v = form && typeof form === 'object' && !Array.isArray(form) ? (form as any).errorCount : undefined
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

export const writeErrorCount = <S>(state: S, nextCount: number): S =>
  setAtPath(state, '$form.errorCount', Math.max(0, nextCount)) as S
