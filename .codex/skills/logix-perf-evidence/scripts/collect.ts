import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'
import { execFileSync } from 'node:child_process'

const REPORT_PREFIX = 'LOGIX_PERF_REPORT:'

type PerfReport = {
  readonly schemaVersion: number
  readonly meta: {
    readonly createdAt: string
    readonly generator: string
    readonly matrixId: string
    readonly matrixUpdatedAt?: string
    readonly matrixHash?: string
    readonly git?: {
      readonly branch?: string
      readonly commit?: string
      readonly dirty?: boolean
    }
    readonly config: {
      readonly runs: number
      readonly warmupDiscard: number
      readonly timeoutMs: number
      readonly headless?: boolean
      readonly profile?: string
      readonly humanSummary?: boolean
      readonly stability?: {
        readonly maxP95DeltaRatio: number
        readonly maxP95DeltaMs: number
      }
      readonly budgets?: ReadonlyArray<unknown>
    }
    readonly env: {
      readonly os: string
      readonly arch: string
      readonly node: string
      readonly browser: {
        readonly name: string
        readonly version?: string
        readonly headless?: boolean
      }
      readonly pnpm?: string
      readonly vitest?: string
      readonly playwright?: string
    }
    readonly evidence?: {
      readonly memory?: Record<string, unknown>
      readonly diagnostics?: Record<string, unknown>
      readonly soak?: Record<string, unknown>
    }
  }
  readonly suites: ReadonlyArray<unknown>
}

type MatrixMeta = {
  readonly id: string
  readonly updatedAt?: string
  readonly hash: string
}

const parseArgs = (
  argv: ReadonlyArray<string>,
): {
  readonly outFile: string
  readonly profile?: string
  readonly files: ReadonlyArray<string>
  readonly targetCwd: string
  readonly configFile?: string
} => {
  const outFlagIndex = argv.lastIndexOf('--out')
  const profileFlagIndex = argv.lastIndexOf('--profile')
  const cwdFlagIndex = argv.lastIndexOf('--cwd')
  const configFlagIndex = argv.lastIndexOf('--config')

  const outFile = outFlagIndex >= 0 ? argv[outFlagIndex + 1] : undefined
  const profile = profileFlagIndex >= 0 ? argv[profileFlagIndex + 1] : undefined
  const cwd = cwdFlagIndex >= 0 ? argv[cwdFlagIndex + 1] : undefined
  const config = configFlagIndex >= 0 ? argv[configFlagIndex + 1] : undefined

  if (outFlagIndex >= 0 && (!outFile || outFile.startsWith('--'))) {
    throw new Error('Missing value for --out')
  }
  if (profileFlagIndex >= 0 && (!profile || profile.startsWith('--'))) {
    throw new Error('Missing value for --profile')
  }
  if (cwdFlagIndex >= 0 && (!cwd || cwd.startsWith('--'))) {
    throw new Error('Missing value for --cwd')
  }
  if (configFlagIndex >= 0 && (!config || config.startsWith('--'))) {
    throw new Error('Missing value for --config')
  }

  const files: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--files') {
      const v = argv[i + 1]
      if (v) files.push(v)
    }
  }

  const targetCwd = path.resolve(cwd ?? 'packages/logix-react')
  const defaultFiles = [
    'test/browser/watcher-browser-perf.test.tsx',
    'test/browser/perf-boundaries',
    'test/browser/perf-scenarios',
  ].filter((p) => fsSync.existsSync(path.resolve(targetCwd, p)))

  return {
    outFile: outFile ?? 'perf/after.local.json',
    profile,
    files: files.length > 0 ? files : defaultFiles,
    targetCwd,
    configFile: config ? path.resolve(config) : undefined,
  }
}

