import { stableStringify } from '../digest.js'
import { isJsonValue, type JsonValue, projectJsonValue } from '../observability/jsonValue.js'

export type WorkflowErrorCode =
  | 'WORKFLOW_UNSUPPORTED_VERSION'
  | 'WORKFLOW_INVALID_DEF'
  | 'WORKFLOW_INVALID_TRIGGER'
  | 'WORKFLOW_INVALID_STEP'
  | 'WORKFLOW_DUPLICATE_STEP_KEY'
  | 'WORKFLOW_INVALID_INPUT_EXPR'
  | 'WORKFLOW_INVALID_JSON_POINTER'
  | 'WORKFLOW_INVALID_MERGE_ITEMS'
  | 'WORKFLOW_INVALID_SERVICE_ID'
  | 'WORKFLOW_MISSING_SERVICE'
  | 'WORKFLOW_INVALID_SERVICE_PORT'

export interface WorkflowError extends Error {
  readonly _tag: 'WorkflowError'
  readonly code: WorkflowErrorCode
  readonly programId?: string
  readonly source?: {
    readonly stepKey?: string
    readonly fragmentId?: string
  }
  readonly detail?: JsonValue
}

const toJsonValue = (detail: unknown): JsonValue => {
  if (isJsonValue(detail)) return detail
  return projectJsonValue(detail).value
}

export const makeWorkflowError = (args: {
  readonly code: WorkflowErrorCode
  readonly message: string
  readonly programId?: string
  readonly source?: WorkflowError['source']
  readonly detail?: unknown
}): WorkflowError => {
  const detailJson = args.detail !== undefined ? toJsonValue(args.detail) : undefined
  const msg = args.detail !== undefined ? `${args.message}\n(detail=${stableStringify(detailJson)})` : args.message

  return Object.assign(new Error(msg), {
    _tag: 'WorkflowError' as const,
    code: args.code,
    programId: args.programId,
    source: args.source,
    detail: detailJson,
  }) as WorkflowError
}
