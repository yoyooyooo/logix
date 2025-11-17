import { Effect, Option } from 'effect'
import {
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  type StateTransactionOverrides,
  type TxnLanesPatch,
} from './env.js'
import { normalizeBoolean, normalizeNonNegativeNumber } from './normalize.js'

export type TxnLanePolicyScope = 'provider' | 'runtime_module' | 'runtime_default' | 'builtin'

export type TxnLaneQueueMode = 'fifo' | 'lanes'

export type TxnLaneYieldStrategy = 'baseline' | 'inputPending'

export type ResolvedTxnLanePolicy = {
  readonly enabled: boolean
  readonly overrideMode?: 'forced_off' | 'forced_sync'
  readonly configScope: TxnLanePolicyScope
  readonly budgetMs: number
  readonly debounceMs: number
  readonly maxLagMs: number
  readonly allowCoalesce: boolean
  readonly yieldStrategy: TxnLaneYieldStrategy
  readonly queueMode: TxnLaneQueueMode
}

type ModuleStateTransactionOptions =
  | {
      readonly txnLanes?: TxnLanesPatch
    }
  | undefined

const normalizeMs = normalizeNonNegativeNumber
const normalizeBool = normalizeBoolean

export const makeResolveTxnLanePolicy = (args: {
  /** Raw options.moduleId (may be undefined), used to query overrides maps. */
  readonly moduleId: string | undefined
  readonly stateTransaction: ModuleStateTransactionOptions
}): (() => Effect.Effect<ResolvedTxnLanePolicy>) => {
  const builtinEnabled = normalizeBool(args.stateTransaction?.txnLanes?.enabled) ?? true
  const builtinBudgetMs = normalizeMs(args.stateTransaction?.txnLanes?.budgetMs) ?? 1
  const builtinDebounceMs = normalizeMs(args.stateTransaction?.txnLanes?.debounceMs) ?? 0
  const builtinMaxLagMs = normalizeMs(args.stateTransaction?.txnLanes?.maxLagMs) ?? 50
  const builtinAllowCoalesce = normalizeBool(args.stateTransaction?.txnLanes?.allowCoalesce) ?? true
  const builtinYieldStrategy: TxnLaneYieldStrategy =
    args.stateTransaction?.txnLanes?.yieldStrategy === 'inputPending' ? 'inputPending' : 'baseline'

  return () =>
    Effect.gen(function* () {
      const runtimeConfigOpt = yield* Effect.serviceOption(StateTransactionConfigTag)
      const overridesOpt = yield* Effect.serviceOption(StateTransactionOverridesTag)

      const runtimeConfig = Option.isSome(runtimeConfigOpt) ? runtimeConfigOpt.value : undefined
      const providerOverrides = Option.isSome(overridesOpt) ? overridesOpt.value : undefined

      let enabled = builtinEnabled
      let budgetMs = builtinBudgetMs
      let debounceMs = builtinDebounceMs
      let maxLagMs = builtinMaxLagMs
      let allowCoalesce = builtinAllowCoalesce
      let yieldStrategy: TxnLaneYieldStrategy = builtinYieldStrategy

      let overrideMode: ResolvedTxnLanePolicy['overrideMode'] = undefined

      let configScope: TxnLanePolicyScope = 'builtin'

      const applyPatch = (
        patch: TxnLanesPatch | StateTransactionOverrides | undefined,
        scope: TxnLanePolicyScope,
      ): void => {
        if (!patch) return

        const raw = (patch as any).txnLanes != null ? (patch as any).txnLanes : patch
        if (!raw || typeof raw !== 'object') return

        let changed = false

        const nextEnabled = normalizeBool((raw as any).enabled)
        if (nextEnabled != null) {
          enabled = nextEnabled
          changed = true
        }

        const nextOverrideMode = (raw as any).overrideMode
        if (nextOverrideMode === 'forced_off' || nextOverrideMode === 'forced_sync') {
          overrideMode = nextOverrideMode
          changed = true
        }

        const nextBudgetMs = normalizeMs((raw as any).budgetMs)
        if (nextBudgetMs != null) {
          budgetMs = nextBudgetMs
          changed = true
        }

        const nextDebounceMs = normalizeMs((raw as any).debounceMs)
        if (nextDebounceMs != null) {
          debounceMs = nextDebounceMs
          changed = true
        }

        const nextMaxLagMs = normalizeMs((raw as any).maxLagMs)
        if (nextMaxLagMs != null) {
          maxLagMs = nextMaxLagMs
          changed = true
        }

        const nextAllowCoalesce = normalizeBool((raw as any).allowCoalesce)
        if (nextAllowCoalesce != null) {
          allowCoalesce = nextAllowCoalesce
          changed = true
        }

        const nextYieldStrategy = (raw as any).yieldStrategy
        if (nextYieldStrategy === 'baseline' || nextYieldStrategy === 'inputPending') {
          yieldStrategy = nextYieldStrategy
          changed = true
        }

        if (changed) {
          configScope = scope
        }
      }

      const moduleId = args.moduleId
      const runtimeModulePatch =
        moduleId && runtimeConfig?.txnLanesOverridesByModuleId
          ? runtimeConfig.txnLanesOverridesByModuleId[moduleId]
          : undefined
      const providerModulePatch =
        moduleId && providerOverrides?.txnLanesOverridesByModuleId
          ? providerOverrides.txnLanesOverridesByModuleId[moduleId]
          : undefined

      // priority: provider > runtime_module > runtime_default > builtin
      applyPatch(runtimeConfig, 'runtime_default')
      applyPatch(runtimeModulePatch, 'runtime_module')
      applyPatch(providerOverrides, 'provider')
      applyPatch(providerModulePatch, 'provider')

      const effectiveEnabled = overrideMode ? false : enabled
      const queueMode: TxnLaneQueueMode = effectiveEnabled ? 'lanes' : 'fifo'

      return {
        enabled: effectiveEnabled,
        ...(overrideMode ? { overrideMode } : {}),
        configScope,
        budgetMs,
        debounceMs,
        maxLagMs,
        allowCoalesce,
        yieldStrategy,
        queueMode,
      }
    })
}
