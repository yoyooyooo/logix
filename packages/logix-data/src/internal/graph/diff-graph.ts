import type { StateGraph, GraphEdge, GraphNode } from "../model/state-graph.js"

const nodeKey = (node: GraphNode): string => node.id

const edgeKey = (edge: GraphEdge): string =>
  `${edge.from}->${edge.to}#${edge.relation}`

export interface StateGraphDiff {
  readonly addedNodes: ReadonlyArray<GraphNode>
  readonly removedNodes: ReadonlyArray<GraphNode>
  readonly addedEdges: ReadonlyArray<GraphEdge>
  readonly removedEdges: ReadonlyArray<GraphEdge>
}

/**
 * 对比两个 StateGraph，找出新增/删除的节点与边。
 * 为简化起见，节点以 id 为主键，边以 from/to/relation 三元组为主键。
 */
export const diffStateGraph = (params: {
  oldGraph: StateGraph
  newGraph: StateGraph
}): StateGraphDiff => {
  const { oldGraph, newGraph } = params

  const oldNodeMap = new Map(oldGraph.nodes.map((n) => [nodeKey(n), n]))
  const newNodeMap = new Map(newGraph.nodes.map((n) => [nodeKey(n), n]))

  const oldEdgeMap = new Map(oldGraph.edges.map((e) => [edgeKey(e), e]))
  const newEdgeMap = new Map(newGraph.edges.map((e) => [edgeKey(e), e]))

  const addedNodes: GraphNode[] = []
  const removedNodes: GraphNode[] = []
  const addedEdges: GraphEdge[] = []
  const removedEdges: GraphEdge[] = []

  for (const [id, node] of newNodeMap) {
    if (!oldNodeMap.has(id)) {
      addedNodes.push(node)
    }
  }

  for (const [id, node] of oldNodeMap) {
    if (!newNodeMap.has(id)) {
      removedNodes.push(node)
    }
  }

  for (const [key, edge] of newEdgeMap) {
    if (!oldEdgeMap.has(key)) {
      addedEdges.push(edge)
    }
  }

  for (const [key, edge] of oldEdgeMap) {
    if (!newEdgeMap.has(key)) {
      removedEdges.push(edge)
    }
  }

  return { addedNodes, removedNodes, addedEdges, removedEdges }
}
