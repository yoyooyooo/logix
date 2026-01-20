import { isJsonValue } from '../observability/jsonValue.js'
import { makeWorkflowError } from './errors.js'
import type { InputExprV1 } from './model.js'

export type JsonPointerToken = string | number

const decodePointerToken = (raw: string): string => raw.replace(/~1/g, '/').replace(/~0/g, '~')

const isIndexToken = (token: string): boolean => token === '0' || (!token.startsWith('0') && /^\d+$/.test(token))

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseJsonPointer = (pointer: string): ReadonlyArray<JsonPointerToken> => {
  if (pointer === '') return []
  if (!pointer.startsWith('/')) {
    throw makeWorkflowError({
      code: 'WORKFLOW_INVALID_JSON_POINTER',
      message: 'Invalid JSON Pointer (must be "" or start with "/").',
      detail: { pointer },
    })
  }

  const raw = pointer.split('/').slice(1)
  const out: JsonPointerToken[] = []
  for (const part of raw) {
    const decoded = decodePointerToken(part)
    out.push(isIndexToken(decoded) ? Number(decoded) : decoded)
  }
  return out
}

export type CompiledInputExpr =
  | { readonly kind: 'payload' }
  | { readonly kind: 'payload.path'; readonly pointer: string; readonly tokens: ReadonlyArray<JsonPointerToken> }
  | { readonly kind: 'const'; readonly value: unknown }
  | { readonly kind: 'object'; readonly fields: ReadonlyArray<readonly [string, CompiledInputExpr]> }
  | { readonly kind: 'merge'; readonly items: ReadonlyArray<CompiledInputExpr> }

export const compileInputExpr = (expr: InputExprV1, pathForError?: { readonly stepKey?: string }): CompiledInputExpr => {
  switch (expr.kind) {
    case 'payload':
      return { kind: 'payload' }
    case 'payload.path': {
      const pointer = expr.pointer
      if (typeof pointer !== 'string') {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_INPUT_EXPR',
          message: 'InputExpr.payload.path.pointer must be a string.',
          source: { stepKey: pathForError?.stepKey },
          detail: { pointer },
        })
      }
      return { kind: 'payload.path', pointer, tokens: parseJsonPointer(pointer) }
    }
    case 'const': {
      const value: unknown = expr.value
      if (!isJsonValue(value)) {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_INPUT_EXPR',
          message: 'InputExpr.const.value must be JSON-serializable.',
          source: { stepKey: pathForError?.stepKey },
          detail: { value },
        })
      }
      return { kind: 'const', value }
    }
    case 'object': {
      const fields: unknown = expr.fields
      if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_INPUT_EXPR',
          message: 'InputExpr.object.fields must be a record.',
          source: { stepKey: pathForError?.stepKey },
        })
      }
      const entries = Object.entries(fields as Record<string, InputExprV1>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      return {
        kind: 'object',
        fields: entries.map(([k, v]) => [k, compileInputExpr(v, pathForError)] as const),
      }
    }
    case 'merge': {
      const items: unknown = expr.items
      if (!Array.isArray(items)) {
        throw makeWorkflowError({
          code: 'WORKFLOW_INVALID_INPUT_EXPR',
          message: 'InputExpr.merge.items must be an array.',
          source: { stepKey: pathForError?.stepKey },
        })
      }

      // Hard gate: merge.items must all be object (enforced at compile-time; runtime should not branch).
      for (const item of items) {
        const kind = isRecord(item) ? item.kind : undefined
        if (kind !== 'object') {
          throw makeWorkflowError({
            code: 'WORKFLOW_INVALID_MERGE_ITEMS',
            message: 'InputExpr.merge.items must all be InputExpr.object.',
            source: { stepKey: pathForError?.stepKey },
            detail: { kind },
          })
        }
      }

      return {
        kind: 'merge',
        items: (items as ReadonlyArray<InputExprV1>).map((i) => compileInputExpr(i, pathForError)),
      }
    }
  }
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const evalPointer = (root: unknown, tokens: ReadonlyArray<JsonPointerToken>): unknown => {
  let current: unknown = root
  for (const token of tokens) {
    if (current == null) return undefined
    if (Array.isArray(current) && typeof token === 'number') {
      current = current[token]
      continue
    }
    if (typeof current !== 'object') return undefined
    const key = typeof token === 'number' ? String(token) : token
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

export const evalInputExpr = (expr: CompiledInputExpr, payload: unknown): unknown => {
  switch (expr.kind) {
    case 'payload':
      return payload
    case 'payload.path':
      return evalPointer(payload, expr.tokens)
    case 'const':
      return expr.value
    case 'object': {
      const out: Record<string, unknown> = {}
      for (const [k, v] of expr.fields) {
        out[k] = evalInputExpr(v, payload)
      }
      return out
    }
    case 'merge': {
      const out: Record<string, unknown> = {}
      for (const item of expr.items) {
        const value = evalInputExpr(item, payload)
        if (isPlainRecord(value)) {
          for (const [k, v] of Object.entries(value)) {
            out[k] = v
          }
        }
      }
      return out
    }
  }
}
