import { Context, Layer } from 'effect'
import type { TraitConvergeRequestedMode } from '../../state-trait/model.js'
import type { ReadQueryStrictGateConfig } from './ReadQuery.js'

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
}

class StateTransactionConfigTagImpl extends Context.Tag('@logix/core/StateTransactionRuntimeConfig')<
  StateTransactionConfigTagImpl,
  StateTransactionRuntimeConfig
>() {}

export const StateTransactionConfigTag = StateTransactionConfigTagImpl

export type ReadQueryStrictGateRuntimeConfig = ReadQueryStrictGateConfig

class ReadQueryStrictGateConfigTagImpl extends Context.Tag('@logix/core/ReadQueryStrictGateRuntimeConfig')<
  ReadQueryStrictGateConfigTagImpl,
  ReadQueryStrictGateRuntimeConfig
>() {}

export const ReadQueryStrictGateConfigTag = ReadQueryStrictGateConfigTagImpl

export type ReplayMode = 'live' | 'replay'

export interface ReplayModeConfig {
  readonly mode: ReplayMode
}

class ReplayModeConfigTagImpl extends Context.Tag('@logix/core/ReplayModeConfig')<
  ReplayModeConfigTagImpl,
  ReplayModeConfig
>() {}

export const ReplayModeConfigTag = ReplayModeConfigTagImpl

export const replayModeLayer = (mode: ReplayMode): Layer.Layer<ReplayModeConfigTagImpl, never, never> =>
  Layer.succeed(ReplayModeConfigTag, { mode })

export interface StateTransactionTraitConvergeOverrides {
  readonly traitConvergeMode?: TraitConvergeRequestedMode
  readonly traitConvergeBudgetMs?: number
  readonly traitConvergeDecisionBudgetMs?: number
  readonly traitConvergeTimeSlicing?: TraitConvergeTimeSlicingPatch
}

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
  /** 060: Txn Lanes provider_module overrides (by moduleId). */
  readonly txnLanesOverridesByModuleId?: Readonly<Record<string, TxnLanesPatch>>
}

class StateTransactionOverridesTagImpl extends Context.Tag('@logix/core/StateTransactionOverrides')<
  StateTransactionOverridesTagImpl,
  StateTransactionOverrides
>() {}

export const StateTransactionOverridesTag = StateTransactionOverridesTagImpl

export type ConcurrencyLimit = number | 'unbounded'

export interface ConcurrencyPolicyPatch {
  readonly concurrencyLimit?: ConcurrencyLimit
  readonly losslessBackpressureCapacity?: number
  readonly allowUnbounded?: boolean
  readonly pressureWarningThreshold?: {
    readonly backlogCount?: number
    readonly backlogDurationMs?: number
  }
  readonly warningCooldownMs?: number
}

/**
 * Runtime-level ConcurrencyPolicy:
 * - Provided at the app layer by Logix.Runtime.make / AppRuntime.makeApp.
 * - ModuleRuntime merges sources via a resolver (builtin/runtime_module/provider, etc.).
 *
 * Notes:
 * - overridesByModuleId is used for runtime_module hot-switching (hotfix / gradual tuning) and is lower priority than provider overrides.
 */
export interface ConcurrencyPolicy extends ConcurrencyPolicyPatch {
  readonly overridesByModuleId?: Readonly<Record<string, ConcurrencyPolicyPatch>>
}

class ConcurrencyPolicyTagImpl extends Context.Tag('@logix/core/ConcurrencyPolicy')<
  ConcurrencyPolicyTagImpl,
  ConcurrencyPolicy
>() {}

export const ConcurrencyPolicyTag = ConcurrencyPolicyTagImpl

/**
 * Provider-scoped ConcurrencyPolicyOverrides (delta overrides):
 * - Used to inject more local overrides into a Provider subtree on top of inherited global runtime config.
 * - Override precedence: provider > runtime_module > runtime_default > builtin.
 */
export interface ConcurrencyPolicyOverrides extends ConcurrencyPolicyPatch {
  readonly overridesByModuleId?: Readonly<Record<string, ConcurrencyPolicyPatch>>
}

class ConcurrencyPolicyOverridesTagImpl extends Context.Tag('@logix/core/ConcurrencyPolicyOverrides')<
  ConcurrencyPolicyOverridesTagImpl,
  ConcurrencyPolicyOverrides
>() {}

export const ConcurrencyPolicyOverridesTag = ConcurrencyPolicyOverridesTagImpl
