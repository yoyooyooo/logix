import {
  Exit,
  Effect,
  Runtime,
  Stream,
  SubscriptionRef,
  PubSub,
  Scope,
  Context,
  FiberRef,
  Option,
  Queue,
  Duration,
  Chunk,
} from 'effect'
import type {
  LogicPlan,
  ModuleRuntime as PublicModuleRuntime,
  ReadonlySubscriptionRef,
  StateChangeWithMeta,
} from './module.js'
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
  RuntimeStoreTag,
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  TickSchedulerTag,
} from './env.js'
import type {
  StateTransactionInstrumentation,
  TraitConvergeTimeSlicingPatch,
  TickSchedulerService,
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
import { compareFieldPath, isPrefixOf, normalizeFieldPath, toKey, type DirtyAllReason, type FieldPath } from '../../field-path.js'
import * as RowId from '../../state-trait/rowid.js'
import * as StateTraitBuild from '../../state-trait/build.js'
import { exportConvergeStaticIr, getConvergeStaticIrDigest } from '../../state-trait/converge-ir.js'
import { makeConvergeExecIr } from '../../state-trait/converge-exec-ir.js'
import * as StateTraitConverge from '../../state-trait/converge.js'
import * as StateTraitValidate from '../../state-trait/validate.js'
import { installInternalHooks, type TraitState } from './ModuleRuntime.internalHooks.js'
import { RootContextTag, type RootContext } from './RootContext.js'
import * as ProcessRuntime from './process/ProcessRuntime.js'
import * as ReadQuery from './ReadQuery.js'
import * as SelectorGraph from './SelectorGraph.js'
import { makeModuleInstanceKey, type RuntimeStoreModuleCommit } from './RuntimeStore.js'
import {
  getRegisteredRuntime,
  getRuntimeByModuleAndInstance,
  registerRuntime,
  registerRuntimeByInstanceKey,
  unregisterRuntime,
  unregisterRuntimeByInstanceKey,
} from './ModuleRuntime.registry.js'
import {
  makeEnqueueTransaction,
  type CapturedTxnRuntimeScope,
  type EnqueueTransaction,
} from './ModuleRuntime.txnQueue.js'
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
    const moduleInstanceKey = makeModuleInstanceKey(moduleId, instanceId)
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

    const resolveConcurrencyPolicyFast = makeResolveConcurrencyPolicy({
      moduleId: options.moduleId,
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
		      convergeStaticIrDigest: undefined,
		      convergePlanCache: undefined,
	      convergeGeneration: {
	        generation: 0,
	        generationBumpCount: 0,
	      },
	      pendingCacheMissReason: undefined,
	      pendingCacheMissReasonCount: 0,
		      lastConvergeIrKeys: undefined,
		      listConfigs: [],
		    }

	    // Cached list-path set (derived from listConfigs) for txn index evidence recording.
	    // - undefined => no list traits; keep recordPatch overhead at ~0 for non-list modules.
	    let listPathSet: ReadonlySet<string> | undefined = undefined

	    let externalOwnedFieldPaths: ReadonlyArray<FieldPath> = []
	    let externalOwnedFieldPathKeys: ReadonlySet<string> = new Set()

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
	      getListPathSet: () => listPathSet,
	    })

    const recordStatePatch: RuntimeInternals['txn']['recordStatePatch'] = (
      path,
      reason,
      from,
      to,
      traitNodeId,
      stepId,
    ): void => {
      if (externalOwnedFieldPaths.length > 0) {
        const registry = txnContext.current?.fieldPathIdRegistry

        const toFieldPathOrStar = (input: StateTransaction.StatePatchPath | undefined): FieldPath | '*' | undefined => {
          if (input === undefined) return undefined
          if (input === '*') return '*'

          if (typeof input === 'number') {
            if (!registry) return '*'
            if (!Number.isFinite(input)) return '*'
            const idx = Math.floor(input)
            if (idx < 0) return '*'
            const resolved = registry.fieldPaths[idx]
            return resolved && Array.isArray(resolved) ? resolved : '*'
          }

          if (typeof input === 'string') {
            if (!registry) return '*'
            const id = registry.pathStringToId?.get(input)
            if (id == null) return '*'
            const resolved = registry.fieldPaths[id]
            return resolved && Array.isArray(resolved) ? resolved : '*'
          }

          const normalized = normalizeFieldPath(input)
          return normalized ?? '*'
        }

        const resolved = toFieldPathOrStar(path)

        const throwViolation = (details: { readonly resolvedPath?: FieldPath | '*'; readonly owned?: FieldPath }): never => {
          const owned = details.owned ?? externalOwnedFieldPaths[0]
          const ownedPath = owned ? owned.join('.') : '<unknown>'
          const resolvedPath =
            details.resolvedPath === undefined
              ? '<unknown>'
              : details.resolvedPath === '*'
                ? '*'
                : details.resolvedPath.join('.')

          const err: any = new Error(
            '[ExternalOwnedWriteError] State write overlaps an external-owned field.\n' +
              `moduleId=${options.moduleId ?? 'unknown'}\n` +
              `instanceId=${instanceId}\n` +
              `owned=${ownedPath}\n` +
              `path=${resolvedPath}\n` +
              `reason=${String(reason)}\n` +
              'Fix: do not write external-owned fields via reducers/$.state.*; use StateTrait.externalStore to own the field, and avoid setState/state.update (root writes) on modules with external-owned fields.',
          )
          err.name = 'ExternalOwnedWriteError'
          err._tag = 'ExternalOwnedWriteError'
          err.moduleId = options.moduleId
          err.instanceId = instanceId
          err.reason = reason
          err.path = path
          throw err
        }

        const ensureFieldPath = (input: FieldPath | '*' | undefined): FieldPath => {
          if (input === undefined || input === '*') {
            return throwViolation({ resolvedPath: input })
          }
          return input
        }

        if (reason === 'trait-external-store') {
          const resolvedFieldPath = ensureFieldPath(resolved)
          const key = toKey(resolvedFieldPath)
          if (!externalOwnedFieldPathKeys.has(key)) {
            throwViolation({ resolvedPath: resolvedFieldPath })
          }
        } else {
          const resolvedFieldPath = ensureFieldPath(resolved)
          for (const owned of externalOwnedFieldPaths) {
            if (isPrefixOf(owned, resolvedFieldPath) || isPrefixOf(resolvedFieldPath, owned)) {
              throwViolation({ resolvedPath: resolvedFieldPath, owned })
            }
          }
        }
      }

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
      capturedContext: CapturedTxnRuntimeScope | undefined
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
    const txnHistory = {
      buffer: new Array<StateTransaction.StateTransaction<S> | undefined>(maxTxnHistory),
      start: 0,
      size: 0,
      capacity: maxTxnHistory,
    }
    const txnById = new Map<string, StateTransaction.StateTransaction<S>>()

    /**
     * Transaction queue:
     * - Executes each logic entrypoint (dispatch / source-refresh / future extensions) serially in FIFO order.
     * - Guarantees at most one transaction at a time per instance; different instances can still run in parallel.
     */
    const kernelImplementationRef = yield* KernelRef.resolveKernelImplementationRef()
    const cutoverGateModeOpt = yield* Effect.serviceOption(RuntimeKernel.FullCutoverGateModeTag)
    const cutoverGateMode = Option.isSome(cutoverGateModeOpt) ? cutoverGateModeOpt.value : 'fullCutover'
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

    const withRuntimeServiceBuiltins = <A, E, R>(
      serviceId: string,
      builtinMake: Effect.Effect<unknown, never, any>,
      effect: Effect.Effect<A, E, R>,
    ) =>
      effect.pipe(
        Effect.provideService(RuntimeServiceBuiltins.RuntimeServiceBuiltinsTag, {
          getBuiltinMake: (candidateServiceId) =>
            candidateServiceId === serviceId
              ? (builtinMake as Effect.Effect<unknown, never, any>)
              : Effect.dieMessage(`[Logix] builtin make not available: ${candidateServiceId}`),
        } satisfies RuntimeServiceBuiltins.RuntimeServiceBuiltins),
      )

    const readCurrentOpSeq = (): Effect.Effect<number | undefined> =>
      FiberRef.get(Debug.currentOpSeq).pipe(
        Effect.map((opSeqRaw) =>
          typeof opSeqRaw === 'number' && Number.isFinite(opSeqRaw) && opSeqRaw >= 0 ? Math.floor(opSeqRaw) : undefined,
        ),
      )

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

    const enqueueTransactionBase = yield* withRuntimeServiceBuiltins('txnQueue', makeTxnQueueBuiltin, enqueueTxnSel.impl.make)

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

    const runOperation = yield* withRuntimeServiceBuiltins(
      'operationRunner',
      makeOperationRunnerBuiltin,
      runOperationSel.impl.make,
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

    const runtimeStoreOpt = yield* Effect.serviceOption(RuntimeStoreTag)
    if (Option.isSome(runtimeStoreOpt)) {
      runtimeStoreOpt.value.registerModuleInstance({
        moduleId,
        instanceId,
        moduleInstanceKey,
        initialState: initialSnapshot,
      })
    }

    const rootContextSvcOpt = yield* Effect.serviceOption(RootContextTag)
    const rootContext = Option.isSome(rootContextSvcOpt) ? (rootContextSvcOpt.value as RootContext) : undefined

    const tickSchedulerOpt = (yield* Effect.serviceOption(TickSchedulerTag)) as Option.Option<TickSchedulerService>
    let tickSchedulerCached: TickSchedulerService | undefined = Option.isSome(tickSchedulerOpt) ? tickSchedulerOpt.value : undefined

    const readTickSchedulerFromRootContext = (root: RootContext | undefined): TickSchedulerService | undefined => {
      if (!root?.context) {
        return undefined
      }

      const fromRoot = Context.getOption(root.context, TickSchedulerTag as any) as Option.Option<TickSchedulerService>
      return Option.isSome(fromRoot) ? fromRoot.value : undefined
    }

    const refreshTickSchedulerFromEnv = (): Effect.Effect<TickSchedulerService | undefined> =>
      Effect.gen(function* () {
        const refreshed = (yield* Effect.serviceOption(TickSchedulerTag)) as Option.Option<TickSchedulerService>
        if (Option.isSome(refreshed)) {
          tickSchedulerCached = refreshed.value
          return refreshed.value
        }
        return undefined
      })

    const enqueueTransaction: EnqueueTransaction = ((a0: any, a1?: any) =>
      Effect.gen(function* () {
        // Cache TickScheduler from the current fiber Env whenever possible:
        // - ManagedRuntime scenarios (e.g. React RuntimeProvider injecting tick services) may not have TickSchedulerTag
        //   visible during ModuleRuntime initialization.
        // - But it is often available at enqueue-time (callsite), and caching it ensures onCommit can publish into RuntimeStore.
        if (!tickSchedulerCached) {
          const refreshed = yield* refreshTickSchedulerFromEnv()
          if (!refreshed) {
            const fromRoot = readTickSchedulerFromRootContext(rootContext)
            if (fromRoot) {
              tickSchedulerCached = fromRoot
            }
          }
        }

        // Preserve the original call signature: (eff) or (lane, eff).
        return yield* (a1 !== undefined ? (enqueueTransactionBase as any)(a0, a1) : (enqueueTransactionBase as any)(a0))
      })) as any

    const makeTransactionBuiltin = Effect.sync(() =>
      makeTransactionOps<S>({
        moduleId,
        optionsModuleId: options.moduleId,
        instanceId,
        stateRef,
        commitHub,
        shouldPublishCommitHub: () => commitHubSubscriberCount > 0,
        recordStatePatch,
        onCommit: ({ state, meta, transaction, diagnosticsLevel }) =>
          Effect.gen(function* () {
            let scheduler = tickSchedulerCached
            if (!scheduler) {
              scheduler = yield* refreshTickSchedulerFromEnv()
            }

            let root = rootContext
            if (!root) {
              const rootOpt = yield* Effect.serviceOption(RootContextTag)
              if (Option.isSome(rootOpt)) {
                root = rootOpt.value as RootContext
              }
            }

            if (!scheduler) {
              const fromRoot = readTickSchedulerFromRootContext(root)
              if (fromRoot) {
                scheduler = fromRoot
                tickSchedulerCached = fromRoot
              }
            }

            if (!scheduler && diagnosticsLevel !== 'off' && isDevEnv()) {
              yield* Debug.record({
                type: 'diagnostic',
                moduleId,
                instanceId,
                txnSeq: meta.txnSeq,
                txnId: meta.txnId,
                trigger: {
                  kind: meta.originKind ?? 'unknown',
                  name: meta.originName ?? meta.originKind ?? 'unknown',
                },
                code: 'tick_scheduler::missing_service',
                severity: 'error',
                message:
                  'TickScheduler service is not visible in ModuleRuntime.onCommit; tickSeq will not advance and RuntimeStore subscribers will not flush.',
                hint:
                  'Ensure TickSchedulerTag is available in the fiber Env for logic/task/txnQueue execution (AppRuntime baseLayer + RootContext wiring).',
                kind: 'missing_tick_scheduler',
              })
            }

            // Avoid selector graph work when there are no selectors at all.
            // (SelectorGraph will no-op; transaction.dirty is already snapshotted at commit time.)
            if (selectorGraph.hasAnyEntries()) {
              yield* selectorGraph.onCommit(
                state,
                meta,
                transaction.dirty,
                diagnosticsLevel,
                scheduler
                  ? (selectorId) => {
                      scheduler.onSelectorChanged({
                        moduleInstanceKey,
                        selectorId,
                        priority: meta.priority,
                      })
                    }
                  : undefined,
              )
            }

            if (scheduler) {
              const opSeq = yield* readCurrentOpSeq()
                let resolvedSchedulingPolicy: RuntimeStoreModuleCommit['schedulingPolicy'] | undefined
                if (diagnosticsLevel !== 'off') {
                  const resolved = yield* resolveConcurrencyPolicyFast()
                  resolvedSchedulingPolicy = {
                    configScope: resolved.configScope,
                    concurrencyLimit: resolved.concurrencyLimit,
                    allowUnbounded: resolved.allowUnbounded,
                  losslessBackpressureCapacity: resolved.losslessBackpressureCapacity,
                  pressureWarningThreshold: resolved.pressureWarningThreshold,
                  warningCooldownMs: resolved.warningCooldownMs,
                  resolvedAtTxnSeq: meta.txnSeq,
                }
              }

              yield* scheduler.onModuleCommit({
                moduleId,
                instanceId,
                moduleInstanceKey,
                state,
                meta,
                opSeq,
                schedulingPolicy: resolvedSchedulingPolicy,
              })
            }
          }),
        enqueueTransaction,
        runOperation,
        txnContext,
        traitConvergeTimeSlicing: traitConvergeTimeSlicingState,
	        traitRuntime: {
	          getProgram: () => traitState.program,
	          getConvergeStaticIrDigest: () => traitState.convergeStaticIrDigest,
	          getConvergePlanCache: () => traitState.convergePlanCache,
	          getConvergeGeneration: () => traitState.convergeGeneration,
	          getPendingCacheMissReason: () => traitState.pendingCacheMissReason,
	          getPendingCacheMissReasonCount: () => traitState.pendingCacheMissReasonCount,
	          setPendingCacheMissReason: (next) => {
	            traitState.pendingCacheMissReason = next
	            if (next == null) {
	              traitState.pendingCacheMissReasonCount = 0
	            }
	          },
	          rowIdStore,
	          getListConfigs: () => traitState.listConfigs,
	        },
        resolveTraitConvergeConfig,
        isDevEnv,
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

    const { readState, setStateInternal, runWithStateTransaction } = yield* withRuntimeServiceBuiltins(
      'transaction',
      makeTransactionBuiltin,
      transactionSel.impl.make,
    )

    let deferredFlushCoalescedCount = 0
    let deferredFlushCanceledCount = 0

    const runDeferredConvergeFlush = (args: {
      readonly dirtyPathsSnapshot: ReadonlyArray<StateTransaction.StatePatchPath>
      readonly dirtyAllReason?: DirtyAllReason
      readonly lane: 'urgent' | 'nonUrgent'
      readonly slice?: { readonly start: number; readonly end: number; readonly total: number }
      readonly captureOpSeq?: boolean
      readonly emitLaneEvidence?: (anchor: {
        readonly txnSeq: number
        readonly txnId?: string
        readonly opSeq?: number
      }) => Effect.Effect<void, never, never>
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
                  capturedOpSeq = yield* readCurrentOpSeq()
                }

                if (args.emitLaneEvidence) {
                  yield* args.emitLaneEvidence({
                    txnSeq: capturedTxnSeq,
                    txnId: capturedTxnId,
                    opSeq: capturedOpSeq,
                  })
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
            if (txnLanePolicy.overrideMode === 'forced_off') {
              deferredFlushCoalescedCount += 1
              deferredFlushCanceledCount += 1
            }

            const reasons: ReadonlyArray<Debug.TxnLaneEvidenceReason> =
              txnLanePolicy.overrideMode === 'forced_off'
                ? ['forced_off', 'canceled']
                : txnLanePolicy.overrideMode === 'forced_sync'
                  ? ['forced_sync']
                  : ['disabled']

            yield* withCapturedContext(
              runDeferredConvergeFlush({
                dirtyPathsSnapshot,
                dirtyAllReason: dirtyAllReasonSnapshot,
                lane: 'urgent',
                captureOpSeq: shouldEmitLaneEvidenceForPolicy,
                emitLaneEvidence: shouldEmitLaneEvidenceForPolicy
                  ? (anchor) =>
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
                          } satisfies Debug.TxnLaneEvidence,
                        },
                      })
                  : undefined,
              }),
            )

            return
          }

          const totalSteps = program.convergeExecIr.topoOrderDeferredInt32.length

          let cursor = 0
          // Perf/latency tradeoff:
          // - Smaller initial slices reduce worst-case urgent blocking while a nonUrgent backlog is being drained.
          // - Catch-up time is still bounded by maxLagMs and the yield policy.
          const initialChunkSize = txnLanePolicy.budgetMs <= 1 ? 1 : 32
          let chunkSize = Math.min(initialChunkSize, totalSteps)
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

    const actionTopicHubCapacity = yield* resolveConcurrencyPolicy().pipe(
      Effect.map((policy) => policy.losslessBackpressureCapacity),
    )
    const actionTagHubsByTag = new Map<string, PubSub.PubSub<A>>()
    if (declaredActionTags && declaredActionTags.size > 0) {
      const topicHubEntries = yield* Effect.forEach(
        declaredActionTags,
        (tag) =>
          PubSub.bounded<A>(actionTopicHubCapacity).pipe(
            Effect.map((hub) => [tag, hub] as const),
          ),
      )
      for (const [tag, hub] of topicHubEntries) {
        actionTagHubsByTag.set(tag, hub)
      }
    }

    const actionTagOfUnknown = (action: unknown): string | undefined => {
      const tag = (action as any)?._tag
      if (typeof tag === 'string' && tag.length > 0) return tag
      const type = (action as any)?.type
      if (typeof type === 'string' && type.length > 0) return type
      if (tag != null) return String(tag)
      if (type != null) return String(type)
      return undefined
    }

    const actionMatchesTopicTag = (action: unknown, topicTag: string): boolean => {
      const tag = (action as any)?._tag
      if (typeof tag === 'string' && tag.length > 0) {
        if (tag === topicTag) return true
        const type = (action as any)?.type
        return typeof type === 'string' && type.length > 0 && type === topicTag
      }

      const type = (action as any)?.type
      if (typeof type === 'string' && type.length > 0) {
        return type === topicTag
      }

      const normalized = actionTagOfUnknown(action)
      return normalized != null && normalized.length > 0 && normalized === topicTag
    }

    const actionsStream: Stream.Stream<A> = Stream.fromPubSub(actionHub)
    const actionsByTagStream = (tag: string): Stream.Stream<A> => {
      const topicHub = actionTagHubsByTag.get(tag)
      if (topicHub) {
        return Stream.fromPubSub(topicHub)
      }
      return actionsStream.pipe(Stream.filter((action: A) => actionMatchesTopicTag(action, tag)))
    }

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
        actionTagHubsByTag,
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

    const dispatchOps = yield* withRuntimeServiceBuiltins('dispatch', makeDispatchBuiltin, dispatchSel.impl.make)

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

    const gate = FullCutoverGate.evaluateFullCutoverGate({
      mode: cutoverGateMode,
      requestedKernelId: kernelImplementationRef.kernelId,
      runtimeServicesEvidence,
      diagnosticsLevel: isDevEnv() ? 'light' : 'off',
    })

    if (gate.verdict === 'FAIL') {
      const msg = isDevEnv()
        ? [
            '[FullCutoverGateFailed] Runtime assembly detected implicit fallback / missing bindings under fullCutover mode.',
            `requestedKernelId: ${kernelImplementationRef.kernelId}`,
            `reason: ${gate.reason}`,
            `missingServiceIds: ${gate.missingServiceIds.join(',')}`,
            `fallbackServiceIds: ${gate.fallbackServiceIds.join(',')}`,
            `requiredServiceCount: ${gate.evidence.requiredServiceCount}`,
            `anchor: moduleId=${gate.anchor.moduleId}, instanceId=${gate.anchor.instanceId}, txnSeq=${gate.anchor.txnSeq}`,
          ].join('\n')
        : 'Full cutover gate failed'

      const err: any = new Error(msg)
      err.name = 'FullCutoverGateFailed'
      err.gate = gate
      err.reason = gate.reason
      err.evidence = gate.evidence
      err.instanceId = instanceId
      err.moduleId = options.moduleId
      throw err
    }

    const writeDenied = () =>
      Effect.dieMessage(
        '[ModuleRuntime.ref] state ref is read-only. Use runtime.setState / $.state.update / $.state.mutate instead.',
      )

    const denyPublish = (_value: unknown): Effect.Effect<boolean> => writeDenied() as Effect.Effect<boolean>

    const denyWithPermits =
      (_permits: number) =>
      <A0, E0, R0>(_self: Effect.Effect<A0, E0, R0>): Effect.Effect<A0, E0, R0> =>
        writeDenied() as Effect.Effect<A0, E0, R0>

    const rootDenyWriteRef = {
      get: SubscriptionRef.get(stateRef),
      modify: writeDenied,
    }

    // Keep root ref identity stable for a runtime instance (important for storeId anchoring in ExternalStore.fromSubscriptionRef).
    const rootReadonlyRef = {
      get: SubscriptionRef.get(stateRef),
      changes: stateRef.changes,
      // Runtime guard for unsafe casts (`as any as SubscriptionRef`) to keep failure deterministic.
      modify: writeDenied,
      ref: rootDenyWriteRef,
      pubsub: {
        publish: denyPublish,
      },
      semaphore: {
        withPermits: denyWithPermits,
      },
    } as const

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
      actions$: actionsStream,
      actionsByTag$: actionsByTagStream,
      actionsWithMeta$: Stream.fromPubSub(actionCommitHub),
      changes: <V>(selector: (s: S) => V) => Stream.map(stateRef.changes, selector).pipe(Stream.changes),
      changesWithMeta: <V>(selector: (s: S) => V) =>
        Stream.map(fromCommitHub, ({ value, meta }) => ({
          value: selector(value),
          meta,
        })),
      changesReadQueryWithMeta: <V>(input: ReadQuery.ReadQueryInput<S, V>) => {
        const compiled: ReadQuery.ReadQueryCompiled<S, V> = ReadQuery.isReadQueryCompiled<S, V>(input)
          ? input
          : ReadQuery.compile(input)

        if (compiled.lane !== 'static') {
          const buildGradeDecision = ReadQuery.resolveBuildGradeStrictGateDecision({
            moduleId,
            instanceId,
            txnSeq: 0,
            compiled,
          })

          const runtimeCompiled = ReadQuery.markRuntimeMissingBuildGrade(compiled)
          let strictGateChecked = false

          return Stream.mapEffect(fromCommitHub, ({ value, meta }) =>
            Effect.gen(function* () {
              if (!strictGateChecked) {
                strictGateChecked = true

                if (buildGradeDecision?.verdict === 'WARN') {
                  yield* Debug.record(buildGradeDecision.diagnostic)
                } else if (buildGradeDecision?.verdict === 'FAIL') {
                  yield* Debug.record(buildGradeDecision.diagnostic)
                  yield* Effect.die(buildGradeDecision.error)
                }

                if (ReadQuery.shouldEvaluateStrictGateAtRuntime(runtimeCompiled)) {
                  const strictGateOpt = yield* Effect.serviceOption(ReadQueryStrictGateConfigTag)

                  if (Option.isSome(strictGateOpt)) {
                    const decision = ReadQuery.evaluateStrictGate({
                      config: strictGateOpt.value,
                      moduleId,
                      instanceId,
                      txnSeq: 0,
                      compiled: runtimeCompiled,
                    })

                    if (decision.verdict === 'WARN') {
                      yield* Debug.record(decision.diagnostic)
                    } else if (decision.verdict === 'FAIL') {
                      yield* Debug.record(decision.diagnostic)
                      yield* Effect.die(decision.error)
                    }
                  }
                }
              }

              return {
                value: runtimeCompiled.select(value),
                meta,
              }
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
      ref: <V = S>(selector?: (s: S) => V): ReadonlySubscriptionRef<V> => {
        if (!selector) {
          return rootReadonlyRef as unknown as ReadonlySubscriptionRef<V>
        }

        const denyWriteRef = {
          get: Effect.map(SubscriptionRef.get(stateRef), selector),
          modify: writeDenied,
        }

        const derivedRef = {
          get: Effect.map(SubscriptionRef.get(stateRef), selector),
          // Derived stream: selector-map stateRef.changes and de-duplicate.
          changes: Stream.map(stateRef.changes, selector).pipe(Stream.changes) as Stream.Stream<V>,
          // Runtime guard for unsafe casts (`as any as SubscriptionRef`) to keep failure deterministic.
          modify: writeDenied,
          ref: denyWriteRef,
          pubsub: {
            publish: denyPublish,
          },
          semaphore: {
            withPermits: denyWithPermits,
          },
        }

        return derivedRef
      },
    }

    // Best-effort sync action callables (perf / JS entrypoints):
    // - Exposes `runtime.actions.<tag>(payload?)` for callers that want "just do it" semantics.
    // - Tries to run the dispatch synchronously when possible (common case: no queue contention) so perf workloads
    //   can time the tick flush separately from transaction overhead.
    // - Falls back to forking the dispatch Effect if it cannot complete synchronously.
    if (declaredActionTags && declaredActionTags.size > 0) {
      const driver = yield* Effect.runtime<never>()
      const actions: any = {}

      const dispatchSyncBestEffort = (action: A): void => {
        try {
          const exit = Runtime.runSyncExit(driver, dispatchOps.dispatch(action) as any)
          if (Exit.isFailure(exit)) {
            Runtime.runFork(driver, dispatchOps.dispatch(action) as any)
          }
        } catch {
          try {
            Runtime.runFork(driver, dispatchOps.dispatch(action) as any)
          } catch {
            // ignore best-effort failures (e.g. runtime disposed)
          }
        }
      }

      for (const tag of declaredActionTags) {
        actions[tag] = (payload?: unknown) => {
          const action = payload === undefined ? ({ _tag: tag } as any) : ({ _tag: tag, payload } as any)
          dispatchSyncBestEffort(action as A)
        }
      }

      ;(runtime as any).actions = actions
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
	        traitState.pendingCacheMissReasonCount = (traitState.pendingCacheMissReasonCount ?? 0) + 1
	        traitState.convergePlanCache = new StateTraitConverge.ConvergePlanCache(convergePlanCacheCapacity)
	      }

      traitState.lastConvergeIrKeys = nextKeys

      const convergeIr = nextIr
        ? {
            ...nextIr,
            generation: traitState.convergeGeneration.generation,
          }
        : undefined

      const prevConvergeIr = (traitState.program as any)?.convergeIr as any | undefined
      const canPreserveInlinePlanCache =
        !!prevConvergeIr &&
        !!nextIr &&
        prevConvergeIr.writersKey === (nextIr as any).writersKey &&
        prevConvergeIr.depsKey === (nextIr as any).depsKey

      const prevConvergeExecIr = (traitState.program as any)?.convergeExecIr as ReturnType<typeof makeConvergeExecIr>
        | undefined

      const convergeExecIr =
        convergeIr && !(convergeIr as any).configError ? makeConvergeExecIr(convergeIr as any) : undefined

      if (convergeExecIr && prevConvergeExecIr) {
        // Preserve hot-path perf hints across generation bumps (forward-only; no compatibility layer).
        // This keeps auto mode stable under frequent register/bump cycles (e.g. graphChangeInvalidation perf boundary).
        convergeExecIr.perf.fullCommitEwmaOffMs = prevConvergeExecIr.perf.fullCommitEwmaOffMs
        convergeExecIr.perf.fullCommitLastTxnSeqOff = prevConvergeExecIr.perf.fullCommitLastTxnSeqOff
        convergeExecIr.perf.fullCommitMinOffMs = prevConvergeExecIr.perf.fullCommitMinOffMs
        convergeExecIr.perf.fullCommitSampleCountOff = prevConvergeExecIr.perf.fullCommitSampleCountOff
        convergeExecIr.perf.recentPlanMissHash1 = prevConvergeExecIr.perf.recentPlanMissHash1
        convergeExecIr.perf.recentPlanMissHash2 = prevConvergeExecIr.perf.recentPlanMissHash2

        // Reuse per-instance scratch draft across rebuilds (avoids per-txn allocations on shallow graphs).
        const nextScratch: any = convergeExecIr.scratch as any
        const prevScratch: any = prevConvergeExecIr.scratch as any
        nextScratch.shallowInPlaceDraft = prevScratch.shallowInPlaceDraft

        // Inline plan micro-cache is safe to preserve only when the converge graph keys are unchanged.
        if (canPreserveInlinePlanCache) {
          nextScratch.inlinePlanCacheHash1 = prevScratch.inlinePlanCacheHash1
          nextScratch.inlinePlanCacheSize1 = prevScratch.inlinePlanCacheSize1
          nextScratch.inlinePlanCachePlan1 = prevScratch.inlinePlanCachePlan1
          nextScratch.inlinePlanCacheHash2 = prevScratch.inlinePlanCacheHash2
          nextScratch.inlinePlanCacheSize2 = prevScratch.inlinePlanCacheSize2
          nextScratch.inlinePlanCachePlan2 = prevScratch.inlinePlanCachePlan2
          nextScratch.inlinePlanCacheRecentMissHash1 = prevScratch.inlinePlanCacheRecentMissHash1
          nextScratch.inlinePlanCacheRecentMissHash2 = prevScratch.inlinePlanCacheRecentMissHash2
        }
      }

      traitState.convergeStaticIrDigest =
        convergeIr && !(convergeIr as any).configError ? getConvergeStaticIrDigest(convergeIr as any) : undefined

	      traitState.program = {
	        ...(program as any),
	        convergeIr,
	        convergeExecIr,
	      }
	      traitState.listConfigs = RowId.collectListConfigs((program as any).spec)
	      listPathSet = (() => {
	        const configs = traitState.listConfigs
	        if (!Array.isArray(configs) || configs.length === 0) return undefined
	        const set = new Set<string>()
	        for (const cfg of configs as ReadonlyArray<any>) {
	          const p = cfg?.path
	          if (typeof p === 'string' && p.length > 0) set.add(p)
	        }
	        return set.size > 0 ? set : undefined
	      })()
	      const owned: FieldPath[] = ((program as any)?.entries ?? [])
	        .filter((e: any) => e && e.kind === 'externalStore' && typeof e.fieldPath === 'string')
	        .map((e: any) => normalizeFieldPath(e.fieldPath))
	        .filter((p: any): p is FieldPath => p != null)
        .sort(compareFieldPath)
      externalOwnedFieldPaths = owned
      externalOwnedFieldPathKeys = new Set(owned.map((p) => toKey(p)))

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

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        if (Option.isSome(runtimeStoreOpt)) {
          runtimeStoreOpt.value.unregisterModuleInstance(moduleInstanceKey)
        }
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
