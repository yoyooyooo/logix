import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")
const skillDir = path.resolve(repoRoot, ".codex/skills/logix-perf-evidence")
const skillPackageJson = path.resolve(skillDir, "package.json")

const usage = (): string => `\
Usage:
  pnpm perf <script> [-- <args...>]

Examples:
  pnpm perf bench:useModule
  pnpm perf collect -- --out specs/<id>/perf/after.local.json
  pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>
  pnpm perf diff:triage -- --before <before.json> --after <after.json> --out <diff.json>
  pnpm perf validate -- --report <before|after>.json
  pnpm perf tuning:best
`

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  const script = argv[0]

  if (!fs.existsSync(skillPackageJson)) {
    throw new Error(
      `Missing skill package.json at ${skillPackageJson}. Did you delete/move .codex/skills/logix-perf-evidence?`,
    )
  }

  if (!script || script === "help" || script === "-h" || script === "--help") {
    // eslint-disable-next-line no-console
    console.log(usage())
    return
  }

  const rest = argv.slice(1)
  const forwarded = rest.length > 0 && rest[0] === "--" ? rest.slice(1) : rest

  const pnpmArgs: string[] = ["run", script]
  if (forwarded.length > 0) {
    pnpmArgs.push("--", ...forwarded)
  }

  const child = spawn("pnpm", pnpmArgs, {
    cwd: skillDir,
    stdio: "inherit",
    shell: false,
  })

  const code: number = await new Promise((resolve) => {
    child.on("close", (c) => resolve(c ?? 1))
  })

  process.exitCode = code
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
