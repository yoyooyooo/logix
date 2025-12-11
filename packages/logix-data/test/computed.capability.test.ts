import { describe, it, expect } from "vitest"
import { Computed } from "../src/computed/schema.js"

describe("Computed capability schema factory", () => {
  it("creates a CapabilityBlueprint with kind=Computed", () => {
    const blueprint = Computed.for({
      deps: ["user.firstName", "user.lastName"],
      derive: "concat"
    })

    expect(blueprint.kind).toBe("Computed")
    expect(blueprint.fieldPath).toBe("")
    expect(blueprint.options?.deps).toEqual([
      "user.firstName",
      "user.lastName"
    ])
  })
})
