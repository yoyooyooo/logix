import type { Field } from "./internal/model/field.js"
import type { FieldCapability } from "./internal/model/capability.js"
import type {
  StateGraph,
  GraphNode,
  GraphEdge
} from "./internal/model/state-graph.js"
import { buildStateGraph } from "./internal/graph/build-graph.js"
import {
  diffStateGraph,
  type StateGraphDiff
} from "./internal/graph/diff-graph.js"

export type { StateGraph, GraphNode, GraphEdge, StateGraphDiff }

export interface BuildStateGraphParams {
  readonly moduleId: string
  readonly fields: ReadonlyArray<Field>
  readonly capabilities: ReadonlyArray<FieldCapability>
  readonly version?: string
}

/**
 * 构建指定模块的 StateGraph 视图。
 */
export const makeStateGraph = (
  params: BuildStateGraphParams
): StateGraph => buildStateGraph(params)

/**
 * 对比两个 StateGraph，得到节点与边的增删情况。
 */
export const diffGraphs = (params: {
  oldGraph: StateGraph
  newGraph: StateGraph
}): StateGraphDiff => diffStateGraph(params)
