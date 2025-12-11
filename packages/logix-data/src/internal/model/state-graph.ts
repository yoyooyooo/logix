/**
 * GraphNode represents either a field node or a capability node in the StateGraph.
 */
export interface GraphNode {
  readonly id: string
  readonly type: "Field" | "Capability"
  readonly fieldId: string
  readonly labels: ReadonlyArray<string>
}

/**
 * GraphEdge represents a relationship between two nodes: dependency, linkage, etc.
 */
export interface GraphEdge {
  readonly from: string
  readonly to: string
  readonly relation: string
  readonly metadata?: Record<string, unknown>
}

/**
 * StateGraph is a projection of a module's fields and capabilities into
 * a graph structure for DevTools and platform use.
 */
export interface StateGraph {
  readonly moduleId: string
  readonly version?: string
  readonly nodes: ReadonlyArray<GraphNode>
  readonly edges: ReadonlyArray<GraphEdge>
}

