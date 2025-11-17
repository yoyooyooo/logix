import type { DependencyGraph } from './graph.js'

/**
 * ReverseClosure (Phase 2 skeleton).
 *
 * - Returns target and all fields that directly or indirectly depend on target.
 * - Used by scoped validate / converge triggering.
 */
export const reverseClosure = (graph: DependencyGraph, target: string): ReadonlySet<string> => {
  const visited = new Set<string>()
  const queue: Array<string> = [target]

  while (queue.length) {
    const current = queue.shift()
    if (!current) break
    if (visited.has(current)) continue
    visited.add(current)

    const nexts = graph.reverseAdj.get(current)
    if (nexts) {
      for (const n of nexts) queue.push(n)
    }
  }

  return visited
}
