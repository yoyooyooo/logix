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
  pnpm perf examples:browser
  pnpm perf examples:browser -- --reporter=dot
  pnpm perf bench:useModule
  pnpm perf collect -- --out specs/<id>/perf/after.local.json
  pnpm perf collect -- --files examples/logix-react/test/browser/perf-scenarios --out specs/<id>/perf/after.examples.json
  pnpm perf diff -- --before <before.json> --after <after.json> --out <diff.json>
  pnpm perf diff:triage -- --before <before.json> --after <after.json> --out <diff.json>
  pnpm perf capacity:probe -- --profile default --steps 200,400,800,1200,1600,2000,2400,2800,3200
  pnpm perf validate -- --report <before|after>.json
  pnpm perf tuning:best
`

const spawnAndWait = async (args: {
  readonly cmd: string
  readonly cmdArgs: ReadonlyArray<string>
  readonly cwd: string
}): Promise<number> => {
  const child = spawn(args.cmd, [...args.cmdArgs], {
    cwd: args.cwd,
    stdio: "inherit",
    shell: false,
  })

  return await new Promise((resolve) => {
    child.on("close", (code) => resolve(code ?? 1))
  })
}

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

  if (script === "examples:browser") {
    const cmdArgs = ["-C", "examples/logix-react", "test", "--", "--project", "browser", "test/browser/perf-scenarios", ...forwarded]
    process.exitCode = await spawnAndWait({ cmd: "pnpm", cmdArgs, cwd: repoRoot })
    return
  }

  const pnpmArgs: string[] = ["run", script]
  if (forwarded.length > 0) {
    pnpmArgs.push("--", ...forwarded)
  }

  process.exitCode = await spawnAndWait({ cmd: "pnpm", cmdArgs: pnpmArgs, cwd: skillDir })
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
