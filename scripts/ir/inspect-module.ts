import { Effect } from "effect"
import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { pathToFileURL } from "node:url"
import * as Logix from "@logixjs/core"

type DiagnosticsLevel = "off" | "light" | "full"

type InspectArgs = {
  readonly modulePath: string
  readonly exportName: string
  readonly outDir: string
  readonly compareDir?: string
  readonly runId: string
  readonly startedAt?: number
  readonly config: Record<string, string | number | boolean>
  readonly includeStaticIr: boolean
  readonly manifestMaxBytes?: number
  readonly reportMaxBytes?: number
  readonly diagnosticsLevel: DiagnosticsLevel
  readonly maxEvents?: number
  readonly trialRunTimeoutMs?: number
  readonly closeScopeTimeout?: number
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const parseNumber = (value: string): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const parseConfigValue = (raw: string): string | number | boolean => {
  if (raw === "true") return true
  if (raw === "false") return false
  const num = parseNumber(raw)
  if (num !== undefined) return num
  return raw
}

const getFlag = (argv: ReadonlyArray<string>, name: string): string | undefined => {
  const idx = argv.lastIndexOf(`--${name}`)
  if (idx < 0) return undefined
  const next = argv[idx + 1]
  if (!next || next.startsWith("--")) {
    throw new Error(`Missing value for --${name}`)
  }
  return next
}

const hasFlag = (argv: ReadonlyArray<string>, name: string): boolean => argv.includes(`--${name}`)

const parseConfigFlags = (argv: ReadonlyArray<string>): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== "--config") continue
    const raw = argv[i + 1]
    if (!raw || raw.startsWith("--")) {
      throw new Error("Missing value for --config (expected KEY=VALUE)")
    }
    const eq = raw.indexOf("=")
    if (eq <= 0) {
      throw new Error(`Invalid --config value: ${raw} (expected KEY=VALUE)`)
    }
    const key = raw.slice(0, eq)
    const value = raw.slice(eq + 1)
    out[key] = parseConfigValue(value)
  }
  return out
}

const parseDiagnosticsLevel = (value: string | undefined): DiagnosticsLevel => {
  if (!value) return "light"
  if (value === "off" || value === "light" || value === "full") return value
  throw new Error(`Invalid diagnosticsLevel: ${value} (expected off|light|full)`)
}

const parseArgs = (argv: ReadonlyArray<string>): InspectArgs => {
  const positional = argv.filter((a) => !a.startsWith("--"))
  const modulePath = getFlag(argv, "module") ?? positional[0]
  if (!modulePath) {
    throw new Error("Missing module path. Provide --module <path> or first positional arg.")
  }

  const exportName = getFlag(argv, "export") ?? positional[1] ?? "AppRoot"
  const outDir = getFlag(argv, "outDir") ?? getFlag(argv, "out") ?? "dist/ir"
  const compareDir = getFlag(argv, "compareDir") ?? getFlag(argv, "compare")

  const runId = getFlag(argv, "runId")
  if (!runId) {
    throw new Error("Missing --runId (CI/可复跑场景必须显式提供)")
  }

  const startedAtRaw = getFlag(argv, "startedAt")
  const startedAt = startedAtRaw ? parseNumber(startedAtRaw) : undefined

  const includeStaticIr = hasFlag(argv, "includeStaticIr") || !hasFlag(argv, "noStaticIr")

  const manifestMaxBytesRaw = getFlag(argv, "manifestMaxBytes")
  const manifestMaxBytes = manifestMaxBytesRaw ? parseNumber(manifestMaxBytesRaw) : undefined

  const reportMaxBytesRaw = getFlag(argv, "reportMaxBytes")
  const reportMaxBytes = reportMaxBytesRaw ? parseNumber(reportMaxBytesRaw) : undefined

  const diagnosticsLevel = parseDiagnosticsLevel(getFlag(argv, "diagnosticsLevel"))

  const maxEventsRaw = getFlag(argv, "maxEvents")
  const maxEvents = maxEventsRaw ? parseNumber(maxEventsRaw) : undefined

  const trialRunTimeoutMsRaw = getFlag(argv, "trialRunTimeoutMs")
  const trialRunTimeoutMs = trialRunTimeoutMsRaw ? parseNumber(trialRunTimeoutMsRaw) : undefined

  const closeScopeTimeoutRaw = getFlag(argv, "closeScopeTimeout")
  const closeScopeTimeout = closeScopeTimeoutRaw ? parseNumber(closeScopeTimeoutRaw) : undefined

  return {
    modulePath,
    exportName,
    outDir,
    compareDir,
    runId,
    startedAt,
    config: parseConfigFlags(argv),
    includeStaticIr,
    manifestMaxBytes: manifestMaxBytes,
    reportMaxBytes: reportMaxBytes,
    diagnosticsLevel,
    maxEvents,
    trialRunTimeoutMs,
    closeScopeTimeout,
  }
}

