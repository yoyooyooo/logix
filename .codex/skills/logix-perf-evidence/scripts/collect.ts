import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import fsSync from 'node:fs'
import type { Stats } from 'node:fs'
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
  readonly matrixFile: string
  readonly files: ReadonlyArray<string>
} => {
  const outFlagIndex = argv.lastIndexOf('--out')
  const profileFlagIndex = argv.lastIndexOf('--profile')
  const matrixFlagIndex = argv.lastIndexOf('--matrix')

  const outFile = outFlagIndex >= 0 ? argv[outFlagIndex + 1] : undefined
  const profile = profileFlagIndex >= 0 ? argv[profileFlagIndex + 1] : undefined
  const matrixFile = matrixFlagIndex >= 0 ? argv[matrixFlagIndex + 1] : undefined

  if (outFlagIndex >= 0 && (!outFile || outFile.startsWith('--'))) {
    throw new Error('Missing value for --out')
  }
  if (profileFlagIndex >= 0 && (!profile || profile.startsWith('--'))) {
    throw new Error('Missing value for --profile')
  }
  if (matrixFlagIndex >= 0 && (!matrixFile || matrixFile.startsWith('--'))) {
    throw new Error('Missing value for --matrix')
  }

  const files: string[] = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--files') {
      const v = argv[i + 1]
      if (v) files.push(v)
    }
  }

  const defaultFiles = ['test/browser/watcher-browser-perf.test.tsx', 'test/browser/perf-boundaries'].filter((p) =>
    fsSync.existsSync(path.resolve('packages/logix-react', p)),
  )

  return {
    outFile: outFile ?? 'perf/after.local.json',
    profile,
    matrixFile: matrixFile ?? '.codex/skills/logix-perf-evidence/assets/matrix.json',
    files: files.length > 0 ? files : defaultFiles,
  }
}

const safeExec = (cmd: string, args: ReadonlyArray<string>): string | undefined => {
  try {
    return execFileSync(cmd, [...args], { encoding: 'utf8' }).trim()
  } catch {
    return undefined
  }
}

