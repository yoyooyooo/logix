import { Effect, SubscriptionRef } from 'effect'
import {
  type FieldPathIdRegistry,
  type DirtyAllReason,
  type FieldPath,
  type FieldPathId,
  type PatchReason,
} from '../../field-path.js'
import * as Dirty from './StateTransaction.dirty.js'
import * as Patch from './StateTransaction.patch.js'
import * as Snapshot from './StateTransaction.snapshot.js'

export type { PatchReason } from '../../field-path.js'

export type StatePatchPath = string | FieldPath | FieldPathId

export interface TxnPatchRecord {
  readonly opSeq: number
  readonly pathId?: FieldPathId
  readonly reason: PatchReason
  readonly stepId?: number
  readonly fieldNodeId?: string
  readonly from?: unknown
  readonly to?: unknown
}

interface MutableTxnPatchRecord {
  opSeq: number
  pathId?: FieldPathId
  reason: PatchReason
  stepId?: number
  fieldNodeId?: string
  from?: unknown
  to?: unknown
}

export interface StateTxnOrigin {
  readonly kind: string
  readonly name?: string
  readonly details?: unknown
}

export type StateTxnInstrumentationLevel = 'full' | 'light'

/**
 * TxnDirtyEvidenceSnapshot:
 * - Immutable snapshot attached to the committed StateTransaction.
 * - Designed for hot-path consumers (SelectorGraph / RowId gate / Debug evidence) without forcing DirtySet(rootIds) construction.
 *
 * Notes:
 * - dirtyPathIds is captured as an Array at commit time (stable across transactions).
 * - When registry is missing, the snapshot conservatively degrades to dirtyAll.
 */
export type TxnDirtyEvidenceSnapshot = {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: DirtyAllReason
  readonly dirtyPathIds: ReadonlyArray<FieldPathId>
  readonly dirtyPathsKeyHash: number
  readonly dirtyPathsKeySize: number
}

/**
 * TxnDirtyEvidence:
 * - Unified "dirty evidence" protocol within a single transaction window.
 * - Carries both root-level dirty path ids (Static IR anchors) and best-effort list index hints.
 *
 * IMPORTANT:
 * - This evidence is only valid within the current transaction window.
 * - Consumers must not persist references (maps/sets are reused across transactions).
 *
 * Key format must match validate.impl.ts `toListInstanceKey`:
 * - root list: `${listPath}@@`
 * - nested list: `${listPath}@@${parentIndexPath.join(',')}`
 */
export type TxnDirtyEvidence = {
  readonly dirtyAll: boolean
  readonly dirtyAllReason?: DirtyAllReason
  readonly dirtyPathIds: ReadonlySet<FieldPathId>
  readonly dirtyPathsKeyHash: number
  readonly dirtyPathsKeySize: number
  readonly list?: {
    readonly indexBindings: ReadonlyMap<string, ReadonlySet<number>>
    readonly rootTouched: ReadonlySet<string>
    /**
     * itemTouched:
     * - Indices for which the patch path directly targeted a list index (e.g. "items.3" / "items[3]"),
     *   which is a stronger structural hint than nested field writes (e.g. "items.3.name").
     */
    readonly itemTouched: ReadonlyMap<string, ReadonlySet<number>>
  }
}

export interface StateTxnConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly instrumentation?: StateTxnInstrumentationLevel
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
  /**
   * Optional: list path set for this module instance (derived from field-kernel list configs).
   * - When absent/empty, list-index evidence is not recorded (zero overhead for modules without list fields).
   */
  readonly getListPathSet?: () => ReadonlySet<string> | undefined
  /**
   * Whether to capture initial/final state snapshots:
   * - enabled by default in full mode
   * - disabled by default in light mode
   */
  readonly captureSnapshots?: boolean
  /**
   * Time source function (useful for injecting a fake clock in tests).
   */
  readonly now?: () => number
}

export interface StateTransaction<S> {
  readonly txnId: string
  readonly txnSeq: number
  readonly origin: StateTxnOrigin
  readonly startedAt: number
  readonly endedAt: number
  readonly durationMs: number
  readonly dirty: TxnDirtyEvidenceSnapshot
  readonly patchCount: number
  readonly patchesTruncated: boolean
  readonly patchesTruncatedReason?: 'max_patches'
  readonly initialStateSnapshot?: S
  readonly finalStateSnapshot?: S
  readonly patches: ReadonlyArray<TxnPatchRecord>
  readonly moduleId?: string
  readonly instanceId?: string
}

