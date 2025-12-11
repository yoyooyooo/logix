import { describe, it, expect } from "vitest"
import { Link } from "../src/link/schema.js"
import {
  scanModuleSchema,
  type ModuleSchemaDescriptor
} from "../src/internal/schema/scan-capabilities.js"
import { buildLinkPlan } from "../src/internal/runtime/attach-link.js"

describe("runtime integration - link capabilities", () => {
  it("builds link runtime plan from schema descriptors", () => {
    const schema: ModuleSchemaDescriptor = {
      moduleId: "UserModule",
      fields: [
        { path: "settings.language", valueType: "string" },
        {
          path: "profile.displayLanguage",
          valueType: "string",
          capabilities: [
            Link.to({
              targetModuleId: "UserModule",
              targetFieldPath: "settings.language",
              direction: "one-way",
              deps: ["settings.language"]
            })
          ]
        }
      ]
    }

    const { capabilities } = scanModuleSchema(schema)
    const plan = buildLinkPlan(capabilities)

    expect(plan).toHaveLength(1)
    expect(plan[0].fieldId).toBe("profile.displayLanguage")
    expect(plan[0].deps).toEqual(["settings.language"])
    expect(plan[0].direction).toBe("one-way")
  })
})
