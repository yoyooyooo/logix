import {
  Effect,
  Stream,
  SubscriptionRef,
  PubSub,
  Scope,
  Context,
  Ref,
  FiberRef,
  Option,
  Queue,
  Duration,
  Chunk,
} from 'effect'
import type { LogicPlan, ModuleRuntime as PublicModuleRuntime, StateChangeWithMeta } from './module.js'
import * as Lifecycle from './Lifecycle.js'
import * as Debug from './DebugSink.js'
import { currentConvergeStaticIrCollectors } from './ConvergeStaticIrCollector.js'
import type { RuntimeInternals } from './RuntimeInternals.js'
import type * as ModuleTraits from './ModuleTraits.js'
import * as StateTransaction from './StateTransaction.js'
import * as RuntimeKernel from './RuntimeKernel.js'
import * as FullCutoverGate from './FullCutoverGate.js'
import * as KernelRef from './KernelRef.js'
import * as RuntimeServiceBuiltins from './RuntimeServiceBuiltins.js'
import {
  getDefaultStateTxnInstrumentation,
  isDevEnv,
  ReadQueryStrictGateConfigTag,
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
} from './env.js'
import type {
  StateTransactionInstrumentation,
  StateTransactionOverrides,
  TraitConvergeTimeSlicingPatch,
  TxnLanesPatch,
} from './env.js'
import { normalizeNonEmptyString } from './normalize.js'
import { EvidenceCollectorTag } from '../../observability/evidenceCollector.js'
import * as EffectOp from '../../effect-op.js'
import { makeRunOperation } from './ModuleRuntime.operation.js'
import { makeDispatchOps } from './ModuleRuntime.dispatch.js'
import { makeEffectsRegistry } from './ModuleRuntime.effects.js'
import { makeTransactionOps } from './ModuleRuntime.transaction.js'
import { makeResolveConcurrencyPolicy } from './ModuleRuntime.concurrencyPolicy.js'
import { makeResolveTxnLanePolicy } from './ModuleRuntime.txnLanePolicy.js'
import {
  makeResolveTraitConvergeConfig,
  type ResolvedTraitConvergeConfig,
} from './ModuleRuntime.traitConvergeConfig.js'
import type { DirtyAllReason } from '../../field-path.js'
import * as RowId from '../../state-trait/rowid.js'
import * as StateTraitBuild from '../../state-trait/build.js'
import { exportConvergeStaticIr } from '../../state-trait/converge-ir.js'
import { makeConvergeExecIr } from '../../state-trait/converge-exec-ir.js'
import * as StateTraitConverge from '../../state-trait/converge.js'
import * as StateTraitValidate from '../../state-trait/validate.js'
import { installInternalHooks, type TraitState } from './ModuleRuntime.internalHooks.js'
import { RootContextTag, type RootContext } from './RootContext.js'
import * as ProcessRuntime from './process/ProcessRuntime.js'
import * as ReadQuery from './ReadQuery.js'
import * as SelectorGraph from './SelectorGraph.js'
import {
  getRegisteredRuntime,
  getRuntimeByModuleAndInstance,
  registerRuntime,
  registerRuntimeByInstanceKey,
  unregisterRuntime,
  unregisterRuntimeByInstanceKey,
} from './ModuleRuntime.registry.js'
import { makeEnqueueTransaction } from './ModuleRuntime.txnQueue.js'
import { runModuleLogics } from './ModuleRuntime.logics.js'
import * as ConcurrencyDiagnostics from './ConcurrencyDiagnostics.js'

export { registerRuntime, unregisterRuntime, getRegisteredRuntime, getRuntimeByModuleAndInstance }

export interface ModuleRuntimeOptions<S, A, R = never> {
  readonly tag?: Context.Tag<any, PublicModuleRuntime<S, A>>
  /**
   * List of "child modules" resolvable within the current instance scope (imports-scope):
   * - Used only to build a minimal imports injector (ModuleToken -> ModuleRuntime).
   * - Do not capture the whole Context into ModuleRuntime (avoid accidentally retaining root/base services).
   */
  readonly imports?: ReadonlyArray<Context.Tag<any, PublicModuleRuntime<any, any>>>
  readonly logics?: ReadonlyArray<Effect.Effect<any, any, R> | LogicPlan<any, R, any>>
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly moduleId?: string
  /** Stable instance anchor (single source of truth); defaults to a monotonic sequence. Never default to randomness/time. */
  readonly instanceId?: string
  readonly createState?: Effect.Effect<SubscriptionRef.SubscriptionRef<S>, never, Scope.Scope>
  readonly createActionHub?: Effect.Effect<PubSub.PubSub<A>, never, Scope.Scope>
  /**
   * Primary reducer map: `_tag -> (state, action) => nextState`.
   *
   * - If provided, dispatch will synchronously apply the reducer before publishing the Action.
   * - If a `_tag` has no reducer, behavior matches the current watcher-only mode.
   */
  readonly reducers?: Readonly<
    Record<string, (state: S, action: A, sink?: (path: StateTransaction.StatePatchPath) => void) => S>
  >
  /**
   * Module-level StateTransaction config:
   * - If instrumentation is provided, it takes precedence over the Runtime-level config and NODE_ENV defaults.
   * - Otherwise, fall back to the Runtime-level config (if any) or getDefaultStateTxnInstrumentation().
   */
  readonly stateTransaction?: {
    readonly instrumentation?: StateTransactionInstrumentation
    readonly traitConvergeBudgetMs?: number
    readonly traitConvergeDecisionBudgetMs?: number
    readonly traitConvergeMode?: 'auto' | 'full' | 'dirty'
    readonly traitConvergeTimeSlicing?: TraitConvergeTimeSlicingPatch
    readonly txnLanes?: TxnLanesPatch
  }
}

let nextInstanceSeq = 0

const makeDefaultInstanceId = (): string => {
  nextInstanceSeq += 1
  return `i${nextInstanceSeq}`
}