export interface StateTransactionCommitResult<S> {
  readonly transaction: StateTransaction<S>
  readonly finalState: S
}

/**
 * StateTxnContext：
 * - Holds transaction state within a single ModuleRuntime.
 * - current is the active transaction (undefined when none).
 *
 * Notes:
 * - The current implementation supports a single active transaction; queueing strategies are added later (US1).
 * - To avoid premature coupling, Context provides only minimal begin/update/record/commit primitives; entry points
 *   (dispatch/source-refresh/devtools) are controlled by higher layers.
 */
export interface StateTxnRuntimeConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly instrumentation: StateTxnInstrumentationLevel
  readonly captureSnapshots: boolean
  readonly now: () => number
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
  readonly getListPathSet?: () => ReadonlySet<string> | undefined
}

export interface StateTxnContext<S> {
  readonly config: StateTxnRuntimeConfig
  current?: StateTxnState<S>
  nextTxnSeq: number
  readonly scratch: StateTxnState<S>
  /**
   * recordPatch：
   * - makeContext selects the implementation based on instrumentation (full/light).
   * - Avoids branching per patch record inside hot loops (051: branch relocation).
   */
  recordPatch: (
    path: StatePatchPath | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    fieldNodeId?: string,
    stepId?: number,
  ) => void
}

export interface StateTxnState<S> {
  txnId: string
  txnSeq: number
  origin: StateTxnOrigin
  startedAt: number
  baseState: S
  draft: S
  initialStateSnapshot?: S
  /**
   * inferReplaceEvidence:
   * - Set when a whole-state replacement write occurred without explicit patch paths.
   * - On commit, the transaction infers best-effort field-level dirty evidence by diffing baseState -> finalState.
   *
   * Motivation:
   * - Avoid dirtyAll fallback on `runtime.setState` / `$.state.update` / reducers without sink patchPaths.
   * - Preserve correctness in `dispatchBatch` where different reducers may mix "has patchPaths" and "no patchPaths".
   *
   * Note:
   * - Kept internal to the txn window; never exported as part of the committed transaction.
   */
  inferReplaceEvidence: boolean
  /**
   * inferReplaceEvidenceIfEmpty:
   * - When true, inference runs only if there is no explicit field-level dirty evidence at commit time.
   * - Primary use case: `setState/state.update` in perf harnesses that record precise patch paths separately.
   * - When a reducer falls back to `path="*"`, this flag is forced to false (supplement mode) to preserve correctness.
   */
  inferReplaceEvidenceIfEmpty: boolean
  /**
   * listPathSet:
   * - Captured once at transaction start from runtime config.
   * - Used to enable list-index evidence recording only when the module actually declares list fields.
   */
  listPathSet?: ReadonlySet<string>
  patches: Array<TxnPatchRecord>
  patchCount: number
  patchesTruncated: boolean
  fieldPathIdRegistry?: FieldPathIdRegistry
  /**
   * dirtyPathIds：
   * - The set of FieldPathIds for all trackable writes within the transaction window (hot path records only integer anchors).
   * - Any non-mappable/non-trackable write must explicitly degrade to dirtyAll (dirtyAllReason); no silent fallback.
   * - Independent of instrumentation: light mode does not keep patches, but still maintains dirtyPathIds/dirtyAllReason for low-cost semantics (e.g. scheduling/diagnostics).
   */
  readonly dirtyPathIds: Set<FieldPathId>
  dirtyPathIdSnapshot: Array<FieldPathId>
  /**
   * dirtyPathIdsKeyHash / dirtyPathIdsKeySize:
   * - Size stays incrementally maintained for hot-path admission checks.
   * - Hash/snapshot are materialized lazily when a consumer actually needs the inline_dirty key
   *   or committed dirty evidence.
   * - Hash: FNV-1a (32-bit) over unique FieldPathIds in Set insertion order.
   */
  dirtyPathIdsKeyHash?: number
  dirtyPathIdsKeySize: number
  dirtyAllReason?: DirtyAllReason
  /**
   * listIndexEvidence:
   * - key: listInstanceKey ("<listPath>@@<parentIndexPath>")
   * - value: changed indices for that list instance within the current transaction window.
   */
  readonly listIndexEvidence: Map<string, Set<number>>
  /**
   * listItemTouched:
   * - key: listInstanceKey
   * - value: indices for which the patch directly targeted the item itself (terminal numeric segment).
   */
  readonly listItemTouched: Map<string, Set<number>>
  /**
   * listRootTouched:
   * - listInstanceKey set for which a patch directly touched the list root (structure may have changed),
   *   so changedIndices hints must be ignored.
   */
  readonly listRootTouched: Set<string>
}

