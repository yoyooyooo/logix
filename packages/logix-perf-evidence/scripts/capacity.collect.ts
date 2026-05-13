import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  buildCapacityEnvelope,
  parseStepsLevelsOverride,
  type Primitive,
  type ThresholdLike,
} from './lib/capacity-envelope'

type PerfReport = {
  readonly schemaVersion: number
  readonly meta?: {
    readonly createdAt?: string
    readonly matrixId?: string
    readonly config?: {
      readonly profile?: string
      readonly runs?: number
      readonly warmupDiscard?: number
      readonly timeoutMs?: number
    }
    readonly git?: {
      readonly branch?: string
      readonly commit?: string
      readonly dirty?: boolean
    }
    readonly env?: {
      readonly os?: string
      readonly arch?: string
      readonly cpu?: string
      readonly browser?: {
        readonly name?: string
        readonly version?: string
      }
    }
  }
  readonly suites: ReadonlyArray<{
    readonly id: string
    readonly thresholds?: ReadonlyArray<ThresholdLike>
    readonly points?: ReadonlyArray<{
      readonly params?: Record<string, Primitive>
    }>
  }>
}

type Args = {
  readonly profile: string
  readonly outDir: string
  readonly suiteId: string
  readonly budgetId: string
  readonly scopeConvergeMode: string
  readonly files: ReadonlyArray<string>
  readonly reportFile?: string
  readonly stepsRaw?: string
}

const usage = (): string => `\
Usage:
  pnpm perf capacity:collect -- [options]

Options:
  --profile <smoke|quick|default|soak>     采样 profile（默认 default）
  --out-dir <dir>                          输出目录（默认 perf/capacity）
  --suite-id <id>                          suite id（默认 converge.txnCommit）
  --budget-id <id>                         budget id（默认 commit.p95<=50ms）
  --scope-converge-mode <mode>             where 过滤（默认 auto）
  --steps <csv>                            覆盖 steps 轴（例如 200,400,800,1600,3200）
  --files <path>                           采集范围，可重复传入（默认 converge-steps）
  --report <file>                          直接分析已有 report（跳过 collect）

Examples:
  pnpm perf capacity:collect -- --profile default --steps 200,400,800,1200,1600,2000,2400,2800,3200
  pnpm perf capacity:collect -- --report perf/capacity/capacity.raw.default.json
`

const parseArgs = (argv: ReadonlyArray<string>): Args => {
  const get = (name: string): string | undefined => {
    const index = argv.lastIndexOf(name)
    if (index < 0) return undefined
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${name}`)
    }
    return value
  }

  const files: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--files') {
      const value = argv[index + 1]
      if (value && !value.startsWith('--')) files.push(value)
    }
  }

  return {
    profile: get('--profile') ?? 'default',
    outDir: get('--out-dir') ?? 'perf/capacity',
    suiteId: get('--suite-id') ?? 'converge.txnCommit',
    budgetId: get('--budget-id') ?? 'commit.p95<=50ms',
    scopeConvergeMode: get('--scope-converge-mode') ?? 'auto',
    stepsRaw: get('--steps'),
    reportFile: get('--report'),
    files: files.length > 0 ? files : ['test/browser/perf-boundaries/converge-steps.test.tsx'],
  }
}

const runCollect = async (args: {
  readonly profile: string
  readonly reportFile: string
  readonly files: ReadonlyArray<string>
  readonly stepsRaw?: string
}): Promise<void> => {
  const commandArgs = [
    'tsx',
    'packages/logix-perf-evidence/scripts/collect.ts',
    '--profile',
    args.profile,
    '--out',
    args.reportFile,
    ...args.files.flatMap((file) => ['--files', file]),
  ]

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    VITE_LOGIX_PERF_HARD_GATES: 'off',
  }

  if (args.stepsRaw != null && args.stepsRaw.trim().length > 0) {
    env.VITE_LOGIX_PERF_STEPS_LEVELS = args.stepsRaw
  }

  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', commandArgs, {
      stdio: 'inherit',
      env,
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`collect failed, exit code=${String(code ?? 'unknown')}`))
      }
    })
  })
}

const deriveStepsLevelsFromReport = (report: PerfReport, suiteId: string): ReadonlyArray<number> => {
  const suite = report.suites.find((entry) => entry.id === suiteId)
  if (!suite || !Array.isArray(suite.points)) return []

  const levels = suite.points
    .map((point) => point.params?.steps)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  return Array.from(new Set(levels)).sort((a, b) => a - b)
}

const renderMarkdown = (args: {
  readonly profile: string
  readonly suiteId: string
  readonly budgetId: string
  readonly reportPath: string
  readonly stepsLevels: ReadonlyArray<number>
  readonly envelope: ReturnType<typeof buildCapacityEnvelope>
  readonly reportMeta?: PerfReport['meta']
}): string => {
  const lines: string[] = []
  lines.push('# Capacity Envelope (Dynamic maxLevel)')
  lines.push('')
  lines.push(`- suite: \`${args.suiteId}\``)
  lines.push(`- budget: \`${args.budgetId}\``)
  lines.push(`- profile: \`${args.profile}\``)
  lines.push(`- report: \`${args.reportPath}\``)
  lines.push(`- steps levels: \`${args.stepsLevels.join(', ')}\``)

  const commit = args.reportMeta?.git?.commit
  if (commit) lines.push(`- git.commit: \`${commit}\``)
  const browserVersion = args.reportMeta?.env?.browser?.version
  if (browserVersion) lines.push(`- browser.version: \`${browserVersion}\``)

  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`- floor maxLevel: \`${args.envelope.summary.floorMaxLevel}\``)
  lines.push(`- p50 maxLevel: \`${args.envelope.summary.p50MaxLevel}\``)
  lines.push(`- p90 maxLevel: \`${args.envelope.summary.p90MaxLevel}\``)
  lines.push(`- max observed level: \`${args.envelope.summary.maxObservedLevel}\``)
  lines.push(
    `- areaUnderCurveNormalized: \`${args.envelope.summary.areaUnderCurveNormalized.toFixed(6)}\` (dirtyRootsRatio∈[0,1])`,
  )

  lines.push('')
  lines.push('## Envelope')
  lines.push('')
  lines.push('| dirtyRootsRatio | maxLevel | firstFailLevel | reason |')
  lines.push('| ---: | ---: | ---: | --- |')

  for (const row of args.envelope.envelope) {
    lines.push(
      `| ${String(row.dirtyRootsRatio)} | ${String(row.maxLevel)} | ${String(row.firstFailLevel ?? '-') } | ${row.reason ?? '-'} |`,
    )
  }

  lines.push('')
  lines.push('## Bottlenecks')
  lines.push('')
  for (const item of args.envelope.summary.bottlenecks) {
    lines.push(`- dirtyRootsRatio=${String(item.dirtyRootsRatio)} -> maxLevel=${String(item.maxLevel)}`)
  }

  lines.push('')
  return `${lines.join('\n')}\n`
}

