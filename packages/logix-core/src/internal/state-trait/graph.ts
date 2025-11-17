import type { StateTraitProgram } from './model.js'

/**
 * DependencyGraph (Phase 2 skeleton).
 *
 * Notes:
 * - build.ts already records deps/link edges in Graph.edges.
 * - This module only normalizes edges into an adjacency list usable for reverse-closure traversal.
 * - Later phases will add stricter node/edge models, cycle detection, and richer diagnostics.
 */
export interface DependencyGraph {
  readonly _tag: 'StateTraitDependencyGraph'
  /**
   * reverseAdj: adjacency list for quickly finding downstream fields that depend on a given field.
   */
  readonly reverseAdj: ReadonlyMap<string, ReadonlyArray<string>>
}

export const buildDependencyGraph = (program: StateTraitProgram<any>): DependencyGraph => {
  const reverseAdj = new Map<string, Array<string>>()

  for (const edge of program.graph.edges) {
    const list = reverseAdj.get(edge.from) ?? []
    list.push(edge.to)
    reverseAdj.set(edge.from, list)
  }

  return {
    _tag: 'StateTraitDependencyGraph',
    reverseAdj,
  }
}