const MAX_PATCHES_FULL = 256

const defaultNow = () => {
  const perf = globalThis.performance
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

export const makeContext = <S>(config: StateTxnConfig): StateTxnContext<S> => {
  const instrumentation: StateTxnInstrumentationLevel = config.instrumentation ?? 'full'

  const captureSnapshots = config.captureSnapshots ?? instrumentation === 'full'

  const scratch: StateTxnState<S> = {
    txnId: '',
    txnSeq: 0,
    origin: { kind: 'unknown' },
    startedAt: 0,
    baseState: undefined as any,
    draft: undefined as any,
    initialStateSnapshot: undefined,
    inferReplaceEvidence: false,
    inferReplaceEvidenceIfEmpty: true,
    listPathSet: undefined,
    patches: [],
    patchCount: 0,
    patchesTruncated: false,
    dirtyPathIds: new Set(),
    dirtyPathIdSnapshot: [],
    dirtyPathIdsKeyHash: undefined,
    dirtyPathIdsKeySize: 0,
    dirtyAllReason: undefined,
    listIndexEvidence: new Map(),
    listItemTouched: new Map(),
    listRootTouched: new Set(),
  }

  const ctx: StateTxnContext<S> = {
    config: {
      instrumentation,
      captureSnapshots,
      now: config.now ?? defaultNow,
      moduleId: config.moduleId,
      instanceId: config.instanceId,
      getFieldPathIdRegistry: config.getFieldPathIdRegistry,
      getListPathSet: config.getListPathSet,
    },
    current: undefined,
    nextTxnSeq: 0,
    scratch,
    recordPatch: () => {},
  }

  const recordPatchLight = (
    path: StatePatchPath | undefined,
    _reason: PatchReason,
    _from?: unknown,
    _to?: unknown,
    _fieldNodeId?: string,
    _stepId?: number,
  ): void => {
    const state = ctx.current
    if (!state) return
    state.patchCount += 1
    if (state.listPathSet && state.listPathSet.size > 0) {
      if (typeof path === 'string') {
        Dirty.recordListIndexEvidenceFromPathString(state, path)
      } else if (Array.isArray(path)) {
        Dirty.recordListIndexEvidenceFromPathArray(state, path)
      }
    }
    Dirty.resolveAndRecordDirtyPathId(state, path, _reason)
  }

  const recordPatchFull = (
    path: StatePatchPath | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    fieldNodeId?: string,
    stepId?: number,
  ): void => {
    const state = ctx.current
    if (!state) return
    state.patchCount += 1
    if (state.listPathSet && state.listPathSet.size > 0) {
      if (typeof path === 'string') {
        Dirty.recordListIndexEvidenceFromPathString(state, path)
      } else if (Array.isArray(path)) {
        Dirty.recordListIndexEvidenceFromPathArray(state, path)
      }
    }
    const opSeq = state.patchCount - 1
    const pathId = Dirty.resolveAndRecordDirtyPathId(state, path, reason)
    if (state.patchesTruncated || state.patches.length >= MAX_PATCHES_FULL) {
      state.patchesTruncated = true
      return
    }
    state.patches.push(Patch.buildPatchRecord(opSeq, pathId, reason, from, to, fieldNodeId, stepId))
  }

  ctx.recordPatch = instrumentation === 'full' ? recordPatchFull : recordPatchLight

  return ctx
}

/**
 * Begins a new transaction:
 * - Default behavior: overrides the current transaction (queueing/nesting are refined in US1).
 * - initialState is provided by the caller (typically the current SubscriptionRef snapshot).
 */
export const beginTransaction = <S>(ctx: StateTxnContext<S>, origin: StateTxnOrigin, initialState: S): void => {
  const { config } = ctx
  const now = config.now
  const startedAt = now()

  ctx.nextTxnSeq += 1
  const txnSeq = ctx.nextTxnSeq
  const anchor = config.instanceId ?? 'unknown'
  const txnId = `${anchor}::t${txnSeq}`

  const initialSnapshot = config.captureSnapshots ? initialState : undefined

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
  state.patches = []
  state.patchCount = 0
  state.patchesTruncated = false
  state.fieldPathIdRegistry = ctx.config.getFieldPathIdRegistry?.()
  state.dirtyPathIds.clear()
  state.dirtyPathIdSnapshot.length = 0
  state.dirtyPathIdsKeyHash = undefined
  state.dirtyPathIdsKeySize = 0
  state.dirtyAllReason = undefined
  state.listPathSet = ctx.config.getListPathSet?.()
  state.listIndexEvidence.clear()
  state.listItemTouched.clear()
  state.listRootTouched.clear()
  ctx.current = state
}

/**
 * Updates the draft state:
 * - next is the latest draft.
 * - When instrumentation is full, patch info is recorded into the transaction via recordPatch.
 */
export const updateDraft = <S>(ctx: StateTxnContext<S>, next: S): void => {
  const state = ctx.current
  if (!state) {
    // No active transaction: ignore patch info; higher layers decide whether to start an implicit transaction.
    return
  }

  state.draft = next
}

/**
 * recordPatch：
 * - In full mode, appends a Patch.
 * - In light mode, silently ignores to avoid extra overhead.
 */
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
  const state = ctx.current as StateTxnState<S> | undefined
  if (!state) return undefined
  const materialized = Dirty.materializeDirtyPathSnapshotAndKey(state)
  const listPathSet = state.listPathSet
  const list =
    listPathSet && listPathSet.size > 0
      ? {
          indexBindings: state.listIndexEvidence,
          rootTouched: state.listRootTouched,
          itemTouched: state.listItemTouched,
        }
      : undefined
  return {
    dirtyAll: state.dirtyAllReason != null,
    dirtyAllReason: state.dirtyAllReason,
    dirtyPathIds: state.dirtyPathIds,
    dirtyPathsKeyHash: materialized.dirtyPathsKeyHash,
    dirtyPathsKeySize: materialized.dirtyPathsKeySize,
    ...(list ? { list } : null),
  }
}

