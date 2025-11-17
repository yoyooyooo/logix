import { execSync } from "node:child_process"

type Mode =
  | { readonly kind: "worktree" }
  | { readonly kind: "cached" }
  | { readonly kind: "base"; readonly base: string }

const parseArgs = (argv: ReadonlyArray<string>): Mode => {
  let mode: Mode = { kind: "worktree" }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--cached") {
      mode = { kind: "cached" }
      continue
    }
    if (arg === "--base") {
      const base = argv[i + 1]
      if (!base) {
        throw new Error("Missing value for --base <ref>")
      }
      i += 1
      mode = { kind: "base", base }
      continue
    }
    if (arg === "--help" || arg === "-h") {
      // eslint-disable-next-line no-console
      console.log(
        [
          "Usage: tsx scripts/checks/no-internal-magic-fields.ts [--cached] [--base <ref>]",
          "",
          "Checks newly-added lines for forbidden direct `.__*` magic field access.",
          "",
          "Modes:",
          "  (default)        git diff --unified=0 HEAD",
          "  --cached         git diff --cached --unified=0",
          "  --base <ref>     git diff --unified=0 <ref>...HEAD",
        ].join("\n"),
      )
      process.exit(0)
    }
  }

  return mode
}

const runGitDiff = (mode: Mode): string => {
  const cmd =
    mode.kind === "cached"
      ? "git diff --cached --unified=0"
      : mode.kind === "base"
        ? `git diff --unified=0 ${mode.base}...HEAD`
        : "git diff --unified=0 HEAD"

  return execSync(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1024 * 1024 * 256,
  }).toString("utf-8")
}

const ALLOWLIST_FILES = new Set<string>([])

const shouldCheckFile = (file: string): boolean => {
  if (ALLOWLIST_FILES.has(file)) return false

  // Only enforce on authored TypeScript sources (avoid generated bundles / docs noise).
  const lower = file.toLowerCase()
  if (!(lower.endsWith(".ts") || lower.endsWith(".tsx"))) return false
  if (lower.includes("/public/")) return false
  if (lower.includes("/dist/")) return false
  return true
}

const isForbiddenMagicAccess = (line: string): boolean => /\.__[A-Za-z0-9_]/.test(line)

const main = (): void => {
  const mode = parseArgs(process.argv.slice(2))
  const diff = runGitDiff(mode)

  let currentFile: string | undefined
  const violations: Array<{ readonly file: string; readonly line: string }> = []

  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice("+++ b/".length).trim()
      continue
    }

    if (!currentFile) continue
    if (!shouldCheckFile(currentFile)) continue

    if (rawLine.startsWith("+++")) continue
    if (rawLine.startsWith("+")) {
      const added = rawLine.slice(1)
      if (!isForbiddenMagicAccess(added)) continue
      violations.push({ file: currentFile, line: added })
    }
  }

  if (violations.length === 0) {
    return
  }

  // eslint-disable-next-line no-console
  console.error("[no-internal-magic-fields] Found forbidden `.__*` access in added lines:")
  for (const v of violations) {
    // eslint-disable-next-line no-console
    console.error(`- ${v.file}: ${v.line.trim()}`)
  }
  process.exit(1)
}

main()
