import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Form } from "../src/index.js"

describe("SchemaPathMapping", () => {
  it("maps rename (segment) + array index", () => {
    const out = Form.SchemaPathMapping.mapSchemaErrorToFieldPaths(
      { path: ["users", 0, "user_id"] },
      { rename: { user_id: "userId" } },
    )
    expect(out).toEqual(["users.0.userId"])
  })

  it("supports prefix flatten via rename mapping", () => {
    const out = Form.SchemaPathMapping.mapSchemaErrorToFieldPaths(
      { path: ["meta", "foo"] },
      { rename: { meta: "" } },
    )
    expect(out).toEqual(["foo"])
  })

  it("supports pattern rename with [] placeholders", () => {
    const out = Form.SchemaPathMapping.mapSchemaErrorToFieldPaths(
      { path: ["items", 2, "user_id"] },
      { rename: { "items[].user_id": "rows[].userId" } },
    )
    expect(out).toEqual(["rows.2.userId"])
  })
})

