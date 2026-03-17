import { Effect, Layer, ServiceMap } from 'effect'
import type { TraitConvergeRequestedMode } from '../../state-trait/model.js'
import type { ReadQueryStrictGateConfig } from './ReadQuery.js'
import { getGlobalHostScheduler, type HostScheduler } from './HostScheduler.js'
import { makeRuntimeStore, type RuntimeStore } from './RuntimeStore.js'
import { makeTickScheduler, type TickScheduler, type TickSchedulerConfig } from './TickScheduler.js'
import { makeDeclarativeLinkRuntime, type DeclarativeLinkRuntime } from './DeclarativeLinkRuntime.js'
import { normalizeBoolean, normalizeNonNegativeNumber } from './normalize.js'

// Unified runtime env detection, avoiding bundlers inlining NODE_ENV at build time.
export const getNodeEnv = (): string | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any)?.process?.env
    return typeof env?.NODE_ENV === 'string' ? env.NODE_ENV : undefined
  } catch {
    return undefined
  }
}

export const isDevEnv = (): boolean => getNodeEnv() !== 'production'

export type StateTransactionInstrumentation = 'full' | 'light'

/**
 * getDefaultStateTxnInstrumentation：
 * - Currently chooses default instrumentation by NODE_ENV:
 *   - dev / test: full (keep patches and snapshots for debugging).
 *   - production: light (keep minimal semantics to reduce overhead).
 * - May evolve with finer-grained overrides in Runtime.make / Module.make.
 */
export const getDefaultStateTxnInstrumentation = (): StateTransactionInstrumentation => (isDevEnv() ? 'full' : 'light')

/**
 * Runtime-level StateTransaction config Service:
 * - Provided at the app layer by Logix.Runtime.make / AppRuntime.makeApp.
 * - ModuleRuntime.make can read runtime-level defaults from Env.
 *
 * Notes:
 * - instrumentation is only a runtime-level default.
 * - Explicit instrumentation in ModuleImpl / ModuleRuntimeOptions has higher priority.
 */
export interface StateTransactionRuntimeConfig {
  readonly instrumentation?: StateTransactionInstrumentation
  /**
   * StateTrait derived converge budget (ms):
   * - Exceeding the budget triggers a soft degrade (freeze derived fields, preserve base writes and 0/1 commit semantics).
   * - Default is 200ms (aligned with the 007 spec threshold).
   */
  readonly traitConvergeBudgetMs?: number
  /**
   * Auto-mode decision budget (ms):
   * - Only used during the decision phase when requestedMode="auto".
   * - Exceeding the budget must immediately fall back to full (and record evidence).
   */
  readonly traitConvergeDecisionBudgetMs?: number
  /**
   * StateTrait converge scheduling strategy:
   * - full: full topo execution (current default; safest).
   * - dirty: minimal triggering based on dirtyPaths + deps in the txn window (requires accurate deps).
   */
  readonly traitConvergeMode?: TraitConvergeRequestedMode
  /**
   * 043: Trait converge time-slicing (explicit opt-in). Disabled by default.
   */
  readonly traitConvergeTimeSlicing?: TraitConvergeTimeSlicingPatch
  /**
   * 060: Txn Lanes (priority scheduling for transaction follow-up work). Enabled by default since 062.
   */
  readonly txnLanes?: TxnLanesPatch
  /**
   * R2-A: high-level Txn Lane policy surface (tier-first).
   * - When provided, it is treated as canonical over txnLanes.
   */
  readonly txnLanePolicy?: TxnLanePolicyInput
  /**
   * Runtime-level per-module overrides (hotfix path):
   * - Only affects converge behavior for the specified moduleId.
   * - Lower priority than Provider overrides.
   */
  readonly traitConvergeOverridesByModuleId?: Readonly<Record<string, StateTransactionTraitConvergeOverrides>>
  /**
   * 060: Txn Lanes runtime_module overrides (hotfix / gradual tuning).
   * - Only affects the specified moduleId.
   * - Lower priority than Provider overrides.
   */
  readonly txnLanesOverridesByModuleId?: Readonly<Record<string, TxnLanesPatch>>
  /**
   * R2-A: tier-first runtime_module overrides.
   * - Only affects the specified moduleId.
   * - Lower priority than Provider overrides.
   */
  readonly txnLanePolicyOverridesByModuleId?: Readonly<Record<string, TxnLanePolicyInput>>
}

