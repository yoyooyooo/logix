import { describe, it, expect } from "vitest"
import type { Field } from "../src/internal/model/field.js"
import type { FieldCapability } from "../src/internal/model/capability.js"
import type { StateGraph } from "../src/internal/model/state-graph.js"
import type { ResourceMetadata } from "../src/internal/model/resource.js"

describe("data model shapes", () => {
  it("allows constructing a basic Field", () => {
    const field: Field = {
      id: "user.name",
      path: "user.name",
      pathSegments: ["user", "name"],
      valueType: "string"
    }

    expect(field.id).toBe("user.name")
    expect(field.pathSegments).toEqual(["user", "name"])
  })

  it("supports a Source capability with resource metadata", () => {
    const resource: ResourceMetadata = {
      resourceKind: "query",
      identifier: "user/detail"
    }

    const capability: FieldCapability = {
      fieldId: "user.detail",
      kind: "Source",
      resource
    }

    expect(capability.kind).toBe("Source")
    expect(capability.resource?.resourceKind).toBe("query")
  })

  it("represents a simple StateGraph", () => {
    const graph: StateGraph = {
      moduleId: "UserModule",
      nodes: [
        { id: "user.name", type: "Field", fieldId: "user.name", labels: ["string"] },
        { id: "user.fullName#Computed", type: "Capability", fieldId: "user.fullName", labels: ["Computed"] }
      ],
      edges: [
        { from: "user.name", to: "user.fullName#Computed", relation: "depends-on" }
      ]
    }

    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges[0].relation).toBe("depends-on")
  })
})
