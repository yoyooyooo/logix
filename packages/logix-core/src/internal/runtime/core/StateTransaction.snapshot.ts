import type {
  StateTransaction,
  StateTxnContext,
  StateTxnState,
  TxnPatchRecord,
} from './StateTransaction.js'
import { buildDirtyEvidenceSnapshot, inferReplaceEvidence } from './StateTransaction.dirty.js'

const EMPTY_TXN_PATCHES: ReadonlyArray<TxnPatchRecord> = []

export const buildCommittedTransaction = <S>(
  ctx: StateTxnContext<S>,
  state: StateTxnState<S>,
  finalState: S,
  endedAt: number,
): StateTransaction<S> => {
  const { config } = ctx
  inferReplaceEvidence(ctx, state, finalState)
  const dirty = buildDirtyEvidenceSnapshot(state)
  const patches =
    config.instrumentation === 'full'
      ? state.patches.length === 0
        ? EMPTY_TXN_PATCHES
        : (state.patches as ReadonlyArray<TxnPatchRecord>)
      : EMPTY_TXN_PATCHES

  return {
    txnId: state.txnId,
    txnSeq: state.txnSeq,
    origin: state.origin,
    startedAt: state.startedAt,
    endedAt,
    durationMs: Math.max(0, endedAt - state.startedAt),
    dirty,
    patchCount: state.patchCount,
    patchesTruncated: state.patchesTruncated,
    ...(state.patchesTruncated ? { patchesTruncatedReason: 'max_patches' } : null),
    initialStateSnapshot: state.initialStateSnapshot,
    finalStateSnapshot: config.captureSnapshots ? finalState : undefined,
    patches,
    moduleId: config.moduleId,
    instanceId: config.instanceId,
  }
}
