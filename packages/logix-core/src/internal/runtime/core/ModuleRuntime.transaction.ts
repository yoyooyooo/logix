import { Cause, Effect, Exit, Fiber, Option, PubSub, Queue, SubscriptionRef } from 'effect'
import type { StateChangeWithMeta, StateCommitMeta, StateCommitMode, StateCommitPriority } from './module.js'
import type {
  FieldProgram,
  FieldConvergeGenerationEvidence,
  FieldConvergePlanCacheEvidence,
} from '../../field-kernel/model.js'
import type { DirtyAllReason, DirtySet, FieldPathIdRegistry } from '../../field-path.js'
import * as Debug from './DebugSink.js'
import * as StateTransaction from './StateTransaction.js'
import * as TaskRunner from './TaskRunner.js'
import * as FieldKernelConverge from '../../field-kernel/converge.js'
import * as FieldValidate from '../../field-kernel/validate.js'
import * as FieldSource from '../../field-kernel/source.js'
import * as RowId from '../../field-kernel/rowid.js'
import type { RunOperation } from './ModuleRuntime.operation.js'
import type { ResolvedFieldConvergeConfig } from './ModuleRuntime.fieldConvergeConfig.js'
import {
  currentTxnQueuePhaseTiming,
  type CapturedTxnRuntimeScope,
  type EnqueueTransaction,
  type TxnQueuePhaseTiming,
} from './ModuleRuntime.txnQueue.js'
import { StateTransactionOverridesTag, type StateTransactionOverrides } from './env.js'
import { runSyncExitWithServices } from './runner/SyncEffectRunner.js'

const DIRTY_ALL_SET_STATE_HINT = Symbol.for('@logixjs/core/dirtyAllSetStateHint')
const ASYNC_ESCAPE_DIAGNOSTIC_CODE = 'state_transaction::async_escape'
const ASYNC_ESCAPE_MESSAGE = 'Synchronous StateTransaction body escaped the transaction window (async/await detected).'
const ASYNC_ESCAPE_HINT =
  'No IO/await/sleep/promises inside the transaction window; use run*Task (pending → IO → writeback) or move async logic outside the transaction.'
const ASYNC_ESCAPE_KIND = 'async_in_transaction'

const makeAsyncEscapeError = (): Error =>
  Object.assign(new Error(ASYNC_ESCAPE_MESSAGE), {
    code: ASYNC_ESCAPE_DIAGNOSTIC_CODE,
    hint: ASYNC_ESCAPE_HINT,
    kind: ASYNC_ESCAPE_KIND,
  })

const findAsyncEscapeFiber = (cause: unknown): Fiber.Fiber<unknown, unknown> | undefined => {
  const defect = Cause.findDefect(cause as any) as
    | { readonly _tag: 'Success'; readonly success: Fiber.Fiber<unknown, unknown> }
    | { readonly _tag: 'Failure' }

  if (defect?._tag !== 'Success') return undefined
  const value: any = defect.success
  if (typeof value !== 'object' || value == null) return undefined
  return typeof value.id === 'number' && typeof value._yielded === 'function' ? (value as Fiber.Fiber<unknown, unknown>) : undefined
}

const readDeferredFlushSlice = (details: unknown): { readonly start: number; readonly end: number } | undefined => {
  if (!details || typeof details !== 'object') return undefined
  const raw = details as any
  const start = raw.sliceStart
  const end = raw.sliceEnd
  if (typeof start !== 'number' || typeof end !== 'number') return undefined
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined
  const s = Math.floor(start)
  const e = Math.floor(end)
  if (s < 0 || e <= s) return undefined
  return { start: s, end: e }
}

type TxnPostCommitPhaseTiming = {
  readonly totalMs: number
  readonly rowIdSyncMs: number
  readonly publishCommitMs: number
  readonly stateUpdateDebugRecordMs: number
  readonly onCommitBeforeStateUpdateMs: number
  readonly onCommitAfterStateUpdateMs: number
}

type TxnPhaseTraceData = {
  readonly kind: 'txn-phase'
  readonly originKind: string
  readonly originName?: string
  readonly commitMode: StateCommitMode
  readonly priority: StateCommitPriority
  readonly txnPreludeMs: number
  readonly queue?: TxnQueuePhaseTiming
  readonly dispatchActionRecordMs: number
  readonly dispatchActionCommitHubMs: number
  readonly dispatchActionCount: number
  readonly bodyShellMs: number
  readonly asyncEscapeGuardMs: number
  readonly fieldConvergeMs: number
  readonly scopedValidateMs: number
  readonly sourceSyncMs: number
  readonly commit: TxnPostCommitPhaseTiming
}

