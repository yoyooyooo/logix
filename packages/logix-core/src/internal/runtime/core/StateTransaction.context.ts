import type { PatchReason } from '../../field-path.js'
import * as Dirty from './StateTransaction.dirty.js'
import * as Patch from './StateTransaction.patch.js'
import type {
  StatePatchPath,
  StateTxnConfig,
  StateTxnContext,
  StateTxnInstrumentationLevel,
  StateTxnState,
} from './StateTransaction.types.js'

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
    dirtyPathsKeyHash: undefined,
    dirtyPathsKeySize: 0,
    dirtyVersion: 0,
    dirtyAllReason: undefined,
    listIndexEvidence: new Map(),
    listItemTouched: new Map(),
    listRootTouched: new Set(),
    listEvidenceVersion: 0,
    dirtyPlanCache: undefined,
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
