import type { ConvergeActionSnippet } from './model.js'

export type TraitConvergeRequestedMode = 'auto' | 'full' | 'dirty'

export type TraitConvergeOverridePatch = {
  readonly traitConvergeMode?: TraitConvergeRequestedMode
  readonly traitConvergeBudgetMs?: number
  readonly traitConvergeDecisionBudgetMs?: number
}

const stableStringify = (value: unknown): string => JSON.stringify(value, null, 2)

export const makeTraitConvergeOverrideSnippets = (params: {
  readonly moduleId: string
  readonly patch: TraitConvergeOverridePatch
}): ReadonlyArray<ConvergeActionSnippet> => {
  const moduleId = params.moduleId

  const patch = Object.fromEntries(
    Object.entries(params.patch).filter(([, v]) => v !== undefined),
  ) as TraitConvergeOverridePatch

  const providerOverride = `Logix.Runtime.stateTransactionOverridesLayer(${stableStringify({
    traitConvergeOverridesByModuleId: {
      [moduleId]: patch,
    },
  })})`

  const moduleOverride = `Logix.Runtime.setTraitConvergeOverride(runtime, ${stableStringify(moduleId)}, ${stableStringify(
    patch,
  )})`

  return [
    {
      kind: 'provider_override',
      scope: 'Provider 范围（优先级最高）',
      expectedConfigScope: 'provider',
      text: providerOverride,
    },
    {
      kind: 'module_override',
      scope: 'Runtime moduleId 覆盖（兜底止血）',
      expectedConfigScope: 'runtime_module',
      text: moduleOverride,
    },
  ]
}
