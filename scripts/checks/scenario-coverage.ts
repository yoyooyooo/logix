import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

type ScenarioCoverage = 'covered' | 'partial' | 'missing'

type ScenarioRow = {
  readonly scenarioId: string
  readonly conclusion: ScenarioCoverage
}

const CHECK_NAME = 'scenario-coverage'
const DEFAULT_MATRIX = 'specs/103-cli-minimal-kernel-self-loop/analysis/scenario-cli-coverage-matrix.md'

const parseArgs = (argv: ReadonlyArray<string>): {
  readonly matrixPath: string
  readonly maxMissing: number
  readonly maxPartial?: number
  readonly minCovered: number
} => {
  let matrixPath = DEFAULT_MATRIX
  let maxMissing = 0
  let maxPartial: number | undefined
  let minCovered = 0

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]

    if ((arg === '--matrix' || arg === '--matrixPath') && typeof next === 'string') {
      matrixPath = next
      i += 1
      continue
    }

    if (arg === '--maxMissing' && typeof next === 'string') {
      const parsed = Number(next)
      if (!Number.isInteger(parsed) || parsed < 0) throw new Error('--maxMissing 必须是 >=0 的整数')
      maxMissing = parsed
      i += 1
      continue
    }

    if (arg === '--maxPartial' && typeof next === 'string') {
      const parsed = Number(next)
      if (!Number.isInteger(parsed) || parsed < 0) throw new Error('--maxPartial 必须是 >=0 的整数')
      maxPartial = parsed
      i += 1
      continue
    }

    if (arg === '--minCovered' && typeof next === 'string') {
      const parsed = Number(next)
      if (!Number.isInteger(parsed) || parsed < 0) throw new Error('--minCovered 必须是 >=0 的整数')
      minCovered = parsed
      i += 1
      continue
    }

    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(
        [
          'Usage: tsx scripts/checks/scenario-coverage.ts [--matrix <path>] [--maxMissing <n>] [--maxPartial <n>] [--minCovered <n>]',
          '',
          'Default threshold: maxMissing=0 (fail when any scenario is missing).',
        ].join('\n'),
      )
      process.exit(0)
    }
  }

  return {
    matrixPath,
    maxMissing,
    maxPartial,
    minCovered,
  }
}

const normalizeCoverage = (value: string): ScenarioCoverage | undefined => {
  const normalized = value.trim().replace(/`/g, '').toLowerCase()
  if (normalized === 'covered') return 'covered'
  if (normalized === 'partial') return 'partial'
  if (normalized === 'missing') return 'missing'
  return undefined
}

const parseRows = (matrixText: string): ReadonlyArray<ScenarioRow> => {
  const rows: ScenarioRow[] = []
  for (const line of matrixText.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('| S')) continue
    const columns = trimmed
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0)
    if (columns.length < 2) continue

    const scenarioId = (columns[0] ?? '').split(/\s+/u)[0] ?? ''
    if (!/^S[0-9]{2}$/u.test(scenarioId)) continue

    const conclusion = normalizeCoverage(columns[columns.length - 1] ?? '')
    if (!conclusion) continue
    rows.push({ scenarioId, conclusion })
  }
  return rows
}

const makeSummary = (rows: ReadonlyArray<ScenarioRow>) => ({
  covered: rows.filter((row) => row.conclusion === 'covered').length,
  partial: rows.filter((row) => row.conclusion === 'partial').length,
  missing: rows.filter((row) => row.conclusion === 'missing').length,
  total: rows.length,
})

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const resolvedMatrixPath = path.resolve(process.cwd(), args.matrixPath)
  if (!fs.existsSync(resolvedMatrixPath)) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify(
        {
          check: CHECK_NAME,
          ok: false,
          reasonCode: 'SCENARIO_COVERAGE_MATRIX_NOT_FOUND',
          matrixPath: args.matrixPath,
        },
        null,
        2,
      ),
    )
    process.exit(2)
  }

  const matrixText = fs.readFileSync(resolvedMatrixPath, 'utf8')
  const rows = parseRows(matrixText)
  const summary = makeSummary(rows)
  const violations: string[] = []
  if (summary.missing > args.maxMissing) violations.push(`missing(${summary.missing}) > maxMissing(${args.maxMissing})`)
  if (typeof args.maxPartial === 'number' && summary.partial > args.maxPartial) {
    violations.push(`partial(${summary.partial}) > maxPartial(${args.maxPartial})`)
  }
  if (summary.covered < args.minCovered) violations.push(`covered(${summary.covered}) < minCovered(${args.minCovered})`)

  if (violations.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify(
        {
          check: CHECK_NAME,
          ok: false,
          reasonCode: 'SCENARIO_COVERAGE_THRESHOLD_FAILED',
          matrixPath: args.matrixPath,
          summary,
          violations,
        },
        null,
        2,
      ),
    )
    process.exit(1)
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        check: CHECK_NAME,
        ok: true,
        reasonCode: 'VERIFY_PASS',
        matrixPath: args.matrixPath,
        summary,
        threshold: {
          maxMissing: args.maxMissing,
          ...(typeof args.maxPartial === 'number' ? { maxPartial: args.maxPartial } : null),
          minCovered: args.minCovered,
        },
      },
      null,
      2,
    ),
  )
}

const isDirectRun = (): boolean => {
  const entry = process.argv[1]
  if (!entry) return false
  return pathToFileURL(path.resolve(entry)).href === import.meta.url
}

if (isDirectRun()) {
  main()
}
