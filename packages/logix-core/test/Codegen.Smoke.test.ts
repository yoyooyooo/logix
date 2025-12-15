import { describe, it, expect } from "@effect/vitest"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

describe("scripts/logix-codegen.ts (smoke)", () => {
  it("generates a scaffold from Schema.Struct", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "logix-codegen-"))
    try {
      const schemaFile = path.join(tmpDir, "schema.ts")
      fs.writeFileSync(
        schemaFile,
        [
          `import { Schema } from "effect"`,
          ``,
          `export const ValuesSchema = Schema.Struct({`,
          `  a: Schema.String,`,
          `  items: Schema.Array(Schema.Struct({`,
          `    id: Schema.String,`,
          `  })),`,
          `})`,
          ``,
        ].join("\n"),
        "utf8",
      )

      const scriptPath = fileURLToPath(
        new URL("../../../scripts/logix-codegen.ts", import.meta.url),
      )
      const repoRoot = path.dirname(path.dirname(scriptPath))

      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          scriptPath,
          "--kind",
          "form",
          "--id",
          "MyForm",
          "--schema",
          schemaFile,
          "--export",
          "ValuesSchema",
        ],
        { cwd: repoRoot, encoding: "utf8" },
      )

      expect(result.status).toBe(0)
      expect(result.stderr).toBe("")
      expect(result.stdout).toContain("export const MyFormFieldPaths")
      expect(result.stdout).toContain('"a"')
      expect(result.stdout).toContain('"items"')
      expect(result.stdout).toContain('"items[]"')
      expect(result.stdout).toContain('"items[].id"')
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })
})

