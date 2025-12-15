import type { DependencyGraph } from "./graph.js"

/**
 * ReverseClosure（Phase 2 骨架）。
 *
 * - 返回 target 及所有“直接或间接依赖 target”的字段集合；
 * - 用于 scoped validate / 触发范围收敛。
 */
export const reverseClosure = (
  graph: DependencyGraph,
  target: string,
): ReadonlySet<string> => {
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