const safeExec = (cmd: string, args: ReadonlyArray<string>): string | undefined => {
  try {
    return execFileSync(cmd, [...args], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

const readMatrixMeta = async (): Promise<MatrixMeta | undefined> => {
  const file = path.resolve('.codex/skills/logix-perf-evidence/assets/matrix.json')
  try {
    const text = await fs.readFile(file, 'utf8')
    const hash = createHash('sha256').update(text).digest('hex')
    const json = JSON.parse(text) as { id?: unknown; updatedAt?: unknown }
    const id = typeof json.id === 'string' && json.id.length > 0 ? json.id : undefined
    const updatedAt = typeof json.updatedAt === 'string' && json.updatedAt.length > 0 ? json.updatedAt : undefined
    if (!id) return undefined
    return { id, updatedAt, hash }
  } catch {
    return undefined
  }
}

const readGitMeta = (): PerfReport['meta']['git'] | undefined => {
  const branch = safeExec('git', ['branch', '--show-current'])
  const commit = safeExec('git', ['rev-parse', 'HEAD'])
  const dirty = safeExec('git', ['status', '--porcelain=v1', '--untracked-files=no'])
  if (!branch && !commit && dirty == null) return undefined
  return {
    branch: branch || undefined,
    commit: commit || undefined,
    dirty: dirty != null ? dirty.length > 0 : undefined,
  }
}

const quantile = (values: ReadonlyArray<number>, q: number): number | undefined => {
  if (values.length === 0) return undefined
  const sorted = values.slice().sort((a, b) => a - b)
  const index = Math.floor(Math.max(0, Math.min(1, q)) * (sorted.length - 1))
  return sorted[index]
}

const collectEvidenceValues = (
  parts: ReadonlyArray<PerfReport>,
  evidenceName: string,
): ReadonlyArray<number | string> => {
  const out: Array<number | string> = []
  for (const report of parts) {
    const suites = Array.isArray(report.suites) ? (report.suites as Array<any>) : []
    for (const suite of suites) {
      const points = Array.isArray(suite?.points) ? suite.points : []
      for (const point of points) {
        const evidence = Array.isArray(point?.evidence) ? point.evidence : []
        for (const entry of evidence) {
          if (entry?.name !== evidenceName || entry?.status !== 'ok') continue
          if (typeof entry.value === 'number' || typeof entry.value === 'string') {
            out.push(entry.value)
          }
        }
      }
    }
  }
  return out
}

const summarizeEvidenceMeta = (parts: ReadonlyArray<PerfReport>): PerfReport['meta']['evidence'] => {
  const memoryDriftBytes = collectEvidenceValues(parts, 'memory.heapDriftBytes').filter(
    (x): x is number => typeof x === 'number' && Number.isFinite(x),
  )
  const memoryDriftRatio = collectEvidenceValues(parts, 'memory.heapDriftRatio').filter(
    (x): x is number => typeof x === 'number' && Number.isFinite(x),
  )
  const diagnosticsLevels = collectEvidenceValues(parts, 'diagnostics.level').filter(
    (x): x is string => typeof x === 'string',
  )
  const diagnosticsOverheadRatio = collectEvidenceValues(parts, 'diagnostics.overheadRatio').filter(
    (x): x is number => typeof x === 'number' && Number.isFinite(x),
  )
  const soakRounds = collectEvidenceValues(parts, 'workload.soakRounds').filter(
    (x): x is number => typeof x === 'number' && Number.isFinite(x),
  )

  return {
    memory: {
      driftBytes: {
        count: memoryDriftBytes.length,
        p50: quantile(memoryDriftBytes, 0.5),
        p95: quantile(memoryDriftBytes, 0.95),
      },
      driftRatio: {
        count: memoryDriftRatio.length,
        p50: quantile(memoryDriftRatio, 0.5),
        p95: quantile(memoryDriftRatio, 0.95),
      },
    },
    diagnostics: {
      levels: Array.from(new Set(diagnosticsLevels)).sort(),
      overheadRatio: {
        count: diagnosticsOverheadRatio.length,
        p50: quantile(diagnosticsOverheadRatio, 0.5),
        p95: quantile(diagnosticsOverheadRatio, 0.95),
      },
    },
    soak: {
      roundsObserved: Array.from(new Set(soakRounds)).sort((a, b) => a - b),
    },
  }
}

const mergeReports = (parts: ReadonlyArray<PerfReport>, matrixMeta: MatrixMeta | undefined): PerfReport => {
  const base = parts[0]
  if (!base) {
    throw new Error('No LOGIX_PERF_REPORT payloads captured')
  }

  const matrixHash = matrixMeta?.id === base.meta.matrixId ? matrixMeta.hash : undefined
  const matrixUpdatedAt = matrixMeta?.id === base.meta.matrixId ? matrixMeta.updatedAt : undefined
  if (matrixMeta && matrixMeta.id !== base.meta.matrixId) {
    // eslint-disable-next-line no-console
    console.warn(
      `[logix-perf] note: report.matrixId(${base.meta.matrixId}) != matrix.json.id(${matrixMeta.id}); skip matrixHash/matrixUpdatedAt`,
    )
  }

  return {
    schemaVersion: base.schemaVersion,
    meta: {
      createdAt: new Date().toISOString(),
      generator: '.codex/skills/logix-perf-evidence/scripts/collect.ts',
      matrixId: base.meta.matrixId,
      matrixUpdatedAt,
      matrixHash,
      git: readGitMeta(),
      config: base.meta.config,
      env: {
        os: process.platform,
        arch: process.arch,
        cpu: os.cpus()[0]?.model,
        memoryGb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        node: process.version,
        pnpm: safeExec('pnpm', ['--version']) || undefined,
        vitest: safeExec('node', ['-e', "console.log(require('vitest/package.json').version)"]) || undefined,
        playwright: safeExec('node', ['-e', "console.log(require('playwright/package.json').version)"]) || undefined,
        browser: {
          name: base.meta.env.browser.name,
          headless: base.meta.env.browser.headless,
          version: base.meta.env.browser.version,
        },
      },
      evidence: summarizeEvidenceMeta(parts),
    },
    suites: parts.flatMap((p) => p.suites),
  }
}

const toPosixPath = (file: string): string => file.split(path.sep).join('/')

const collectTestFilesRecursively = async (args: {
  readonly rootAbs: string
  readonly dirAbs: string
}): Promise<ReadonlyArray<string>> => {
  const entries = await fs.readdir(args.dirAbs, { withFileTypes: true })
  const out: string[] = []

  for (const entry of entries) {
    if (entry.name === '__screenshots__') continue
    const abs = path.join(args.dirAbs, entry.name)
    if (entry.isDirectory()) {
      out.push(...(await collectTestFilesRecursively({ rootAbs: args.rootAbs, dirAbs: abs })))
      continue
    }
    if (!entry.isFile()) continue
    if (!/\.test\.[mc]?[jt]sx?$/.test(entry.name)) continue
    out.push(toPosixPath(path.relative(args.rootAbs, abs)))
  }

  return out
}

const expandVitestTargets = async (args: {
  readonly rootAbs: string
  readonly targets: ReadonlyArray<string>
}): Promise<ReadonlyArray<string>> => {
  const expanded: string[] = []

  for (const target of args.targets) {
    const abs = path.resolve(args.rootAbs, target)
    const stat = await fs.stat(abs).catch(() => undefined)
    if (!stat) {
      throw new Error(`Missing --files target: ${target} (resolved: ${abs})`)
    }

    if (stat.isDirectory()) {
      const files = await collectTestFilesRecursively({ rootAbs: args.rootAbs, dirAbs: abs })
      expanded.push(...files)
      continue
    }

    if (stat.isFile()) {
      expanded.push(toPosixPath(target))
      continue
    }
  }

  return Array.from(new Set(expanded)).sort()
}

const runVitestBrowser = async (args: {
  readonly files: ReadonlyArray<string>
  readonly env: NodeJS.ProcessEnv
  readonly projectCwd: string
  readonly configFile?: string
}): Promise<ReadonlyArray<PerfReport>> => {
  const cmd = 'pnpm'
  const childArgs = ['-C', args.projectCwd, 'test', '--', '--project', 'browser', '--maxWorkers', '1']
  if (args.configFile) {
    childArgs.push('--config', args.configFile)
  }
  childArgs.push(...args.files)

  const child = spawn(cmd, childArgs, {
    env: args.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const parts: PerfReport[] = []

  const handleLine = (line: string) => {
    const idx = line.indexOf(REPORT_PREFIX)
    if (idx < 0) return
    const json = line.slice(idx + REPORT_PREFIX.length)
    parts.push(JSON.parse(json) as PerfReport)
  }

  const stdoutRl = readline.createInterface({ input: child.stdout })
  stdoutRl.on('line', (line) => {
    process.stdout.write(`${line}\n`)
    handleLine(line)
  })

  const stderrRl = readline.createInterface({ input: child.stderr })
  stderrRl.on('line', (line) => {
    process.stderr.write(`${line}\n`)
    handleLine(line)
  })

  const exitCode: number = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? 1))
  })

  stdoutRl.close()
  stderrRl.close()

  if (exitCode !== 0) {
    throw new Error(`Vitest browser project failed (exitCode=${exitCode})`)
  }

  return parts
}

const main = async (): Promise<void> => {
  const { outFile, profile, files, targetCwd, configFile } = parseArgs(process.argv.slice(2))

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    ...(process.env.VITE_LOGIX_PERF_HARD_GATES ? {} : { VITE_LOGIX_PERF_HARD_GATES: 'off' }),
    ...(profile ? { VITE_LOGIX_PERF_PROFILE: profile } : {}),
  }

  const expandedFiles = await expandVitestTargets({ rootAbs: targetCwd, targets: files })
  if (expandedFiles.length === 0) {
    throw new Error(`No test files resolved in target cwd: ${targetCwd}`)
  }

  const parts: PerfReport[] = []
  for (const file of expandedFiles) {
    const collected = await runVitestBrowser({
      files: [file],
      env: childEnv,
      projectCwd: targetCwd,
      configFile,
    })
    parts.push(...collected)
  }

  const matrixMeta = await readMatrixMeta()
  const report = mergeReports(parts, matrixMeta)

  await fs.mkdir(path.dirname(outFile), { recursive: true })
  await fs.writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${outFile}`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