class StateTransactionConfigTagImpl extends ServiceMap.Service<
  StateTransactionConfigTagImpl,
  StateTransactionRuntimeConfig
>()('@logixjs/core/StateTransactionRuntimeConfig') {}

export const StateTransactionConfigTag = StateTransactionConfigTagImpl

export type ReadQueryStrictGateRuntimeConfig = ReadQueryStrictGateConfig

class ReadQueryStrictGateConfigTagImpl extends ServiceMap.Service<
  ReadQueryStrictGateConfigTagImpl,
  ReadQueryStrictGateRuntimeConfig
>()('@logixjs/core/ReadQueryStrictGateRuntimeConfig') {}

export const ReadQueryStrictGateConfigTag = ReadQueryStrictGateConfigTagImpl

export type ReplayMode = 'live' | 'replay'

export interface ReplayModeConfig {
  readonly mode: ReplayMode
}

class ReplayModeConfigTagImpl extends ServiceMap.Service<
  ReplayModeConfigTagImpl,
  ReplayModeConfig
>()('@logixjs/core/ReplayModeConfig') {}

export const ReplayModeConfigTag = ReplayModeConfigTagImpl

export const replayModeLayer = (mode: ReplayMode): Layer.Layer<ReplayModeConfigTagImpl, never, never> =>
  Layer.succeed(ReplayModeConfigTag, { mode })

export interface StateTransactionTraitConvergeOverrides {
  readonly traitConvergeMode?: TraitConvergeRequestedMode
  readonly traitConvergeBudgetMs?: number
  readonly traitConvergeDecisionBudgetMs?: number
  readonly traitConvergeTimeSlicing?: TraitConvergeTimeSlicingPatch
}

export type TxnLanePolicyTier = 'off' | 'sync' | 'interactive' | 'throughput'

export interface TxnLanePolicyTuning {
  readonly budgetMs?: number
  readonly debounceMs?: number
  readonly maxLagMs?: number
  readonly allowCoalesce?: boolean
  readonly yieldStrategy?: 'baseline' | 'inputPending'
}

export type TxnLanePolicyInput =
  | { readonly tier: TxnLanePolicyTier }
  | { readonly tier: TxnLanePolicyTier; readonly tuning: TxnLanePolicyTuning }

export interface TxnLanesPatch {
  /**
   * enabled: whether Txn Lanes is enabled (default on since 062).
   * - undefined: default enabled (when not explicitly configured)
   * - false: disabled (returns to baseline behavior)
   * - true: enabled (only affects scheduling of follow-up work outside the transaction; transactions remain synchronous)
   */
  readonly enabled?: boolean
  /**
   * overrideMode: runtime temporary override (for debugging/rollback/comparison).
   * - forced_off: forcibly disables Txn Lanes (returns to baseline behavior).
   * - forced_sync: forces fully synchronous execution (ignores non-urgent deferral and time-slicing; used for comparisons).
   *
   * Notes:
   * - Override precedence follows StateTransactionOverrides: provider > runtime_module > runtime_default > builtin.
   * - Overrides must be explainable by evidence (see 060 LaneEvidence reasons).
   */
  readonly overrideMode?: 'forced_off' | 'forced_sync'
  /** non-urgent work loop slice budget (ms). */
  readonly budgetMs?: number
  /** Non-urgent backlog coalescing window (ms). */
  readonly debounceMs?: number
  /** Max lag upper bound (ms): exceeding it triggers an explainable starvation protection (forced catch-up). */
  readonly maxLagMs?: number
  /** Whether to allow coalescing/canceling intermediate non-urgent work (must preserve eventual consistency). */
  readonly allowCoalesce?: boolean
  /**
   * Yield strategy for the non-urgent work loop (progressive enhancement).
   * - baseline: uses only time budget + hard upper bound
   * - inputPending: when supported by browsers, also consults `navigator.scheduling.isInputPending`
   */
  readonly yieldStrategy?: 'baseline' | 'inputPending'
}

