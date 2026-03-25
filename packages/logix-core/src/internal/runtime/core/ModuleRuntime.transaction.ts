import { Cause, Context, Effect, Exit, Fiber, FiberRef, Option, PubSub, Queue, Runtime, SubscriptionRef } from 'effect'
import type { StateChangeWithMeta, StateCommitMeta, StateCommitMode, StateCommitPriority } from './module.js'
import type {
  StateTraitProgram,
  TraitConvergeGenerationEvidence,
  TraitConvergePlanCacheEvidence,
} from '../../state-trait/model.js'
import { normalizeFieldPath, type DirtyAllReason, type DirtySet, type FieldPathIdRegistry } from '../../field-path.js'
import * as Debug from './DebugSink.js'
import * as StateTransaction from './StateTransaction.js'
import * as TaskRunner from './TaskRunner.js'
import * as StateTraitConverge from '../../state-trait/converge.js'
import { getMiddlewareStack } from '../../state-trait/converge-step.js'
import { currentExecVmMode } from '../../state-trait/exec-vm-mode.js'
import * as StateTraitValidate from '../../state-trait/validate.js'
import * as StateTraitSource from '../../state-trait/source.js'
import * as RowId from '../../state-trait/rowid.js'
import type { ResolvedConvergeEnv } from '../../state-trait/converge.types.js'
import type * as ReplayLog from './ReplayLog.js'
import type { RunOperation } from './ModuleRuntime.operation.js'
import type { ResolvedTraitConvergeConfig } from './ModuleRuntime.traitConvergeConfig.js'
import type { EnqueueTransaction } from './ModuleRuntime.txnQueue.js'
import { currentTxnQueuePhaseTiming } from './ModuleRuntime.txnQueue.js'
import { RuntimeStoreTag, StateTransactionOverridesTag, TickSchedulerTag, type StateTransactionOverrides } from './env.js'
import type { TxnLanePolicyCacheEntry } from './ModuleRuntime.txnLanePolicy.js'

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

const hasSourceTraits = (program: StateTraitProgram<any> | undefined): boolean =>
  program?.entries.some((entry) => entry.kind === 'source') === true

const runSyncExitWithServices = <A, E>(
  runtime: Runtime.Runtime<any>,
  effect: Effect.Effect<A, E, any>,
  services: Context.Context<any>,
): Exit.Exit<A, E> => Runtime.runSyncExit(runtime, Effect.provide(effect, services) as Effect.Effect<A, E, never>)

const resolveConvergeEnv = (): Effect.Effect<ResolvedConvergeEnv> =>
  Effect.gen(function* () {
    const [middlewareStack, diagnosticsLevel, debugSinks, execVmMode] = yield* Effect.all([
      getMiddlewareStack(),
      FiberRef.get(Debug.currentDiagnosticsLevel),
      FiberRef.get(Debug.currentDebugSinks),
      FiberRef.get(currentExecVmMode),
    ] as const)

    return {
      diagnosticsLevel,
      debugSinks,
      middlewareStack,
      execVmMode,
    }
  })

const stripSyncBodyRunnerDynamicServices = (services: Context.Context<any>): Context.Context<any> =>
  Context.omit(
    StateTransactionOverridesTag,
    RuntimeStoreTag,
    TickSchedulerTag,
    currentTxnQueuePhaseTiming as any,
  )(services as any) as Context.Context<any>

