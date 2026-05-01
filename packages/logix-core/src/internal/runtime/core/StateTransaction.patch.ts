import { normalizePatchReason, type FieldPathId, type PatchReason } from '../../field-path.js'
import type { TxnPatchRecord } from './StateTransaction.js'

interface MutableTxnPatchRecord {
  opSeq: number
  pathId?: FieldPathId
  reason: PatchReason
  stepId?: number
  fieldNodeId?: string
  from?: unknown
  to?: unknown
}

export const normalizePatchStepId = (stepId?: number): number | undefined => {
  if (typeof stepId !== 'number' || !Number.isFinite(stepId) || stepId < 0) {
    return undefined
  }
  return Math.floor(stepId)
}

export const buildPatchRecord = (
  opSeq: number,
  pathId: FieldPathId | undefined,
  reason: PatchReason,
  from?: unknown,
  to?: unknown,
  fieldNodeId?: string,
  stepId?: number,
): TxnPatchRecord => {
  const record: MutableTxnPatchRecord = {
    opSeq,
    reason: normalizePatchReason(reason),
  }

  if (pathId != null) {
    record.pathId = pathId
  }
  if (from !== undefined) {
    record.from = from
  }
  if (to !== undefined) {
    record.to = to
  }
  if (fieldNodeId) {
    record.fieldNodeId = fieldNodeId
  }

  const normalizedStepId = normalizePatchStepId(stepId)
  if (normalizedStepId !== undefined) {
    record.stepId = normalizedStepId
  }

  return record
}