type NormalizedTxnLanePolicyInput = {
  readonly tier: TxnLanePolicyTier
  readonly patch: TxnLanesPatch
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const presetPatchByTier: Readonly<Record<TxnLanePolicyTier, TxnLanesPatch>> = {
  off: { overrideMode: 'forced_off', enabled: false },
  sync: { overrideMode: 'forced_sync', enabled: false },
  interactive: {
    enabled: true,
    budgetMs: 1,
    debounceMs: 0,
    maxLagMs: 50,
    allowCoalesce: true,
    yieldStrategy: 'baseline',
  },
  throughput: {
    enabled: true,
    budgetMs: 4,
    debounceMs: 0,
    maxLagMs: 100,
    allowCoalesce: true,
    yieldStrategy: 'baseline',
  },
}

export const normalizeTxnLanePolicyInput = (value: unknown): NormalizedTxnLanePolicyInput | undefined => {
  if (!isRecord(value)) return undefined
  const rawTier = value.tier
  if (rawTier !== 'off' && rawTier !== 'sync' && rawTier !== 'interactive' && rawTier !== 'throughput') {
    return undefined
  }

  const base = presetPatchByTier[rawTier]
  if (rawTier === 'off' || rawTier === 'sync') {
    return { tier: rawTier, patch: base }
  }

  let patch: TxnLanesPatch = base
  const rawTuning = value.tuning
  if (!isRecord(rawTuning)) {
    return { tier: rawTier, patch }
  }

  const nextBudgetMs = normalizeNonNegativeNumber(rawTuning.budgetMs)
  if (nextBudgetMs != null) patch = { ...patch, budgetMs: nextBudgetMs }

  const nextDebounceMs = normalizeNonNegativeNumber(rawTuning.debounceMs)
  if (nextDebounceMs != null) patch = { ...patch, debounceMs: nextDebounceMs }

  const nextMaxLagMs = normalizeNonNegativeNumber(rawTuning.maxLagMs)
  if (nextMaxLagMs != null) patch = { ...patch, maxLagMs: nextMaxLagMs }

  const nextAllowCoalesce = normalizeBoolean(rawTuning.allowCoalesce)
  if (nextAllowCoalesce != null) patch = { ...patch, allowCoalesce: nextAllowCoalesce }

  if (rawTuning.yieldStrategy === 'baseline' || rawTuning.yieldStrategy === 'inputPending') {
    patch = { ...patch, yieldStrategy: rawTuning.yieldStrategy }
  }

  return { tier: rawTier, patch }
}

export interface TraitConvergeTimeSlicingPatch {
  /**
   * enabled：
   * - false/undefined: disabled (default)
   * - true: enables time-slicing (only affects computed/link explicitly marked as deferred)
   */
  readonly enabled?: boolean
  /**
   * debounceMs: coalescing interval (ms) for the deferral window; merges high-frequency inputs into one deferred flush.
   */
  readonly debounceMs?: number
  /**
   * maxLagMs: max lag upper bound (ms); exceeding it triggers an explainable forced flush (starvation protection).
   */
  readonly maxLagMs?: number
}

/**
 * Provider-scoped StateTransactionOverrides (delta overrides):
 * - Used to inject more local overrides into a Provider subtree on top of inherited global runtime config.
 * - Override precedence: provider > runtime_module > runtime_default > builtin.
 */
export interface StateTransactionOverrides {
  readonly traitConvergeMode?: TraitConvergeRequestedMode
  readonly traitConvergeBudgetMs?: number
  readonly traitConvergeDecisionBudgetMs?: number
  readonly traitConvergeTimeSlicing?: TraitConvergeTimeSlicingPatch
  readonly traitConvergeOverridesByModuleId?: Readonly<Record<string, StateTransactionTraitConvergeOverrides>>
  /** 060: Txn Lanes provider-level overrides (delta overrides). */
  readonly txnLanes?: TxnLanesPatch
  /** R2-A: tier-first provider-level overrides (delta overrides). */
  readonly txnLanePolicy?: TxnLanePolicyInput
  /** 060: Txn Lanes provider_module overrides (by moduleId). */
  readonly txnLanesOverridesByModuleId?: Readonly<Record<string, TxnLanesPatch>>
  /** R2-A: tier-first provider_module overrides (by moduleId). */
  readonly txnLanePolicyOverridesByModuleId?: Readonly<Record<string, TxnLanePolicyInput>>
}

class StateTransactionOverridesTagImpl extends ServiceMap.Service<
  StateTransactionOverridesTagImpl,
  StateTransactionOverrides
>()('@logixjs/core/StateTransactionOverrides') {}

export const StateTransactionOverridesTag = StateTransactionOverridesTagImpl

export type SchedulingPolicyLimit = number | 'unbounded'
export type ConcurrencyLimit = SchedulingPolicyLimit

export interface SchedulingPolicySurfacePatch {
  readonly concurrencyLimit?: SchedulingPolicyLimit
  readonly losslessBackpressureCapacity?: number
  readonly allowUnbounded?: boolean
  readonly pressureWarningThreshold?: {
    readonly backlogCount?: number
    readonly backlogDurationMs?: number
  }
  readonly warningCooldownMs?: number
}

/**
 * Runtime-level unified scheduling policy surface:
 * - Provided at the app layer by Logix.Runtime.make / AppRuntime.makeApp.
 * - ModuleRuntime merges sources via a resolver (builtin/runtime_module/provider, etc.).
 *
 * Notes:
 * - overridesByModuleId is used for runtime_module hot-switching (hotfix / gradual tuning) and is lower priority than provider overrides.
 */
export interface SchedulingPolicySurface extends SchedulingPolicySurfacePatch {
  readonly overridesByModuleId?: Readonly<Record<string, SchedulingPolicySurfacePatch>>
}

class SchedulingPolicySurfaceTagImpl extends ServiceMap.Service<
  SchedulingPolicySurfaceTagImpl,
  SchedulingPolicySurface
>()('@logixjs/core/SchedulingPolicySurface') {}

export const SchedulingPolicySurfaceTag = SchedulingPolicySurfaceTagImpl

/**
 * Provider-scoped SchedulingPolicySurfaceOverrides (delta overrides):
 * - Used to inject more local overrides into a Provider subtree on top of inherited global runtime config.
 * - Override precedence: provider > runtime_module > runtime_default > builtin.
 */
export interface SchedulingPolicySurfaceOverrides extends SchedulingPolicySurfacePatch {
  readonly overridesByModuleId?: Readonly<Record<string, SchedulingPolicySurfacePatch>>
}

class SchedulingPolicySurfaceOverridesTagImpl extends ServiceMap.Service<
  SchedulingPolicySurfaceOverridesTagImpl,
  SchedulingPolicySurfaceOverrides
>()('@logixjs/core/SchedulingPolicySurfaceOverrides') {}

export const SchedulingPolicySurfaceOverridesTag = SchedulingPolicySurfaceOverridesTagImpl

/**
 * Legacy aliases:
 * - Keep old names as pure aliases to support migration without behavior drift.
 * - Canonical naming for new code should use SchedulingPolicySurface*.
 */
export type ConcurrencyPolicyPatch = SchedulingPolicySurfacePatch
export type ConcurrencyPolicy = SchedulingPolicySurface
export type ConcurrencyPolicyOverrides = SchedulingPolicySurfaceOverrides

export const ConcurrencyPolicyTag = SchedulingPolicySurfaceTag
export const ConcurrencyPolicyOverridesTag = SchedulingPolicySurfaceOverridesTag

// ---- 073: TickScheduler + RuntimeStore (injectable runtime services) ----

export interface RuntimeStoreService extends RuntimeStore {}

export class RuntimeStoreTag extends ServiceMap.Service<RuntimeStoreTag, RuntimeStoreService>()('@logixjs/core/RuntimeStore') {}

export const runtimeStoreLayer: Layer.Layer<any, never, never> = Layer.effect(
  RuntimeStoreTag,
  Effect.acquireRelease(
    Effect.sync(() => makeRuntimeStore() as RuntimeStoreService),
    (store) => Effect.sync(() => store.dispose()),
  ),
) as Layer.Layer<any, never, never>

export const runtimeStoreTestStubLayer = (store: RuntimeStoreService): Layer.Layer<any, never, never> =>
  Layer.succeed(RuntimeStoreTag, store) as Layer.Layer<any, never, never>

export interface HostSchedulerService extends HostScheduler {}

export class HostSchedulerTag extends ServiceMap.Service<
  HostSchedulerTag,
  HostSchedulerService
>()('@logixjs/core/HostScheduler') {}

export const hostSchedulerLayer: Layer.Layer<any, never, never> = Layer.succeed(
  HostSchedulerTag,
  getGlobalHostScheduler() as HostSchedulerService,
) as Layer.Layer<any, never, never>

export const hostSchedulerTestStubLayer = (scheduler: HostSchedulerService): Layer.Layer<any, never, never> =>
  Layer.succeed(HostSchedulerTag, scheduler) as Layer.Layer<any, never, never>

export interface DeclarativeLinkRuntimeService extends DeclarativeLinkRuntime {}

export class DeclarativeLinkRuntimeTag extends ServiceMap.Service<
  DeclarativeLinkRuntimeTag,
  DeclarativeLinkRuntimeService
>()('@logixjs/core/DeclarativeLinkRuntime') {}

export const declarativeLinkRuntimeLayer: Layer.Layer<any, never, never> = Layer.succeed(
  DeclarativeLinkRuntimeTag,
  makeDeclarativeLinkRuntime() as DeclarativeLinkRuntimeService,
) as Layer.Layer<any, never, never>

export const declarativeLinkRuntimeTestStubLayer = (
  runtime: DeclarativeLinkRuntimeService,
): Layer.Layer<any, never, never> => Layer.succeed(DeclarativeLinkRuntimeTag, runtime) as Layer.Layer<any, never, never>

export interface TickSchedulerService extends TickScheduler {}

export class TickSchedulerTag extends ServiceMap.Service<TickSchedulerTag, TickSchedulerService>()('@logixjs/core/TickScheduler') {}

export const tickSchedulerLayer = (config?: TickSchedulerConfig): Layer.Layer<any, never, never> =>
  Layer.effect(
    TickSchedulerTag,
    Effect.gen(function* () {
      const store = yield* Effect.service(RuntimeStoreTag).pipe(Effect.orDie)
      const declarativeLinkRuntime = yield* Effect.service(DeclarativeLinkRuntimeTag).pipe(Effect.orDie)
      const hostScheduler = yield* Effect.service(HostSchedulerTag).pipe(Effect.orDie)
      return makeTickScheduler({ runtimeStore: store, declarativeLinkRuntime, hostScheduler, config }) as TickSchedulerService
    }),
  ) as Layer.Layer<any, never, never>

export const tickSchedulerTestStubLayer = (scheduler: TickSchedulerService): Layer.Layer<any, never, never> =>
  Layer.succeed(TickSchedulerTag, scheduler) as Layer.Layer<any, never, never>
