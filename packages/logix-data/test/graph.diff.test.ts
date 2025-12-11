import { describe, it, expect } from "vitest"
import type { StateGraph } from "../src/internal/model/state-graph.js"
import { diffStateGraph } from "../src/internal/graph/diff-graph.js"

describe("StateGraph diff", () => {
  it("detects added and removed nodes and edges", () => {
    const oldGraph: StateGraph = {
      moduleId: "UserModule",
      nodes: [
        {
          id: "user.name",
          type: "Field",
          fieldId: "user.name",
          labels: ["string"]
        },
        {
          id: "user.name#Computed",
          type: "Capability",
          fieldId: "user.name",
          labels: ["Computed"]
        }
      ],
      edges: [
        {
          from: "user.name#Computed",
          to: "user.name",
          relation: "drives"
        }
      ]
    }

    const newGraph: StateGraph = {
      moduleId: "UserModule",
      nodes: [
        ...oldGraph.nodes,
        {
          id: "user.displayName",
          type: "Field",
          fieldId: "user.displayName",
          labels: ["string"]
        }
      ],
      edges: [
        ...oldGraph.edges,
        {
          from: "user.name",
          to: "user.name#Computed",
          relation: "depends-on"
        }
      ]
    }

    const diff = diffStateGraph({ oldGraph, newGraph })

    expect(diff.addedNodes.length).toBe(1)
    expect(diff.addedNodes[0].fieldId).toBe("user.displayName")

    expect(diff.removedNodes.length).toBe(0)

    expect(diff.addedEdges.length).toBe(1)
    expect(diff.addedEdges[0].relation).toBe("depends-on")

    expect(diff.removedEdges.length).toBe(0)
  })
})