const withSyncBodyRunnerDynamicServices = (
  baseServices: Context.Context<any>,
): Effect.Effect<Context.Context<any>, never, never> =>
  Effect.gen(function* () {
    let nextServices = baseServices

    const overridesOpt = yield* Effect.serviceOption(StateTransactionOverridesTag)
    if (Option.isSome(overridesOpt)) {
      nextServices = Context.add(nextServices, StateTransactionOverridesTag, overridesOpt.value)
    }

    const runtimeStoreOpt = yield* Effect.serviceOption(RuntimeStoreTag)
    if (Option.isSome(runtimeStoreOpt)) {
      nextServices = Context.add(nextServices, RuntimeStoreTag, runtimeStoreOpt.value)
    }

    const tickSchedulerOpt = yield* Effect.serviceOption(TickSchedulerTag)
    if (Option.isSome(tickSchedulerOpt)) {
      nextServices = Context.add(nextServices, TickSchedulerTag, tickSchedulerOpt.value)
    }

    const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
    if (diagnosticsLevel !== 'off') {
      const currentServices = (yield* Effect.context<never>()) as Context.Context<any>
      const queuePhaseTimingOpt = Context.getOption(
        currentServices as any,
        currentTxnQueuePhaseTiming as any,
      ) as Option.Option<unknown>

      if (Option.isSome(queuePhaseTimingOpt) && queuePhaseTimingOpt.value !== undefined) {
        nextServices = Context.add(
          nextServices as any,
          currentTxnQueuePhaseTiming as any,
          queuePhaseTimingOpt.value as any,
        ) as Context.Context<any>
      }
    }

    return nextServices
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readFirstNodeIdFromDirtySet = (dirtySet: unknown): number | undefined => {
  if (!isRecord(dirtySet)) return undefined
  const rootIds = dirtySet.rootIds
  if (!Array.isArray(rootIds)) return undefined
  for (const id of rootIds) {
    if (typeof id === 'number' && Number.isFinite(id) && id >= 0) {
      return Math.floor(id)
    }
  }
  return undefined
}

const findNodeIdByFieldPath = (
  fieldPath: string,
  fieldPathIdRegistry: FieldPathIdRegistry | undefined,
): number | undefined => {
  if (!fieldPathIdRegistry) return undefined

  const direct = fieldPathIdRegistry.pathStringToId?.get(fieldPath)
  if (typeof direct === 'number' && Number.isFinite(direct) && direct >= 0) {
    return Math.floor(direct)
  }

  const normalized = normalizeFieldPath(fieldPath)
  if (!normalized) return undefined

  const canonical = normalized.join('.')
  const normalizedHit = fieldPathIdRegistry.pathStringToId?.get(canonical)
  if (typeof normalizedHit === 'number' && Number.isFinite(normalizedHit) && normalizedHit >= 0) {
    return Math.floor(normalizedHit)
  }

  for (let i = 0; i < fieldPathIdRegistry.fieldPaths.length; i++) {
    const path = fieldPathIdRegistry.fieldPaths[i]
    if (!path || path.length !== normalized.length) continue
    let matched = true
    for (let j = 0; j < path.length; j++) {
      if (path[j] !== normalized[j]) {
        matched = false
        break
      }
    }
    if (matched) return i
  }

  return undefined
}

const enrichReplayEventLookupKey = (args: {
  readonly replayEvent: unknown
  readonly staticIrDigest: string | undefined
  readonly fieldPathIdRegistry: FieldPathIdRegistry | undefined
}): { readonly replayEvent: unknown; readonly lookupKey: ReplayLog.StaticIrLookupKey | undefined } => {
  const { replayEvent, staticIrDigest, fieldPathIdRegistry } = args
  if (!isRecord(replayEvent) || replayEvent._tag !== 'ResourceSnapshot' || !staticIrDigest) {
    return { replayEvent, lookupKey: undefined }
  }

  const existingLookupRaw = replayEvent.lookupKey
  if (isRecord(existingLookupRaw) && typeof existingLookupRaw.staticIrDigest === 'string') {
    return {
      replayEvent,
      lookupKey: {
        staticIrDigest: existingLookupRaw.staticIrDigest,
        ...(typeof existingLookupRaw.nodeId === 'number' && Number.isFinite(existingLookupRaw.nodeId)
          ? { nodeId: Math.floor(existingLookupRaw.nodeId) }
          : null),
        ...(typeof existingLookupRaw.stepId === 'string' && existingLookupRaw.stepId.length > 0
          ? { stepId: existingLookupRaw.stepId }
          : null),
      } satisfies ReplayLog.StaticIrLookupKey,
    }
  }

  const fieldPath = typeof replayEvent.fieldPath === 'string' ? replayEvent.fieldPath : undefined
  if (!fieldPath) return { replayEvent, lookupKey: undefined }

  const nodeId = findNodeIdByFieldPath(fieldPath, fieldPathIdRegistry)
  const lookupKey: ReplayLog.StaticIrLookupKey =
    nodeId !== undefined
      ? { staticIrDigest, nodeId }
      : {
          staticIrDigest,
        }

  return {
    replayEvent: {
      ...(replayEvent as any),
      lookupKey,
    } as ReplayLog.ReplayLogEvent,
    lookupKey,
  }
}

export type RunWithStateTransaction = <E>(
  origin: StateTransaction.StateTxnOrigin,
  body: () => Effect.Effect<void, E, never>,
) => Effect.Effect<void, E, never>

type TxnEntryHotContext = {
  readonly syncBodyRunnerServices: Context.Context<any>
}

export type RunWithStateTransactionContinuationHandle = {
  readonly id: string
  readonly phaseDiagnosticsLevel: Debug.DiagnosticsLevel
  readonly txnEntryHotContext: TxnEntryHotContext
}

export type RunWithStateTransactionWithContinuationHandle = <E>(
  continuationHandle: RunWithStateTransactionContinuationHandle,
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
        readonly policyCache: TxnLanePolicyCacheEntry
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
  readonly shouldRunPostCommitObservation?: () => boolean
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
  readonly captureTxnLanePolicyCache: (args: {
    readonly overrides: StateTransactionOverrides | undefined
    readonly previous: TxnLanePolicyCacheEntry | undefined
  }) => Effect.Effect<TxnLanePolicyCacheEntry, never, never>
  readonly isDevEnv: () => boolean
  readonly maxTxnHistory: number
  readonly txnHistory: Array<StateTransaction.StateTransaction<S>>
  readonly txnById: Map<string, StateTransaction.StateTransaction<S>>
}): {
  readonly readState: Effect.Effect<S>
  readonly setStateInternal: SetStateInternal<S>
  readonly runWithStateTransaction: RunWithStateTransaction
  readonly createRunWithStateTransactionContinuationHandle: () => Effect.Effect<
    RunWithStateTransactionContinuationHandle,
    never,
    never
  >
  readonly runWithStateTransactionWithContinuationHandle: RunWithStateTransactionWithContinuationHandle
  readonly __logixGetExecVmAssemblyEvidence?: () => unknown
} => {
  const {
    moduleId,
    optionsModuleId,
    instanceId,
    stateRef,
    commitHub,
    shouldPublishCommitHub,
    shouldRunPostCommitObservation,
    recordStatePatch,
    onCommit,
    enqueueTransaction,
    runOperation,
    txnContext,
    traitConvergeTimeSlicing,
    traitRuntime,
    resolveTraitConvergeConfig,
    captureTxnLanePolicyCache,
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
    const current = txnContext.current
    if (TaskRunner.isInSyncTransactionShadow() && current) return current.draft

    const inTxn = yield* FiberRef.get(TaskRunner.inSyncTransactionFiber)
    if (inTxn && current) return current.draft
    return yield* SubscriptionRef.get(stateRef)
  })

  let syncBodyRunnerBaseServices: Context.Context<any> | undefined

  const resolveSyncBodyRunnerServices = (): Effect.Effect<Context.Context<any>, never, never> =>
    Effect.gen(function* () {
      if (!syncBodyRunnerBaseServices) {
        const currentServices = (yield* Effect.context<never>()) as Context.Context<any>
        syncBodyRunnerBaseServices = stripSyncBodyRunnerDynamicServices(currentServices)
      }

      return yield* withSyncBodyRunnerDynamicServices(syncBodyRunnerBaseServices)
    })

  let nextTxnContinuationHandleSeq = 0
  const defaultTxnContinuationHandleByDiagnostics = new Map<
    Debug.DiagnosticsLevel,
    RunWithStateTransactionContinuationHandle
  >()
  let sameTickOffTxnContinuationHandle: RunWithStateTransactionContinuationHandle | undefined
  let sameTickOffTxnContinuationResetQueued = false

  const createRunWithStateTransactionContinuationHandle = (): Effect.Effect<
    RunWithStateTransactionContinuationHandle,
    never,
    never
  > =>
    Effect.gen(function* () {
      const phaseDiagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
      const syncBodyRunnerServices = yield* resolveSyncBodyRunnerServices()
      nextTxnContinuationHandleSeq += 1
      return {
        id: `${instanceId}::txncont${nextTxnContinuationHandleSeq}`,
        phaseDiagnosticsLevel,
        txnEntryHotContext: {
          syncBodyRunnerServices,
        },
      }
    })

  const scheduleSameTickOffTxnContinuationReset = (): void => {
    if (sameTickOffTxnContinuationResetQueued) return
    sameTickOffTxnContinuationResetQueued = true
    setTimeout(() => {
      sameTickOffTxnContinuationHandle = undefined
      sameTickOffTxnContinuationResetQueued = false
    }, 0)
  }

  const getOrCreateSameTickTxnContinuationHandle = (): Effect.Effect<
    RunWithStateTransactionContinuationHandle,
    never,
    never
  > => {
    if (sameTickOffTxnContinuationHandle) {
      return Effect.succeed(sameTickOffTxnContinuationHandle)
    }

    return Effect.gen(function* () {
      const phaseDiagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
      const cached = defaultTxnContinuationHandleByDiagnostics.get(phaseDiagnosticsLevel)
      if (cached) {
        if (phaseDiagnosticsLevel === 'off') {
          sameTickOffTxnContinuationHandle = cached
          scheduleSameTickOffTxnContinuationReset()
        }
        return cached
      }

      const created = yield* createRunWithStateTransactionContinuationHandle()
      defaultTxnContinuationHandleByDiagnostics.set(phaseDiagnosticsLevel, created)
      if (phaseDiagnosticsLevel === 'off') {
        sameTickOffTxnContinuationHandle = created
        scheduleSameTickOffTxnContinuationReset()
      }
      return created
    })
  }

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
      const diagnosticsLevel = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
      const shouldEmitDirtyAllFallbackDiagnostic =
        shouldWarnDirtyAllSetState && isDevEnv() && (txn.dirtySet as any)?.dirtyAll === true
      const shouldRetainTxnHistory = isDevEnv() || txnContext.config.instrumentation === 'full'

      if (shouldEmitDirtyAllFallbackDiagnostic) {
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
      if (shouldRetainTxnHistory) {
        txnHistory.push(txn)
        txnById.set(txn.txnId, txn)
        if (txnHistory.length > maxTxnHistory) {
          const oldest = txnHistory.shift()
          if (oldest) {
            txnById.delete(oldest.txnId)
          }
        }
      }

      // RowID virtual identity layer: align mappings after each observable commit
      // so in-flight gates and cache reuse remain stable under insert/remove/reorder.
      const listConfigs = traitRuntime.getListConfigs()
      const shouldSyncRowIds =
        listConfigs.length > 0 &&
        RowId.shouldReconcileListConfigsByDirtySet({
          dirtySet: txn.dirtySet,
          listConfigs,
          fieldPathIdRegistry,
        })
      const shouldPublishCommit = shouldPublishCommitHub ? shouldPublishCommitHub() : true
      const shouldObservePostCommit =
        onCommit != null && (shouldRunPostCommitObservation ? shouldRunPostCommitObservation() : true)
      const debugSinks = yield* FiberRef.get(Debug.currentDebugSinks)
      const shouldRecordStateUpdate = debugSinks.length > 0 && !Debug.isErrorOnlyOnlySinks(debugSinks)

      if (
        diagnosticsLevel === 'off' &&
        !shouldEmitDirtyAllFallbackDiagnostic &&
        !shouldRetainTxnHistory &&
        !shouldSyncRowIds &&
        !shouldPublishCommit &&
        !shouldObservePostCommit &&
        !shouldRecordStateUpdate
      ) {
        return
      }

      if (listConfigs.length > 0) {
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

      if (shouldPublishCommit) {
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
      if (shouldObservePostCommit && diagnosticsLevel === 'off' && onCommit) {
        yield* onCommit({
          state: nextState,
          meta,
          dirtySet: txn.dirtySet,
          diagnosticsLevel,
        })
      }

      if (shouldRecordStateUpdate) {
        const shouldComputeEvidence = diagnosticsLevel !== 'off'

        const staticIrDigest = shouldComputeEvidence ? traitRuntime.getConvergeStaticIrDigest() : undefined

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

        const replayEventWithLookup = shouldComputeEvidence
          ? enrichReplayEventLookupKey({
              replayEvent,
              staticIrDigest,
              fieldPathIdRegistry,
            })
          : { replayEvent, lookupKey: undefined as ReplayLog.StaticIrLookupKey | undefined }

        const fallbackNodeId = readFirstNodeIdFromDirtySet(dirtySetEvidence)

        const traceLookupKey =
          replayEventWithLookup.lookupKey ??
          (shouldComputeEvidence && staticIrDigest
            ? ({
                staticIrDigest,
                ...(fallbackNodeId !== undefined ? { nodeId: fallbackNodeId } : null),
              } satisfies ReplayLog.StaticIrLookupKey)
            : undefined)

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
          traceLookupKey,
          originDetails: txn.origin.details,
          traitSummary,
          replayEvent: replayEventWithLookup.replayEvent as any,
        })
      }

      if (shouldObservePostCommit && diagnosticsLevel !== 'off' && onCommit) {
        yield* onCommit({
          state: nextState,
          meta,
          dirtySet: txn.dirtySet,
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
  const runWithStateTransactionInternal = <E2>(
    origin: StateTransaction.StateTxnOrigin,
    body: () => Effect.Effect<void, E2, never>,
    continuationHandle?: RunWithStateTransactionContinuationHandle,
  ): Effect.Effect<void, E2, never> =>
    Effect.locally(
      TaskRunner.inSyncTransactionFiber,
      true,
    )(
      Effect.gen(function* () {
        const baseState = yield* SubscriptionRef.get(stateRef)

        StateTransaction.beginTransaction(txnContext, origin, baseState)
        const txnCurrent: any = txnContext.current
        txnCurrent.lastReplayEvent = undefined
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

                // Execute logic inside the transaction window (reducer / watcher writeback / traits, etc.).
                // Contract: no long IO/await in the transaction window.
                const diagnosticsLevelAtBody = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
                const runtime = yield* Effect.runtime<never>()
                const currentServices =
                  continuationHandle?.txnEntryHotContext.syncBodyRunnerServices ??
                  (yield* resolveSyncBodyRunnerServices())
                const stateTraitProgramAtBody = traitRuntime.getProgram()
                const shouldPropagateForceSourceRefresh = hasSourceTraits(stateTraitProgramAtBody)
                const forceSourceRefreshAtBody = shouldPropagateForceSourceRefresh
                  ? yield* FiberRef.get(TaskRunner.forceSourceRefresh)
                  : false
                const bodyEffect = shouldPropagateForceSourceRefresh
                  ? Effect.locally(TaskRunner.forceSourceRefresh, forceSourceRefreshAtBody)(
                      body() as Effect.Effect<void, E2, any>,
                    )
                  : (body() as Effect.Effect<void, E2, any>)
                const bodyExit = yield* Effect.sync(() =>
                  runSyncExitWithServices(
                    runtime as Runtime.Runtime<any>,
                    bodyEffect,
                    currentServices as Context.Context<any>,
                  ) as Exit.Exit<void, E2>,
                )

                if (Exit.isFailure(bodyExit)) {
                  const asyncEscapeDefect = [...Cause.defects(bodyExit.cause)].find(Runtime.isAsyncFiberException)

                  if (asyncEscapeDefect) {
                    if (diagnosticsLevelAtBody !== 'off') {
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
                    const asyncEscapeError = makeAsyncEscapeError()
                    yield* Fiber.interruptFork(asyncEscapeDefect.fiber)
                    return yield* Effect.die(asyncEscapeError)
                  }

                  return yield* Effect.failCause(bodyExit.cause)
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
                  const resolvedEnv = yield* resolveConvergeEnv()

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
                        resolvedEnv,
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

                  const dirtyAllReasonForDeferred: DirtyAllReason | undefined = (txnContext.current as any)
                    ?.dirtyAllReason
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
                    const policyCache = yield* captureTxnLanePolicyCache({
                      overrides,
                      previous: traitConvergeTimeSlicing.capturedContext?.policyCache,
                    })

                    traitConvergeTimeSlicing.capturedContext = {
                      runtimeLabel,
                      diagnosticsLevel,
                      debugSinks,
                      overrides,
                      policyCache,
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
          TaskRunner.exitSyncTransaction()
        }

        if (exit!._tag === 'Failure') {
          // Always clear the transaction context on failure to avoid leaking into subsequent entrypoints.
          StateTransaction.abort(txnContext)
          return yield* Effect.failCause(exit!.cause)
        }
      }),
    )

  const runWithStateTransaction: RunWithStateTransaction = <E2>(
    origin: StateTransaction.StateTxnOrigin,
    body: () => Effect.Effect<void, E2, never>,
  ): Effect.Effect<void, E2, never> =>
    Effect.gen(function* () {
      const continuationHandle = yield* getOrCreateSameTickTxnContinuationHandle()
      return yield* runWithStateTransactionInternal(origin, body, continuationHandle)
    })

  const runWithStateTransactionWithContinuationHandle: RunWithStateTransactionWithContinuationHandle = <E2>(
    continuationHandle: RunWithStateTransactionContinuationHandle,
    origin: StateTransaction.StateTxnOrigin,
    body: () => Effect.Effect<void, E2, never>,
  ): Effect.Effect<void, E2, never> => runWithStateTransactionInternal(origin, body, continuationHandle)

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
      if (TaskRunner.isInSyncTransactionShadow() && txnContext.current) {
        const current: any = txnContext.current

        StateTransaction.updateDraft(txnContext, next)
        recordStatePatch(path, reason, from, to, traitNodeId, stepId)

        if (path === '*') {
          current[DIRTY_ALL_SET_STATE_HINT] = true
        }
        return
      }

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
    createRunWithStateTransactionContinuationHandle,
    runWithStateTransactionWithContinuationHandle,
    __logixGetExecVmAssemblyEvidence: getExecVmAssemblyEvidence,
  }
}
