import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")
const packageDir = path.resolve(repoRoot, "packages/logix-perf-evidence")
const perfPackageJson = path.resolve(packageDir, "package.json")

const usage = (): string => `\
Usage:
  pnpm perf <script> [-- <args...>]

Examples:
  pnpm perf bench:useModule
  pnpm perf collect -- --out specs/<id>/perf/after.local.json
  pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>
  pnpm perf diff:triage -- --before <before.json> --after <after.json> --out <diff.json>
  pnpm perf capacity:collect -- --profile default --steps 200,400,800,1200,1600,2000,2400,2800,3200
  pnpm perf validate -- --report <before|after>.json
  pnpm perf tuning:best
`

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  const script = argv[0]

  if (!fs.existsSync(perfPackageJson)) {
    throw new Error(
      `Missing perf evidence package.json at ${perfPackageJson}. Did you delete/move packages/logix-perf-evidence?`,
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
    cwd: packageDir,
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