const loadProgramModule = async (args: InspectArgs): Promise<unknown> => {
  const abs = path.resolve(process.cwd(), args.modulePath)
  const mod = await import(pathToFileURL(abs).toString())

  if (args.exportName === "default") {
    if (!("default" in mod)) {
      throw new Error(`Module has no default export: ${args.modulePath}`)
    }
    return (mod as any).default
  }

  if (!(args.exportName in mod)) {
    const keys = Object.keys(mod).sort().join(", ")
    throw new Error(
      `Missing export "${args.exportName}" in ${args.modulePath}. Available: [${keys}]`,
    )
  }
  return (mod as any)[args.exportName]
}

const writeJson = async (filePath: string, data: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
}

const readJson = async (filePath: string): Promise<any> => {
  const text = await fs.readFile(filePath, "utf8")
  return JSON.parse(text)
}

const normalizeTrialRunReport = (report: any): unknown => {
  const environment = report?.environment
  return {
    ok: report?.ok === true,
    error: report?.error
      ? {
          code: String(report.error.code ?? ""),
          name: String(report.error.name ?? ""),
          message: String(report.error.message ?? ""),
          hint: report.error.hint ? String(report.error.hint) : undefined,
        }
      : undefined,
    environment: environment
      ? {
          tagIds: Array.isArray(environment.tagIds)
            ? environment.tagIds.map(String).slice().sort()
            : [],
          configKeys: Array.isArray(environment.configKeys)
            ? environment.configKeys.map(String).slice().sort()
            : [],
          missingServices: Array.isArray(environment.missingServices)
            ? environment.missingServices.map(String).slice().sort()
            : [],
          missingConfigKeys: Array.isArray(environment.missingConfigKeys)
            ? environment.missingConfigKeys.map(String).slice().sort()
            : [],
        }
      : undefined,
    manifestDigest: report?.manifest?.digest ? String(report.manifest.digest) : undefined,
    staticIrDigest: report?.staticIr?.digest ? String(report.staticIr.digest) : undefined,
    truncated: report?.summary?.__logix?.truncated === true ? true : undefined,
  }
}

const main = async (): Promise<unknown> => {
  const args = parseArgs(process.argv.slice(2))

  const programModule = await loadProgramModule(args)

  const manifest = Logix.Reflection.extractManifest(programModule as any, {
    includeStaticIr: args.includeStaticIr,
    budgets: isFiniteNumber(args.manifestMaxBytes) ? { maxBytes: args.manifestMaxBytes } : undefined,
  })

  const report = await Effect.runPromise(
    Logix.Observability.trialRunModule(programModule as any, {
      runId: args.runId,
      startedAt: args.startedAt,
      source: { host: "node", label: "inspect-module" },
      buildEnv: { hostKind: "node", config: Object.keys(args.config).length ? args.config : undefined },
      diagnosticsLevel: args.diagnosticsLevel,
      maxEvents: isFiniteNumber(args.maxEvents) ? args.maxEvents : undefined,
      trialRunTimeoutMs: isFiniteNumber(args.trialRunTimeoutMs) ? args.trialRunTimeoutMs : undefined,
      closeScopeTimeout: isFiniteNumber(args.closeScopeTimeout) ? args.closeScopeTimeout : undefined,
      budgets: isFiniteNumber(args.reportMaxBytes) ? { maxBytes: args.reportMaxBytes } : undefined,
    }),
  )

  const outDirAbs = path.resolve(process.cwd(), args.outDir)
  const manifestFile = path.join(outDirAbs, "module-manifest.json")
  const reportFile = path.join(outDirAbs, "trial-run-report.json")

  await writeJson(manifestFile, manifest)
  await writeJson(reportFile, report)

  let compare: unknown = undefined
  let ok = true

  if (args.compareDir) {
    const compareDirAbs = path.resolve(process.cwd(), args.compareDir)
    const baselineManifestFile = path.join(compareDirAbs, "module-manifest.json")
    const baselineReportFile = path.join(compareDirAbs, "trial-run-report.json")

    const baselineManifest = await readJson(baselineManifestFile)
    const baselineReport = await readJson(baselineReportFile)

    const diff = Logix.Reflection.diffManifest(baselineManifest, manifest)
    const diffFile = path.join(outDirAbs, "module-manifest-diff.json")
    await writeJson(diffFile, diff)

    const trialRunCompare = {
      equal:
        JSON.stringify(normalizeTrialRunReport(baselineReport)) ===
        JSON.stringify(normalizeTrialRunReport(report)),
      baseline: normalizeTrialRunReport(baselineReport),
      current: normalizeTrialRunReport(report),
    }

    const compareFile = path.join(outDirAbs, "trial-run-report-compare.json")
    await writeJson(compareFile, trialRunCompare)

    ok = diff.verdict === "PASS" && trialRunCompare.equal

    compare = {
      diffVerdict: diff.verdict,
      trialRunEqual: trialRunCompare.equal,
      outFiles: {
        diff: diffFile,
        trialRunCompare: compareFile,
      },
    }
  }

  const summary = {
    ok,
    outDir: outDirAbs,
    module: { path: args.modulePath, export: args.exportName },
    manifest: { digest: manifest.digest, file: manifestFile },
    trialRun: { ok: report.ok, errorCode: report.error?.code, file: reportFile },
    compare,
  }

  if (!ok) {
    process.exitCode = 1
  }

  return summary
}

main()
  .then((summary) => {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(summary, null, 2))
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exitCode = 1
  })
