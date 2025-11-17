import { Effect, Option } from 'effect'
import {
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  type StateTransactionOverrides,
  type StateTransactionTraitConvergeOverrides,
  type TraitConvergeTimeSlicingPatch,
} from './env.js'
import { normalizePositiveNumber } from './normalize.js'
import type { TraitConvergeConfigScope, TraitConvergeRequestedMode } from '../../state-trait/model.js'

export type ResolvedTraitConvergeTimeSlicingConfig = {
  readonly enabled: boolean
  readonly debounceMs: number
  readonly maxLagMs: number
}

export type ResolvedTraitConvergeConfig = {
  readonly traitConvergeMode: TraitConvergeRequestedMode
  readonly traitConvergeBudgetMs: number
  readonly traitConvergeDecisionBudgetMs: number
  readonly traitConvergeTimeSlicing: ResolvedTraitConvergeTimeSlicingConfig
  readonly configScope: TraitConvergeConfigScope
}

type ModuleStateTransactionOptions =
  | {
      readonly traitConvergeBudgetMs?: number
      readonly traitConvergeDecisionBudgetMs?: number
      readonly traitConvergeMode?: 'auto' | 'full' | 'dirty'
      readonly traitConvergeTimeSlicing?: TraitConvergeTimeSlicingPatch
    }
  | undefined

const normalizePositiveMs = normalizePositiveNumber

const normalizeRequestedMode = (mode: unknown): TraitConvergeRequestedMode | undefined =>
  mode === 'auto' || mode === 'full' || mode === 'dirty' ? mode : undefined

const normalizeBool = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

export const makeResolveTraitConvergeConfig = (args: {
  /** Original options.moduleId (may be undefined); used for module overrides map lookup. */
  readonly moduleId: string | undefined
  readonly stateTransaction: ModuleStateTransactionOptions
}): (() => Effect.Effect<ResolvedTraitConvergeConfig>) => {
  const builtinTraitConvergeBudgetMs: number = normalizePositiveMs(args.stateTransaction?.traitConvergeBudgetMs) ?? 200
  const builtinTraitConvergeDecisionBudgetMs: number =
    normalizePositiveMs(args.stateTransaction?.traitConvergeDecisionBudgetMs) ?? 0.5
  const builtinTraitConvergeMode: TraitConvergeRequestedMode =
    normalizeRequestedMode(args.stateTransaction?.traitConvergeMode) ?? 'auto'

  const builtinTimeSlicingEnabled: boolean =
    normalizeBool(args.stateTransaction?.traitConvergeTimeSlicing?.enabled) ?? false
  const builtinTimeSlicingDebounceMs: number =
    normalizePositiveMs(args.stateTransaction?.traitConvergeTimeSlicing?.debounceMs) ?? 16
  const builtinTimeSlicingMaxLagMs: number =
    normalizePositiveMs(args.stateTransaction?.traitConvergeTimeSlicing?.maxLagMs) ?? 200

  return () =>
    Effect.gen(function* () {
      const runtimeConfigOpt = yield* Effect.serviceOption(StateTransactionConfigTag)
      const overridesOpt = yield* Effect.serviceOption(StateTransactionOverridesTag)

      const runtimeConfig = Option.isSome(runtimeConfigOpt) ? runtimeConfigOpt.value : undefined
      const providerOverrides = Option.isSome(overridesOpt) ? overridesOpt.value : undefined

      let traitConvergeMode = builtinTraitConvergeMode
      let traitConvergeBudgetMs = builtinTraitConvergeBudgetMs
      let traitConvergeDecisionBudgetMs = builtinTraitConvergeDecisionBudgetMs
      let traitConvergeTimeSlicingEnabled = builtinTimeSlicingEnabled
      let traitConvergeTimeSlicingDebounceMs = builtinTimeSlicingDebounceMs
      let traitConvergeTimeSlicingMaxLagMs = builtinTimeSlicingMaxLagMs

      let configScope: TraitConvergeConfigScope = 'builtin'

      const applyPatch = (
        patch: StateTransactionTraitConvergeOverrides | StateTransactionOverrides | undefined,
        scope: TraitConvergeConfigScope,
      ): void => {
        if (!patch) return
        let changed = false

        const mode = normalizeRequestedMode((patch as any).traitConvergeMode)
        if (mode) {
          traitConvergeMode = mode
          changed = true
        }

        const budgetMs = normalizePositiveMs((patch as any).traitConvergeBudgetMs)
        if (budgetMs != null) {
          traitConvergeBudgetMs = budgetMs
          changed = true
        }

        const decisionBudgetMs = normalizePositiveMs((patch as any).traitConvergeDecisionBudgetMs)
        if (decisionBudgetMs != null) {
          traitConvergeDecisionBudgetMs = decisionBudgetMs
          changed = true
        }

        const timeSlicing = (patch as any).traitConvergeTimeSlicing
        if (timeSlicing && typeof timeSlicing === 'object') {
          const enabled = normalizeBool((timeSlicing as any).enabled)
          if (enabled != null) {
            traitConvergeTimeSlicingEnabled = enabled
            changed = true
          }

          const debounceMs = normalizePositiveMs((timeSlicing as any).debounceMs)
          if (debounceMs != null) {
            traitConvergeTimeSlicingDebounceMs = debounceMs
            changed = true
          }

          const maxLagMs = normalizePositiveMs((timeSlicing as any).maxLagMs)
          if (maxLagMs != null) {
            traitConvergeTimeSlicingMaxLagMs = maxLagMs
            changed = true
          }
        }

        if (changed) {
          configScope = scope
        }
      }

      const moduleId = args.moduleId
      const runtimeModulePatch =
        moduleId && runtimeConfig?.traitConvergeOverridesByModuleId
          ? runtimeConfig.traitConvergeOverridesByModuleId[moduleId]
          : undefined
      const providerModulePatch =
        moduleId && providerOverrides?.traitConvergeOverridesByModuleId
          ? providerOverrides.traitConvergeOverridesByModuleId[moduleId]
          : undefined

      // priority: provider > runtime_module > runtime_default > builtin
      applyPatch(runtimeConfig, 'runtime_default')
      applyPatch(runtimeModulePatch, 'runtime_module')
      applyPatch(providerOverrides, 'provider')
      applyPatch(providerModulePatch, 'provider')

      return {
        traitConvergeMode,
        traitConvergeBudgetMs,
        traitConvergeDecisionBudgetMs,
        traitConvergeTimeSlicing: {
          enabled: traitConvergeTimeSlicingEnabled,
          debounceMs: traitConvergeTimeSlicingDebounceMs,
          maxLagMs: traitConvergeTimeSlicingMaxLagMs,
        },
        configScope,
      }
    })
}
