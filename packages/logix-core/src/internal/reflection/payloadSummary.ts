import { fnv1a32, stableStringify } from '../digest.js'
import { summarizeSchema as summarizePortSchema } from './ports/schemaSummary.js'

export type PayloadSchemaSummaryKind = 'void' | 'primitive' | 'struct' | 'array' | 'literal' | 'union' | 'unknown'

export interface PayloadSchemaSummary {
  readonly kind: PayloadSchemaSummaryKind
  readonly label: string
  readonly digest: string
  readonly jsonShape?: unknown
  readonly truncated?: boolean
  readonly unknownReason?: string
}

export interface PayloadSummaryOptions {
  readonly maxDepth?: number
  readonly maxProperties?: number
  readonly maxUnionMembers?: number
}

const DEFAULT_MAX_DEPTH = 4
const DEFAULT_MAX_PROPERTIES = 16
const DEFAULT_MAX_UNION_MEMBERS = 8

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeOptions = (options?: PayloadSummaryOptions): Required<PayloadSummaryOptions> => ({
  maxDepth:
    typeof options?.maxDepth === 'number' && Number.isFinite(options.maxDepth) && options.maxDepth >= 0
      ? Math.floor(options.maxDepth)
      : DEFAULT_MAX_DEPTH,
  maxProperties:
    typeof options?.maxProperties === 'number' && Number.isFinite(options.maxProperties) && options.maxProperties > 0
      ? Math.floor(options.maxProperties)
      : DEFAULT_MAX_PROPERTIES,
  maxUnionMembers:
    typeof options?.maxUnionMembers === 'number' && Number.isFinite(options.maxUnionMembers) && options.maxUnionMembers > 0
      ? Math.floor(options.maxUnionMembers)
      : DEFAULT_MAX_UNION_MEMBERS,
})

const astOf = (schemaOrAst: unknown): unknown => {
  if (isRecord(schemaOrAst) && schemaOrAst.ast) return schemaOrAst.ast
  return schemaOrAst
}

const kindOfAst = (ast: unknown): PayloadSchemaSummaryKind => {
  if (!isRecord(ast)) return 'unknown'
  switch (ast._tag) {
    case 'Void':
      return 'void'
    case 'String':
    case 'Number':
    case 'Boolean':
    case 'BigInt':
    case 'Symbol':
    case 'Undefined':
    case 'Null':
    case 'Unknown':
      return 'primitive'
    case 'Objects':
      return 'struct'
    case 'Arrays':
      return 'array'
    case 'Literal':
      return 'literal'
    case 'Union':
      return 'union'
    default:
      return 'unknown'
  }
}

const schemaNameOfAst = (ast: unknown): string | undefined => {
  if (!isRecord(ast) || typeof ast._tag !== 'string') return undefined
  switch (ast._tag) {
    case 'Void':
      return 'Schema.Void'
    case 'String':
      return 'Schema.String'
    case 'Number':
      return 'Schema.Number'
    case 'Boolean':
      return 'Schema.Boolean'
    case 'BigInt':
      return 'Schema.BigInt'
    case 'Symbol':
      return 'Schema.Symbol'
    case 'Undefined':
      return 'Schema.Undefined'
    case 'Null':
      return 'Schema.Null'
    case 'Unknown':
      return 'Schema.Unknown'
    default:
      return undefined
  }
}

const jsonShapeForPrimitive = (ast: Record<string, unknown>): unknown => {
  switch (ast._tag) {
    case 'Void':
      return { type: 'void' }
    case 'String':
      return { type: 'string' }
    case 'Number':
      return { type: 'number' }
    case 'Boolean':
      return { type: 'boolean' }
    case 'BigInt':
      return { type: 'bigint' }
    case 'Symbol':
      return { type: 'symbol' }
    case 'Undefined':
      return { type: 'undefined' }
    case 'Null':
      return { type: 'null' }
    case 'Unknown':
      return { type: 'unknown' }
    default:
      return { type: String(ast._tag ?? 'unknown') }
  }
}

const labelOfLiteral = (value: unknown): string => {
  if (typeof value === 'string') return JSON.stringify(value)
  return String(value)
}

const isOptionalPropertyAst = (ast: unknown): boolean => {
  if (!isRecord(ast)) return false
  const context = isRecord(ast.context) ? ast.context : undefined
  return context?.isOptional === true
}

