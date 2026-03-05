import { Cause, Effect, Exit, Fiber, FiberRef, Option, PubSub, Queue, SubscriptionRef } from 'effect'
import type { StateChangeWithMeta, StateCommitMeta, StateCommitMode, StateCommitPriority } from './module.js'
import type {
  StateTraitProgram,
  TraitConvergeGenerationEvidence,
  TraitConvergePlanCacheEvidence,
} from '../../state-trait/model.js'
import type { DirtyAllReason, DirtySet, FieldPathIdRegistry } from '../../field-path.js'
import * as Debug from './DebugSink.js'
import * as StateTransaction from './StateTransaction.js'
import * as TaskRunner from './TaskRunner.js'
import * as StateTraitConverge from '../../state-trait/converge.js'
import * as StateTraitValidate from '../../state-trait/validate.js'
import * as StateTraitSource from '../../state-trait/source.js'
import * as RowId from '../../state-trait/rowid.js'
import type { RunOperation } from './ModuleRuntime.operation.js'
import type { ResolvedTraitConvergeConfig } from './ModuleRuntime.traitConvergeConfig.js'
import type { CapturedTxnRuntimeScope, EnqueueTransaction } from './ModuleRuntime.txnQueue.js'
import { StateTransactionOverridesTag, type StateTransactionOverrides } from './env.js'

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
  traitNodeId?: string,
  stepId?: number,
) => Effect.Effect<void>

export type TraitRuntimeAccess = {
  readonly getProgram: () => StateTraitProgram<any> | undefined
  readonly getConvergeStaticIrDigest: () => string | undefined
  readonly getConvergePlanCache: () => StateTraitConverge.ConvergePlanCache | undefined
  readonly getConvergeGeneration: () => TraitConvergeGenerationEvidence
  readonly getPendingCacheMissReason: () => TraitConvergePlanCacheEvidence['missReason'] | undefined
  readonly getPendingCacheMissReasonCount: () => number
  readonly setPendingCacheMissReason: (next: TraitConvergePlanCacheEvidence['missReason'] | undefined) => void
  readonly rowIdStore: RowId.RowIdStore
  readonly getListConfigs: () => ReadonlyArray<RowId.ListConfig>
}