/**
 * commitWithState：
 * - Commits current transaction and returns both aggregated transaction metadata and committed final state.
 * - Used by runtime hot path to avoid an extra stateRef round-trip after commit.
 */
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

    // 0 commit: when there is no change, do not write SubscriptionRef and do not emit state:update.
    if (Object.is(finalState, state.baseState)) {
      ctx.current = undefined
      return undefined
    }

    // Single write to SubscriptionRef: ensures only one external state commit + subscription notification.
    yield* SubscriptionRef.set(stateRef, finalState)

    const endedAt = now()
    const transaction = Snapshot.buildCommittedTransaction(ctx, state, finalState, endedAt)

    // Hand off hot arrays to the committed transaction, then switch scratch slots to fresh arrays
    // so later transactions do not mutate committed snapshots.
    state.patches = []
    state.dirtyPathIdSnapshot = []
    state.dirtyPathIdsKeyHash = undefined

    // Clear the current transaction.
    ctx.current = undefined

    return {
      transaction,
      finalState,
    }
  })

/**
 * Commits the transaction:
 * - Writes the final draft to SubscriptionRef exactly once.
 * - Returns the aggregated StateTransaction; returns undefined if there is no active transaction.
 *
 * Notes:
 * - Emitting Debug/Devtools events is decided by the caller based on the returned transaction.
 * - This module does not depend on DebugSink to avoid circular dependencies in core.
 */
export const commit = <S>(
  ctx: StateTxnContext<S>,
  stateRef: SubscriptionRef.SubscriptionRef<S>,
): Effect.Effect<StateTransaction<S> | undefined> =>
  commitWithState(ctx, stateRef).pipe(Effect.map((result) => result?.transaction))

/**
 * abort：
 * - Terminates the current transaction and clears context.
 * - Does not write to stateRef.
 * - Higher layers decide whether to record diagnostics/observability events.
 */
export const abort = <S>(ctx: StateTxnContext<S>): void => {
  ctx.current = undefined
}