const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  if (argv.includes('--help') || argv.includes('-h')) {
    // eslint-disable-next-line no-console
    console.log(usage())
    return
  }

  const args = parseArgs(argv)
  const stepsLevelsOverride = parseStepsLevelsOverride(args.stepsRaw)

  await fs.mkdir(args.outDir, { recursive: true })

  const reportPath = path.resolve(
    process.cwd(),
    args.reportFile ?? path.join(args.outDir, `capacity.raw.${args.profile}.json`),
  )

  if (!args.reportFile) {
    await runCollect({
      profile: args.profile,
      reportFile: reportPath,
      files: args.files,
      stepsRaw: args.stepsRaw,
    })
  }

  const report = JSON.parse(await fs.readFile(reportPath, 'utf8')) as PerfReport
  const suite = report.suites.find((entry) => entry.id === args.suiteId)
  if (!suite) {
    throw new Error(`suite not found: ${args.suiteId}`)
  }

  const thresholds = Array.isArray(suite.thresholds) ? suite.thresholds : []
  if (thresholds.length === 0) {
    throw new Error(`suite has no thresholds: ${args.suiteId}`)
  }

  const stepsLevels =
    stepsLevelsOverride != null && stepsLevelsOverride.length > 0
      ? stepsLevelsOverride
      : deriveStepsLevelsFromReport(report, args.suiteId)

  if (stepsLevels.length === 0) {
    throw new Error('failed to derive steps levels from report; pass --steps explicitly')
  }

  const envelope = buildCapacityEnvelope({
    suiteId: args.suiteId,
    budgetId: args.budgetId,
    scope: {
      convergeMode: args.scopeConvergeMode,
    },
    stepsLevels,
    thresholds,
  })

  const jsonOut = path.resolve(process.cwd(), path.join(args.outDir, `capacity.envelope.${args.profile}.json`))
  const mdOut = path.resolve(process.cwd(), path.join(args.outDir, `capacity.envelope.${args.profile}.md`))

  const payload = {
    schemaVersion: 1,
    meta: {
      createdAt: new Date().toISOString(),
      generator: 'packages/logix-perf-evidence/scripts/capacity.collect.ts',
      profile: args.profile,
      suiteId: args.suiteId,
      budgetId: args.budgetId,
      scope: {
        convergeMode: args.scopeConvergeMode,
      },
      reportPath,
      stepsLevels,
      reportMeta: report.meta,
    },
    envelope,
  }

  await fs.writeFile(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  await fs.writeFile(
    mdOut,
    renderMarkdown({
      profile: args.profile,
      suiteId: args.suiteId,
      budgetId: args.budgetId,
      reportPath,
      stepsLevels,
      envelope,
      reportMeta: report.meta,
    }),
    'utf8',
  )

  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${jsonOut}`)
  // eslint-disable-next-line no-console
  console.log(`[logix-perf] wrote ${mdOut}`)
  // eslint-disable-next-line no-console
  console.log(
    `[logix-perf] floor=${String(envelope.summary.floorMaxLevel)} p50=${String(
      envelope.summary.p50MaxLevel,
    )} p90=${String(envelope.summary.p90MaxLevel)} max=${String(envelope.summary.maxObservedLevel)}`,
  )
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exitCode = 1
})
