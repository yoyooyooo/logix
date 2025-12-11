import { describe, it, expect } from "vitest"
import { Computed } from "../src/computed/schema.js"
import {
  scanModuleSchema,
  type ModuleSchemaDescriptor
} from "../src/internal/schema/scan-capabilities.js"
import { buildComputedPlan } from "../src/internal/runtime/attach-computed.js"

describe("runtime integration - nested objects & lists", () => {
  it("handles capabilities on nested object fields and list items", () => {
    const schema: ModuleSchemaDescriptor = {
      moduleId: "ResumeModule",
      fields: [
        { path: "educationList[*].school", valueType: "string" },
        { path: "educationList[*].degree", valueType: "string" },
        {
          path: "educationList[*].label",
          valueType: "string",
          capabilities: [
            Computed.for({
              deps: [
                "educationList[*].school",
                "educationList[*].degree"
              ],
              derive: "concat"
            })
          ]
        }
      ]
    }

    const { capabilities } = scanModuleSchema(schema)
    const plan = buildComputedPlan(capabilities)

    expect(plan).toHaveLength(1)
    expect(plan[0].fieldId).toBe("educationList[*].label")
    expect(plan[0].deps).toEqual([
      "educationList[*].school",
      "educationList[*].degree"
    ])
  })
})
