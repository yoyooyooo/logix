import { Cause, Effect, Exit, Fiber, FiberRef, Option, PubSub, Queue, SubscriptionRef } from 'effect'
import type { StateChangeWithMeta, StateCommitMeta, StateCommitMode, StateCommitPriority } from './module.js'
import type {
  StateTraitProgram,
  TraitConvergeGenerationEvidence,
  TraitConvergePlanCacheEvidence,
} from '../../state-trait/model.js'
import type { DirtyAllReason, DirtySet } from '../../field-path.js'
import * as Debug from './DebugSink.js'
import * as StateTransaction from './StateTransaction.js'
import * as TaskRunner from './TaskRunner.js'
import * as StateTraitConverge from '../../state-trait/converge.js'
import * as StateTraitValidate from '../../state-trait/validate.js'
import * as StateTraitSource from '../../state-trait/source.js'
import { getConvergeStaticIrDigest } from '../../state-trait/converge-ir.js'
import type * as RowId from '../../state-trait/rowid.js'
import type { RunOperation } from './ModuleRuntime.operation.js'
import type { ResolvedTraitConvergeConfig } from './ModuleRuntime.traitConvergeConfig.js'
import type { EnqueueTransaction } from './ModuleRuntime.txnQueue.js'
import { StateTransactionOverridesTag, type StateTransactionOverrides } from './env.js'