export type TraitConvergeTimeSlicingState = {
  readonly signal: Queue.Queue<void>
  readonly backlogDirtyPaths: Set<StateTransaction.StatePatchPath>
  backlogDirtyAllReason?: DirtyAllReason
  firstPendingAtMs: number | undefined
  lastTouchedAtMs: number | undefined
  latestConvergeConfig: ResolvedTraitConvergeConfig | undefined
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
    traitNodeId?: string,
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
  readonly traitConvergeTimeSlicing: TraitConvergeTimeSlicingState
  readonly traitRuntime: TraitRuntimeAccess
  readonly resolveTraitConvergeConfig: () => Effect.Effect<ResolvedTraitConvergeConfig, never, never>
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
    traitConvergeTimeSlicing,
    traitRuntime,
    resolveTraitConvergeConfig,
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
    const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
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
    readonly traitSummary: unknown
  }): Effect.Effect<void> =>
    Effect.gen(function* () {
      const {
        txn,
        nextState,
        replayEvent,
        commitMode,
        priority,
        fieldPathIdRegistry,
        dirtyAllSetStateHint,
        traitSummary,
      } = args
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
      const listConfigs = traitRuntime.getListConfigs()
      if (listConfigs.length > 0) {
        const shouldSyncRowIds = RowId.shouldReconcileListConfigsByDirtyEvidence({
          dirty: txn.dirty,
          listConfigs,
          fieldPathIdRegistry,
        })
        if (shouldSyncRowIds) {
          traitRuntime.rowIdStore.updateAll(nextState as any, listConfigs)
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
      yield* PubSub.publish(commitHub, {
        value: nextState,
        meta,
      })

      // Perf-sensitive ordering:
      // - In diagnostics=off mode (default for production/perf runs), allow selectorGraph notifications to be published
      //   before state:update debug recording so React external store subscribers can start flushing earlier.
      // - When traceMode=off (production default), treat it as a perf mode even under diagnostics=light/full:
      //   publish onCommit before state:update so TickScheduler can schedule the tick flush earlier (yieldMicrotask),
      //   reducing end-to-end latency and full/off variance on externalStore ingest workloads.
      // - When traceMode=on, keep the original ordering so any selector eval trace stays after state:update
      //   (preserves a more intuitive txn → selector → render causal chain in devtools).
      const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
      let shouldCommitBeforeStateUpdate = false
      if (onCommit) {
        if (diagnosticsLevel === 'off') {
          shouldCommitBeforeStateUpdate = true
        } else {
          const traceMode = yield* FiberRef.get(Debug.currentTraceMode)
          shouldCommitBeforeStateUpdate = traceMode === 'off'
        }
      }

      if (onCommit && shouldCommitBeforeStateUpdate) {
        yield* onCommit({
          state: nextState,
          meta,
          transaction: txn,
          diagnosticsLevel,
        })
      }

      const debugSinks = yield* FiberRef.get(Debug.currentDebugSinks)
      const shouldRecordStateUpdate = debugSinks.length > 0 && !Debug.isErrorOnlyOnlySinks(debugSinks)

      if (shouldRecordStateUpdate) {
        const shouldComputeEvidence = diagnosticsLevel !== 'off'

        const staticIrDigest = shouldComputeEvidence ? traitRuntime.getConvergeStaticIrDigest() : undefined

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
          traitSummary,
          replayEvent: replayEvent as any,
        })
      }

      if (onCommit && !shouldCommitBeforeStateUpdate) {
        yield* onCommit({
          state: nextState,
          meta,
          transaction: txn,
          diagnosticsLevel,
        })
      }
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
    Effect.locally(
      TaskRunner.inSyncTransactionFiber,
      true,
    )(
      Effect.gen(function* () {
        const baseState = yield* SubscriptionRef.get(stateRef)

        StateTransaction.beginTransaction(txnContext, origin, baseState)
        const txnCurrent: any = txnContext.current
        txnCurrent.stateTraitValidateRequests = []
        txnCurrent.commitMode = 'normal' as StateCommitMode
        txnCurrent.priority = 'normal' as StateCommitPriority

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
            Effect.locally(
              Debug.currentTxnId,
              txnId,
            )(
              Effect.gen(function* () {
                // Trait summary inside the transaction window (for devtools/diagnostics).
                let traitSummary: unknown | undefined

                // Execute logic inside the transaction window (reducer / watcher writeback / traits, etc.).
                // Contract: no IO/await/sleep/promises inside the transaction window.
                //
                // Fail-fast when async escapes the window (even in production), without blocking on cleanup.
                // - Sync bodies typically finish before/within the first few polls.
                // - Async bodies (sleep/await/IO) suspend and will not complete within the budget.
                // Use daemon fiber to avoid supervision-induced blocking:
                // - An uninterruptible async escape must not block abort/next transaction.
                const bodyFiber = yield* Effect.forkDaemon(body())

                // Tune for perf: production path uses a small budget to keep the fast path cheap,
                // but must still tolerate Effect's cooperative scheduling (especially in browser runs).
                const yieldBudget = 8

                let polled = yield* Fiber.poll(bodyFiber)
                for (let index = 0; index < yieldBudget && Option.isNone(polled); index += 1) {
                  yield* Effect.yieldNow()
                  polled = yield* Fiber.poll(bodyFiber)
                }

                if (Option.isNone(polled)) {
                  // Do not pay diagnostics overhead when DiagnosticsLevel=off (perf default).
                  const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
                  if (diagnosticsLevel !== 'off') {
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

                  // Interrupt without awaiting: uninterruptible async escapes must not block abort/next txn.
                  yield* Fiber.interruptFork(bodyFiber)
                  return yield* Effect.die(makeAsyncEscapeError())
                }

                const bodyExit = Option.getOrThrow(polled)
                yield* Exit.match(bodyExit, {
                  onFailure: (cause) => Effect.failCause(cause),
                  onSuccess: () => Effect.void,
                })

                const stateTraitProgram = traitRuntime.getProgram()

                // StateTrait: converge derived fields (computed/link, etc.) before commit to ensure 0/1 commit per window.
                if (stateTraitProgram && txnContext.current) {
                  const convergeConfig = yield* resolveTraitConvergeConfig()
                  traitConvergeTimeSlicing.latestConvergeConfig = convergeConfig
                  const timeSlicingConfig = convergeConfig.traitConvergeTimeSlicing
                  const isDeferredFlushTxn = origin.kind === 'trait:deferred_flush'
                  const hasDeferredSteps =
                    stateTraitProgram.convergeExecIr != null &&
                    stateTraitProgram.convergeExecIr.topoOrderDeferredInt32.length > 0
                  const canTimeSlice = timeSlicingConfig.enabled === true && hasDeferredSteps
                  const schedulingScope: StateTraitConverge.ConvergeContext<any>['schedulingScope'] = isDeferredFlushTxn
                    ? 'deferred'
                    : canTimeSlice
                      ? 'immediate'
                      : 'all'

                  const deferredSlice = isDeferredFlushTxn ? readDeferredFlushSlice(origin.details) : undefined
                  const deferredScopeStepIds =
                    deferredSlice && stateTraitProgram.convergeExecIr
                      ? stateTraitProgram.convergeExecIr.topoOrderDeferredInt32.subarray(
                          deferredSlice.start,
                          deferredSlice.end,
                        )
                      : undefined

                  const convergeExit = yield* Effect.exit(
                    StateTraitConverge.convergeInTransaction(
                      stateTraitProgram as any,
                      {
                        moduleId: optionsModuleId,
                        instanceId,
                        txnSeq,
                        txnId,
                        configScope: convergeConfig.configScope,
                        now: txnContext.config.now,
                        budgetMs: convergeConfig.traitConvergeBudgetMs,
                        decisionBudgetMs: convergeConfig.traitConvergeDecisionBudgetMs,
                        requestedMode: deferredScopeStepIds ? 'full' : convergeConfig.traitConvergeMode,
                        schedulingScope,
                        ...(deferredScopeStepIds ? { schedulingScopeStepIds: deferredScopeStepIds } : {}),
                        dirtyAllReason: (txnContext.current as any)?.dirtyAllReason,
                        dirtyPaths: txnContext.current?.dirtyPathIds,
                        dirtyPathsKeyHash: (txnContext.current as any)?.dirtyPathIdsKeyHash,
                        dirtyPathsKeySize: (txnContext.current as any)?.dirtyPathIdsKeySize,
                        allowInPlaceDraft:
                          txnContext.current != null &&
                          !Object.is(txnContext.current.draft, txnContext.current.baseState),
	                        planCache: traitRuntime.getConvergePlanCache(),
	                        generation: traitRuntime.getConvergeGeneration(),
	                        cacheMissReasonHint: traitRuntime.getPendingCacheMissReason(),
	                        cacheMissReasonHintCount: traitRuntime.getPendingCacheMissReasonCount(),
	                        getDraft: () => txnContext.current!.draft as any,
	                        setDraft: (next) => {
	                          StateTransaction.updateDraft(txnContext, next as any)
	                        },
                        recordPatch: (path, reason, from, to, traitNodeId, stepId) =>
                          recordStatePatch(path, reason, from, to, traitNodeId, stepId),
                      } as StateTraitConverge.ConvergeContext<any>,
                    ),
                  )

                  if (traitRuntime.getPendingCacheMissReason() === 'generation_bumped') {
                    traitRuntime.setPendingCacheMissReason(undefined)
                  }

                  if (convergeExit._tag === 'Failure') {
                    const errors = [...Cause.failures(convergeExit.cause), ...Cause.defects(convergeExit.cause)]
                    const configError = errors.find(
                      (err): err is StateTraitConverge.StateTraitConfigError =>
                        err instanceof StateTraitConverge.StateTraitConfigError,
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
                        code: 'state_trait::config_error',
                        severity: 'error',
                        message: configError.message,
                        hint:
                          configError.code === 'CYCLE_DETECTED'
                            ? `computed/link graph has a cycle: ${fields.join(', ')}`
                            : `multiple writers detected for the same field: ${fields.join(', ')}`,
                        kind: `state_trait_config_error:${configError.code}`,
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
                    traitConvergeTimeSlicing.firstPendingAtMs = traitConvergeTimeSlicing.firstPendingAtMs ?? nowMs
                    traitConvergeTimeSlicing.lastTouchedAtMs = nowMs

                    if (dirtyAllReasonForDeferred != null) {
                      traitConvergeTimeSlicing.backlogDirtyAllReason = dirtyAllReasonForDeferred
                      traitConvergeTimeSlicing.backlogDirtyPaths.clear()
                    } else if (!traitConvergeTimeSlicing.backlogDirtyAllReason && dirtyPathIdsForDeferred) {
                      for (const p of dirtyPathIdsForDeferred) {
                        traitConvergeTimeSlicing.backlogDirtyPaths.add(p)
                      }
                    }

                    const runtimeLabel = yield* FiberRef.get(Debug.currentRuntimeLabel)
                    const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
                    const debugSinks = yield* FiberRef.get(Debug.currentDebugSinks)
                    const overridesOpt = yield* Effect.serviceOption(StateTransactionOverridesTag)
                    const overrides = Option.isSome(overridesOpt) ? overridesOpt.value : undefined

                    traitConvergeTimeSlicing.capturedContext = {
                      runtimeLabel,
                      diagnosticsLevel,
                      debugSinks,
                      overrides,
                    }

                    yield* Queue.offer(traitConvergeTimeSlicing.signal, undefined)
                  }

                  traitSummary = outcome.decision ? { converge: outcome.decision } : undefined

                  if (outcome._tag === 'Degraded') {
                    yield* Debug.record({
                      type: 'diagnostic',
                      moduleId: optionsModuleId,
                      instanceId,
                      txnSeq,
                      code: outcome.reason === 'budget_exceeded' ? 'trait::budget_exceeded' : 'trait::runtime_error',
                      severity: 'warning',
                      message:
                        outcome.reason === 'budget_exceeded'
                          ? 'Trait converge exceeded budget; derived fields are frozen for this operation window.'
                          : 'Trait converge failed at runtime; derived fields are frozen for this operation window.',
                      hint:
                        outcome.reason === 'budget_exceeded'
                          ? 'Check whether computed/check contains heavy computation; move it to source/task or split into cacheable derived pieces.'
                          : 'Check computed/link/check for invalid inputs or impure logic; add equals or guards if needed.',
                      kind: 'trait_degraded',
                    })
                  }
                }

                // TraitLifecycle scoped validate: flush after converge so validation reads the latest derived state.
                if (stateTraitProgram && txnContext.current) {
                  const dedupeScopedValidateRequests = (
                    requests: ReadonlyArray<StateTraitValidate.ScopedValidateRequest>,
                  ): ReadonlyArray<StateTraitValidate.ScopedValidateRequest> => {
                    if (requests.length <= 1) return requests

                    const priorities: Record<StateTraitValidate.ValidateMode, number> = {
                      submit: 4,
                      blur: 3,
                      valueChange: 2,
                      manual: 1,
                    }

                    let bestMode: StateTraitValidate.ValidateMode = 'manual'
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

                    const makeKey = (target: StateTraitValidate.ValidateTarget): string => {
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
                    const byKey = new Map<string, StateTraitValidate.ScopedValidateRequest>()

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

                  const pending = (txnContext.current as any).stateTraitValidateRequests as
                    | ReadonlyArray<StateTraitValidate.ScopedValidateRequest>
                    | undefined

                  if (pending && pending.length > 0) {
                    const deduped = dedupeScopedValidateRequests(pending)
                    yield* StateTraitValidate.validateInTransaction(
	                      stateTraitProgram as any,
	                      {
	                        moduleId: optionsModuleId,
	                        instanceId,
	                        txnSeq: txnContext.current!.txnSeq,
	                        txnId: txnContext.current!.txnId,
	                        origin: txnContext.current!.origin,
	                        rowIdStore: traitRuntime.rowIdStore,
	                        listConfigs: traitRuntime.getListConfigs(),
	                        txnDirtyEvidence: StateTransaction.readDirtyEvidence(txnContext),
	                        getDraft: () => txnContext.current!.draft as any,
	                        setDraft: (next) => {
	                          StateTransaction.updateDraft(txnContext, next as any)
	                        },
                        recordPatch: (path, reason, from, to, traitNodeId, stepId) =>
                          recordStatePatch(path, reason, from, to, traitNodeId, stepId),
                      } as StateTraitValidate.ValidateContext<any>,
                      deduped,
                    )
                  }
                }

                // If a source key becomes empty, synchronously recycle it back to idle (avoid tearing / ghost data).
                if (stateTraitProgram && txnContext.current) {
                  yield* StateTraitSource.syncIdleInTransaction(
                    stateTraitProgram as any,
                    {
                      moduleId: optionsModuleId,
                      instanceId,
                      getDraft: () => txnContext.current!.draft as any,
                      setDraft: (next) => {
                        StateTransaction.updateDraft(txnContext, next as any)
                      },
                      recordPatch: (path, reason, from, to, traitNodeId, stepId) =>
                        recordStatePatch(path, reason, from, to, traitNodeId, stepId),
                    } as StateTraitSource.SourceSyncContext<any>,
                  )
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
                    const dirtyAllSetStateHint =
                      txnContext.current != null && (txnContext.current as any)[DIRTY_ALL_SET_STATE_HINT] === true
                    const commitResult = yield* StateTransaction.commitWithState(txnContext, stateRef)

                    if (commitResult) {
                      yield* runPostCommitPhases({
                        txn: commitResult.transaction,
                        nextState: commitResult.finalState,
                        replayEvent,
                        commitMode,
                        priority,
                        fieldPathIdRegistry,
                        dirtyAllSetStateHint,
                        traitSummary,
                      })
                    }
                  }),
                )
              }),
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
      }),
    )

  /**
   * setStateInternal：
   * - Inside an active transaction: only update the draft and record patches (whole-State granularity), without writing to the underlying Ref.
   * - Outside a transaction: keep legacy behavior, write to SubscriptionRef directly and emit a state:update Debug event.
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
    traitNodeId?: string,
    stepId?: number,
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
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

        recordStatePatch(path, reason, from, to, traitNodeId, stepId)

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
                recordStatePatch(path, reason, from, to, traitNodeId, stepId)
              }),
          ),
        ),
      )
    })

  const getExecVmAssemblyEvidence = (): unknown => {
    const digest = traitRuntime.getConvergeStaticIrDigest()
    if (!digest) return undefined
    return {
      convergeStaticIrDigest: digest,
      convergeGeneration: traitRuntime.getConvergeGeneration().generation,
    }
  }

  return {
    readState,
    setStateInternal,
    runWithStateTransaction,
    __logixGetExecVmAssemblyEvidence: getExecVmAssemblyEvidence,
  }
}