interface ShapeResult {
  readonly shape: unknown
  readonly label: string
  readonly truncated: boolean
}

const shapeOfAst = (
  ast: unknown,
  options: Required<PayloadSummaryOptions>,
  depth: number,
  seen: WeakSet<object>,
): ShapeResult => {
  if (!isRecord(ast)) {
    return {
      shape: { type: 'unknown' },
      label: 'Schema.Unknown',
      truncated: false,
    }
  }

  if (seen.has(ast)) {
    return {
      shape: { type: 'recursive', truncated: true },
      label: 'Schema.Recursive',
      truncated: true,
    }
  }

  if (depth > options.maxDepth) {
    return {
      shape: { type: 'unknown', truncated: true },
      label: 'Schema.Unknown',
      truncated: true,
    }
  }

  seen.add(ast)

  const simpleName = schemaNameOfAst(ast)
  if (simpleName) {
    return {
      shape: jsonShapeForPrimitive(ast),
      label: simpleName,
      truncated: false,
    }
  }

  if (ast._tag === 'Literal') {
    return {
      shape: { const: ast.literal },
      label: `Schema.Literal(${labelOfLiteral(ast.literal)})`,
      truncated: false,
    }
  }

  if (ast._tag === 'Objects' && Array.isArray(ast.propertySignatures)) {
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    let truncated = false
    const parts: string[] = []

    for (const property of ast.propertySignatures.slice(0, options.maxProperties)) {
      if (!isRecord(property) || typeof property.name !== 'string') continue
      const child = shapeOfAst(property.type, options, depth + 1, seen)
      properties[property.name] = child.shape
      parts.push(`${property.name}: ${child.label}`)
      if (!isOptionalPropertyAst(property.type)) required.push(property.name)
      truncated = truncated || child.truncated
    }

    if (ast.propertySignatures.length > options.maxProperties) {
      truncated = true
    }

    required.sort()
    return {
      shape: {
        type: 'object',
        properties,
        required,
      },
      label: `Schema.Struct({ ${parts.join(', ')}${ast.propertySignatures.length > options.maxProperties ? ', ...' : ''} })`,
      truncated,
    }
  }

  if (ast._tag === 'Arrays' && Array.isArray(ast.rest)) {
    const item = shapeOfAst(ast.rest[0], options, depth + 1, seen)
    return {
      shape: { type: 'array', items: item.shape },
      label: `Schema.Array(${item.label})`,
      truncated: item.truncated,
    }
  }

  if (ast._tag === 'Union' && Array.isArray(ast.types)) {
    const members = ast.types.slice(0, options.maxUnionMembers).map((member) => shapeOfAst(member, options, depth + 1, seen))
    const truncated = ast.types.length > options.maxUnionMembers || members.some((member) => member.truncated)
    return {
      shape: { anyOf: members.map((member) => member.shape) },
      label: `Schema.Union(${members.map((member) => member.label).join(' | ')}${ast.types.length > options.maxUnionMembers ? ' | ...' : ''})`,
      truncated,
    }
  }

  const portSummary = summarizePortSchema({ ast })
  return {
    shape: portSummary.tag ? { type: String(portSummary.tag) } : { type: 'unknown' },
    label: portSummary.label ?? (typeof ast._tag === 'string' ? `Schema.${ast._tag}` : 'Schema.Unknown'),
    truncated: false,
  }
}

export const summarizePayloadSchema = (
  schemaOrAst: unknown,
  options?: PayloadSummaryOptions,
): PayloadSchemaSummary => {
  const ast = astOf(schemaOrAst)
  const normalized = normalizeOptions(options)
  const result = shapeOfAst(ast, normalized, 0, new WeakSet<object>())
  const kind = kindOfAst(ast)
  const digestBase = {
    kind,
    label: result.label,
    jsonShape: result.shape,
    truncated: result.truncated,
  }

  return {
    kind,
    label: result.label,
    digest: `schema:${fnv1a32(stableStringify(digestBase))}`,
    jsonShape: result.shape,
    ...(result.truncated ? { truncated: true } : {}),
    ...(kind === 'unknown' ? { unknownReason: 'unsupported-schema-ast' } : {}),
  }
}
