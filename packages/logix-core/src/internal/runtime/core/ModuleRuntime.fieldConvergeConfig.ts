import { Effect, Option } from 'effect'
import {
  StateTransactionConfigTag,
  StateTransactionOverridesTag,
  type StateTransactionOverrides,
  type StateTransactionFieldConvergeOverrides,
  type FieldConvergeTimeSlicingPatch,
} from './env.js'
import { normalizePositiveNumber } from './normalize.js'
import type { FieldConvergeConfigScope, FieldConvergeRequestedMode } from '../../field-kernel/model.js'

export type ResolvedFieldConvergeTimeSlicingConfig = {
  readonly enabled: boolean
  readonly debounceMs: number
  readonly maxLagMs: number
}

export type ResolvedFieldConvergeConfig = {
  readonly fieldConvergeMode: FieldConvergeRequestedMode
  readonly fieldConvergeBudgetMs: number
  readonly fieldConvergeDecisionBudgetMs: number
  readonly fieldConvergeTimeSlicing: ResolvedFieldConvergeTimeSlicingConfig
  readonly configScope: FieldConvergeConfigScope
}

type ModuleStateTransactionOptions =
  | {
      readonly fieldConvergeBudgetMs?: number
      readonly fieldConvergeDecisionBudgetMs?: number
      readonly fieldConvergeMode?: 'auto' | 'full' | 'dirty'
      readonly fieldConvergeTimeSlicing?: FieldConvergeTimeSlicingPatch
    }
  | undefined

const normalizePositiveMs = normalizePositiveNumber

const normalizeRequestedMode = (mode: unknown): FieldConvergeRequestedMode | undefined =>
  mode === 'auto' || mode === 'full' || mode === 'dirty' ? mode : undefined

const normalizeBool = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

export const makeResolveFieldConvergeConfig = (args: {
  /** Original options.moduleId (may be undefined); used for module overrides map lookup. */
  readonly moduleId: string | undefined
  readonly stateTransaction: ModuleStateTransactionOptions
}): (() => Effect.Effect<ResolvedFieldConvergeConfig>) => {
  const builtinFieldConvergeBudgetMs: number = normalizePositiveMs(args.stateTransaction?.fieldConvergeBudgetMs) ?? 200
  const builtinFieldConvergeDecisionBudgetMs: number =
    normalizePositiveMs(args.stateTransaction?.fieldConvergeDecisionBudgetMs) ?? 0.5
  const builtinFieldConvergeMode: FieldConvergeRequestedMode =
    normalizeRequestedMode(args.stateTransaction?.fieldConvergeMode) ?? 'auto'

  const builtinTimeSlicingEnabled: boolean =
    normalizeBool(args.stateTransaction?.fieldConvergeTimeSlicing?.enabled) ?? false
  const builtinTimeSlicingDebounceMs: number =
    normalizePositiveMs(args.stateTransaction?.fieldConvergeTimeSlicing?.debounceMs) ?? 16
  const builtinTimeSlicingMaxLagMs: number =
    normalizePositiveMs(args.stateTransaction?.fieldConvergeTimeSlicing?.maxLagMs) ?? 200

  return () =>
    Effect.gen(function* () {
      const runtimeConfigOpt = yield* Effect.serviceOption(StateTransactionConfigTag)
      const overridesOpt = yield* Effect.serviceOption(StateTransactionOverridesTag)

      const runtimeConfig = Option.isSome(runtimeConfigOpt) ? runtimeConfigOpt.value : undefined
      const providerOverrides = Option.isSome(overridesOpt) ? overridesOpt.value : undefined

      let fieldConvergeMode = builtinFieldConvergeMode
      let fieldConvergeBudgetMs = builtinFieldConvergeBudgetMs
      let fieldConvergeDecisionBudgetMs = builtinFieldConvergeDecisionBudgetMs
      let fieldConvergeTimeSlicingEnabled = builtinTimeSlicingEnabled
      let fieldConvergeTimeSlicingDebounceMs = builtinTimeSlicingDebounceMs
      let fieldConvergeTimeSlicingMaxLagMs = builtinTimeSlicingMaxLagMs

      let configScope: FieldConvergeConfigScope = 'builtin'

      const applyPatch = (
        patch: StateTransactionFieldConvergeOverrides | StateTransactionOverrides | undefined,
        scope: FieldConvergeConfigScope,
      ): void => {
        if (!patch) return
        let changed = false

        const mode = normalizeRequestedMode((patch as any).fieldConvergeMode)
        if (mode) {
          fieldConvergeMode = mode
          changed = true
        }

        const budgetMs = normalizePositiveMs((patch as any).fieldConvergeBudgetMs)
        if (budgetMs != null) {
          fieldConvergeBudgetMs = budgetMs
          changed = true
        }

        const decisionBudgetMs = normalizePositiveMs((patch as any).fieldConvergeDecisionBudgetMs)
        if (decisionBudgetMs != null) {
          fieldConvergeDecisionBudgetMs = decisionBudgetMs
          changed = true
        }

        const timeSlicing = (patch as any).fieldConvergeTimeSlicing
        if (timeSlicing && typeof timeSlicing === 'object') {
          const enabled = normalizeBool((timeSlicing as any).enabled)
          if (enabled != null) {
            fieldConvergeTimeSlicingEnabled = enabled
            changed = true
          }

          const debounceMs = normalizePositiveMs((timeSlicing as any).debounceMs)
          if (debounceMs != null) {
            fieldConvergeTimeSlicingDebounceMs = debounceMs
            changed = true
          }

          const maxLagMs = normalizePositiveMs((timeSlicing as any).maxLagMs)
          if (maxLagMs != null) {
            fieldConvergeTimeSlicingMaxLagMs = maxLagMs
            changed = true
          }
        }

        if (changed) {
          configScope = scope
        }
      }

      const moduleId = args.moduleId
      const runtimeModulePatch =
        moduleId && runtimeConfig?.fieldConvergeOverridesByModuleId
          ? runtimeConfig.fieldConvergeOverridesByModuleId[moduleId]
          : undefined
      const providerModulePatch =
        moduleId && providerOverrides?.fieldConvergeOverridesByModuleId
          ? providerOverrides.fieldConvergeOverridesByModuleId[moduleId]
          : undefined

      // priority: provider > runtime_module > runtime_default > builtin
      applyPatch(runtimeConfig, 'runtime_default')
      applyPatch(runtimeModulePatch, 'runtime_module')
      applyPatch(providerOverrides, 'provider')
      applyPatch(providerModulePatch, 'provider')

      return {
        fieldConvergeMode,
        fieldConvergeBudgetMs,
        fieldConvergeDecisionBudgetMs,
        fieldConvergeTimeSlicing: {
          enabled: fieldConvergeTimeSlicingEnabled,
          debounceMs: fieldConvergeTimeSlicingDebounceMs,
          maxLagMs: fieldConvergeTimeSlicingMaxLagMs,
        },
        configScope,
      }
    })
}
