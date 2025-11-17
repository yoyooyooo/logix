export type TypeIrBudget = {
  readonly maxNodes?: number
  readonly maxDepth?: number
}

export type TypeIrBudgetResult<T> = {
  readonly types: ReadonlyArray<T>
  readonly truncated: boolean
  readonly droppedTypeIds: ReadonlyArray<string>
  readonly budget: Required<Pick<TypeIrBudget, 'maxNodes'>> & Partial<Pick<TypeIrBudget, 'maxDepth'>>
}

export const defaultTypeIrBudget = {
  maxNodes: 200,
  maxDepth: 6,
} as const satisfies Required<TypeIrBudget>

const resolveMaxNodes = (budget?: TypeIrBudget): number => {
  const value = budget?.maxNodes
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  return defaultTypeIrBudget.maxNodes
}

const resolveMaxDepth = (budget?: TypeIrBudget): number | undefined => {
  const value = budget?.maxDepth
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  return defaultTypeIrBudget.maxDepth
}

export const applyTypeIrBudget = <T extends { readonly id: string }>(
  types: ReadonlyArray<T>,
  budget?: TypeIrBudget,
): TypeIrBudgetResult<T> => {
  const maxNodes = resolveMaxNodes(budget)
  const maxDepth = resolveMaxDepth(budget)

  if (types.length <= maxNodes) {
    return {
      types,
      truncated: false,
      droppedTypeIds: [],
      budget: { maxNodes, ...(maxDepth ? { maxDepth } : {}) },
    }
  }

  const kept = types.slice(0, maxNodes)
  const dropped = types.slice(maxNodes).map((t) => t.id)

  return {
    types: kept,
    truncated: true,
    droppedTypeIds: dropped,
    budget: { maxNodes, ...(maxDepth ? { maxDepth } : {}) },
  }
}
