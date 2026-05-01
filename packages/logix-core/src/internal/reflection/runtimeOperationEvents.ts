export const RUNTIME_OPERATION_EVENT_NAMES = [
  'operation.accepted',
  'operation.completed',
  'operation.failed',
  'evidence.gap',
] as const

export type RuntimeOperationEventName = (typeof RUNTIME_OPERATION_EVENT_NAMES)[number]

export const RUNTIME_OPERATION_KINDS = ['dispatch', 'run', 'check', 'trial'] as const

export type RuntimeOperationKind = (typeof RUNTIME_OPERATION_KINDS)[number]

export interface RuntimeOperationCoordinate {
  readonly instanceId: string
  readonly txnSeq: number
  readonly opSeq: number
}

export interface RuntimeOperationAttachmentRef {
  readonly kind: 'state' | 'log' | 'trace' | 'artifact'
  readonly ref: string
  readonly digest?: string
}

export interface RuntimeOperationFailure {
  readonly code?: string
  readonly message: string
}

export interface RuntimeOperationEventBase extends RuntimeOperationCoordinate {
  readonly name: RuntimeOperationEventName
  readonly eventId: string
  readonly operationKind?: RuntimeOperationKind
  readonly actionTag?: string
  readonly runId?: string
  readonly message?: string
  readonly timestampMode: 'omitted' | 'host-provided'
  readonly attachmentRefs: ReadonlyArray<RuntimeOperationAttachmentRef>
}

export type RuntimeOperationEvent =
  | (RuntimeOperationEventBase & {
      readonly name: 'operation.accepted'
    })
  | (RuntimeOperationEventBase & {
      readonly name: 'operation.completed'
    })
  | (RuntimeOperationEventBase & {
      readonly name: 'operation.failed'
      readonly failure: RuntimeOperationFailure
    })
  | (RuntimeOperationEventBase & {
      readonly name: 'evidence.gap'
      readonly code: string
    })

export interface RuntimeOperationEventInput extends RuntimeOperationCoordinate {
  readonly operationKind?: RuntimeOperationKind
  readonly actionTag?: string
  readonly runId?: string
  readonly message?: string
  readonly attachmentRefs?: ReadonlyArray<RuntimeOperationAttachmentRef>
  readonly timestampMode?: 'omitted' | 'host-provided'
}

export interface RuntimeOperationFailedEventInput extends RuntimeOperationEventInput {
  readonly failure: RuntimeOperationFailure
}

export interface RuntimeOperationEvidenceGapInput extends RuntimeOperationEventInput {
  readonly code: string
  readonly message: string
}

export interface RuntimeDebugRefOperationProjectionOptions {
  readonly operationKind: RuntimeOperationKind
  readonly opSeq?: number
}

const normalizeNonNegativeInt = (value: number): number =>
  Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0

const normalizeCoordinate = (input: RuntimeOperationCoordinate): RuntimeOperationCoordinate => ({
  instanceId: input.instanceId.trim() || 'unknown',
  txnSeq: normalizeNonNegativeInt(input.txnSeq),
  opSeq: normalizeNonNegativeInt(input.opSeq),
})

export const runtimeOperationEventId = (
  coordinate: RuntimeOperationCoordinate,
  name: RuntimeOperationEventName,
): string => {
  const normalized = normalizeCoordinate(coordinate)
  return `${normalized.instanceId}::t${normalized.txnSeq}::o${normalized.opSeq}::${name}`
}

const baseEvent = (
  name: RuntimeOperationEventName,
  input: RuntimeOperationEventInput,
): RuntimeOperationEventBase => {
  const coordinate = normalizeCoordinate(input)
  return {
    name,
    eventId: runtimeOperationEventId(coordinate, name),
    ...coordinate,
    ...(input.operationKind ? { operationKind: input.operationKind } : {}),
    ...(input.actionTag ? { actionTag: input.actionTag } : {}),
    ...(input.runId ? { runId: input.runId } : {}),
    ...(input.message ? { message: input.message } : {}),
    timestampMode: input.timestampMode ?? 'omitted',
    attachmentRefs: Array.from(input.attachmentRefs ?? []),
  }
}

export const createOperationAcceptedEvent = (
  input: RuntimeOperationEventInput,
): Extract<RuntimeOperationEvent, { readonly name: 'operation.accepted' }> => ({
  ...baseEvent('operation.accepted', input),
  name: 'operation.accepted',
})

export const createOperationCompletedEvent = (
  input: RuntimeOperationEventInput,
): Extract<RuntimeOperationEvent, { readonly name: 'operation.completed' }> => ({
  ...baseEvent('operation.completed', input),
  name: 'operation.completed',
})

export const createOperationFailedEvent = (
  input: RuntimeOperationFailedEventInput,
): Extract<RuntimeOperationEvent, { readonly name: 'operation.failed' }> => ({
  ...baseEvent('operation.failed', input),
  name: 'operation.failed',
  failure: input.failure,
})

export const createRuntimeOperationEvidenceGap = (
  input: RuntimeOperationEvidenceGapInput,
): Extract<RuntimeOperationEvent, { readonly name: 'evidence.gap' }> => ({
  ...baseEvent('evidence.gap', input),
  name: 'evidence.gap',
  code: input.code,
  message: input.message,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stringOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

const nonNegativeIntOf = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined

const actionTagOfDebugRef = (ref: Record<string, unknown>): string | undefined => {
  const label = stringOf(ref.label)
  const meta = isRecord(ref.meta) ? ref.meta : undefined
  return stringOf(meta?.actionTag) ?? label
}

export const projectRuntimeDebugRefToOperationEvents = (
  ref: unknown,
  options: RuntimeDebugRefOperationProjectionOptions,
): ReadonlyArray<RuntimeOperationEvent> => {
  const record = isRecord(ref) ? ref : {}
  const coordinate = {
    instanceId: stringOf(record.instanceId) ?? 'unknown',
    txnSeq: nonNegativeIntOf(record.txnSeq) ?? 0,
    opSeq: options.opSeq ?? nonNegativeIntOf(record.opSeq) ?? 0,
  }

  if (!stringOf(record.instanceId) || nonNegativeIntOf(record.txnSeq) === undefined || coordinate.opSeq === 0) {
    return [
      createRuntimeOperationEvidenceGap({
        operationKind: options.operationKind,
        ...coordinate,
        code: 'missing-operation-coordinate',
        message: 'Runtime debug ref is missing stable operation coordinate.',
      }),
    ]
  }

  const kind = stringOf(record.kind)
  const label = stringOf(record.label)
  const errorSummary = isRecord(record.errorSummary) ? record.errorSummary : undefined

  if (errorSummary || label === 'lifecycle:error') {
    return [
      createOperationFailedEvent({
        operationKind: options.operationKind,
        ...coordinate,
        failure: {
          ...(stringOf(errorSummary?.code) ? { code: stringOf(errorSummary?.code) } : {}),
          message: stringOf(errorSummary?.message) ?? 'operation failed',
        },
      }),
    ]
  }

  if (kind === 'action') {
    const actionTag = actionTagOfDebugRef(record)
    return [
      createOperationAcceptedEvent({
        operationKind: options.operationKind,
        ...coordinate,
        ...(actionTag ? { actionTag } : {}),
      }),
      createOperationCompletedEvent({
        operationKind: options.operationKind,
        ...coordinate,
        ...(actionTag ? { actionTag } : {}),
      }),
    ]
  }

  if (kind === 'state' && label === 'state:update') {
    return [
      createOperationCompletedEvent({
        operationKind: options.operationKind,
        ...coordinate,
      }),
    ]
  }

  return []
}
