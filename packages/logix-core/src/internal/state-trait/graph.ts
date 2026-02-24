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

type DependencyGraphCacheEntry = {
  readonly edgesRef: StateTraitProgram<any>['graph']['edges']
  readonly graph: DependencyGraph
}

const dependencyGraphCache = new WeakMap<StateTraitProgram<any>, DependencyGraphCacheEntry>()

export const buildDependencyGraph = (program: StateTraitProgram<any>): DependencyGraph => {
  const edges = program.graph.edges
  const cached = dependencyGraphCache.get(program)
  if (cached && cached.edgesRef === edges) {
    return cached.graph
  }

  const reverseAdj = new Map<string, Array<string>>()

  for (const edge of edges) {
    const list = reverseAdj.get(edge.from) ?? []
    list.push(edge.to)
    reverseAdj.set(edge.from, list)
  }

  const graph: DependencyGraph = {
    _tag: 'StateTraitDependencyGraph',
    reverseAdj,
  }

  // Program graph is immutable after build; reuse normalized reverse adjacency across validate windows.
  dependencyGraphCache.set(program, {
    edgesRef: edges,
    graph,
  })

  return graph
}
