import { describe, it, expect } from "vitest"
import { Source } from "../src/source/schema.js"

describe("Source capability schema factory", () => {
  it("creates a CapabilityBlueprint with kind=Source and resource metadata", () => {
    const blueprint = Source.field({
      resource: {
        resourceKind: "query",
        identifier: "user/detail"
      },
      statusModel: { mode: "inline" }
    })

    expect(blueprint.kind).toBe("Source")
    expect(blueprint.options?.resource).toEqual({
      resourceKind: "query",
      identifier: "user/detail"
    })
  })
})
