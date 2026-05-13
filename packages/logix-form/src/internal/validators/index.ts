import type { I18nMessageToken } from '@logixjs/i18n'
import {
  emailToken,
  literalToken,
  maxLengthToken,
  maxToken,
  minLengthToken,
  minToken,
  patternToken,
  requiredToken,
} from './builtinMessageTokens.js'

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

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && value !== null && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const isI18nMessageToken = (value: unknown): value is I18nMessageToken => {
  if (!isPlainRecord(value)) return false
  if (value._tag !== 'i18n') return false
  if (typeof value.key !== 'string' || value.key.length === 0) return false
  if (value.params !== undefined && !isPlainRecord(value.params)) return false
  return true
}

const expectBuiltinMessageToken = (label: string, value: unknown): I18nMessageToken => {
  if (!isI18nMessageToken(value)) {
    throw new Error(`[Form.validators] "${label}" message must be I18nMessageToken`)
  }
  return errorValue(label, value) as I18nMessageToken
}

const lowerBuiltinMessage = (label: string, value: unknown): I18nMessageToken => {
  if (typeof value === 'string') {
    return errorValue(label, literalToken(value)) as I18nMessageToken
  }
  return expectBuiltinMessageToken(label, value)
}

const invalidBuiltinDecl = (label: string, expected: string): never => {
  throw new Error(`[Form.validators] "${label}" declaration must be ${expected}`)
}

export type RequiredDecl =
  | boolean
  | I18nMessageToken
  | Readonly<{
      readonly message?: string | I18nMessageToken
      readonly trim?: boolean
    }>

export const required = (decl?: RequiredDecl): ((value: unknown) => unknown | undefined) => {
  const trim = typeof decl === 'object' && decl !== null ? Boolean((decl as any).trim) : true
  const message =
    decl === undefined || decl === true || decl === false
      ? requiredToken()
      : isI18nMessageToken(decl)
        ? decl
        : typeof decl === 'object' && decl !== null
          ? lowerBuiltinMessage('required', (decl as any).message ?? requiredToken())
          : expectBuiltinMessageToken('required', decl)

  const err = expectBuiltinMessageToken('required', message)

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

export type EmailDecl =
  | boolean
  | I18nMessageToken
  | Readonly<{
      readonly message?: string | I18nMessageToken
    }>

export const email = (decl?: EmailDecl): ((value: unknown) => unknown | undefined) => {
  const message =
    decl === undefined || decl === true || decl === false
      ? emailToken()
      : isI18nMessageToken(decl)
        ? decl
        : typeof decl === 'object' && decl !== null
          ? lowerBuiltinMessage('email', (decl as any).message ?? emailToken())
          : expectBuiltinMessageToken('email', decl)

  const err = expectBuiltinMessageToken('email', message)

  return (value: unknown) => {
    if (value === null || value === undefined) return undefined
    if (typeof value !== 'string') return undefined
    const text = value.trim()
    if (text.length === 0) return undefined
    return text.includes('@') ? undefined : err
  }
}

export type MinLengthDecl =
  | number
  | Readonly<{
      readonly min: number
      readonly message?: string | I18nMessageToken
    }>

export const minLength = (decl: MinLengthDecl): ((value: unknown) => unknown | undefined) => {
  if (!(typeof decl === 'number' || (isPlainRecord(decl) && isFiniteNumber(decl.min)))) {
    invalidBuiltinDecl('minLength', 'number or { min, message? }')
  }
  const min = typeof decl === 'number' ? decl : decl.min
  const err =
    typeof decl === 'object' && decl !== null && 'message' in decl && decl.message !== undefined
      ? lowerBuiltinMessage('minLength', decl.message)
      : expectBuiltinMessageToken('minLength', minLengthToken(min))

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
      readonly message?: string | I18nMessageToken
    }>

export const maxLength = (decl: MaxLengthDecl): ((value: unknown) => unknown | undefined) => {
  if (!(typeof decl === 'number' || (isPlainRecord(decl) && isFiniteNumber(decl.max)))) {
    invalidBuiltinDecl('maxLength', 'number or { max, message? }')
  }
  const max = typeof decl === 'number' ? decl : decl.max
  const err =
    typeof decl === 'object' && decl !== null && 'message' in decl && decl.message !== undefined
      ? lowerBuiltinMessage('maxLength', decl.message)
      : expectBuiltinMessageToken('maxLength', maxLengthToken(max))

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
      readonly message?: string | I18nMessageToken
    }>

export const min = (decl: MinDecl): ((value: unknown) => unknown | undefined) => {
  if (!(typeof decl === 'number' || (isPlainRecord(decl) && isFiniteNumber(decl.min)))) {
    invalidBuiltinDecl('min', 'number or { min, message? }')
  }
  const minValue = typeof decl === 'number' ? decl : decl.min
  const err =
    typeof decl === 'object' && decl !== null && 'message' in decl && decl.message !== undefined
      ? lowerBuiltinMessage('min', decl.message)
      : expectBuiltinMessageToken('min', minToken(minValue))

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
      readonly message?: string | I18nMessageToken
    }>

export const max = (decl: MaxDecl): ((value: unknown) => unknown | undefined) => {
  if (!(typeof decl === 'number' || (isPlainRecord(decl) && isFiniteNumber(decl.max)))) {
    invalidBuiltinDecl('max', 'number or { max, message? }')
  }
  const maxValue = typeof decl === 'number' ? decl : decl.max
  const err =
    typeof decl === 'object' && decl !== null && 'message' in decl && decl.message !== undefined
      ? lowerBuiltinMessage('max', decl.message)
      : expectBuiltinMessageToken('max', maxToken(maxValue))

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
      readonly message?: string | I18nMessageToken
    }>

export const pattern = (decl: PatternDecl): ((value: unknown) => unknown | undefined) => {
  if (!(decl instanceof RegExp || (isPlainRecord(decl) && decl.re instanceof RegExp))) {
    invalidBuiltinDecl('pattern', 'RegExp or { re, message? }')
  }
  const re = decl instanceof RegExp ? decl : decl.re
  const err =
    isPlainRecord(decl) && 'message' in decl && decl.message !== undefined
      ? lowerBuiltinMessage('pattern', decl.message)
      : expectBuiltinMessageToken('pattern', patternToken())

  return (value: unknown) => {
    if (value === null || value === undefined) return undefined
    if (typeof value !== 'string') return undefined
    return re.test(value) ? undefined : err
  }
}

export const schemaErrorMessage = (schemaError: unknown): string => {
  let message: string
  try {
    message = schemaError instanceof Error ? (schemaError.message || 'schema invalid') : String(schemaError)
  } catch {
    message = 'schema invalid'
  }

  const truncated = truncateToJsonByteBudget(message, ERROR_VALUE_MAX_BYTES)
  return truncated.length > 0 ? truncated : 'schema invalid'
}