const readClockMs = (): number => {
  const perf = globalThis.performance
  if (perf && typeof perf.now === "function") {
    return perf.now()
  }
  return Date.now()
}

export type RunWithStateTransaction = <E>(
  origin: StateTransaction.StateTxnOrigin,
  body: () => Effect.Effect<void, E, never>,
) => Effect.Effect<void, E, never>

export type SetStateInternal<S> = (
  next: S,
  path: StateTransaction.StatePatchPath,
  reason: StateTransaction.PatchReason,
  from?: unknown,
  to?: unknown,
  fieldNodeId?: string,
  stepId?: number,
) => Effect.Effect<void>

export type FieldRuntimeAccess = {
  readonly getProgram: () => FieldProgram<any> | undefined
  readonly getConvergeStaticIrDigest: () => string | undefined
  readonly getConvergePlanCache: () => FieldKernelConverge.ConvergePlanCache | undefined
  readonly getConvergeGeneration: () => FieldConvergeGenerationEvidence
  readonly getPendingCacheMissReason: () => FieldConvergePlanCacheEvidence['missReason'] | undefined
  readonly getPendingCacheMissReasonCount: () => number
  readonly setPendingCacheMissReason: (next: FieldConvergePlanCacheEvidence['missReason'] | undefined) => void
  readonly rowIdStore: RowId.RowIdStore
  readonly getListConfigs: () => ReadonlyArray<RowId.ListConfig>
}

export type FieldConvergeTimeSlicingState = {
  readonly signal: Queue.Queue<void>
  readonly backlogDirtyPaths: Set<StateTransaction.StatePatchPath>
  readonly ensureWorkerStarted: () => Effect.Effect<void, never, never>
  backlogDirtyAllReason?: DirtyAllReason
  firstPendingAtMs: number | undefined
  lastTouchedAtMs: number | undefined
  latestConvergeConfig: ResolvedFieldConvergeConfig | undefined
  capturedContext: CapturedTxnRuntimeScope | undefined
}

