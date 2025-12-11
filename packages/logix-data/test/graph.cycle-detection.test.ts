import { describe, it, expect } from "vitest"
import type { Field } from "../src/internal/model/field.js"
import type { FieldCapability } from "../src/internal/model/capability.js"
import { buildStateGraph } from "../src/internal/graph/build-graph.js"

const hasCycle = (edges: ReadonlyArray<{ from: string; to: string }>): boolean => {
  const adj = new Map<string, string[]>()
  for (const { from, to } of edges) {
    adj.set(from, [...(adj.get(from) ?? []), to])
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()

  const dfs = (node: string): boolean => {
    if (visiting.has(node)) return true
    if (visited.has(node)) return false
    visiting.add(node)
    for (const next of adj.get(node) ?? []) {
      if (dfs(next)) return true
    }
    visiting.delete(node)
    visited.add(node)
    return false
  }

  for (const node of adj.keys()) {
    if (dfs(node)) {
      return true
    }
  }
  return false
}

describe("StateGraph cycle detection (boundary scenario)", () => {
  it("can expose cycles formed by computed capabilities", () => {
    const fields: Field[] = [
      {
        id: "a",
        path: "a",
        pathSegments: ["a"],
        valueType: "number"
      },
      {
        id: "b",
        path: "b",
        pathSegments: ["b"],
        valueType: "number"
      }
    ]

    const capabilities: FieldCapability[] = [
      {
        fieldId: "a",
        kind: "Computed",
        deps: ["b"]
      },
      {
        fieldId: "b",
        kind: "Computed",
        deps: ["a"]
      }
    ]

    const graph = buildStateGraph({
      moduleId: "CycleModule",
      fields,
      capabilities
    })

    // StateGraph 本身允许表达环路，检测/处理策略由上层 Runtime 决定。
    expect(hasCycle(graph.edges)).toBe(true)
  })
})
