import { Effect, PubSub } from 'effect'
import type { StateChangeWithMeta, StateCommitMeta, StateCommitMode, StateCommitPriority } from './module.js'
import type { FieldPathIdRegistry } from '../../field-path.js'
import * as Debug from './DebugSink.js'
import * as RowId from '../../field-kernel/rowid.js'
import type * as StateTransaction from './StateTransaction.js'
import type { FieldRuntimeAccess } from './ModuleRuntime.transaction.js'

export type TxnPostCommitPhaseTiming = {
  readonly totalMs: number
  readonly rowIdSyncMs: number
  readonly publishCommitMs: number
  readonly stateUpdateDebugRecordMs: number
  readonly onCommitBeforeStateUpdateMs: number
  readonly onCommitAfterStateUpdateMs: number
}

export const readClockMs = (): number => {
  const perf = globalThis.performance
  if (perf && typeof perf.now === 'function') {
    return perf.now()
  }
  return Date.now()
}

export const runPostCommitPhases = <S>(args: {
  readonly moduleId: string | undefined
  readonly instanceId: string
  readonly isDevEnv: () => boolean
  readonly txnContext: StateTransaction.StateTxnContext<S>
  readonly txnHistory: {
    readonly buffer: Array<StateTransaction.StateTransaction<S> | undefined>
    start: number
    size: number
    readonly capacity: number
  }
  readonly txnById: Map<string, StateTransaction.StateTransaction<S>>
  readonly fieldRuntime: FieldRuntimeAccess
  readonly commitHub: PubSub.PubSub<StateChangeWithMeta<S>>
  readonly shouldPublishCommitHub?: () => boolean
  readonly onCommit?: (args: {
    readonly state: S
    readonly meta: StateCommitMeta
    readonly transaction: StateTransaction.StateTransaction<S>
    readonly diagnosticsLevel: Debug.DiagnosticsLevel
  }) => Effect.Effect<void>
  readonly txn: StateTransaction.StateTransaction<S>
  readonly nextState: S
  readonly replayEvent: unknown
  readonly commitMode: StateCommitMode
  readonly priority: StateCommitPriority
  readonly fieldPathIdRegistry: FieldPathIdRegistry | undefined
  readonly dirtyAllSetStateHint: boolean
  readonly fieldSummary: unknown
  readonly phaseTimingEnabled: boolean
}): Effect.Effect<TxnPostCommitPhaseTiming | undefined> =>
  Effect.gen(function* () {
    const {
      moduleId,
      instanceId,
      isDevEnv,
      txnContext,
      txnHistory,
      txnById,
      fieldRuntime,
      commitHub,
      shouldPublishCommitHub,
      onCommit,
      txn,
      nextState,
      replayEvent,
      commitMode,
      priority,
      fieldPathIdRegistry,
      dirtyAllSetStateHint,
      fieldSummary,
      phaseTimingEnabled,
    } = args
    const phaseStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
    let rowIdSyncMs = 0
    let publishCommitMs = 0
    let stateUpdateDebugRecordMs = 0
    let onCommitBeforeStateUpdateMs = 0
    let onCommitAfterStateUpdateMs = 0
    const shouldWarnDirtyAllSetState = dirtyAllSetStateHint || (txn.origin.kind === 'state' && txn.origin.name === 'setState')

    if (shouldWarnDirtyAllSetState && isDevEnv() && txn.dirty.dirtyAll === true) {
      yield* Debug.record({
        type: 'diagnostic',
        moduleId,
        instanceId,
        txnSeq: txn.txnSeq,
        txnId: txn.txnId,
        trigger: txn.origin,
        code: 'state_transaction::dirty_all_fallback',
        severity: 'warning',
        message: 'setState/state.update did not provide field-level dirty-set evidence; falling back to dirtyAll scheduling.',
        hint: 'Prefer $.state.mutate(...) or Logix.Module.Reducer.mutate(...) to produce field-level patchPaths; otherwise converge/validate degrades to full-path scheduling.',
        kind: 'dirty_all_fallback:set_state',
      })
    }

    if (isDevEnv() || txnContext.config.instrumentation === 'full') {
      txnById.set(txn.txnId, txn)
      const cap = txnHistory.capacity
      if (cap > 0) {
        const buf = txnHistory.buffer
        if (txnHistory.size < cap) {
          buf[(txnHistory.start + txnHistory.size) % cap] = txn
          txnHistory.size += 1
        } else {
          const evicted = buf[txnHistory.start]
          buf[txnHistory.start] = txn
          txnHistory.start = (txnHistory.start + 1) % cap
          if (evicted) {
            txnById.delete(evicted.txnId)
          }
        }
      }
    }

    const listConfigs = fieldRuntime.getListConfigs()
    if (listConfigs.length > 0) {
      const rowIdSyncStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
      const shouldSyncRowIds = RowId.shouldReconcileListConfigsByDirtyEvidence({
        dirty: txn.dirty,
        listConfigs,
        fieldPathIdRegistry,
      })
      if (shouldSyncRowIds) {
        fieldRuntime.rowIdStore.updateAll(nextState as any, listConfigs)
      }
      if (phaseTimingEnabled) {
        rowIdSyncMs = Math.max(0, readClockMs() - rowIdSyncStartedAtMs)
      }
    }

    const meta: StateCommitMeta = {
      txnSeq: txn.txnSeq,
      txnId: txn.txnId,
      commitMode,
      priority,
      originKind: txn.origin.kind,
      originName: txn.origin.name,
    }

    if (shouldPublishCommitHub?.() ?? true) {
      const publishCommitStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
      yield* PubSub.publish(commitHub, {
        value: nextState,
        meta,
      })
      if (phaseTimingEnabled) {
        publishCommitMs = Math.max(0, readClockMs() - publishCommitStartedAtMs)
      }
    }

    const diagnosticsLevel = yield* Effect.service(Debug.currentDiagnosticsLevel).pipe(Effect.orDie)
    let shouldCommitBeforeStateUpdate = false
    if (onCommit) {
      if (diagnosticsLevel === 'off') {
        shouldCommitBeforeStateUpdate = true
      } else {
        const traceMode = yield* Effect.service(Debug.currentTraceMode).pipe(Effect.orDie)
        shouldCommitBeforeStateUpdate = traceMode === 'off'
      }
    }

    if (onCommit && shouldCommitBeforeStateUpdate) {
      const onCommitStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
      yield* onCommit({
        state: nextState,
        meta,
        transaction: txn,
        diagnosticsLevel,
      })
      if (phaseTimingEnabled) {
        onCommitBeforeStateUpdateMs = Math.max(0, readClockMs() - onCommitStartedAtMs)
      }
    }

    const debugSinks = yield* Effect.service(Debug.currentDebugSinks).pipe(Effect.orDie)
    const shouldRecordStateUpdate =
      diagnosticsLevel !== 'off' && debugSinks.length > 0 && !Debug.isErrorOnlyOnlySinks(debugSinks)

    if (shouldRecordStateUpdate) {
      const stateUpdateDebugRecordStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
      const shouldComputeEvidence = true

      const staticIrDigest = shouldComputeEvidence ? fieldRuntime.getConvergeStaticIrDigest() : undefined

      const dirtySetEvidence = shouldComputeEvidence
        ? (() => {
            const pathIdsTopK = diagnosticsLevel === 'full' ? 32 : 3

            if (txn.dirty.dirtyAll) {
              return {
                dirtyAll: true,
                reason: txn.dirty.dirtyAllReason ?? 'unknownWrite',
                pathIds: [],
                pathCount: 0,
                keySize: 0,
                keyHash: 0,
                pathIdsTruncated: false,
              }
            }

            const fullPathIds = txn.dirty.dirtyPathIds
            const topK = fullPathIds.slice(0, pathIdsTopK)
            return {
              dirtyAll: false,
              pathIds: topK,
              pathCount: fullPathIds.length,
              keySize: txn.dirty.dirtyPathsKeySize,
              keyHash: txn.dirty.dirtyPathsKeyHash,
              pathIdsTruncated: fullPathIds.length > pathIdsTopK,
            }
          })()
        : undefined

      yield* Debug.record({
        type: 'state:update',
        moduleId,
        state: nextState,
        instanceId,
        txnSeq: txn.txnSeq,
        txnId: txn.txnId,
        staticIrDigest,
        dirtySet: dirtySetEvidence,
        patchCount: txn.patchCount,
        patchesTruncated: txn.patchesTruncated,
        ...(txn.patchesTruncated ? { patchesTruncatedReason: txn.patchesTruncatedReason } : null),
        commitMode,
        priority,
        originKind: txn.origin.kind,
        originName: txn.origin.name,
        fieldSummary,
        replayEvent: replayEvent as any,
      })
      if (phaseTimingEnabled) {
        stateUpdateDebugRecordMs = Math.max(0, readClockMs() - stateUpdateDebugRecordStartedAtMs)
      }
    }

    if (onCommit && !shouldCommitBeforeStateUpdate) {
      const onCommitStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
      yield* onCommit({
        state: nextState,
        meta,
        transaction: txn,
        diagnosticsLevel,
      })
      if (phaseTimingEnabled) {
        onCommitAfterStateUpdateMs = Math.max(0, readClockMs() - onCommitStartedAtMs)
      }
    }

    return phaseTimingEnabled
      ? {
          totalMs: Math.max(0, readClockMs() - phaseStartedAtMs),
          rowIdSyncMs,
          publishCommitMs,
          stateUpdateDebugRecordMs,
          onCommitBeforeStateUpdateMs,
          onCommitAfterStateUpdateMs,
        }
      : undefined
  })
