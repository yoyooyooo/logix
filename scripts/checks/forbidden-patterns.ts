import { execSync } from "node:child_process"

type Mode =
  | { readonly kind: "worktree" }
  | { readonly kind: "cached" }
  | { readonly kind: "base"; readonly base: string }

type Rule = {
  readonly id: "txn-window-io" | "business-subscriptionref-write" | "legacy-runtime-entrypoint"
  readonly message: string
  readonly appliesToFile: (file: string) => boolean
  readonly isViolation: (line: string, file: string) => boolean
}

type Violation = {
  readonly rule: Rule["id"]
  readonly file: string
  readonly line: string
}

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
          "Usage: tsx scripts/checks/forbidden-patterns.ts [--cached] [--base <ref>]",
          "",
          "Fail-fast scan for Stage2B T088 forbidden patterns on added lines.",
          "",
          "Rules:",
          "  - txn-window-io",
          "  - business-subscriptionref-write",
          "  - legacy-runtime-entrypoint",
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

const isTsSourceFile = (file: string): boolean => {
  const lower = file.toLowerCase()
  if (!(lower.endsWith(".ts") || lower.endsWith(".tsx"))) return false
  if (lower.includes("/test/") || lower.includes("/tests/") || lower.includes("/__tests__/")) return false
  if (lower.includes(".test.") || lower.includes(".spec.")) return false
  if (lower.includes("/dist/") || lower.includes("/build/") || lower.includes("/public/")) return false
  return lower.includes("/src/")
}

const isCommentLine = (line: string): boolean => {
  const trimmed = line.trim()
  return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("*/")
}

const LEGACY_ENTRY_ALLOWLIST_PREFIXES = [
  "packages/logix-core/src/internal/runtime/core/runner/",
  "packages/logix-core/src/internal/observability/",
  "packages/logix-react/src/internal/provider/",
  "packages/logix-core/src/ExternalStore.ts",
  "packages/logix-core/src/internal/InternalContracts.ts",
  "packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts",
  "packages/logix-core/src/internal/runtime/core/WorkflowRuntime.ts",
  "packages/logix-react/src/ModuleScope.ts",
  "packages/logix-react/src/internal/hooks/useProcesses.ts",
  "packages/logix-react/src/internal/store/ModuleCache.ts",
] as const

const SUBSCRIPTION_REF_WRITE_ALLOWLIST_PREFIXES = [
  "packages/logix-core/src/internal/runtime/core/",
  "packages/logix-core/src/internal/state-trait/",
  "packages/i18n/src/internal/driver/",
] as const

const startsWithAny = (file: string, prefixes: ReadonlyArray<string>): boolean =>
  prefixes.some((prefix) => file.startsWith(prefix))

const rules: ReadonlyArray<Rule> = [
  {
    id: "txn-window-io",
    message:
      "Transaction-window IO is forbidden in ModuleRuntime.transaction. Move async work outside runWithStateTransaction.",
    appliesToFile: (file) => file === "packages/logix-core/src/internal/runtime/core/ModuleRuntime.transaction.ts",
    isViolation: (line) => {
      if (isCommentLine(line)) return false
      return /(\bawait\b|Effect\.sleep\(|Effect\.promise\(|Effect\.tryPromise\(|new\s+Promise\b|setTimeout\(|queueMicrotask\()/.test(
        line,
      )
    },
  },
  {
    id: "business-subscriptionref-write",
    message:
      "Business-layer direct SubscriptionRef writes are forbidden. Route state writes through runtime transaction APIs.",
    appliesToFile: (file) => isTsSourceFile(file) && !startsWithAny(file, SUBSCRIPTION_REF_WRITE_ALLOWLIST_PREFIXES),
    isViolation: (line) => {
      if (isCommentLine(line)) return false
      return /SubscriptionRef\.(set|update|updateAndGet|modify|modifyEffect|setAndGet)\s*\(/.test(line)
    },
  },
  {
    id: "legacy-runtime-entrypoint",
    message:
      "Legacy runtime run* entrypoints are forbidden on main paths. Use runtime/scope-managed execution surfaces instead.",
    appliesToFile: (file) => {
      if (!isTsSourceFile(file)) return false
      const inTargetSurface =
        file.startsWith("packages/logix-core/src/") ||
        file.startsWith("packages/logix-react/src/") ||
        file.startsWith("packages/logix-sandbox/src/")
      return inTargetSurface && !startsWithAny(file, LEGACY_ENTRY_ALLOWLIST_PREFIXES)
    },
    isViolation: (line) => {
      if (isCommentLine(line)) return false
      return /\b(runSync|runFork|runPromise|runSyncExit|runPromiseExit)\s*\(/.test(line)
    },
  },
]

const main = (): void => {
  const mode = parseArgs(process.argv.slice(2))
  const diff = runGitDiff(mode)

  let currentFile: string | undefined
  const violations: Array<Violation> = []

  for (const rawLine of diff.split("\n")) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice("+++ b/".length).trim()
      continue
    }

    if (!currentFile) continue
    if (rawLine.startsWith("+++")) continue
    if (!rawLine.startsWith("+")) continue

    const added = rawLine.slice(1)

    for (const rule of rules) {
      if (!rule.appliesToFile(currentFile)) continue
      if (!rule.isViolation(added, currentFile)) continue
      violations.push({ rule: rule.id, file: currentFile, line: added })
    }
  }

  if (violations.length === 0) {
    return
  }

  // eslint-disable-next-line no-console
  console.error("[forbidden-patterns] Found forbidden patterns in added lines:")
  for (const violation of violations) {
    const rule = rules.find((entry) => entry.id === violation.rule)
    // eslint-disable-next-line no-console
    console.error(`- [${violation.rule}] ${violation.file}: ${violation.line.trim()}`)
    if (rule) {
      // eslint-disable-next-line no-console
      console.error(`  -> ${rule.message}`)
    }
  }
  process.exit(1)
}

main()
