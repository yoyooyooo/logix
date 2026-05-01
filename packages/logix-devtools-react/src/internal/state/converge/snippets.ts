import type { ConvergeActionSnippet } from './model.js'
// Snippet text only: runtime hot-switch APIs are now effectful and should be executed via Effect.runPromise / yield*.

export type FieldConvergeRequestedMode = 'auto' | 'full' | 'dirty'

export type FieldConvergeOverridePatch = {
  readonly fieldConvergeMode?: FieldConvergeRequestedMode
  readonly fieldConvergeBudgetMs?: number
  readonly fieldConvergeDecisionBudgetMs?: number
}

const stableStringify = (value: unknown): string => JSON.stringify(value, null, 2)

export const makeFieldConvergeOverrideSnippets = (params: {
  readonly moduleId: string
  readonly patch: FieldConvergeOverridePatch
}): ReadonlyArray<ConvergeActionSnippet> => {
  const moduleId = params.moduleId

  const patch = Object.fromEntries(
    Object.entries(params.patch).filter(([, v]) => v !== undefined),
  ) as FieldConvergeOverridePatch

  const providerOverride = `Logix.Runtime.stateTransactionOverridesLayer(${stableStringify({
    fieldConvergeOverridesByModuleId: {
      [moduleId]: patch,
    },
  })})`

  const moduleOverride = `await Effect.runPromise(Logix.Runtime.setFieldConvergeOverride(runtime, ${stableStringify(moduleId)}, ${stableStringify(
    patch,
  )}))`

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
