import { describe, it, expect } from "vitest"
import { Link } from "../src/link/schema.js"

describe("Link capability schema factory", () => {
  it("creates a CapabilityBlueprint with kind=Link and link options", () => {
    const blueprint = Link.to({
      targetModuleId: "OtherModule",
      targetFieldPath: "other.value",
      direction: "one-way"
    })

    expect(blueprint.kind).toBe("Link")
    expect(blueprint.options?.targetModuleId).toBe("OtherModule")
    expect(blueprint.options?.direction).toBe("one-way")
  })
})
