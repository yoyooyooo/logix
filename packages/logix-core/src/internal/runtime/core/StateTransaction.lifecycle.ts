import { Effect, SubscriptionRef } from 'effect'
import type { FieldPathId, PatchReason } from '../../field-path.js'
import * as Dirty from './StateTransaction.dirty.js'
import * as Snapshot from './StateTransaction.snapshot.js'
import { countDirtyBufferClearEntries, countSnapshotObjectMaterializeLight } from './txnHotPathSentinels.js'
import type {
  StatePatchPath,
  StateTransaction,
  StateTransactionCommitResult,
  StateTxnContext,
  StateTxnOrigin,
  StateTxnState,
  TxnDirtyEvidence,
  TxnDirtyPlanSnapshot,
} from './StateTransaction.types.js'

export const beginTransaction = <S>(ctx: StateTxnContext<S>, origin: StateTxnOrigin, initialState: S): void => {
  const { config } = ctx
  const now = config.now
  const startedAt = now()

  ctx.nextTxnSeq += 1
  const txnSeq = ctx.nextTxnSeq
  const anchor = config.instanceId ?? 'unknown'
  const txnId = `${anchor}::t${txnSeq}`

  const initialSnapshot = config.captureSnapshots ? initialState : undefined
  if (config.instrumentation !== 'full' && config.captureSnapshots) {
    countSnapshotObjectMaterializeLight()
  }

  const state = ctx.scratch
  state.txnId = txnId
  state.txnSeq = txnSeq
  state.origin = origin
  state.startedAt = startedAt
  state.baseState = initialState
  state.draft = initialState
  state.initialStateSnapshot = initialSnapshot
  state.inferReplaceEvidence = false
  state.inferReplaceEvidenceIfEmpty = true
  const residualEntryCount =
    state.dirtyPathIds.size +
    state.listIndexEvidence.size +
    state.listItemTouched.size +
    state.listRootTouched.size
  countDirtyBufferClearEntries(residualEntryCount)

  state.patches = []
  state.patchCount = 0
  state.patchesTruncated = false
  state.fieldPathIdRegistry = ctx.config.getFieldPathIdRegistry?.()
  state.dirtyPathIds.clear()
  state.dirtyPathIdSnapshot.length = 0
  state.dirtyPathsKeyHash = undefined
  state.dirtyPathsKeySize = 0
  state.dirtyVersion = 0
  state.dirtyAllReason = undefined
  state.listPathSet = ctx.config.getListPathSet?.()
  state.listIndexEvidence.clear()
  state.listItemTouched.clear()
  state.listRootTouched.clear()
  state.listEvidenceVersion = 0
  state.dirtyPlanCache = undefined
  ctx.current = state
}

const clearTxnScratch = <S>(state: StateTxnState<S>): void => {
  const entryCount =
    state.dirtyPathIds.size +
    state.listIndexEvidence.size +
    state.listItemTouched.size +
    state.listRootTouched.size
  countDirtyBufferClearEntries(entryCount)

  state.patches = []
  state.dirtyPathIds.clear()
  state.dirtyPathIdSnapshot.length = 0
  state.dirtyPathsKeyHash = undefined
  state.dirtyPathsKeySize = 0
  state.listIndexEvidence.clear()
  state.listItemTouched.clear()
  state.listRootTouched.clear()
  state.dirtyPlanCache = undefined
}

export const updateDraft = <S>(ctx: StateTxnContext<S>, next: S): void => {
  const state = ctx.current
  if (!state) {
    return
  }

  state.draft = next
}

export const recordPatch = <S>(
  ctx: StateTxnContext<S>,
  path: StatePatchPath | undefined,
  reason: PatchReason,
  from?: unknown,
  to?: unknown,
  fieldNodeId?: string,
  stepId?: number,
): void => {
  ctx.recordPatch(path, reason, from, to, fieldNodeId, stepId)
}

export const markDirtyPath = <S>(
  ctx: StateTxnContext<S>,
  path: StatePatchPath | undefined,
  reason: PatchReason,
): FieldPathId | undefined => {
  const state = ctx.current
  if (!state) return undefined
  return Dirty.resolveAndRecordDirtyPathId(state, path, reason)
}

export const readDirtyEvidence = <S>(ctx: StateTxnContext<S>): TxnDirtyEvidence | undefined => {
  const plan = readDirtyPlanSnapshot(ctx)
  return plan ? Dirty.dirtyEvidenceFromPlan(plan) : undefined
}

export const readDirtyPlanSnapshot = <S>(ctx: StateTxnContext<S>): TxnDirtyPlanSnapshot | undefined => {
  const state = ctx.current as StateTxnState<S> | undefined
  if (!state) return undefined
  if (state.inferReplaceEvidence && !state.dirtyAllReason && state.dirtyPathIds.size === 0) {
    Dirty.inferReplaceEvidence(ctx, state, state.draft)
  }
  return Dirty.materializeDirtyPlanSnapshot(state)
}

export const dirtyEvidenceFromPlan = (plan: TxnDirtyPlanSnapshot | undefined): TxnDirtyEvidence | undefined =>
  plan ? Dirty.dirtyEvidenceFromPlan(plan) : undefined

export const commitWithState = <S>(
  ctx: StateTxnContext<S>,
  stateRef: SubscriptionRef.SubscriptionRef<S>,
): Effect.Effect<StateTransactionCommitResult<S> | undefined> =>
  Effect.gen(function* () {
    const state = ctx.current
    if (!state) {
      return undefined
    }

    const { config } = ctx
    const now = config.now

    const finalState = state.draft

    if (Object.is(finalState, state.baseState)) {
      ctx.current = undefined
      return undefined
    }

    yield* SubscriptionRef.set(stateRef, finalState)

    const endedAt = now()
    const transaction = Snapshot.buildCommittedTransaction(ctx, state, finalState, endedAt)

    clearTxnScratch(state)

    ctx.current = undefined

    return {
      transaction,
      finalState,
    }
  })

export const commit = <S>(
  ctx: StateTxnContext<S>,
  stateRef: SubscriptionRef.SubscriptionRef<S>,
): Effect.Effect<StateTransaction<S> | undefined> =>
  commitWithState(ctx, stateRef).pipe(Effect.map((result) => result?.transaction))

export const abort = <S>(ctx: StateTxnContext<S>): void => {
  const state = ctx.current
  if (state) {
    clearTxnScratch(state)
  }
  ctx.current = undefined
}
