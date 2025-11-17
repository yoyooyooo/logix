import { Effect, SubscriptionRef } from 'effect'
import {
  getFieldPathId,
  dirtyPathsToRootIds,
  normalizeFieldPath,
  normalizePatchReason,
  type FieldPathIdRegistry,
  type DirtyAllReason,
  type DirtySet,
  type FieldPath,
  type FieldPathId,
  type PatchReason,
} from '../../field-path.js'

export type { PatchReason } from '../../field-path.js'

export type StatePatchPath = string | FieldPath | FieldPathId

export interface TxnPatchRecord {
  readonly opSeq: number
  readonly pathId?: FieldPathId
  readonly reason: PatchReason
  readonly stepId?: number
  readonly traitNodeId?: string
  readonly from?: unknown
  readonly to?: unknown
}

export interface StateTxnOrigin {
  readonly kind: string
  readonly name?: string
  readonly details?: unknown
}

export type StateTxnInstrumentationLevel = 'full' | 'light'

export interface StateTxnConfig {
  readonly moduleId?: string
  readonly instanceId?: string
  readonly instrumentation?: StateTxnInstrumentationLevel
  readonly getFieldPathIdRegistry?: () => FieldPathIdRegistry | undefined
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
  readonly dirtySet: DirtySet
  readonly patchCount: number
  readonly patchesTruncated: boolean
  readonly patchesTruncatedReason?: 'max_patches'
  readonly initialStateSnapshot?: S
  readonly finalStateSnapshot?: S
  readonly patches: ReadonlyArray<TxnPatchRecord>
  readonly moduleId?: string
  readonly instanceId?: string
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
    traitNodeId?: string,
    stepId?: number,
  ) => void
}

interface StateTxnState<S> {
  txnId: string
  txnSeq: number
  origin: StateTxnOrigin
  startedAt: number
  baseState: S
  draft: S
  initialStateSnapshot?: S
  readonly patches: Array<TxnPatchRecord>
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
  dirtyAllReason?: DirtyAllReason
}

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
    patches: [],
    patchCount: 0,
    patchesTruncated: false,
    dirtyPathIds: new Set(),
    dirtyAllReason: undefined,
  }

  const ctx: StateTxnContext<S> = {
    config: {
      instrumentation,
      captureSnapshots,
      now: config.now ?? defaultNow,
      moduleId: config.moduleId,
      instanceId: config.instanceId,
      getFieldPathIdRegistry: config.getFieldPathIdRegistry,
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
    _traitNodeId?: string,
    _stepId?: number,
  ): void => {
    const state = ctx.current
    if (!state) return
    state.patchCount += 1
    resolveAndRecordDirtyPathId(state, path, _reason)
  }

  const MAX_PATCHES_FULL = 256

  const recordPatchFull = (
    path: StatePatchPath | undefined,
    reason: PatchReason,
    from?: unknown,
    to?: unknown,
    traitNodeId?: string,
    stepId?: number,
  ): void => {
    const state = ctx.current
    if (!state) return
    state.patchCount += 1
    const opSeq = state.patchCount - 1
    const pathId = resolveAndRecordDirtyPathId(state, path, reason)
    if (state.patchesTruncated || state.patches.length >= MAX_PATCHES_FULL) {
      state.patchesTruncated = true
      return
    }
    state.patches.push({
      opSeq,
      ...(pathId != null ? { pathId } : null),
      ...(from !== undefined ? { from } : null),
      ...(to !== undefined ? { to } : null),
      reason: normalizePatchReason(reason),
      ...(traitNodeId ? { traitNodeId } : null),
      ...(typeof stepId === 'number' && Number.isFinite(stepId) && stepId >= 0 ? { stepId: Math.floor(stepId) } : null),
    })
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
  state.patches.length = 0
  state.patchCount = 0
  state.patchesTruncated = false
  state.fieldPathIdRegistry = ctx.config.getFieldPathIdRegistry?.()
  state.dirtyPathIds.clear()
  state.dirtyAllReason = undefined
  ctx.current = state
}

const resolveAndRecordDirtyPathId = <S>(
  state: StateTxnState<S>,
  path: StatePatchPath | undefined,
  reason: PatchReason,
): FieldPathId | undefined => {
  if (state.dirtyAllReason) return undefined

  if (path === undefined) {
    state.dirtyAllReason = 'customMutation'
    return undefined
  }

  if (path === '*') {
    state.dirtyAllReason = 'unknownWrite'
    return undefined
  }

  const registry = state.fieldPathIdRegistry
  if (!registry) {
    state.dirtyAllReason = reason === 'reducer' ? 'customMutation' : 'fallbackPolicy'
    return undefined
  }

  let id: FieldPathId | undefined

  if (typeof path === 'number') {
    if (!Number.isFinite(path)) {
      state.dirtyAllReason = 'nonTrackablePatch'
      return undefined
    }
    const n = Math.floor(path)
    if (n < 0) {
      state.dirtyAllReason = 'nonTrackablePatch'
      return undefined
    }
    if (!registry.fieldPaths[n]) {
      state.dirtyAllReason = 'fallbackPolicy'
      return undefined
    }
    id = n
  } else if (typeof path === 'string') {
    const direct = registry.pathStringToId?.get(path)
    if (direct == null) {
      state.dirtyAllReason = 'fallbackPolicy'
      return undefined
    }
    id = direct
  } else {
    const normalized = normalizeFieldPath(path)
    if (!normalized) {
      state.dirtyAllReason = 'nonTrackablePatch'
      return undefined
    }

    const next = getFieldPathId(registry, normalized)
    if (next == null) {
      state.dirtyAllReason = 'fallbackPolicy'
      return undefined
    }
    id = next
  }

  state.dirtyPathIds.add(id)
  return id
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
  traitNodeId?: string,
  stepId?: number,
): void => {
  ctx.recordPatch(path, reason, from, to, traitNodeId, stepId)
}

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
    const durationMs = Math.max(0, endedAt - state.startedAt)

    const registry = state.fieldPathIdRegistry
    const dirtySet: DirtySet =
      registry == null
        ? {
            dirtyAll: true,
            reason: state.dirtyAllReason ?? 'fallbackPolicy',
            rootIds: [],
            rootCount: 0,
            keySize: 0,
            keyHash: 0,
          }
        : dirtyPathsToRootIds({
            dirtyPaths: state.dirtyPathIds,
            registry,
            dirtyAllReason: state.dirtyAllReason,
          })

    const transaction: StateTransaction<S> = {
      txnId: state.txnId,
      txnSeq: state.txnSeq,
      origin: state.origin,
      startedAt: state.startedAt,
      endedAt,
      durationMs,
      dirtySet,
      patchCount: state.patchCount,
      patchesTruncated: state.patchesTruncated,
      ...(state.patchesTruncated ? { patchesTruncatedReason: 'max_patches' } : null),
      initialStateSnapshot: state.initialStateSnapshot,
      finalStateSnapshot: config.captureSnapshots ? finalState : undefined,
      patches: ctx.config.instrumentation === 'full' ? state.patches.slice() : [],
      moduleId: config.moduleId,
      instanceId: config.instanceId,
    }

    // Clear the current transaction.
    ctx.current = undefined

    return transaction
  })

/**
 * abort：
 * - Terminates the current transaction and clears context.
 * - Does not write to stateRef.
 * - Higher layers decide whether to record diagnostics/observability events.
 */
export const abort = <S>(ctx: StateTxnContext<S>): void => {
  ctx.current = undefined
}
