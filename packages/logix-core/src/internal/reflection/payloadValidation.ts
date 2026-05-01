import { Schema } from 'effect'
import type { ReflectionEvidenceGap } from './consumptionContract.js'

export interface PayloadValidationIssue {
  readonly path: string
  readonly code: string
  readonly message: string
}

export type PayloadValidationResult =
  | {
      readonly _tag: 'success'
      readonly value: unknown
    }
  | {
      readonly _tag: 'failure'
      readonly issues: ReadonlyArray<PayloadValidationIssue>
    }
  | {
      readonly _tag: 'unavailable'
      readonly reason: 'unknown-schema' | 'unsupported-schema'
      readonly evidenceGap: ReflectionEvidenceGap
    }

const MAX_MESSAGE_LENGTH = 180

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSchema = (schema: unknown): schema is Schema.Schema<any> => Schema.isSchema(schema)

const truncateMessage = (message: string): string =>
  message.length <= MAX_MESSAGE_LENGTH ? message : `${message.slice(0, MAX_MESSAGE_LENGTH - 1)}…`

const pathSegmentToString = (segment: unknown): string => {
  if (typeof segment === 'string') return segment
  if (typeof segment === 'number' || typeof segment === 'bigint') return String(segment)
  return String(segment)
}

const joinPath = (segments: ReadonlyArray<unknown>): string => segments.map(pathSegmentToString).join('.')

const codeOfIssue = (issue: unknown): string => {
  if (!isRecord(issue)) return 'schema_issue'
  switch (issue._tag) {
    case 'InvalidType':
      return 'invalid_type'
    case 'MissingKey':
      return 'missing_key'
    case 'UnexpectedKey':
      return 'unexpected_key'
    case 'InvalidValue':
      return 'invalid_value'
    case 'Forbidden':
      return 'forbidden'
    case 'OneOf':
      return 'one_of'
    case 'Filter':
      return 'filter'
    case 'AnyOf':
      return 'any_of'
    default:
      return typeof issue._tag === 'string' ? issue._tag.replace(/[A-Z]/g, (letter, index) => `${index === 0 ? '' : '_'}${letter.toLowerCase()}`) : 'schema_issue'
  }
}

const leafMessageOf = (issue: unknown, fallback: string): string => {
  const text = String(issue ?? fallback)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[0]
  return truncateMessage(text ?? fallback)
}

const walkIssue = (
  issue: unknown,
  path: ReadonlyArray<unknown>,
  out: Array<PayloadValidationIssue>,
): void => {
  if (!isRecord(issue)) {
    out.push({
      path: joinPath(path),
      code: 'schema_issue',
      message: truncateMessage(String(issue ?? 'Payload does not match schema.')),
    })
    return
  }

  if (issue._tag === 'Pointer') {
    const pointerPath = Array.isArray(issue.path) ? issue.path : []
    walkIssue(issue.issue, [...path, ...pointerPath], out)
    return
  }

  if (Array.isArray(issue.issues)) {
    for (const child of issue.issues) {
      walkIssue(child, path, out)
    }
    return
  }

  const inner = issue.issue
  if (inner) {
    walkIssue(inner, path, out)
    return
  }

  out.push({
    path: joinPath(path),
    code: codeOfIssue(issue),
    message: leafMessageOf(issue, 'Payload does not match schema.'),
  })
}

const issuesFromError = (error: unknown): ReadonlyArray<PayloadValidationIssue> => {
  const cause = isRecord(error) ? error.cause : undefined
  const issues: Array<PayloadValidationIssue> = []
  walkIssue(cause ?? error, [], issues)

  if (issues.length === 0) {
    const message = isRecord(error) && typeof error.message === 'string' ? error.message : 'Payload does not match schema.'
    issues.push({
      path: '',
      code: 'schema_issue',
      message: truncateMessage(message),
    })
  }

  const seen = new Set<string>()
  const deduped: PayloadValidationIssue[] = []
  for (const issue of issues) {
    const key = `${issue.path}\u0000${issue.code}\u0000${issue.message}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(issue)
  }
  deduped.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0,
  )
  return deduped
}

const unknownSchemaGap: ReflectionEvidenceGap = {
  class: 'evidenceGap',
  kind: 'reflection-evidence-gap',
  id: 'unknown-payload-schema',
  owner: 'reflection',
  code: 'unknown-payload-schema',
  message: 'Payload schema is unavailable for validation.',
  severity: 'warning',
}

export const validateJsonPayload = (schema: unknown, value: unknown): PayloadValidationResult => {
  if (!isSchema(schema)) {
    return {
      _tag: 'unavailable',
      reason: 'unknown-schema',
      evidenceGap: unknownSchemaGap,
    }
  }

  try {
    return {
      _tag: 'success',
      value: Schema.decodeUnknownSync(schema as any)(value),
    }
  } catch (error) {
    return {
      _tag: 'failure',
      issues: issuesFromError(error),
    }
  }
}
