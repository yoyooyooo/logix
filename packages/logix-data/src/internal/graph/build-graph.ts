import type { Field } from "../model/field.js"
import type { FieldCapability, FieldCapabilityKind } from "../model/capability.js"
import type {
  StateGraph,
  GraphNode,
  GraphEdge
} from "../model/state-graph.js"

const capabilityNodeId = (fieldId: string, kind: FieldCapabilityKind): string =>
  `${fieldId}#${kind}`

const makeFieldNode = (field: Field): GraphNode => ({
  id: field.id,
  type: "Field",
  fieldId: field.id,
  labels: [field.valueType]
})

const makeCapabilityNode = (
  capability: FieldCapability
): GraphNode => ({
  id: capabilityNodeId(capability.fieldId, capability.kind),
  type: "Capability",
  fieldId: capability.fieldId,
  labels: [capability.kind]
})

/**
 * 从 Field / FieldCapability 集合构建模块的 StateGraph 视图。
 */
export const buildStateGraph = (params: {
  moduleId: string
  fields: ReadonlyArray<Field>
  capabilities: ReadonlyArray<FieldCapability>
  version?: string
}): StateGraph => {
  const fieldNodes: GraphNode[] = params.fields.map(makeFieldNode)

  const capabilityNodes: GraphNode[] = params.capabilities.map(
    makeCapabilityNode
  )

  const edges: GraphEdge[] = []

  for (const capability of params.capabilities) {
    const capNodeId = capabilityNodeId(capability.fieldId, capability.kind)

    // 能力节点驱动自身字段值
    edges.push({
      from: capNodeId,
      to: capability.fieldId,
      relation: "drives"
    })

    // Computed / Link 能力依赖其他字段
    if (
      (capability.kind === "Computed" || capability.kind === "Link") &&
      capability.deps &&
      capability.deps.length > 0
    ) {
      for (const dep of capability.deps) {
        edges.push({
          from: dep,
          to: capNodeId,
          relation: "depends-on"
        })
      }
    }
  }

  return {
    moduleId: params.moduleId,
    version: params.version,
    nodes: [...fieldNodes, ...capabilityNodes],
    edges
  }
}