const DIRTY_ALL_SET_STATE_HINT = Symbol.for('@logix/core/dirtyAllSetStateHint')

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
  readonly getConvergePlanCache: () => StateTraitConverge.ConvergePlanCache | undefined
  readonly getConvergeGeneration: () => TraitConvergeGenerationEvidence
  readonly getPendingCacheMissReason: () => TraitConvergePlanCacheEvidence['missReason'] | undefined
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
  capturedContext:
    | {
        readonly runtimeLabel: string | undefined
        readonly diagnosticsLevel: Debug.DiagnosticsLevel
        readonly debugSinks: ReadonlyArray<Debug.Sink>
        readonly overrides: StateTransactionOverrides | undefined
      }
    | undefined
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
    readonly dirtySet: DirtySet
    readonly diagnosticsLevel: Debug.DiagnosticsLevel
  }) => Effect.Effect<void>
  readonly enqueueTransaction: EnqueueTransaction
  readonly runOperation: RunOperation
  readonly txnContext: StateTransaction.StateTxnContext<S>
  readonly traitConvergeTimeSlicing: TraitConvergeTimeSlicingState
  readonly traitRuntime: TraitRuntimeAccess
  readonly resolveTraitConvergeConfig: () => Effect.Effect<ResolvedTraitConvergeConfig, never, never>
  readonly isDevEnv: () => boolean
  readonly maxTxnHistory: number
  readonly txnHistory: Array<StateTransaction.StateTransaction<S>>
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
    maxTxnHistory,
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

        TaskRunner.enterSyncTransaction()
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

                // Execute the actual logic inside the transaction window (reducer / watcher writeback / traits, etc.).
                if (isDevEnv()) {
                  const bodyFiber = yield* Effect.fork(body())

                  const YIELD_BUDGET = 5
                  let polled = yield* Fiber.poll(bodyFiber)
                  for (let i = 0; i < YIELD_BUDGET && Option.isNone(polled); i++) {
                    yield* Effect.yieldNow()
                    polled = yield* Fiber.poll(bodyFiber)
                  }

                  if (Option.isNone(polled)) {
                    yield* Debug.record({
                      type: 'diagnostic',
                      moduleId: optionsModuleId,
                      instanceId,
                      txnSeq,
                      txnId,
                      trigger: origin,
                      code: 'state_transaction::async_escape',
                      severity: 'error',
                      message:
                        'Synchronous StateTransaction body escaped the transaction window (async/await detected).',
                      hint: 'No IO/await/sleep/promises inside the transaction window; use run*Task (pending → IO → writeback) or move async logic outside the transaction.',
                      kind: 'async_in_transaction',
                    })
                  }

                  const bodyExit = yield* Fiber.await(bodyFiber)
                  yield* Exit.match(bodyExit, {
                    onFailure: (cause) => Effect.failCause(cause),
                    onSuccess: () => Effect.void,
                  })
                } else {
                  yield* body()
                }

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
                        allowInPlaceDraft:
                          txnContext.current != null &&
                          !Object.is(txnContext.current.draft, txnContext.current.baseState),
                        planCache: traitRuntime.getConvergePlanCache(),
                        generation: traitRuntime.getConvergeGeneration(),
                        cacheMissReasonHint: traitRuntime.getPendingCacheMissReason(),
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
                  const dirtyPathsSnapshotForDeferred: ReadonlyArray<StateTransaction.StatePatchPath> | undefined =
                    canTimeSlice && !isDeferredFlushTxn && !dirtyAllReasonForDeferred
                      ? Array.from(txnContext.current.dirtyPathIds)
                      : undefined

                  if (
                    canTimeSlice &&
                    !isDeferredFlushTxn &&
                    outcome._tag !== 'Degraded' &&
                    (dirtyAllReasonForDeferred != null ||
                      (dirtyPathsSnapshotForDeferred != null && dirtyPathsSnapshotForDeferred.length > 0))
                  ) {
                    const nowMs = Date.now()
                    traitConvergeTimeSlicing.firstPendingAtMs = traitConvergeTimeSlicing.firstPendingAtMs ?? nowMs
                    traitConvergeTimeSlicing.lastTouchedAtMs = nowMs

                    if (dirtyAllReasonForDeferred != null) {
                      traitConvergeTimeSlicing.backlogDirtyAllReason = dirtyAllReasonForDeferred
                      traitConvergeTimeSlicing.backlogDirtyPaths.clear()
                    } else if (!traitConvergeTimeSlicing.backlogDirtyAllReason && dirtyPathsSnapshotForDeferred) {
                      for (const p of dirtyPathsSnapshotForDeferred) {
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
                    const dirtyAllSetStateHint = !!(txnContext.current as any)
                      ? (txnContext.current as any)[DIRTY_ALL_SET_STATE_HINT] === true
                      : false
                    const txn = yield* StateTransaction.commit(txnContext, stateRef)

                    if (txn) {
                      const shouldWarnDirtyAllSetState =
                        dirtyAllSetStateHint || (txn.origin.kind === 'state' && txn.origin.name === 'setState')

                      if (shouldWarnDirtyAllSetState && isDevEnv() && (txn.dirtySet as any)?.dirtyAll === true) {
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
                        txnHistory.push(txn)
                        txnById.set(txn.txnId, txn)
                        if (txnHistory.length > maxTxnHistory) {
                          const oldest = txnHistory.shift()
                          if (oldest) {
                            txnById.delete(oldest.txnId)
                          }
                        }
                      }

                      const nextState =
                        txn.finalStateSnapshot !== undefined
                          ? txn.finalStateSnapshot
                          : yield* SubscriptionRef.get(stateRef)

                      // RowID virtual identity layer: align mappings after each observable commit
                      // so in-flight gates and cache reuse remain stable under insert/remove/reorder.
                      const listConfigs = traitRuntime.getListConfigs()
                      if (listConfigs.length > 0) {
                        traitRuntime.rowIdStore.updateAll(nextState as any, listConfigs)
                      }

                      const meta: StateCommitMeta = {
                        txnSeq: txn.txnSeq,
                        txnId: txn.txnId,
                        commitMode,
                        priority,
                        originKind: txn.origin.kind,
                        originName: txn.origin.name,
                      }

                      if (!shouldPublishCommitHub || shouldPublishCommitHub()) {
                        yield* PubSub.publish(commitHub, {
                          value: nextState,
                          meta,
                        })
                      }

                      // Perf-sensitive ordering:
                      // - In diagnostics=off mode (default for production/perf runs), allow selectorGraph notifications to be published
                      //   before state:update debug recording so React external store subscribers can start flushing earlier.
                      // - In diagnostics=light/full, keep the original ordering so any selector eval trace stays after state:update
                      //   (preserves a more intuitive txn → selector → render causal chain in devtools).
                      const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
                      if (onCommit && diagnosticsLevel === 'off') {
                        yield* onCommit({
                          state: nextState,
                          meta,
                          dirtySet: txn.dirtySet,
                          diagnosticsLevel,
                        })
                      }

                      const debugSinks = yield* FiberRef.get(Debug.currentDebugSinks)
                      const shouldRecordStateUpdate = debugSinks.length > 0 && !Debug.isErrorOnlyOnlySinks(debugSinks)

                      if (shouldRecordStateUpdate) {
                        const shouldComputeEvidence = diagnosticsLevel !== 'off'

                        const staticIrDigest = shouldComputeEvidence
                          ? (() => {
                              const convergeIr: any = (stateTraitProgram as any)?.convergeIr
                              if (!convergeIr || convergeIr.configError) return undefined
                              return getConvergeStaticIrDigest(convergeIr)
                            })()
                          : undefined

                        const dirtySetEvidence = shouldComputeEvidence
                          ? (() => {
                              const rootIdsTopK = diagnosticsLevel === 'full' ? 32 : 3

                              if (txn.dirtySet.dirtyAll) {
                                return {
                                  dirtyAll: true,
                                  reason: txn.dirtySet.reason ?? 'unknownWrite',
                                  rootIds: [],
                                  rootCount: 0,
                                  keySize: 0,
                                  keyHash: 0,
                                  rootIdsTruncated: false,
                                }
                              }

                              const fullRootIds = txn.dirtySet.rootIds
                              const topK = fullRootIds.slice(0, rootIdsTopK)
                              return {
                                dirtyAll: false,
                                // Keep diff anchors (count/hash/size) for the full set; only truncate the rootIds payload.
                                rootIds: topK,
                                rootCount: txn.dirtySet.rootCount,
                                keySize: txn.dirtySet.keySize,
                                keyHash: txn.dirtySet.keyHash,
                                rootIdsTruncated: fullRootIds.length > rootIdsTopK,
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

                      if (onCommit && diagnosticsLevel !== 'off') {
                        yield* onCommit({
                          state: nextState,
                          meta,
                          dirtySet: txn.dirtySet,
                          diagnosticsLevel,
                        })
                      }
                    }
                  }),
                )
              }),
            ),
          )
        } finally {
          TaskRunner.exitSyncTransaction()
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
   * - When path="*" and field-level evidence is missing, treat it as a dirtyAll-degrade entrypoint: it triggers full converge/validate paths;
   * - Prefer `$.state.mutate(...)` / `Logix.Module.Reducer.mutate(...)` to produce field-level patchPaths;
   * - Any non-trackable write (including path="*") must explicitly degrade (dirtyAll); do not "ignore *" when roots exist.
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
    const program: any = traitRuntime.getProgram()
    const convergeIr: any = program?.convergeIr
    if (!convergeIr || convergeIr.configError) return undefined

    const digest = getConvergeStaticIrDigest(convergeIr)
    return {
      convergeStaticIrDigest: digest,
      convergeGeneration: convergeIr.generation,
    }
  }

  return {
    readState,
    setStateInternal,
    runWithStateTransaction,
    __logixGetExecVmAssemblyEvidence: getExecVmAssemblyEvidence,
  }
}