export const makeTransactionOps = <S>(args: {
  readonly moduleId: string
  readonly optionsModuleId: string | undefined
  readonly instanceId: string
  readonly stateRef: SubscriptionRef.SubscriptionRef<S>
  readonly commitHub: PubSub.PubSub<StateChangeWithMeta<S>>
  readonly shouldPublishCommitHub?: () => boolean
  readonly recordStatePatch: (
    path: StateTransaction.StatePatchPath | undefined,
    reason: StateTransaction.PatchReason,
    from?: unknown,
    to?: unknown,
    fieldNodeId?: string,
    stepId?: number,
  ) => void
  readonly onCommit?: (args: {
    readonly state: S
    readonly meta: StateCommitMeta
    readonly transaction: StateTransaction.StateTransaction<S>
    readonly diagnosticsLevel: Debug.DiagnosticsLevel
  }) => Effect.Effect<void>
  readonly enqueueTransaction: EnqueueTransaction
  readonly runOperation: RunOperation
  readonly txnContext: StateTransaction.StateTxnContext<S>
  readonly fieldConvergeTimeSlicing: FieldConvergeTimeSlicingState
  readonly fieldRuntime: FieldRuntimeAccess
  readonly resolveFieldConvergeConfig: () => Effect.Effect<ResolvedFieldConvergeConfig, never, never>
  readonly isDevEnv: () => boolean
  readonly txnHistory: {
    readonly buffer: Array<StateTransaction.StateTransaction<S> | undefined>
    start: number
    size: number
    readonly capacity: number
  }
  readonly txnById: Map<string, StateTransaction.StateTransaction<S>>
}): {
  readonly readState: Effect.Effect<S>
  readonly setStateInternal: SetStateInternal<S>
  readonly runWithStateTransaction: RunWithStateTransaction
  readonly __logixGetExecVmAssemblyEvidence?: () => unknown
} => {
  const {
    moduleId,
    optionsModuleId,
    instanceId,
    stateRef,
    commitHub,
    shouldPublishCommitHub,
    recordStatePatch,
    onCommit,
    enqueueTransaction,
    runOperation,
    txnContext,
    fieldConvergeTimeSlicing,
    fieldRuntime,
    resolveFieldConvergeConfig,
    isDevEnv,
    txnHistory,
    txnById,
  } = args

  /**
   * Read current state:
   * - If a transaction is active, return the transaction draft.
   * - Otherwise, fall back to the underlying SubscriptionRef snapshot.
   */
  const readState: Effect.Effect<S> = Effect.gen(function* () {
    const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)
    const current = txnContext.current
    if (inTxn && current) return current.draft
    return yield* SubscriptionRef.get(stateRef)
  })

  const runPostCommitPhases = (args: {
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
      const shouldWarnDirtyAllSetState =
        dirtyAllSetStateHint || (txn.origin.kind === 'state' && txn.origin.name === 'setState')

      if (shouldWarnDirtyAllSetState && isDevEnv() && txn.dirty.dirtyAll === true) {
        yield* Debug.record({
          type: 'diagnostic',
          moduleId: optionsModuleId,
          instanceId,
          txnSeq: txn.txnSeq,
          txnId: txn.txnId,
          trigger: txn.origin,
          code: 'state_transaction::dirty_all_fallback',
          severity: 'warning',
          message:
            'setState/state.update did not provide field-level dirty-set evidence; falling back to dirtyAll scheduling.',
          hint: 'Prefer $.state.mutate(...) or Logix.Module.Reducer.mutate(...) to produce field-level patchPaths; otherwise converge/validate degrades to full-path scheduling.',
          kind: 'dirty_all_fallback:set_state',
        })
      }

      // Record txn history: only for dev/test or explicit full instrumentation (devtools/debugging).
      // In production (default light), keep zero retention to avoid turning "txn history" into an implicit memory tax.
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

      // RowID virtual identity layer: align mappings after each observable commit
      // so in-flight gates and cache reuse remain stable under insert/remove/reorder.
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

      // Always publish:
      // - PubSub already optimizes for 0 subscribers.
      // - Skipping here can drop the first commit due to subscription start races (strictGate/process triggers/tests).
      const publishCommitStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
      yield* PubSub.publish(commitHub, {
        value: nextState,
        meta,
      })
      if (phaseTimingEnabled) {
        publishCommitMs = Math.max(0, readClockMs() - publishCommitStartedAtMs)
      }

      // Perf-sensitive ordering:
      // - In diagnostics=off mode (default for production/perf runs), allow selectorGraph notifications to be published
      //   before state:update debug recording so React external store subscribers can start flushing earlier.
      // - When traceMode=off (production default), treat it as a perf mode even under diagnostics=light/full:
      //   publish onCommit before state:update so TickScheduler can schedule the tick flush earlier (yieldMicrotask),
      //   reducing end-to-end latency and full/off variance on externalStore ingest workloads.
      // - When traceMode=on, keep the original ordering so any selector eval trace stays after state:update
      //   (preserves a more intuitive txn → selector → render causal chain in devtools).
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
      const shouldRecordStateUpdate = debugSinks.length > 0 && !Debug.isErrorOnlyOnlySinks(debugSinks)

      if (shouldRecordStateUpdate) {
        const stateUpdateDebugRecordStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
        const shouldComputeEvidence = diagnosticsLevel !== 'off'

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
                // Keep diff anchors (count/hash/size) for the full set; only truncate the pathIds payload.
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
          moduleId: optionsModuleId,
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

  /**
   * runWithStateTransaction：
   * - Open a transaction for a single logic entrypoint (dispatch / source-refresh / future extensions).
   * - Aggregate all state writes within body; at the end commit once and emit a state:update debug event.
   * - The caller must ensure body does not cross long IO boundaries (see the spec constraints on the transaction window).
   */
  const runWithStateTransaction: RunWithStateTransaction = <E2>(
    origin: StateTransaction.StateTxnOrigin,
    body: () => Effect.Effect<void, E2, never>,
  ): Effect.Effect<void, E2, never> =>
    (Effect.provideService(Effect.gen(function* () {
      const txnPreludeStartedAtMs = readClockMs()
      const phaseDiagnosticsLevel = yield* Effect.service(Debug.currentDiagnosticsLevel).pipe(Effect.orDie)
      const phaseTimingEnabled = phaseDiagnosticsLevel !== 'off'
      const queuePhaseTiming = yield* Effect.service(currentTxnQueuePhaseTiming).pipe(Effect.orDie)
      const baseState = yield* SubscriptionRef.get(stateRef)

      StateTransaction.beginTransaction(txnContext, origin, baseState)
      const txnCurrent: any = txnContext.current
      txnCurrent.fieldValidateRequests = []
      txnCurrent.commitMode = 'normal' as StateCommitMode
      txnCurrent.priority = 'normal' as StateCommitPriority
      txnCurrent.dispatchPhaseTimingEnabled = phaseTimingEnabled
      txnCurrent.dispatchActionRecordMs = 0
      txnCurrent.dispatchActionCommitHubMs = 0
      txnCurrent.dispatchActionCount = 0
      const txnPreludeMs = phaseTimingEnabled ? Math.max(0, readClockMs() - txnPreludeStartedAtMs) : 0

      const stateCommitPriority = (origin as any)?.details?.stateCommit?.priority
      if (stateCommitPriority === 'low' || stateCommitPriority === 'normal') {
        txnCurrent.priority = stateCommitPriority as StateCommitPriority
      }
    
      const txnId = txnContext.current?.txnId
      const txnSeq = txnContext.current?.txnSeq
    
      TaskRunner.enterSyncTransactionShadow()
      let exit: Exit.Exit<void, E2> | undefined

      try {
        exit = yield* Effect.exit(
          Effect.provideService(
            Effect.gen(function* () {
              // Field summary inside the transaction window (for devtools/diagnostics).
              let fieldSummary: unknown | undefined
    
              // Execute logic inside the transaction window (reducer / watcher writeback / field updates, etc.).
              // Contract: no IO/await/sleep/promises inside the transaction window.
              //
              // Fail-fast when async escapes the window (even in production), without blocking on cleanup.
              // - Sync bodies typically finish before/within the first few polls.
              // - Async bodies (sleep/await/IO) suspend and will not complete within the budget.
              // Use daemon fiber to avoid supervision-induced blocking:
              // - An uninterruptible async escape must not block abort/next transaction.
              const bodyShellStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
              const asyncEscapeGuardStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
              const currentServices = yield* Effect.services<any>()
              const bodyExit = yield* Effect.sync(
                () => runSyncExitWithServices(body() as Effect.Effect<void, E2, any>, currentServices) as Exit.Exit<void, E2>,
              )
              const asyncEscapeGuardMs = phaseTimingEnabled
                ? Math.max(0, readClockMs() - asyncEscapeGuardStartedAtMs)
                : 0

              if (Exit.isFailure(bodyExit)) {
                const asyncEscapeFiber = findAsyncEscapeFiber(bodyExit.cause)

                if (asyncEscapeFiber) {
                  if (phaseDiagnosticsLevel !== 'off') {
                    yield* Debug.record({
                      type: 'diagnostic',
                      moduleId: optionsModuleId,
                      instanceId,
                      txnSeq,
                      txnId,
                      trigger: origin,
                      code: ASYNC_ESCAPE_DIAGNOSTIC_CODE,
                      severity: 'error',
                      message: ASYNC_ESCAPE_MESSAGE,
                      hint: ASYNC_ESCAPE_HINT,
                      kind: ASYNC_ESCAPE_KIND,
                    })
                  }

                  yield* Fiber.interrupt(asyncEscapeFiber).pipe(Effect.asVoid, Effect.forkDetach({ startImmediately: true }))
                  return yield* Effect.die(makeAsyncEscapeError())
                }

                return yield* Effect.failCause(bodyExit.cause)
              }
              const bodyShellMs = phaseTimingEnabled ? Math.max(0, readClockMs() - bodyShellStartedAtMs) : 0

              const fieldProgram = fieldRuntime.getProgram()
              let fieldConvergeMs = 0
              let scopedValidateMs = 0
              let sourceSyncMs = 0
    
              // Field-kernel: converge derived fields (computed/link, etc.) before commit to ensure 0/1 commit per window.
              if (fieldProgram && txnContext.current) {
                const convergeConfig = yield* resolveFieldConvergeConfig()
                fieldConvergeTimeSlicing.latestConvergeConfig = convergeConfig
                const timeSlicingConfig = convergeConfig.fieldConvergeTimeSlicing
                const isDeferredFlushTxn = origin.kind === 'field:deferred_flush'
                const hasDeferredSteps =
                  fieldProgram.convergeExecIr != null &&
                  fieldProgram.convergeExecIr.topoOrderDeferredInt32.length > 0
                const canTimeSlice = timeSlicingConfig.enabled === true && hasDeferredSteps
                const schedulingScope: FieldKernelConverge.ConvergeContext<any>['schedulingScope'] = isDeferredFlushTxn
                  ? 'deferred'
                  : canTimeSlice
                    ? 'immediate'
                    : 'all'
    
                const deferredSlice = isDeferredFlushTxn ? readDeferredFlushSlice(origin.details) : undefined
                const deferredScopeStepIds =
                  deferredSlice && fieldProgram.convergeExecIr
                    ? fieldProgram.convergeExecIr.topoOrderDeferredInt32.subarray(
                        deferredSlice.start,
                        deferredSlice.end,
                      )
                    : undefined
    
                const fieldConvergeStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
                const convergeExit = yield* Effect.exit(
                  FieldKernelConverge.convergeInTransaction(
                    fieldProgram as any,
                    {
                      moduleId: optionsModuleId,
                      instanceId,
                      txnSeq,
                      txnId,
                      configScope: convergeConfig.configScope,
                      now: txnContext.config.now,
                      budgetMs: convergeConfig.fieldConvergeBudgetMs,
                      decisionBudgetMs: convergeConfig.fieldConvergeDecisionBudgetMs,
                      requestedMode: isDeferredFlushTxn ? 'full' : convergeConfig.fieldConvergeMode,
                      schedulingScope,
                      ...(deferredScopeStepIds ? { schedulingScopeStepIds: deferredScopeStepIds } : {}),
                      dirtyAllReason: (txnContext.current as any)?.dirtyAllReason,
                      dirtyPaths: txnContext.current?.dirtyPathIds,
                      dirtyPathsKeyHash: (txnContext.current as any)?.dirtyPathIdsKeyHash,
                      dirtyPathsKeySize: (txnContext.current as any)?.dirtyPathIdsKeySize,
                      getBaseState: () => txnContext.current!.baseState as any,
                      allowInPlaceDraft:
                        txnContext.current != null &&
                        !Object.is(txnContext.current.draft, txnContext.current.baseState),
    	                        planCache: fieldRuntime.getConvergePlanCache(),
    	                        generation: fieldRuntime.getConvergeGeneration(),
    	                        cacheMissReasonHint: fieldRuntime.getPendingCacheMissReason(),
    	                        cacheMissReasonHintCount: fieldRuntime.getPendingCacheMissReasonCount(),
    	                        getDraft: () => txnContext.current!.draft as any,
    	                        setDraft: (next) => {
    	                          StateTransaction.updateDraft(txnContext, next as any)
    	                        },
                      recordPatch: (path, reason, from, to, fieldNodeId, stepId) =>
                        recordStatePatch(path, reason, from, to, fieldNodeId, stepId),
                    } as FieldKernelConverge.ConvergeContext<any>,
                  ),
                )
                if (phaseTimingEnabled) {
                  fieldConvergeMs = Math.max(0, readClockMs() - fieldConvergeStartedAtMs)
                }
    
                if (fieldRuntime.getPendingCacheMissReason() === 'generation_bumped') {
                  fieldRuntime.setPendingCacheMissReason(undefined)
                }
    
                if (convergeExit._tag === 'Failure') {
                  const errors = convergeExit.cause.reasons
                    .filter((reason) => Cause.isFailReason(reason) || Cause.isDieReason(reason))
                    .map((reason) => (Cause.isFailReason(reason) ? reason.error : reason.defect))
                  const configError = errors.find(
                    (err): err is FieldKernelConverge.FieldKernelConfigError =>
                      err instanceof FieldKernelConverge.FieldKernelConfigError,
                  )
    
                  if (configError) {
                    const fields = configError.fields ?? []
                    yield* Debug.record({
                      type: 'diagnostic',
                      moduleId: optionsModuleId,
                      instanceId,
                      txnSeq,
                      txnId,
                      trigger: origin,
                      code: 'field_kernel::config_error',
                      severity: 'error',
                      message: configError.message,
                      hint:
                        configError.code === 'CYCLE_DETECTED'
                          ? `computed/link graph has a cycle: ${fields.join(', ')}`
                          : `multiple writers detected for the same field: ${fields.join(', ')}`,
                      kind: `field_kernel_config_error:${configError.code}`,
                    })
                  }
    
                  return yield* Effect.failCause(convergeExit.cause)
                }
    
                const outcome = convergeExit.value
    
                const dirtyAllReasonForDeferred: DirtyAllReason | undefined = (txnContext.current as any)?.dirtyAllReason
                const dirtyPathIdsForDeferred: ReadonlySet<StateTransaction.StatePatchPath> | undefined =
                  canTimeSlice && !isDeferredFlushTxn && !dirtyAllReasonForDeferred
                    ? txnContext.current.dirtyPathIds
                    : undefined
    
                if (
                  canTimeSlice &&
                  !isDeferredFlushTxn &&
                  outcome._tag !== 'Degraded' &&
                  (dirtyAllReasonForDeferred != null ||
                    (dirtyPathIdsForDeferred != null && dirtyPathIdsForDeferred.size > 0))
                ) {
                  const nowMs = Date.now()
                  fieldConvergeTimeSlicing.firstPendingAtMs = fieldConvergeTimeSlicing.firstPendingAtMs ?? nowMs
                  fieldConvergeTimeSlicing.lastTouchedAtMs = nowMs
    
                  if (dirtyAllReasonForDeferred != null) {
                    fieldConvergeTimeSlicing.backlogDirtyAllReason = dirtyAllReasonForDeferred
                    fieldConvergeTimeSlicing.backlogDirtyPaths.clear()
                  } else if (!fieldConvergeTimeSlicing.backlogDirtyAllReason && dirtyPathIdsForDeferred) {
                    for (const p of dirtyPathIdsForDeferred) {
                      fieldConvergeTimeSlicing.backlogDirtyPaths.add(p)
                    }
                  }
    
                  const runtimeLabel = yield* Effect.service(Debug.currentRuntimeLabel).pipe(Effect.orDie)
                  const diagnosticsLevel = yield* Effect.service(Debug.currentDiagnosticsLevel).pipe(Effect.orDie)
                  const debugSinks = yield* Effect.service(Debug.currentDebugSinks).pipe(Effect.orDie)
                  const overridesOpt = yield* Effect.serviceOption(StateTransactionOverridesTag)
                  const overrides = Option.isSome(overridesOpt) ? overridesOpt.value : undefined
    
                  fieldConvergeTimeSlicing.capturedContext = {
                    runtimeLabel,
                    diagnosticsLevel,
                    debugSinks,
                    overrides,
                  }
    
                  yield* fieldConvergeTimeSlicing.ensureWorkerStarted()
                }
    
                fieldSummary = outcome.decision ? { converge: outcome.decision } : undefined
    
                if (outcome._tag === 'Degraded') {
                  yield* Debug.record({
                    type: 'diagnostic',
                    moduleId: optionsModuleId,
                    instanceId,
                    txnSeq,
                    code: outcome.reason === 'budget_exceeded' ? 'field::budget_exceeded' : 'field::runtime_error',
                    severity: 'warning',
                    message:
                      outcome.reason === 'budget_exceeded'
                        ? 'Field converge exceeded budget; derived fields are frozen for this operation window.'
                        : 'Field converge failed at runtime; derived fields are frozen for this operation window.',
                    hint:
                      outcome.reason === 'budget_exceeded'
                        ? 'Check whether computed/check contains heavy computation; move it to source/task or split into cacheable derived pieces.'
                        : 'Check computed/link/check for invalid inputs or impure logic; add equals or guards if needed.',
                    kind: 'field_degraded',
                  })
                }
              }
    
              // Field scoped validate: flush after converge so validation reads the latest derived state.
              if (fieldProgram && txnContext.current) {
                const dedupeScopedValidateRequests = (
                  requests: ReadonlyArray<FieldValidate.ScopedValidateRequest>,
                ): ReadonlyArray<FieldValidate.ScopedValidateRequest> => {
                  if (requests.length <= 1) return requests
    
                  const priorities: Record<FieldValidate.ValidateMode, number> = {
                    submit: 4,
                    blur: 3,
                    valueChange: 2,
                    manual: 1,
                  }
    
                  let bestMode: FieldValidate.ValidateMode = 'manual'
                  let bestP = priorities[bestMode]
                  let hasRoot = false
    
                  for (const r of requests) {
                    const p = priorities[r.mode]
                    if (p > bestP) {
                      bestP = p
                      bestMode = r.mode
                    }
                    if (r.target.kind === 'root') {
                      hasRoot = true
                    }
                  }
    
                  if (hasRoot) {
                    return [{ mode: bestMode, target: { kind: 'root' } }]
                  }
    
                  const makeKey = (target: FieldValidate.ValidateTarget): string => {
                    switch (target.kind) {
                      case 'field':
                        return `field:${target.path}`
                      case 'list':
                        return `list:${target.path}`
                      case 'item':
                        return `item:${target.path}:${target.index}:${target.field ?? ''}`
                      case 'root':
                        return 'root'
                    }
                  }
    
                  const order: Array<string> = []
                  const byKey = new Map<string, FieldValidate.ScopedValidateRequest>()
    
                  for (const req of requests) {
                    const key = makeKey(req.target)
                    const existing = byKey.get(key)
                    if (!existing) {
                      byKey.set(key, req)
                      order.push(key)
                      continue
                    }
                    if (priorities[req.mode] > priorities[existing.mode]) {
                      byKey.set(key, { ...existing, mode: req.mode })
                    }
                  }
    
                  return order.map((k) => byKey.get(k)!).filter(Boolean)
                }
    
                const pending = (txnContext.current as any).fieldValidateRequests as
                  | ReadonlyArray<FieldValidate.ScopedValidateRequest>
                  | undefined
    
                if (pending && pending.length > 0) {
                  const scopedValidateStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
                  const deduped = dedupeScopedValidateRequests(pending)
                  yield* FieldValidate.validateInTransaction(
    	                      fieldProgram as any,
    	                      {
    	                        moduleId: optionsModuleId,
    	                        instanceId,
    	                        txnSeq: txnContext.current!.txnSeq,
    	                        txnId: txnContext.current!.txnId,
    	                        origin: txnContext.current!.origin,
    	                        rowIdStore: fieldRuntime.rowIdStore,
    	                        listConfigs: fieldRuntime.getListConfigs(),
    	                        txnDirtyEvidence: StateTransaction.readDirtyEvidence(txnContext),
    	                        getDraft: () => txnContext.current!.draft as any,
    	                        setDraft: (next) => {
    	                          StateTransaction.updateDraft(txnContext, next as any)
    	                        },
                      recordPatch: (path, reason, from, to, fieldNodeId, stepId) =>
                        recordStatePatch(path, reason, from, to, fieldNodeId, stepId),
                    } as FieldValidate.ValidateContext<any>,
                    deduped,
                  )
                  if (phaseTimingEnabled) {
                    scopedValidateMs = Math.max(0, readClockMs() - scopedValidateStartedAtMs)
                  }
                }
              }

              // If a source key becomes empty, synchronously recycle it back to idle (avoid tearing / ghost data).
              if (fieldProgram && txnContext.current) {
                const sourceSyncStartedAtMs = phaseTimingEnabled ? readClockMs() : 0
                yield* FieldSource.syncIdleInTransaction(
                  fieldProgram as any,
                  {
                    moduleId: optionsModuleId,
                    instanceId,
                    getDraft: () => txnContext.current!.draft as any,
                    setDraft: (next) => {
                      StateTransaction.updateDraft(txnContext, next as any)
                    },
                    recordPatch: (path, reason, from, to, fieldNodeId, stepId) =>
                      recordStatePatch(path, reason, from, to, fieldNodeId, stepId),
                  } as FieldSource.SourceSyncContext<any>,
                )
                if (phaseTimingEnabled) {
                  sourceSyncMs = Math.max(0, readClockMs() - sourceSyncStartedAtMs)
                }
              }
    
              // Commit the transaction: write to the underlying state once, and emit a single aggregated state:update event.
              yield* runOperation(
                'state',
                'state:update',
                { meta: { moduleId: optionsModuleId, instanceId } },
                Effect.gen(function* () {
                  const replayEvent = (txnContext.current as any)?.lastReplayEvent as unknown
                  const commitMode = ((txnContext.current as any)?.commitMode ?? 'normal') as StateCommitMode
                  const priority = ((txnContext.current as any)?.priority ?? 'normal') as StateCommitPriority
                  const fieldPathIdRegistry = txnContext.current?.fieldPathIdRegistry
                  const dispatchPhaseTiming =
                    phaseTimingEnabled && txnContext.current
                      ? {
                          dispatchActionRecordMs:
                            typeof (txnContext.current as any).dispatchActionRecordMs === 'number'
                              ? (txnContext.current as any).dispatchActionRecordMs
                              : 0,
                          dispatchActionCommitHubMs:
                            typeof (txnContext.current as any).dispatchActionCommitHubMs === 'number'
                              ? (txnContext.current as any).dispatchActionCommitHubMs
                              : 0,
                          dispatchActionCount:
                            typeof (txnContext.current as any).dispatchActionCount === 'number'
                              ? (txnContext.current as any).dispatchActionCount
                              : 0,
                        }
                      : undefined
                  const dirtyAllSetStateHint =
                    txnContext.current != null && (txnContext.current as any)[DIRTY_ALL_SET_STATE_HINT] === true
                  const commitResult = yield* StateTransaction.commitWithState(txnContext, stateRef)

                  if (commitResult) {
                    const commitPhaseTiming = yield* runPostCommitPhases({
                      txn: commitResult.transaction,
                      nextState: commitResult.finalState,
                      replayEvent,
                      commitMode,
                      priority,
                      fieldPathIdRegistry,
                      dirtyAllSetStateHint,
                      fieldSummary,
                      phaseTimingEnabled,
                    })

                    if (phaseTimingEnabled && commitPhaseTiming) {
                      const trace: TxnPhaseTraceData = {
                        kind: 'txn-phase',
                        originKind: commitResult.transaction.origin.kind,
                        originName: commitResult.transaction.origin.name,
                        commitMode,
                        priority,
                        txnPreludeMs,
                        ...(queuePhaseTiming ? { queue: queuePhaseTiming } : null),
                        dispatchActionRecordMs: dispatchPhaseTiming?.dispatchActionRecordMs ?? 0,
                        dispatchActionCommitHubMs: dispatchPhaseTiming?.dispatchActionCommitHubMs ?? 0,
                        dispatchActionCount: dispatchPhaseTiming?.dispatchActionCount ?? 0,
                        bodyShellMs,
                        asyncEscapeGuardMs,
                        fieldConvergeMs,
                        scopedValidateMs,
                        sourceSyncMs,
                        commit: commitPhaseTiming,
                      }
                      yield* Debug.record({
                        type: 'trace:txn-phase',
                        moduleId: optionsModuleId,
                        instanceId,
                        txnSeq: commitResult.transaction.txnSeq,
                        txnId: commitResult.transaction.txnId,
                        data: trace,
                      })
                    }
                  }
                }),
              )
            }),
            Debug.currentTxnId,
            txnId,
          ),
          )
        } finally {
        TaskRunner.exitSyncTransactionShadow()
      }
    
      if (exit!._tag === 'Failure') {
        // Always clear the transaction context on failure to avoid leaking into subsequent entrypoints.
        StateTransaction.abort(txnContext)
        return yield* Effect.failCause(exit!.cause)
      }
    }), TaskRunner.inSyncTransactionFiber, true) as Effect.Effect<void, E2, never>)

  /**
   * setStateInternal：
   * - Inside an active transaction: only update the draft and record patches (whole-State granularity), without writing to the underlying Ref.
   * - Outside a transaction: keep current default behavior, write to SubscriptionRef directly and emit a state:update Debug event.
   *
   * Notes:
   * - When path="*" and field-level evidence is missing, the transaction attempts a best-effort commit-time inference
   *   (diff baseState -> finalState) to produce field-level dirty evidence. If inference is not possible, it degrades to dirtyAll.
   * - Prefer `$.state.mutate(...)` / `Logix.Module.Reducer.mutate(...)` to produce exact field-level patchPaths.
   * - Perf harness can still force dirtyAll via `recordStatePatch('*', 'perf')` (explicit contract).
   */
  const setStateInternal: SetStateInternal<S> = (
    next: S,
    path: StateTransaction.StatePatchPath,
    reason: StateTransaction.PatchReason,
    from?: unknown,
    to?: unknown,
    fieldNodeId?: string,
    stepId?: number,
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const inTxn = yield* Effect.service(TaskRunner.inSyncTransactionFiber).pipe(Effect.orDie)
      if (inTxn && txnContext.current) {
        const current: any = txnContext.current

        StateTransaction.updateDraft(txnContext, next)
        // Soft dirtyAll hint for `runtime.setState(...)` inside an active transaction:
        // - `setState` is a whole-state write and does not carry field-level dirty evidence by itself.
        // - Advanced callers (perf harness / internal integrators) may provide precise dirty evidence via
        //   `InternalContracts.recordStatePatch(...)` after `setState`.
        // - We must not permanently degrade the txn to dirtyAll before that evidence arrives.
        if (path === '*' && reason === 'unknown') {
          current[DIRTY_ALL_SET_STATE_HINT] = true
          current.inferReplaceEvidence = true
          return
        }

        recordStatePatch(path, reason, from, to, fieldNodeId, stepId)

        if (path === '*') {
          current[DIRTY_ALL_SET_STATE_HINT] = true
        }
        return
      }

      // Writes from non-transaction fibers must be queued to avoid bypassing txnQueue with concurrent updates.
      yield* enqueueTransaction(
        runOperation(
          'state',
          'state:update',
          {
            payload: next,
            meta: { moduleId, instanceId },
          },
          runWithStateTransaction(
            {
              kind: 'state',
              name: 'setState',
            },
            () =>
              Effect.sync(() => {
                // baseState is injected by runWithStateTransaction at txn start; we only need to update the draft here.
                StateTransaction.updateDraft(txnContext, next)
                recordStatePatch(path, reason, from, to, fieldNodeId, stepId)
              }),
          ),
        ),
      )
    })

  const getExecVmAssemblyEvidence = (): unknown => {
    const digest = fieldRuntime.getConvergeStaticIrDigest()
    if (!digest) return undefined
    return {
      convergeStaticIrDigest: digest,
      convergeGeneration: fieldRuntime.getConvergeGeneration().generation,
    }
  }

  return {
    readState,
    setStateInternal,
    runWithStateTransaction,
    __logixGetExecVmAssemblyEvidence: getExecVmAssemblyEvidence,
  }
}