const readMatrixMeta = async (matrixFile: string): Promise<MatrixMeta | undefined> => {
  const file = path.resolve(matrixFile)
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

type CollectRoot = 'logix-react' | 'logix-core'
type ResolvedTarget = { readonly root: CollectRoot; readonly rootAbs: string; readonly abs: string; readonly rel: string }

const resolveTarget = async (target: string): Promise<ResolvedTarget> => {
  const raw = String(target ?? '').trim()
  if (!raw) {
    throw new Error('Missing --files target (empty)')
  }

  const reactRootAbs = path.resolve('packages/logix-react')
  const coreRootAbs = path.resolve('packages/logix-core')

  const tryStat = async (abs: string): Promise<Stats | undefined> => fs.stat(abs).catch(() => undefined)

  const resolveIn = async (root: CollectRoot, rootAbs: string, rel: string): Promise<ResolvedTarget | undefined> => {
    const abs = path.resolve(rootAbs, rel)
    const stat = await tryStat(abs)
    if (!stat) return undefined
    return { root, rootAbs, abs, rel: toPosixPath(rel) }
  }

  const prefixedReact = 'packages/logix-react/'
  const prefixedCore = 'packages/logix-core/'

  if (raw.startsWith(prefixedReact)) {
    const rel = raw.slice(prefixedReact.length)
    const resolved = await resolveIn('logix-react', reactRootAbs, rel)
    if (!resolved) {
      throw new Error(`Missing --files target: ${raw} (resolved: ${path.resolve(reactRootAbs, rel)})`)
    }
    return resolved
  }

  if (raw.startsWith(prefixedCore)) {
    const rel = raw.slice(prefixedCore.length)
    const resolved = await resolveIn('logix-core', coreRootAbs, rel)
    if (!resolved) {
      throw new Error(`Missing --files target: ${raw} (resolved: ${path.resolve(coreRootAbs, rel)})`)
    }
    return resolved
  }

  const resolvedReact = await resolveIn('logix-react', reactRootAbs, raw)
  if (resolvedReact) return resolvedReact

  const resolvedCore = await resolveIn('logix-core', coreRootAbs, raw)
  if (resolvedCore) return resolvedCore

  const absRepo = path.resolve(raw)
  const statRepo = await tryStat(absRepo)
  if (statRepo) {
    const relToReact = path.relative(reactRootAbs, absRepo)
    if (!relToReact.startsWith('..') && !path.isAbsolute(relToReact)) {
      return { root: 'logix-react', rootAbs: reactRootAbs, abs: absRepo, rel: toPosixPath(relToReact) }
    }
    const relToCore = path.relative(coreRootAbs, absRepo)
    if (!relToCore.startsWith('..') && !path.isAbsolute(relToCore)) {
      return { root: 'logix-core', rootAbs: coreRootAbs, abs: absRepo, rel: toPosixPath(relToCore) }
    }
  }

  throw new Error(
    `Missing --files target: ${raw} (checked packages/logix-react, packages/logix-core, and repo-root)`,
  )
}

const expandVitestTargets = async (targets: ReadonlyArray<string>): Promise<{ readonly root: CollectRoot; readonly files: ReadonlyArray<string> }> => {
  const expanded: string[] = []
  const resolved = await Promise.all(targets.map(resolveTarget))

  const root = resolved[0]?.root
  if (!root) {
    throw new Error('No --files targets provided')
  }
  if (resolved.some((t) => t.root !== root)) {
    const roots = Array.from(new Set(resolved.map((t) => t.root))).sort()
    throw new Error(
      `Mixed --files roots are not supported in a single collect run: roots=${roots.join(', ')} (run collect separately)`,
    )
  }

  for (const target of resolved) {
    const stat = await fs.stat(target.abs).catch(() => undefined)
    if (!stat) {
      throw new Error(`Missing --files target: ${target.rel} (resolved: ${target.abs})`)
    }

    if (stat.isDirectory()) {
      const files = await collectTestFilesRecursively({ rootAbs: target.rootAbs, dirAbs: target.abs })
      expanded.push(...files)
      continue
    }

    if (stat.isFile()) {
      expanded.push(target.rel)
      continue
    }
  }

  return { root, files: Array.from(new Set(expanded)).sort() }
}

const runVitestBrowser = async (args: {
  readonly files: ReadonlyArray<string>
  readonly env: NodeJS.ProcessEnv
}): Promise<ReadonlyArray<PerfReport>> => {
  const cmd = 'pnpm'
  const childArgs = ['-C', 'packages/logix-react', 'test', '--', '--project', 'browser', '--maxWorkers', '1', ...args.files]

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

const runVitestNode = async (args: {
  readonly files: ReadonlyArray<string>
  readonly env: NodeJS.ProcessEnv
}): Promise<ReadonlyArray<PerfReport>> => {
  const cmd = 'pnpm'
  const childArgs = ['-C', 'packages/logix-core', 'test', '--', '--maxWorkers', '1', ...args.files]

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
    throw new Error(`Vitest node project failed (exitCode=${exitCode})`)
  }

  return parts
}

const main = async (): Promise<void> => {
  const { outFile, profile, matrixFile, files } = parseArgs(process.argv.slice(2))

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'production',
    LOGIX_PERF_COLLECT: '1',
    ...(process.env.VITE_LOGIX_PERF_HARD_GATES ? {} : { VITE_LOGIX_PERF_HARD_GATES: 'off' }),
    ...(profile ? { VITE_LOGIX_PERF_PROFILE: profile } : {}),
  }

  const expanded = await expandVitestTargets(files)

  const parts: PerfReport[] = []
  const run = expanded.root === 'logix-core' ? runVitestNode : runVitestBrowser
  for (const file of expanded.files) {
    const collected = await run({ files: [file], env: childEnv })
    parts.push(...collected)
  }

  const matrixMeta = await readMatrixMeta(matrixFile)
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
