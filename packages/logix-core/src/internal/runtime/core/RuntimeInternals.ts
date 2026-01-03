import { Cause, Context, Effect } from 'effect'
import type { ModuleRuntime as PublicModuleRuntime } from './module.js'
import type * as Lifecycle from './Lifecycle.js'
import type * as StateTransaction from './StateTransaction.js'
import type { ResolvedTxnLanePolicy } from './ModuleRuntime.txnLanePolicy.js'
import type { ConcurrencyLimit, StateTransactionInstrumentation } from './env.js'
import type * as ModuleTraits from './ModuleTraits.js'

export type RuntimeInternalsEffects = {
  readonly registerEffect: (args: {
    readonly actionTag: string
    readonly handler: (payload: unknown) => Effect.Effect<void, any, any>
    readonly phase: 'setup' | 'run'
    readonly logicUnit?: {
      readonly logicUnitId: string
      readonly logicUnitLabel: string
      readonly path?: string
    }
  }) => Effect.Effect<{ readonly sourceKey: string; readonly duplicate: boolean }, never, any>
}

export type ImportsScope = {
  readonly kind: 'imports-scope'
  readonly get: (module: Context.Tag<any, PublicModuleRuntime<any, any>>) => PublicModuleRuntime<any, any> | undefined
}

export type RuntimeInternalsLifecycle = {
  readonly registerInitRequired: (eff: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => void
  readonly registerStart: (
    eff: Effect.Effect<void, never, any>,
    options?: { readonly name?: string; readonly fatalOnFailure?: boolean },
  ) => void
  readonly registerDestroy: (eff: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => void
  readonly registerOnError: (
    handler: (cause: Cause.Cause<unknown>, context: Lifecycle.ErrorContext) => Effect.Effect<void, never, any>,
  ) => void
  readonly registerPlatformSuspend: (eff: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => void
  readonly registerPlatformResume: (eff: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => void
  readonly registerPlatformReset: (eff: Effect.Effect<void, never, any>, options?: { readonly name?: string }) => void
}

export type RuntimeInternalsTxn = {
  readonly instrumentation: StateTransactionInstrumentation
  readonly registerReducer: (tag: string, fn: (state: unknown, action: unknown) => unknown) => void
  readonly runWithStateTransaction: (
    origin: StateTransaction.StateTxnOrigin,
    body: () => Effect.Effect<void, never, any>,
  ) => Effect.Effect<void, never, any>
  /**
   * updateDraft：
   * - Use only within an active transaction: update the current transaction draft state;
   * - Does not implicitly write wildcard patches (avoid overriding already-recorded field-level patchPaths).
   */
  readonly updateDraft: (nextState: unknown) => void
  readonly recordStatePatch: (
    path: StateTransaction.StatePatchPath | undefined,
    reason: StateTransaction.PatchReason,
    from?: unknown,
    to?: unknown,
    traitNodeId?: string,
    stepId?: number,
  ) => void
  readonly recordReplayEvent: (event: unknown) => void
  readonly applyTransactionSnapshot: (txnId: string, mode: 'before' | 'after') => Effect.Effect<void, never, any>
}

export type RuntimeInternalsTraits = {
  readonly rowIdStore: unknown
  readonly getListConfigs: () => ReadonlyArray<unknown>
  /**
   * registerSourceRefresh：
   * - Used only by StateTrait.install/source to mount refresh logic during the build/install phase.
   * - The implementation must be scoped per runtime instance (must not be process-wide global).
   */
  readonly registerSourceRefresh: (
    fieldPath: string,
    handler: (state: unknown) => Effect.Effect<void, never, any>,
  ) => void
  readonly getSourceRefreshHandler: (
    fieldPath: string,
  ) => ((state: unknown) => Effect.Effect<void, never, any>) | undefined
  readonly registerStateTraitProgram: (
    program: unknown,
    registerOptions?: { readonly bumpReason?: unknown; readonly exportStaticIr?: boolean },
  ) => void
  readonly enqueueStateTraitValidateRequest: (request: unknown) => void

  // ---- 023: Logic Traits in Setup (module-level + logic-level contributions) ----
  readonly registerModuleTraitsContribution: (contribution: ModuleTraits.TraitContribution) => void
  readonly freezeModuleTraits: () => void
  readonly getModuleTraitsContributions: () => ReadonlyArray<ModuleTraits.TraitContribution>
  readonly getModuleTraitsSnapshot: () => ModuleTraits.ModuleTraitsSnapshot | undefined
  readonly setModuleTraitsSnapshot: (snapshot: ModuleTraits.ModuleTraitsSnapshot) => void
}

export type RuntimeInternalsDevtools = {
  readonly registerConvergeStaticIr: (staticIr: unknown) => void
}

export type ConcurrencyPolicyConfigScope = 'builtin' | 'runtime_default' | 'runtime_module' | 'provider'

export type RuntimeInternalsResolvedConcurrencyPolicy = {
  readonly concurrencyLimit: ConcurrencyLimit
  readonly losslessBackpressureCapacity: number
  readonly allowUnbounded: boolean
  readonly pressureWarningThreshold: {
    readonly backlogCount: number
    readonly backlogDurationMs: number
  }
  readonly warningCooldownMs: number
  readonly configScope: ConcurrencyPolicyConfigScope
  readonly concurrencyLimitScope: ConcurrencyPolicyConfigScope
  readonly requestedConcurrencyLimit: ConcurrencyLimit
  readonly requestedConcurrencyLimitScope: ConcurrencyPolicyConfigScope
  readonly allowUnboundedScope: ConcurrencyPolicyConfigScope
}

export type RuntimeInternalsConcurrency = {
  readonly resolveConcurrencyPolicy: () => Effect.Effect<RuntimeInternalsResolvedConcurrencyPolicy, never, any>
}

export type RuntimeInternalsTxnLanes = {
  readonly resolveTxnLanePolicy: () => Effect.Effect<ResolvedTxnLanePolicy, never, any>
}

/**
 * RuntimeInternals（Internal Hooks Runtime Service）
 *
 * Goal: converge the scattered `runtime.__*` / `bound.__*` cooperation protocol into a single internal contract entrypoint,
 * and fully ban magic fields by using Symbol + non-enumerable slots for internal capabilities.
 */
export interface RuntimeInternals {
  readonly moduleId?: string
  readonly instanceId: string
  readonly stateSchema?: unknown

  readonly lifecycle: RuntimeInternalsLifecycle
  readonly imports: ImportsScope
  readonly txn: RuntimeInternalsTxn
  readonly concurrency: RuntimeInternalsConcurrency
  readonly txnLanes: RuntimeInternalsTxnLanes
  readonly traits: RuntimeInternalsTraits
  readonly effects: RuntimeInternalsEffects
  readonly devtools: RuntimeInternalsDevtools
}