export const make = <S, A, R = never>(
  initialState: S,
  options: ModuleRuntimeOptions<S, A, R> = {},
): Effect.Effect<PublicModuleRuntime<S, A>, never, Scope.Scope | R> => {
  const program = Effect.gen(function* () {
    const stateRef = options.createState ? yield* options.createState : yield* SubscriptionRef.make(initialState)

    const commitHub = yield* PubSub.unbounded<StateChangeWithMeta<S>>()
    const actionCommitHub = yield* PubSub.unbounded<StateChangeWithMeta<A>>()
    let commitHubSubscriberCount = 0

    const fromCommitHub = Stream.unwrapScoped(
      Effect.gen(function* () {
        commitHubSubscriberCount += 1
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            commitHubSubscriberCount = Math.max(0, commitHubSubscriberCount - 1)
          }),
        )
        return Stream.fromPubSub(commitHub)
      }),
    )

    const moduleId = options.moduleId ?? 'unknown'
    const instanceId = normalizeNonEmptyString(options.instanceId) ?? makeDefaultInstanceId()
    const runtimeLabel = yield* FiberRef.get(Debug.currentRuntimeLabel)
    const lifecycle = yield* Lifecycle.makeLifecycleManager({
      moduleId,
      instanceId,
      runtimeLabel,
    })
    const concurrencyDiagnostics = yield* ConcurrencyDiagnostics.make({
      moduleId: options.moduleId,
      instanceId,
    })

    // Resolve StateTransaction instrumentation:
    // - Prefer ModuleRuntimeOptions.stateTransaction.instrumentation.
    // - Otherwise read the default from the Runtime-level StateTransactionConfig service.
    // - Finally fall back to NODE_ENV-based defaults.
    const runtimeConfigOpt = yield* Effect.serviceOption(StateTransactionConfigTag)
    const runtimeInstrumentation: StateTransactionInstrumentation | undefined = Option.isSome(runtimeConfigOpt)
      ? runtimeConfigOpt.value.instrumentation
      : undefined

    const instrumentation: StateTransactionInstrumentation =
      options.stateTransaction?.instrumentation ?? runtimeInstrumentation ?? getDefaultStateTxnInstrumentation()

    const resolveTraitConvergeConfig = makeResolveTraitConvergeConfig({
      moduleId: options.moduleId,
      stateTransaction: options.stateTransaction,
    })

    const resolveConcurrencyPolicy = makeResolveConcurrencyPolicy({
      moduleId: options.moduleId,
      diagnostics: concurrencyDiagnostics,
    })

    const resolveTxnLanePolicy = makeResolveTxnLanePolicy({
      moduleId: options.moduleId,
      stateTransaction: options.stateTransaction,
    })

    const actionHub = options.createActionHub
      ? yield* options.createActionHub
      : yield* Effect.gen(function* () {
          const policy = yield* resolveConcurrencyPolicy()
          return yield* PubSub.bounded<A>(policy.losslessBackpressureCapacity)
        })

    const convergePlanCacheCapacity = 128
    const traitState: TraitState = {
      program: undefined,
      convergePlanCache: undefined,
      convergeGeneration: {
        generation: 0,
        generationBumpCount: 0,
      },
      pendingCacheMissReason: undefined,
      lastConvergeIrKeys: undefined,
      listConfigs: [],
    }
    const rowIdStore = new RowId.RowIdStore(instanceId)
    const selectorGraph = SelectorGraph.make<S>({
      moduleId,
      instanceId,
      getFieldPathIdRegistry: () => {
        const convergeIr: any = (traitState.program as any)?.convergeIr
        if (!convergeIr || convergeIr.configError) return undefined
        return convergeIr.fieldPathIdRegistry
      },
    })

    // StateTransaction context:
    // - Maintain a single active transaction per ModuleRuntime;
    // - Aggregate state writes from all entrypoints on this instance (dispatch / Traits / source-refresh, etc.);
    // - New entrypoints (e.g. service writebacks / devtools operations) must also go through the same context + queue.
    const txnContext = StateTransaction.makeContext<S>({
      moduleId,
      instanceId,
      instrumentation,
      getFieldPathIdRegistry: () => {
        const convergeIr: any = (traitState.program as any)?.convergeIr
        if (!convergeIr || convergeIr.configError) return undefined
        return convergeIr.fieldPathIdRegistry
      },
    })

    const recordStatePatch: RuntimeInternals['txn']['recordStatePatch'] = (
      path,
      reason,
      from,
      to,
      traitNodeId,
      stepId,
    ): void => {
      StateTransaction.recordPatch(txnContext, path, reason, from, to, traitNodeId, stepId)
    }

    const updateDraft: RuntimeInternals['txn']['updateDraft'] = (nextState): void => {
      if (!txnContext.current) return
      StateTransaction.updateDraft(txnContext, nextState as S)
    }

    const traitConvergeTimeSlicingSignal = yield* Queue.unbounded<void>()
    const traitConvergeTimeSlicingState: {
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
    } = {
      signal: traitConvergeTimeSlicingSignal,
      backlogDirtyPaths: new Set(),
      backlogDirtyAllReason: undefined,
      firstPendingAtMs: undefined,
      lastTouchedAtMs: undefined,
      latestConvergeConfig: undefined,
      capturedContext: undefined,
    }

    const moduleTraitsState: {
      frozen: boolean
      contributions: Array<ModuleTraits.TraitContribution>
      snapshot: ModuleTraits.ModuleTraitsSnapshot | undefined
    } = {
      frozen: false,
      contributions: [],
      snapshot: undefined,
    }

    /**
     * Transaction history:
     * - Keeps the latest N StateTransaction records per ModuleRuntime.
     * - Used only for dev/test devtools features (e.g. time-travel, txn summary views).
     * - Capacity is bounded to avoid unbounded memory growth in long-running apps.
     */
    const maxTxnHistory = 500
    const txnHistory: Array<StateTransaction.StateTransaction<S>> = []
    const txnById = new Map<string, StateTransaction.StateTransaction<S>>()

    /**
     * Transaction queue:
     * - Executes each logic entrypoint (dispatch / source-refresh / future extensions) serially in FIFO order.
     * - Guarantees at most one transaction at a time per instance; different instances can still run in parallel.
     */
    const kernelImplementationRef = yield* KernelRef.resolveKernelImplementationRef()
    const runtimeServicesOverrides = yield* RuntimeKernel.resolveRuntimeServicesOverrides({
      moduleId: options.moduleId,
    })

    const runtimeServicesRegistryOpt = yield* Effect.serviceOption(RuntimeKernel.RuntimeServicesRegistryTag)
    const runtimeServicesRegistry = Option.isSome(runtimeServicesRegistryOpt)
      ? runtimeServicesRegistryOpt.value
      : undefined

    const resolveRuntimeServiceImpls = <Service>(
      serviceId: string,
      builtin: ReadonlyArray<RuntimeKernel.RuntimeServiceImpl<Service>>,
    ): ReadonlyArray<RuntimeKernel.RuntimeServiceImpl<Service>> => {
      const extraRaw = runtimeServicesRegistry?.implsByServiceId[serviceId]
      if (!extraRaw || extraRaw.length === 0) return builtin

      const extra = extraRaw as ReadonlyArray<RuntimeKernel.RuntimeServiceImpl<Service>>
      const seen = new Set<string>()
      const out: Array<RuntimeKernel.RuntimeServiceImpl<Service>> = []

      for (const impl of builtin) {
        seen.add(impl.implId)
        out.push(impl)
      }

      for (const impl of extra) {
        if (!impl || typeof impl.implId !== 'string' || impl.implId.length === 0) continue
        if (seen.has(impl.implId)) continue
        seen.add(impl.implId)
        out.push(impl)
      }

      return out
    }

    const makeTxnQueueBuiltin = makeEnqueueTransaction({
      moduleId: options.moduleId,
      instanceId,
      resolveConcurrencyPolicy,
      diagnostics: concurrencyDiagnostics,
    })

    const enqueueTxnSel = RuntimeKernel.selectRuntimeService(
      'txnQueue',
      resolveRuntimeServiceImpls('txnQueue', [
        {
          implId: 'builtin',
          implVersion: 'v1',
          make: makeTxnQueueBuiltin,
        },
        {
          implId: 'trace',
          implVersion: 'v1',
          make: makeTxnQueueBuiltin,
          notes: 'no-op wrapper (used for override isolation tests)',
        },
      ]),
      runtimeServicesOverrides,
    )

    const enqueueTransaction = yield* enqueueTxnSel.impl.make.pipe(
      Effect.provideService(RuntimeServiceBuiltins.RuntimeServiceBuiltinsTag, {
        getBuiltinMake: (serviceId) =>
          serviceId === 'txnQueue'
            ? (makeTxnQueueBuiltin as Effect.Effect<unknown, never, any>)
            : Effect.dieMessage(`[Logix] builtin make not available: ${serviceId}`),
      } satisfies RuntimeServiceBuiltins.RuntimeServiceBuiltins),
    )

    const makeOperationRunnerBuiltin = Effect.succeed(
      makeRunOperation({
        optionsModuleId: options.moduleId,
        instanceId,
        txnContext,
      }),
    )

    const runOperationSel = RuntimeKernel.selectRuntimeService(
      'operationRunner',
      resolveRuntimeServiceImpls('operationRunner', [
        {
          implId: 'builtin',
          implVersion: 'v1',
          make: makeOperationRunnerBuiltin,
        },
      ]),
      runtimeServicesOverrides,
    )

    const runOperation = yield* runOperationSel.impl.make.pipe(
      Effect.provideService(RuntimeServiceBuiltins.RuntimeServiceBuiltinsTag, {
        getBuiltinMake: (serviceId) =>
          serviceId === 'operationRunner'
            ? (makeOperationRunnerBuiltin as Effect.Effect<unknown, never, any>)
            : Effect.dieMessage(`[Logix] builtin make not available: ${serviceId}`),
      } satisfies RuntimeServiceBuiltins.RuntimeServiceBuiltins),
    )

    yield* runOperation(
      'lifecycle',
      'module:init',
      { meta: { moduleId, instanceId } },
      Debug.record({
        type: 'module:init',
        moduleId,
        instanceId,
      }),
    )

    // Initial state snapshot:
    // - Emit a state:update event to write the initial state into the Debug stream.
    // - Helps Devtools show "Current State" even before any business interaction.
    // - Provides frame 0 for the timeline so later events can build time-travel views on top of it.
    const initialSnapshot = yield* SubscriptionRef.get(stateRef)
    yield* runOperation(
      'state',
      'state:init',
      { meta: { moduleId, instanceId } },
      Debug.record({
        type: 'state:update',
        moduleId,
        state: initialSnapshot,
        instanceId,
        txnSeq: 0,
      }),
    )

    const makeTransactionBuiltin = Effect.sync(() =>
      makeTransactionOps<S>({
        moduleId,
        optionsModuleId: options.moduleId,
        instanceId,
        stateRef,
        commitHub,
        shouldPublishCommitHub: () => commitHubSubscriberCount > 0,
        recordStatePatch,
        onCommit: ({ state, meta, dirtySet, diagnosticsLevel }) =>
          selectorGraph.onCommit(state, meta, dirtySet, diagnosticsLevel),
        enqueueTransaction,
        runOperation,
        txnContext,
        traitConvergeTimeSlicing: traitConvergeTimeSlicingState,
        traitRuntime: {
          getProgram: () => traitState.program,
          getConvergePlanCache: () => traitState.convergePlanCache,
          getConvergeGeneration: () => traitState.convergeGeneration,
          getPendingCacheMissReason: () => traitState.pendingCacheMissReason,
          setPendingCacheMissReason: (next) => {
            traitState.pendingCacheMissReason = next
          },
          rowIdStore,
          getListConfigs: () => traitState.listConfigs,
        },
        resolveTraitConvergeConfig,
        isDevEnv,
        maxTxnHistory,
        txnHistory,
        txnById,
      }),
    )

    const transactionSel = RuntimeKernel.selectRuntimeService(
      'transaction',
      resolveRuntimeServiceImpls('transaction', [
        {
          implId: 'builtin',
          implVersion: 'v1',
          make: makeTransactionBuiltin,
        },
      ]),
      runtimeServicesOverrides,
    )

    const { readState, setStateInternal, runWithStateTransaction } = yield* transactionSel.impl.make.pipe(
      Effect.provideService(RuntimeServiceBuiltins.RuntimeServiceBuiltinsTag, {
        getBuiltinMake: (serviceId) =>
          serviceId === 'transaction'
            ? (makeTransactionBuiltin as Effect.Effect<unknown, never, any>)
            : Effect.dieMessage(`[Logix] builtin make not available: ${serviceId}`),
      } satisfies RuntimeServiceBuiltins.RuntimeServiceBuiltins),
    )

    let deferredFlushCoalescedCount = 0
    let deferredFlushCanceledCount = 0

    const runDeferredConvergeFlush = (args: {
      readonly dirtyPathsSnapshot: ReadonlyArray<StateTransaction.StatePatchPath>
      readonly dirtyAllReason?: DirtyAllReason
      readonly lane: 'urgent' | 'nonUrgent'
      readonly slice?: { readonly start: number; readonly end: number; readonly total: number }
      readonly captureOpSeq?: boolean
    }): Effect.Effect<{ readonly txnSeq: number; readonly txnId?: string; readonly opSeq?: number }> => {
      let capturedTxnSeq = 0
      let capturedTxnId: string | undefined = undefined
      let capturedOpSeq: number | undefined = undefined

      const details: any = { dirtyPathCount: args.dirtyPathsSnapshot.length }
      if (args.dirtyAllReason) {
        details.dirtyAllReason = args.dirtyAllReason
      }
      if (args.slice) {
        details.sliceStart = args.slice.start
        details.sliceEnd = args.slice.end
        details.sliceTotal = args.slice.total
      }

      return enqueueTransaction(
        args.lane,
        runOperation(
          'lifecycle',
          'trait:deferredConvergeFlush',
          {
            payload: { dirtyPathCount: args.dirtyPathsSnapshot.length },
            meta: { moduleId, instanceId },
          },
          runWithStateTransaction(
            {
              kind: 'trait:deferred_flush',
              name: 'trait:deferredConvergeFlush',
              details,
            },
            () =>
              Effect.gen(function* () {
                const current: any = txnContext.current
                if (current) {
                  capturedTxnSeq = current.txnSeq
                  capturedTxnId = current.txnId
                }

                if (args.captureOpSeq) {
                  const opSeqRaw = yield* FiberRef.get(Debug.currentOpSeq)
                  if (typeof opSeqRaw === 'number' && Number.isFinite(opSeqRaw) && opSeqRaw >= 0) {
                    capturedOpSeq = Math.floor(opSeqRaw)
                  }
                }

                if (!current) return
                if (args.dirtyAllReason) {
                  current.dirtyAllReason = args.dirtyAllReason
                }
                for (const p of args.dirtyPathsSnapshot) {
                  if (typeof p === 'number' && Number.isFinite(p) && p >= 0) {
                    current.dirtyPathIds.add(Math.floor(p))
                  }
                }
              }),
          ),
        ),
      ).pipe(
        Effect.as({
          txnSeq: capturedTxnSeq,
          txnId: capturedTxnId,
          opSeq: capturedOpSeq,
        } as const),
      )
    }

    // 043: time-slicing scheduler for deferred converge (debounce + maxLag); triggered by in-txn signals and enqueued outside the txn.
    yield* Effect.forkScoped(
      Effect.forever(
        Effect.gen(function* () {
          yield* Queue.take(traitConvergeTimeSlicingState.signal)

          while (true) {
            const config = traitConvergeTimeSlicingState.latestConvergeConfig?.traitConvergeTimeSlicing
            if (!config?.enabled) {
              traitConvergeTimeSlicingState.backlogDirtyPaths.clear()
              traitConvergeTimeSlicingState.backlogDirtyAllReason = undefined
              traitConvergeTimeSlicingState.firstPendingAtMs = undefined
              traitConvergeTimeSlicingState.lastTouchedAtMs = undefined
              return
            }

            const now = Date.now()
            const firstPendingAtMs = traitConvergeTimeSlicingState.firstPendingAtMs ?? now
            traitConvergeTimeSlicingState.firstPendingAtMs = firstPendingAtMs

            const captured = traitConvergeTimeSlicingState.capturedContext
            const txnLanePolicy = yield* captured?.overrides
              ? Effect.provideService(resolveTxnLanePolicy(), StateTransactionOverridesTag, captured.overrides)
              : resolveTxnLanePolicy()

            const debounceMs = txnLanePolicy.enabled ? txnLanePolicy.debounceMs : config.debounceMs
            const maxLagMs = txnLanePolicy.enabled ? txnLanePolicy.maxLagMs : config.maxLagMs

            const elapsedMs = Math.max(0, now - firstPendingAtMs)
            const remainingLagMs = Math.max(0, maxLagMs - elapsedMs)
            if (remainingLagMs <= 0) {
              break
            }

            const sleepMs = Math.max(0, Math.min(debounceMs, remainingLagMs))
            if (sleepMs > 0) {
              yield* Effect.sleep(Duration.millis(sleepMs))
            } else {
              yield* Effect.yieldNow()
            }

            const drained = yield* Queue.takeAll(traitConvergeTimeSlicingState.signal)
            if (Chunk.isEmpty(drained)) {
              break
            }
          }

          const dirtyPathsSnapshot = Array.from(traitConvergeTimeSlicingState.backlogDirtyPaths)
          traitConvergeTimeSlicingState.backlogDirtyPaths.clear()
          const dirtyAllReasonSnapshot = traitConvergeTimeSlicingState.backlogDirtyAllReason
          traitConvergeTimeSlicingState.backlogDirtyAllReason = undefined
          const firstPendingAtMsForRun = traitConvergeTimeSlicingState.firstPendingAtMs
          traitConvergeTimeSlicingState.firstPendingAtMs = undefined
          traitConvergeTimeSlicingState.lastTouchedAtMs = undefined

          if (dirtyPathsSnapshot.length === 0 && !dirtyAllReasonSnapshot) {
            return
          }

          const program = traitState.program
          if (!program?.convergeExecIr || program.convergeExecIr.topoOrderDeferredInt32.length === 0) {
            return
          }

          const captured = traitConvergeTimeSlicingState.capturedContext
          const txnLanePolicy = yield* captured?.overrides
            ? Effect.provideService(resolveTxnLanePolicy(), StateTransactionOverridesTag, captured.overrides)
            : resolveTxnLanePolicy()

          const shouldEmitLaneEvidence = captured != null && captured.diagnosticsLevel !== 'off'
          const shouldEmitLaneEvidenceForPolicy =
            shouldEmitLaneEvidence && (txnLanePolicy.enabled || txnLanePolicy.overrideMode != null)

          const withCapturedContext = <A2, E2, R2>(eff: Effect.Effect<A2, E2, R2>): Effect.Effect<A2, E2, R2> => {
            let next = eff
            if (captured?.overrides) {
              next = Effect.provideService(next, StateTransactionOverridesTag, captured.overrides)
            }
            if (captured) {
              next = next.pipe(
                Effect.locally(Debug.currentRuntimeLabel, captured.runtimeLabel),
                Effect.locally(Debug.currentDiagnosticsLevel, captured.diagnosticsLevel),
                Effect.locally(Debug.currentDebugSinks, captured.debugSinks),
              )
            }
            return next
          }

          const firstPendingAtMs = firstPendingAtMsForRun ?? Date.now()

          if (!txnLanePolicy.enabled) {
            const anchor = yield* withCapturedContext(
              runDeferredConvergeFlush({
                dirtyPathsSnapshot,
                dirtyAllReason: dirtyAllReasonSnapshot,
                lane: 'urgent',
                captureOpSeq: shouldEmitLaneEvidenceForPolicy,
              }),
            )

            if (shouldEmitLaneEvidenceForPolicy) {
              const reasons: ReadonlyArray<Debug.TxnLaneEvidenceReason> =
                txnLanePolicy.overrideMode === 'forced_off'
                  ? ['forced_off']
                  : txnLanePolicy.overrideMode === 'forced_sync'
                    ? ['forced_sync']
                    : ['disabled']

              const evidence: Debug.TxnLaneEvidence = {
                anchor: {
                  moduleId,
                  instanceId,
                  txnSeq: anchor.txnSeq,
                  ...(typeof anchor.opSeq === 'number' ? { opSeq: anchor.opSeq } : {}),
                },
                lane: 'urgent',
                kind: 'trait:deferred_flush',
                policy: txnLanePolicy,
                backlog: {
                  pendingCount: 0,
                  ageMs: Math.max(0, Date.now() - firstPendingAtMs),
                  coalescedCount: deferredFlushCoalescedCount,
                  canceledCount: deferredFlushCanceledCount,
                },
                starvation: { triggered: false },
                reasons,
              }

              yield* withCapturedContext(
                Debug.record({
                  type: 'trace:txn-lane',
                  moduleId,
                  instanceId,
                  txnSeq: anchor.txnSeq,
                  txnId: anchor.txnId,
                  data: { evidence },
                }),
              )
            }

            return
          }

          const totalSteps = program.convergeExecIr.topoOrderDeferredInt32.length

          let cursor = 0
          let chunkSize = Math.min(32, totalSteps)
          let yieldCount = 0
          let lastYieldAtMs = Date.now()

          const readIsInputPending = (): boolean => {
            const nav = (globalThis as any).navigator
            const scheduling = nav?.scheduling
            const isInputPending = scheduling?.isInputPending
            if (typeof isInputPending !== 'function') return false
            try {
              return Boolean(isInputPending.call(scheduling))
            } catch {
              return false
            }
          }

          while (cursor < totalSteps) {
            const lagMs = Math.max(0, Date.now() - firstPendingAtMs)
            const lagExceeded = lagMs >= txnLanePolicy.maxLagMs
            const budgetMs = lagExceeded
              ? Math.max(txnLanePolicy.budgetMs, txnLanePolicy.budgetMs * 4)
              : txnLanePolicy.budgetMs

            const sliceStart = cursor
            const sliceEnd = Math.min(totalSteps, cursor + chunkSize)

            const { sliceDurationMs, anchor } = yield* withCapturedContext(
              Effect.gen(function* () {
                const sliceStartedAtMs = Date.now()
                const anchor = yield* runDeferredConvergeFlush({
                  dirtyPathsSnapshot,
                  dirtyAllReason: dirtyAllReasonSnapshot,
                  lane: 'nonUrgent',
                  slice: { start: sliceStart, end: sliceEnd, total: totalSteps },
                  captureOpSeq: shouldEmitLaneEvidence,
                })
                const sliceDurationMs = Math.max(0, Date.now() - sliceStartedAtMs)
                return { sliceDurationMs, anchor } as const
              }),
            )

            cursor = sliceEnd

            // Keep the signal queue bounded during long backlog processing.
            yield* Queue.takeAll(traitConvergeTimeSlicingState.signal)

            const hasPending =
              traitConvergeTimeSlicingState.backlogDirtyPaths.size > 0 ||
              traitConvergeTimeSlicingState.backlogDirtyAllReason != null
            const willCoalesce = txnLanePolicy.allowCoalesce && !lagExceeded && hasPending

            const elapsedSinceLastYieldMs = Math.max(0, Date.now() - lastYieldAtMs)
            const budgetExceeded = budgetMs > 0 && Number.isFinite(budgetMs) && elapsedSinceLastYieldMs >= budgetMs
            const forcedFrameYield = elapsedSinceLastYieldMs >= 16
            const inputPending =
              !willCoalesce && txnLanePolicy.yieldStrategy === 'inputPending' ? readIsInputPending() : false

            const shouldYield =
              cursor < totalSteps && !willCoalesce && (inputPending || budgetExceeded || forcedFrameYield)

            const yieldReason: Debug.TxnLaneNonUrgentYieldReason = !shouldYield
              ? 'none'
              : inputPending
                ? 'input_pending'
                : budgetExceeded
                  ? 'budget_exceeded'
                  : 'forced_frame_yield'

            if (shouldEmitLaneEvidence) {
              yield* withCapturedContext(
                Effect.gen(function* () {
                  const reasons: Array<Debug.TxnLaneEvidenceReason> = ['queued_non_urgent']
                  if (lagExceeded) reasons.push('max_lag_forced', 'starvation_protection')
                  if (yieldReason === 'budget_exceeded') reasons.push('budget_yield')

                  const evidence: Debug.TxnLaneEvidence = {
                    anchor: {
                      moduleId,
                      instanceId,
                      txnSeq: anchor.txnSeq,
                      ...(typeof anchor.opSeq === 'number' ? { opSeq: anchor.opSeq } : {}),
                    },
                    lane: 'nonUrgent',
                    kind: 'trait:deferred_flush',
                    policy: txnLanePolicy,
                    backlog: {
                      pendingCount: Math.max(0, totalSteps - sliceEnd),
                      ageMs: lagMs,
                      coalescedCount: deferredFlushCoalescedCount,
                      canceledCount: deferredFlushCanceledCount,
                    },
                    budget: {
                      budgetMs,
                      sliceDurationMs,
                      yieldCount,
                      yielded: shouldYield,
                      yieldReason,
                    },
                    starvation: lagExceeded ? { triggered: true, reason: 'max_lag_exceeded' } : { triggered: false },
                    reasons,
                  }

                  yield* Debug.record({
                    type: 'trace:txn-lane',
                    moduleId,
                    instanceId,
                    txnSeq: anchor.txnSeq,
                    txnId: anchor.txnId,
                    data: { evidence },
                  })
                }),
              )
            }

            if (willCoalesce) {
              // Ensure the scheduler wakes again for the new backlog after we cancel.
              deferredFlushCoalescedCount += 1
              deferredFlushCanceledCount += 1
              if (shouldEmitLaneEvidence) {
                yield* withCapturedContext(
                  Debug.record({
                    type: 'trace:txn-lane',
                    moduleId,
                    instanceId,
                    txnSeq: anchor.txnSeq,
                    txnId: anchor.txnId,
                    data: {
                      evidence: {
                        anchor: {
                          moduleId,
                          instanceId,
                          txnSeq: anchor.txnSeq,
                          ...(typeof anchor.opSeq === 'number' ? { opSeq: anchor.opSeq } : {}),
                        },
                        lane: 'nonUrgent',
                        kind: 'trait:deferred_flush',
                        policy: txnLanePolicy,
                        backlog: {
                          pendingCount: Math.max(0, totalSteps - cursor),
                          ageMs: lagMs,
                          coalescedCount: deferredFlushCoalescedCount,
                          canceledCount: deferredFlushCanceledCount,
                        },
                        budget: {
                          budgetMs,
                          sliceDurationMs,
                          yieldCount,
                          yielded: false,
                          yieldReason: 'none',
                        },
                        starvation: { triggered: false },
                        reasons: ['coalesced', 'canceled'],
                      } satisfies Debug.TxnLaneEvidence,
                    },
                  }),
                )
              }
              yield* Queue.offer(traitConvergeTimeSlicingState.signal, undefined)
              break
            }

            if (budgetMs > 0 && Number.isFinite(budgetMs)) {
              if (sliceDurationMs > budgetMs && chunkSize > 1) {
                chunkSize = Math.max(1, Math.floor(chunkSize / 2))
              } else if (sliceDurationMs < budgetMs / 2) {
                chunkSize = Math.min(totalSteps, chunkSize * 2)
              }
            }

            if (shouldYield) {
              yieldCount += 1
              lastYieldAtMs = Date.now()
              yield* Effect.yieldNow()
            }
          }

          // If new backlog arrived while processing, ensure we don't lose wakeup after draining signals.
          if (
            traitConvergeTimeSlicingState.backlogDirtyPaths.size > 0 ||
            traitConvergeTimeSlicingState.backlogDirtyAllReason != null
          ) {
            yield* Queue.offer(traitConvergeTimeSlicingState.signal, undefined)
          }
        }),
      ),
    )

    const declaredActionTags = (() => {
      const actionMap = (options.tag as any)?.shape?.actionMap
      if (!actionMap || typeof actionMap !== 'object') {
        return undefined
      }
      return new Set(Object.keys(actionMap))
    })()

    const makeDispatchBuiltin = Effect.sync(() =>
      makeDispatchOps<S, A>({
        optionsModuleId: options.moduleId,
        instanceId,
        declaredActionTags,
        initialReducers: options.reducers as any,
        txnContext,
        readState,
        setStateInternal,
        recordStatePatch,
        actionHub,
        actionCommitHub,
        diagnostics: concurrencyDiagnostics,
        enqueueTransaction,
        resolveConcurrencyPolicy,
        runOperation,
        runWithStateTransaction,
        isDevEnv,
      }),
    )

    const dispatchSel = RuntimeKernel.selectRuntimeService(
      'dispatch',
      resolveRuntimeServiceImpls('dispatch', [
        {
          implId: 'builtin',
          implVersion: 'v1',
          make: makeDispatchBuiltin,
        },
      ]),
      runtimeServicesOverrides,
    )

    const dispatchOps = yield* dispatchSel.impl.make.pipe(
      Effect.provideService(RuntimeServiceBuiltins.RuntimeServiceBuiltinsTag, {
        getBuiltinMake: (serviceId) =>
          serviceId === 'dispatch'
            ? (makeDispatchBuiltin as Effect.Effect<unknown, never, any>)
            : Effect.dieMessage(`[Logix] builtin make not available: ${serviceId}`),
      } satisfies RuntimeServiceBuiltins.RuntimeServiceBuiltins),
    )

    const runtimeServicesEvidence = RuntimeKernel.makeRuntimeServicesEvidence({
      moduleId: options.moduleId,
      instanceId,
      bindings: [enqueueTxnSel.binding, runOperationSel.binding, transactionSel.binding, dispatchSel.binding],
      overridesApplied: [
        ...enqueueTxnSel.overridesApplied,
        ...runOperationSel.overridesApplied,
        ...transactionSel.overridesApplied,
        ...dispatchSel.overridesApplied,
      ],
    })

    if (kernelImplementationRef.kernelId !== 'core') {
      const modeOpt = yield* Effect.serviceOption(RuntimeKernel.FullCutoverGateModeTag)
      const mode = Option.isSome(modeOpt) ? modeOpt.value : 'trial'

      if (mode === 'fullCutover') {
        const gate = FullCutoverGate.evaluateFullCutoverGate({
          mode: 'fullCutover',
          requestedKernelId: kernelImplementationRef.kernelId,
          runtimeServicesEvidence,
          diagnosticsLevel: isDevEnv() ? 'light' : 'off',
        })

        if (gate.verdict === 'FAIL') {
          const msg = isDevEnv()
            ? [
                '[FullCutoverGateFailed] Runtime assembly detected implicit fallback / missing bindings under fullCutover mode.',
                `requestedKernelId: ${kernelImplementationRef.kernelId}`,
                `missingServiceIds: ${gate.missingServiceIds.join(',')}`,
                `fallbackServiceIds: ${gate.fallbackServiceIds.join(',')}`,
                `anchor: moduleId=${gate.anchor.moduleId}, instanceId=${gate.anchor.instanceId}, txnSeq=${gate.anchor.txnSeq}`,
              ].join('\n')
            : 'Full cutover gate failed'

          const err: any = new Error(msg)
          err.name = 'FullCutoverGateFailed'
          err.gate = gate
          err.instanceId = instanceId
          err.moduleId = options.moduleId
          throw err
        }
      }
    }

    const runtime: PublicModuleRuntime<S, A> = {
      // Expose moduleId on the runtime so React / Devtools can correlate module information at the view layer.
      moduleId,
      instanceId,
      lifecycleStatus: lifecycle.getStatus,
      getState: readState,
      setState: (next) => setStateInternal(next, '*', 'unknown', undefined, next),
      dispatch: (action) =>
        // Enqueue the txn request to guarantee FIFO serialization within a single instance.
        dispatchOps.dispatch(action),
      dispatchBatch: (actions) => dispatchOps.dispatchBatch(actions),
      dispatchLowPriority: (action) => dispatchOps.dispatchLowPriority(action),
      actions$: Stream.fromPubSub(actionHub),
      actionsWithMeta$: Stream.fromPubSub(actionCommitHub),
      changes: <V>(selector: (s: S) => V) => Stream.map(stateRef.changes, selector).pipe(Stream.changes),
      changesWithMeta: <V>(selector: (s: S) => V) =>
        Stream.map(fromCommitHub, ({ value, meta }) => ({
          value: selector(value),
          meta,
        })),
      changesReadQueryWithMeta: <V>(input: ReadQuery.ReadQueryInput<S, V>) => {
        const compiled: ReadQuery.ReadQueryCompiled<S, V> =
          (input as any)?.staticIr != null &&
          typeof (input as any)?.lane === 'string' &&
          typeof (input as any)?.producer === 'string'
            ? (input as any)
            : ReadQuery.compile(input)

        if (compiled.lane !== 'static') {
          return Stream.unwrapScoped(
            Effect.gen(function* () {
              const strictGateOpt = yield* Effect.serviceOption(ReadQueryStrictGateConfigTag)

              if (Option.isSome(strictGateOpt)) {
                const decision = ReadQuery.evaluateStrictGate({
                  config: strictGateOpt.value,
                  moduleId,
                  instanceId,
                  txnSeq: 0,
                  compiled,
                })

                if (decision.verdict === 'WARN') {
                  yield* Debug.record(decision.diagnostic)
                } else if (decision.verdict === 'FAIL') {
                  yield* Debug.record(decision.diagnostic)
                  yield* Effect.die(decision.error)
                }
              }

              return Stream.map(fromCommitHub, ({ value, meta }) => ({
                value: compiled.select(value),
                meta,
              }))
            }),
          )
        }

        return Stream.unwrapScoped(
          Effect.gen(function* () {
            const entry = yield* selectorGraph.ensureEntry(compiled)
            entry.subscriberCount += 1

            yield* Effect.addFinalizer(() =>
              Effect.sync(() => {
                selectorGraph.releaseEntry(compiled.selectorId)
              }),
            )

            if (!entry.hasValue) {
              const current = yield* readState
              try {
                entry.cachedValue = compiled.select(current) as any
                entry.hasValue = true
                entry.cachedAtTxnSeq = 0
              } catch {
                // keep entry empty; commit-time eval will emit diagnostic in diagnostics mode (if enabled)
              }
            }

            return Stream.fromPubSub(entry.hub) as Stream.Stream<StateChangeWithMeta<V>>
          }),
        )
      },
      ref: <V = S>(selector?: (s: S) => V): SubscriptionRef.SubscriptionRef<V> => {
        if (!selector) {
          return stateRef as unknown as SubscriptionRef.SubscriptionRef<V>
        }

        // Read-only derived view: derive from the root state via selector and forbid writes.
        const readonlyRef = {
          get: Effect.map(SubscriptionRef.get(stateRef), selector),
          modify: () => Effect.dieMessage('Cannot write to a derived ref'),
        } as unknown as Ref.Ref<V>

        const derived = {
          // SubscriptionRef internals access self.ref / self.pubsub / self.semaphore.
          ref: readonlyRef,
          pubsub: {
            publish: () => Effect.succeed(true),
          },
          semaphore: {
            withPermits:
              () =>
              <A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
                self,
          },
          get: readonlyRef.get,
          modify: readonlyRef.modify,
          // Derived stream: selector-map stateRef.changes and de-duplicate.
          changes: Stream.map(stateRef.changes, selector).pipe(Stream.changes) as Stream.Stream<V>,
        } as unknown as SubscriptionRef.SubscriptionRef<V>

        return derived
      },
    }

    KernelRef.setKernelImplementationRef(runtime, kernelImplementationRef)
    RuntimeKernel.setRuntimeServicesEvidence(runtime, runtimeServicesEvidence)

    // Optional: when RunSession/EvidenceCollector is in scope, write runtime services evidence into the collector.
    // By default (non-trial-run), Env does not contain EvidenceCollectorTag, so this adds no overhead.
    const collectorOpt = yield* Effect.serviceOption(EvidenceCollectorTag)
    if (Option.isSome(collectorOpt)) {
      collectorOpt.value.setKernelImplementationRef(kernelImplementationRef)
      const level = yield* FiberRef.get(Debug.currentDiagnosticsLevel)
      if (level !== 'off') {
        collectorOpt.value.setRuntimeServicesEvidence(runtimeServicesEvidence)
      }
    }

    const convergeStaticIrCollectors = yield* FiberRef.get(currentConvergeStaticIrCollectors)
    const registerConvergeStaticIr = (staticIr: unknown): void => {
      if (convergeStaticIrCollectors.length === 0) return
      for (const collector of convergeStaticIrCollectors) {
        collector.register(staticIr as any)
      }
    }

    const sourceRefreshRegistry = new Map<string, (state: unknown) => Effect.Effect<void, never, any>>()
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        sourceRefreshRegistry.clear()
      }),
    )

    // Build a minimal imports-scope injector:
    // - Only store ModuleToken -> ModuleRuntime mappings.
    // - Never capture the whole Context into ModuleRuntime (avoid leaking root/base services by accident).
    const importsMap = new Map<Context.Tag<any, PublicModuleRuntime<any, any>>, PublicModuleRuntime<any, any>>()

    for (const imported of options.imports ?? []) {
      const maybe = yield* Effect.serviceOption(imported)
      if (Option.isSome(maybe)) {
        importsMap.set(imported, maybe.value)
      }
    }

    const importsScope: RuntimeInternals['imports'] = {
      kind: 'imports-scope',
      get: (module) => importsMap.get(module),
    }

    const instanceKey = options.moduleId != null ? `${options.moduleId}::${instanceId}` : undefined

    if (instanceKey) {
      registerRuntimeByInstanceKey(instanceKey, runtime as PublicModuleRuntime<any, any>)
    }

    const registerStateTraitProgram = (
      program: any,
      registerOptions?: { readonly bumpReason?: any; readonly exportStaticIr?: boolean },
    ): void => {
      const nextIr = (program as any).convergeIr
      const nextKeys = nextIr
        ? {
            writersKey: nextIr.writersKey,
            depsKey: nextIr.depsKey,
          }
        : undefined

      const requestedBumpReason = registerOptions?.bumpReason
      let bumpReason: any

      if (traitState.lastConvergeIrKeys && nextKeys) {
        if (requestedBumpReason) {
          bumpReason = requestedBumpReason
        } else if (traitState.lastConvergeIrKeys.writersKey !== nextKeys.writersKey) {
          bumpReason = 'writers_changed'
        } else if (traitState.lastConvergeIrKeys.depsKey !== nextKeys.depsKey) {
          bumpReason = 'deps_changed'
        }
      } else if (traitState.lastConvergeIrKeys && !nextKeys) {
        bumpReason = requestedBumpReason ?? 'unknown'
      }

      if (bumpReason) {
        const nextGeneration = traitState.convergeGeneration.generation + 1
        const nextBumpCount = (traitState.convergeGeneration.generationBumpCount ?? 0) + 1
        traitState.convergeGeneration = {
          generation: nextGeneration,
          generationBumpCount: nextBumpCount,
          lastBumpReason: bumpReason,
        }

        traitState.pendingCacheMissReason = 'generation_bumped'
        traitState.convergePlanCache = new StateTraitConverge.ConvergePlanCache(convergePlanCacheCapacity)
      }

      traitState.lastConvergeIrKeys = nextKeys

      const convergeIr = nextIr
        ? {
            ...nextIr,
            generation: traitState.convergeGeneration.generation,
          }
        : undefined

      const convergeExecIr =
        convergeIr && !(convergeIr as any).configError ? makeConvergeExecIr(convergeIr as any) : undefined

      traitState.program = {
        ...(program as any),
        convergeIr,
        convergeExecIr,
      }
      traitState.listConfigs = RowId.collectListConfigs((program as any).spec)

      if (!traitState.convergePlanCache) {
        traitState.convergePlanCache = new StateTraitConverge.ConvergePlanCache(convergePlanCacheCapacity)
      }

      const exportStaticIrEnabled = registerOptions?.exportStaticIr !== false

      if (exportStaticIrEnabled && convergeIr && !(convergeIr as any).configError) {
        if (convergeStaticIrCollectors.length > 0) {
          registerConvergeStaticIr(
            exportConvergeStaticIr({
              ir: convergeIr,
              moduleId: options.moduleId ?? 'unknown',
              instanceId,
            }),
          )
        }
      }
    }

    // 065: even if the module declares no traits, it must still have a schema-backed Static IR table (FieldPathIdRegistry),
    // otherwise reducer patchPaths / ReadQuery(static lane) cannot be mapped and will degrade to dirtyAll.
    if (!traitState.program) {
      const stateSchema = (options.tag as any)?.stateSchema as unknown
      if (stateSchema) {
        try {
          registerStateTraitProgram(StateTraitBuild.build(stateSchema as any, {} as any), { exportStaticIr: false })
        } catch {
          // best-effort: keep trait program undefined and fall back to dirtyAll scheduling when registry is missing.
        }
      }
    }

    const enqueueStateTraitValidateRequest = (request: StateTraitValidate.ScopedValidateRequest): void => {
      if (!txnContext.current) return
      const current: any = txnContext.current
      const list: Array<StateTraitValidate.ScopedValidateRequest> = current.stateTraitValidateRequests ?? []
      list.push(request)
      current.stateTraitValidateRequests = list
    }

    const recordReplayEvent = (event: unknown): void => {
      if (!txnContext.current) return
      const current: any = txnContext.current
      current.lastReplayEvent = {
        ...(event as any),
        txnId: current.txnId,
        trigger: current.origin,
      }
    }

    const runWithStateTransactionInternal = (
      origin: StateTransaction.StateTxnOrigin,
      body: () => Effect.Effect<void>,
    ): Effect.Effect<void> =>
      enqueueTransaction(
        runOperation(
          origin.kind as any as EffectOp.EffectOp['kind'],
          origin.name ? `txn:${origin.name}` : 'txn',
          { meta: { moduleId: options.moduleId, instanceId } },
          runWithStateTransaction(origin, body),
        ),
      )

    const applyTransactionSnapshot = (txnId: string, mode: 'before' | 'after'): Effect.Effect<void> =>
      enqueueTransaction(
        Effect.gen(function* () {
          // Time travel is disabled by default in production to avoid misuse.
          // Devtools should use this only in dev/test with instrumentation = "full".
          if (!isDevEnv()) {
            return
          }

          const txn = txnById.get(txnId)
          if (!txn) {
            return
          }

          const targetState = mode === 'before' ? txn.initialStateSnapshot : txn.finalStateSnapshot

          if (targetState === undefined) {
            // Time travel is not possible when snapshots are not collected.
            return
          }

          // Record a replay operation as a StateTransaction with origin.kind = "devtools"
          // so Devtools txn views can show a complete time-travel trace.
          yield* runWithStateTransaction(
            {
              kind: 'devtools',
              name: 'time-travel',
              details: {
                baseTxnId: txnId,
                mode,
              },
            },
            () =>
              Effect.sync(() => {
                StateTransaction.updateDraft(txnContext, targetState as S)
                StateTransaction.recordPatch(txnContext, '*', 'devtools')
              }),
          )
        }),
      )

    const stateSchema = (options.tag as any)?.stateSchema

    const effectsRegistry = makeEffectsRegistry({
      moduleId: options.moduleId,
      instanceId,
      actions$: runtime.actions$ as Stream.Stream<unknown>,
    })

    const runtimeInternals: RuntimeInternals = {
      moduleId: options.moduleId,
      instanceId,
      stateSchema,
      lifecycle: {
        registerInitRequired: (eff, options) => {
          lifecycle.registerInitRequired(eff, options)
        },
        registerStart: (eff, options) => {
          lifecycle.registerStart(eff, options)
        },
        registerDestroy: (eff, options) => {
          lifecycle.registerDestroy(eff, options)
        },
        registerOnError: (handler) => {
          lifecycle.registerOnError(handler)
        },
        registerPlatformSuspend: (eff, options) => {
          lifecycle.registerPlatformSuspend(eff, options)
        },
        registerPlatformResume: (eff, options) => {
          lifecycle.registerPlatformResume(eff, options)
        },
        registerPlatformReset: (eff, options) => {
          lifecycle.registerPlatformReset(eff, options)
        },
      },
      imports: importsScope,
      txn: {
        instrumentation,
        registerReducer: dispatchOps.registerReducer as any,
        runWithStateTransaction: runWithStateTransactionInternal as any,
        updateDraft,
        recordStatePatch,
        recordReplayEvent,
        applyTransactionSnapshot: applyTransactionSnapshot as any,
      },
      concurrency: {
        resolveConcurrencyPolicy,
      },
      txnLanes: {
        resolveTxnLanePolicy,
      },
      traits: {
        rowIdStore,
        getListConfigs: () => traitState.listConfigs as ReadonlyArray<unknown>,
        registerSourceRefresh: (fieldPath, handler) => {
          sourceRefreshRegistry.set(fieldPath, handler)
        },
        getSourceRefreshHandler: (fieldPath) => sourceRefreshRegistry.get(fieldPath),
        registerStateTraitProgram: registerStateTraitProgram as any,
        enqueueStateTraitValidateRequest: enqueueStateTraitValidateRequest as any,
        registerModuleTraitsContribution: (contribution) => {
          if (moduleTraitsState.frozen) {
            throw new Error('[ModuleTraitsFrozen] Cannot register traits contribution after finalize/freeze.')
          }
          moduleTraitsState.contributions.push(contribution)
        },
        freezeModuleTraits: () => {
          moduleTraitsState.frozen = true
        },
        getModuleTraitsContributions: () => moduleTraitsState.contributions,
        getModuleTraitsSnapshot: () => moduleTraitsState.snapshot,
        setModuleTraitsSnapshot: (snapshot) => {
          moduleTraitsState.snapshot = snapshot
        },
      },
      effects: {
        registerEffect: (args) => effectsRegistry.registerEffect(args as any),
      },
      devtools: {
        registerConvergeStaticIr: registerConvergeStaticIr as any,
      },
    }

    yield* installInternalHooks({ runtime, runtimeInternals })

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        importsMap.clear()
      }),
    )

    if (options.tag) {
      registerRuntime(options.tag as Context.Tag<any, PublicModuleRuntime<S, A>>, runtime)
    }

    yield* Effect.addFinalizer(() =>
      lifecycle.runDestroy.pipe(
        Effect.flatMap(() =>
          runOperation(
            'lifecycle',
            'module:destroy',
            { meta: { moduleId: options.moduleId, instanceId } },
            Debug.record({
              type: 'module:destroy',
              moduleId: options.moduleId,
              instanceId,
            }),
          ),
        ),
        Effect.tap(() =>
          Effect.sync(() => {
            if (options.tag) {
              unregisterRuntime(options.tag as Context.Tag<any, PublicModuleRuntime<any, any>>)
            }
            if (instanceKey) {
              unregisterRuntimeByInstanceKey(instanceKey)
            }
          }),
        ),
      ),
    )

    if (options.tag && options.logics?.length) {
      yield* runModuleLogics({
        tag: options.tag as Context.Tag<any, PublicModuleRuntime<S, A>>,
        logics: options.logics,
        runtime,
        lifecycle,
        moduleId,
        instanceId,
      })
    }

    if (options.processes && options.processes.length > 0) {
      const env = (yield* Effect.context<Scope.Scope | R>()) as Context.Context<any>
      const rootContextOpt = Context.getOption(env, RootContextTag as any)
      const isAppModule =
        Option.isSome(rootContextOpt) &&
        Array.isArray((rootContextOpt.value as RootContext).appModuleIds) &&
        (rootContextOpt.value as RootContext).appModuleIds!.includes(moduleId)

      if (!isAppModule) {
        const processRuntimeOpt = Context.getOption(env, ProcessRuntime.ProcessRuntimeTag as any)
        const processRuntime = Option.isSome(processRuntimeOpt)
          ? (processRuntimeOpt.value as ProcessRuntime.ProcessRuntime)
          : undefined
        const scope = {
          type: 'moduleInstance',
          moduleId,
          instanceId,
        } as const

        yield* Effect.forEach(
          options.processes,
          (process) =>
            Effect.gen(function* () {
              if (processRuntime) {
                const installEffect = processRuntime.install(process as any, {
                  scope,
                  enabled: true,
                  installedAt: 'moduleRuntime',
                })

                // During the acquire phase of Layer.scoped(...), the current module runtime is not yet in Context,
                // but instance-scope processes (especially Link) may strictly require dependencies to be resolvable in scope.
                // We explicitly provide the current module runtime to avoid falsely treating itself as a missing dependency.
                const installation = options.tag
                  ? yield* installEffect.pipe(
                      Effect.provideService(options.tag as Context.Tag<any, any>, runtime as any),
                    )
                  : yield* installEffect

                if (installation !== undefined) {
                  return
                }
              }

              // Legacy fallback: a raw Effect is still allowed as a process host, but it has no Process static surface/diagnostics.
              yield* Effect.forkScoped(process as any)
            }),
          { discard: true },
        )
      }
    }

    return runtime
  })

  return program as Effect.Effect<PublicModuleRuntime<S, A>, never, Scope.Scope | R>
}
