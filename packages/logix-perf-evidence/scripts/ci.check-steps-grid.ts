import fs from 'node:fs/promises'
import { compareStepsGrid } from './lib/steps-grid'
import { buildStepsGridGuardDecision } from './lib/steps-grid-guard'

type ReportLike = {
  readonly suites: ReadonlyArray<{
    readonly id: string
    readonly points: ReadonlyArray<{
      readonly params: Record<string, string | number | boolean | undefined>
    }>
  }>
}

const getArg = (argv: ReadonlyArray<string>, name: string): string | undefined => {
  const index = argv.lastIndexOf(name)
  if (index < 0) return undefined
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}`)
  }
  return value
}

const hasFlag = (argv: ReadonlyArray<string>, name: string): boolean => argv.includes(name)

const appendEnvLines = async (envOut: string, lines: ReadonlyArray<string>) => {
  await fs.appendFile(envOut, `${lines.join('\n')}\n`, 'utf8')
}

const readReport = async (file: string): Promise<ReportLike> => {
  const text = await fs.readFile(file, 'utf8')
  return JSON.parse(text) as ReportLike
}

const usage = () =>
  [
    'Usage:',
    '  pnpm perf ci:check-steps-grid -- --before <before.json> --after <after.json> [--env-out <github_env_path>] [--strict]',
  ].join('\n')

const main = async () => {
  const argv = process.argv.slice(2)
  const beforeFile = getArg(argv, '--before')
  const afterFile = getArg(argv, '--after')
  const envOut = getArg(argv, '--env-out')
  const strict = hasFlag(argv, '--strict')

  if (!beforeFile || !afterFile) {
    throw new Error(usage())
  }

  const [before, after] = await Promise.all([readReport(beforeFile), readReport(afterFile)])
  const result = compareStepsGrid(before, after)
  const decision = buildStepsGridGuardDecision({
    matched: result.matched,
    beforeHash: result.beforeHash,
    afterHash: result.afterHash,
    summary: result.beforeSummary,
  })

  if (decision.matched) {
    console.log(`[logix-perf] steps grid check: matched hash=${result.beforeHash}`)
    if (envOut) {
      await appendEnvLines(envOut, decision.envLines)
    }
    return
  }

  console.warn(
    `[logix-perf] steps grid mismatch: before=${result.beforeHash} after=${result.afterHash}\n` +
      `[logix-perf] steps grid before: ${result.beforeSummary}\n` +
      `[logix-perf] steps grid after: ${result.afterSummary}`,
  )

  if (envOut) {
    await appendEnvLines(envOut, decision.envLines)
  }

  if (strict) {
    throw new Error(
      `[logix-perf] strict steps grid check failed: before=${result.beforeHash} after=${result.afterHash}`,
    )
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
