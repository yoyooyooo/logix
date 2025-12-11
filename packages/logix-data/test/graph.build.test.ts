import { describe, it, expect } from "vitest"
import type { Field } from "../src/internal/model/field.js"
import type { FieldCapability } from "../src/internal/model/capability.js"
import { buildStateGraph } from "../src/internal/graph/build-graph.js"

describe("StateGraph build", () => {
  it("builds nodes and edges from fields and capabilities", () => {
    const fields: Field[] = [
      {
        id: "user.firstName",
        path: "user.firstName",
        pathSegments: ["user", "firstName"],
        valueType: "string"
      },
      {
        id: "user.lastName",
        path: "user.lastName",
        pathSegments: ["user", "lastName"],
        valueType: "string"
      },
      {
        id: "user.fullName",
        path: "user.fullName",
        pathSegments: ["user", "fullName"],
        valueType: "string"
      }
    ]

    const capabilities: FieldCapability[] = [
      {
        fieldId: "user.fullName",
        kind: "Computed",
        deps: ["user.firstName", "user.lastName"]
      }
    ]

    const graph = buildStateGraph({
      moduleId: "UserModule",
      fields,
      capabilities
    })

    expect(graph.moduleId).toBe("UserModule")
    expect(graph.nodes.length).toBe(4) // 3 fields + 1 capability

    const capabilityNode = graph.nodes.find(
      (n) => n.type === "Capability"
    )
    expect(capabilityNode?.labels).toEqual(["Computed"])

    // should contain depends-on edges from deps to capability node
    const dependsEdges = graph.edges.filter(
      (e) => e.relation === "depends-on"
    )
    expect(dependsEdges).toHaveLength(2)

    // and one drives edge from capability node to fullName field
    const drivesEdges = graph.edges.filter(
      (e) => e.relation === "drives"
    )
    expect(drivesEdges).toHaveLength(1)
    expect(drivesEdges[0].to).toBe("user.fullName")
  })
})
