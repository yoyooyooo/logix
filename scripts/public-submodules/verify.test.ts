import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { verifyWorkspace } from "./verify"

const fixturesRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
)

describe("verify:public-submodules", () => {
  it("passes on a compliant fixture workspace", async () => {
    const root = path.resolve(fixturesRoot, "pass")
    const result = await verifyWorkspace(root, { checkImports: false })
    expect(result.ok).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it("fails on src/ root governance violations", async () => {
    const root = path.resolve(fixturesRoot, "src-root-violation")
    const result = await verifyWorkspace(root, { checkImports: false })
    expect(result.ok).toBe(false)
    expect(result.violations.some((v) => v.code === "src_root_forbidden_file")).toBe(true)
  })

  it("fails when exports points into src/internal", async () => {
    const root = path.resolve(fixturesRoot, "internal-leak")
    const result = await verifyWorkspace(root, { checkImports: false })
    expect(result.ok).toBe(false)
    expect(result.violations.some((v) => v.code === "exports_points_to_internal")).toBe(true)
  })

  it("fails on cross-package deep import into src/internal", async () => {
    const root = path.resolve(fixturesRoot, "cross-package-internal-import")
    const result = await verifyWorkspace(root)
    expect(result.ok).toBe(false)
    expect(result.violations.some((v) => v.code === "import_bypass_cross_package_src_internal")).toBe(true)
  })
})
