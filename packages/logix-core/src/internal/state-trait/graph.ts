import type { StateTraitProgram } from "./model.js"

/**
 * DependencyGraph（Phase 2 骨架）。
 *
 * 说明：
 * - 当前 build.ts 已在 Graph.edges 中记录了 deps/link 边；
 * - 本模块只把 edges 归一为可用于“反向闭包（Reverse Closure）”的邻接表；
 * - 后续 Phase 会在此处加入更严格的节点/边模型、循环检测与更丰富的诊断信息。
 */
export interface DependencyGraph {
  readonly _tag: "StateTraitDependencyGraph"
  /**
   * reverseAdj：用于从某个字段快速找到“依赖于它”的下游字段集合。
   */
  readonly reverseAdj: ReadonlyMap<string, ReadonlyArray<string>>
}

export const buildDependencyGraph = (
  program: StateTraitProgram<any>,
): DependencyGraph => {
  const reverseAdj = new Map<string, Array<string>>()

  for (const edge of program.graph.edges) {
    const list = reverseAdj.get(edge.from) ?? []
    list.push(edge.to)
    reverseAdj.set(edge.from, list)
  }

  return {
    _tag: "StateTraitDependencyGraph",
    reverseAdj,
  }
}

