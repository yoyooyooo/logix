import { fnv1a32, stableStringify } from '../../digest.js'

export type SchemaSummary = {
  readonly label?: string
  readonly tag?: string
  readonly digest?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null && !Array.isArray(value)

const normalizeText = (value: unknown): string | undefined => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.length > 0 ? raw : undefined
}

const safeAstJson = (ast: unknown): unknown | undefined => {
  if (!ast || (typeof ast !== 'object' && typeof ast !== 'function')) return undefined
  try {
    return JSON.parse(JSON.stringify(ast))
  } catch {
    return undefined
  }
}

export const summarizeAst = (ast: unknown): SchemaSummary => {
  if (!ast || (typeof ast !== 'object' && typeof ast !== 'function')) return {}
  const record = ast as Record<string, unknown>
  const tag = normalizeText(record._tag)

  const annotations = isRecord(record.annotations) ? record.annotations : undefined
  const label =
    normalizeText(annotations?.identifier) ??
    normalizeText(annotations?.title) ??
    normalizeText(annotations?.description)

  const json = safeAstJson(ast)
  const digest = json ? `schema:${fnv1a32(stableStringify(json))}` : undefined

  return { label, tag, digest }
}

export const summarizeSchema = (schema: unknown): SchemaSummary => {
  const ast = isRecord(schema) ? schema.ast : undefined
  if (!ast) return {}
  return summarizeAst(ast)
}
