import { describe, it, expect } from "vitest"
import { Computed } from "../src/computed/schema.js"
import {
  scanModuleSchema,
  type ModuleSchemaDescriptor
} from "../src/internal/schema/scan-capabilities.js"
import { buildComputedPlan } from "../src/internal/runtime/attach-computed.js"

describe("runtime integration - computed capabilities", () => {
  it("builds computed runtime plan from schema descriptors", () => {
    const schema: ModuleSchemaDescriptor = {
      moduleId: "UserModule",
      fields: [
        { path: "user.firstName", valueType: "string" },
        { path: "user.lastName", valueType: "string" },
        {
          path: "user.fullName",
          valueType: "string",
          capabilities: [
            Computed.for({
              deps: ["user.firstName", "user.lastName"],
              derive: "concat"
            })
          ]
        }
      ]
    }

    const { capabilities } = scanModuleSchema(schema)
    const plan = buildComputedPlan(capabilities)

    expect(plan).toHaveLength(1)
    expect(plan[0].fieldId).toBe("user.fullName")
    expect(plan[0].deps).toEqual(["user.firstName", "user.lastName"])
  })
})
