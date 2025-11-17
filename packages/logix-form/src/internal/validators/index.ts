import { ParseResult } from 'effect'

export const ERROR_VALUE_MAX_BYTES = 256

const textEncoder = new TextEncoder()

const jsonByteSize = (value: unknown): number => {
  const json = JSON.stringify(value)
  return textEncoder.encode(json).length
}

const truncateToJsonByteBudget = (value: string, maxBytes: number): string => {
  if (jsonByteSize(value) <= maxBytes) return value

  let lo = 0
  let hi = value.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const slice = value.slice(0, mid)
    if (jsonByteSize(slice) <= maxBytes) lo = mid
    else hi = mid - 1
  }
  return value.slice(0, lo)
}

export const assertErrorValueBudget = (value: unknown, label: string): unknown => {
  const bytes = jsonByteSize(value)
  if (bytes <= ERROR_VALUE_MAX_BYTES) return value
  throw new Error(`[Form.validators] ErrorValue for "${label}" must be JSON ≤${ERROR_VALUE_MAX_BYTES}B (got ${bytes}B)`)
}

const errorValue = (label: string, value: unknown): unknown => assertErrorValueBudget(value, label)

export type RequiredDecl =
  | boolean
  | string
  | Readonly<{
      readonly message?: string
      readonly trim?: boolean
    }>

export const required = (decl: RequiredDecl): ((value: unknown) => unknown | undefined) => {
  const trim = typeof decl === 'object' && decl !== null ? Boolean((decl as any).trim) : true
  const message =
    typeof decl === 'string'
      ? decl
      : typeof decl === 'object' && decl !== null && typeof (decl as any).message === 'string'
        ? (decl as any).message
        : 'required'

  const err = errorValue('required', message)

  return (value: unknown) => {
    if (value === null || value === undefined) return err
    if (typeof value === 'string') {
      const v = trim ? value.trim() : value
      return v.length > 0 ? undefined : err
    }
    if (Array.isArray(value)) return value.length > 0 ? undefined : err
    if (typeof value === 'boolean') return value ? undefined : err
    return undefined
  }
}

export type MinLengthDecl =
  | number
  | Readonly<{
      readonly min: number
      readonly message?: string
    }>

export const minLength = (decl: MinLengthDecl): ((value: unknown) => unknown | undefined) => {
  const min = typeof decl === 'number' ? decl : decl.min
  const message =
    typeof decl === 'object' && decl !== null && typeof decl.message === 'string' ? decl.message : 'minLength'
  const err = errorValue('minLength', message)

  return (value: unknown) => {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'string') return value.length >= min ? undefined : err
    if (Array.isArray(value)) return value.length >= min ? undefined : err
    return undefined
  }
}

export type MaxLengthDecl =
  | number
  | Readonly<{
      readonly max: number
      readonly message?: string
    }>

export const maxLength = (decl: MaxLengthDecl): ((value: unknown) => unknown | undefined) => {
  const max = typeof decl === 'number' ? decl : decl.max
  const message =
    typeof decl === 'object' && decl !== null && typeof decl.message === 'string' ? decl.message : 'maxLength'
  const err = errorValue('maxLength', message)

  return (value: unknown) => {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'string') return value.length <= max ? undefined : err
    if (Array.isArray(value)) return value.length <= max ? undefined : err
    return undefined
  }
}

export type MinDecl =
  | number
  | Readonly<{
      readonly min: number
      readonly message?: string
    }>

export const min = (decl: MinDecl): ((value: unknown) => unknown | undefined) => {
  const minValue = typeof decl === 'number' ? decl : decl.min
  const message = typeof decl === 'object' && decl !== null && typeof decl.message === 'string' ? decl.message : 'min'
  const err = errorValue('min', message)

  return (value: unknown) => {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'number' && Number.isFinite(value)) return value >= minValue ? undefined : err
    return undefined
  }
}

export type MaxDecl =
  | number
  | Readonly<{
      readonly max: number
      readonly message?: string
    }>

export const max = (decl: MaxDecl): ((value: unknown) => unknown | undefined) => {
  const maxValue = typeof decl === 'number' ? decl : decl.max
  const message = typeof decl === 'object' && decl !== null && typeof decl.message === 'string' ? decl.message : 'max'
  const err = errorValue('max', message)

  return (value: unknown) => {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'number' && Number.isFinite(value)) return value <= maxValue ? undefined : err
    return undefined
  }
}

export type PatternDecl =
  | RegExp
  | Readonly<{
      readonly re: RegExp
      readonly message?: string
    }>

export const pattern = (decl: PatternDecl): ((value: unknown) => unknown | undefined) => {
  const re = decl instanceof RegExp ? decl : decl.re
  const message =
    typeof decl === 'object' && decl !== null && typeof (decl as any).message === 'string'
      ? (decl as any).message
      : 'pattern'
  const err = errorValue('pattern', message)

  return (value: unknown) => {
    if (value === null || value === undefined) return undefined
    if (typeof value !== 'string') return undefined
    return re.test(value) ? undefined : err
  }
}

export const schemaErrorMessage = (schemaError: unknown): string => {
  let message: string
  try {
    message = ParseResult.TreeFormatter.formatErrorSync(schemaError as any)
  } catch {
    message = 'schema invalid'
  }

  const truncated = truncateToJsonByteBudget(message, ERROR_VALUE_MAX_BYTES)
  return truncated.length > 0 ? truncated : 'schema invalid'
}
