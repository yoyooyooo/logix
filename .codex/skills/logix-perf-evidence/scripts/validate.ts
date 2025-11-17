import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

type PerfMatrix = {
  readonly id?: unknown
  readonly suites?: unknown
}

type PerfReport = {
  readonly meta?: {
    readonly matrixId?: unknown
    readonly matrixHash?: unknown
    readonly config?: {
      readonly runs?: unknown
      readonly warmupDiscard?: unknown
      readonly timeoutMs?: unknown
    }
  }
  readonly suites?: unknown
}

const parseArgs = (
  argv: ReadonlyArray<string>,
): {
  readonly reportFile: string
  readonly matrixFile: string
  readonly allowPartial: boolean
} => {
  const hasFlag = (name: string): boolean => argv.includes(name)

  const get = (name: string): string | undefined => {
    const idx = argv.lastIndexOf(name)
    if (idx < 0) return undefined
    const value = argv[idx + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${name}`)
    }
    return value
  }

  const reportFile = get('--report')
  const matrixFile = get('--matrix') ?? '.codex/skills/logix-perf-evidence/assets/matrix.json'
  const allowPartial = hasFlag('--allow-partial')

  if (!reportFile) {
    throw new Error(
      'Usage: pnpm perf validate -- --report <report.json> [--matrix <matrix.json>] [--allow-partial]',
    )
  }

  return { reportFile, matrixFile, allowPartial }
}

const sha256Hex = (text: string): string => createHash('sha256').update(text).digest('hex')

const readJsonText = async (file: string): Promise<string> => fs.readFile(file, 'utf8')

const uniqSorted = (items: ReadonlyArray<string>): ReadonlyArray<string> => Array.from(new Set(items)).sort()

const main = async (): Promise<void> => {
  const { reportFile, matrixFile, allowPartial } = parseArgs(process.argv.slice(2))

  const reportAbs = path.resolve(reportFile)
  const matrixAbs = path.resolve(matrixFile)

  const [matrixText, reportText] = await Promise.all([readJsonText(matrixAbs), readJsonText(reportAbs)])
  const matrixHash = sha256Hex(matrixText)

  const matrix = JSON.parse(matrixText) as PerfMatrix
  const report = JSON.parse(reportText) as PerfReport

  const errors: string[] = []
  const notes: string[] = []

  const matrixId = typeof matrix.id === 'string' ? matrix.id : undefined
  if (!matrixId) {
    errors.push(`matrix.id is missing or not a string: file=${matrixFile}`)
  }

  const reportMatrixId = typeof report.meta?.matrixId === 'string' ? report.meta?.matrixId : undefined
  if (!reportMatrixId) {
    errors.push(`report.meta.matrixId is missing or not a string: file=${reportFile}`)
  } else if (matrixId && reportMatrixId !== matrixId) {
    errors.push(`matrixId mismatch: report=${reportMatrixId} matrix=${matrixId}`)
  }

  const reportMatrixHash = typeof report.meta?.matrixHash === 'string' ? report.meta?.matrixHash : undefined
  if (!reportMatrixHash) {
    errors.push(`report.meta.matrixHash is missing (collect via .codex/skills/logix-perf-evidence/scripts/collect.ts)`)
  } else if (reportMatrixHash !== matrixHash) {
    errors.push(`matrixHash mismatch: report=${reportMatrixHash} matrix=${matrixHash}`)
  }

  const runs = report.meta?.config?.runs
  const warmupDiscard = report.meta?.config?.warmupDiscard
  const timeoutMs = report.meta?.config?.timeoutMs
  if (typeof runs !== 'number' || !Number.isFinite(runs)) errors.push('report.meta.config.runs is missing or invalid')
  if (typeof warmupDiscard !== 'number' || !Number.isFinite(warmupDiscard)) {
    errors.push('report.meta.config.warmupDiscard is missing or invalid')
  }
  if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs)) errors.push('report.meta.config.timeoutMs is missing or invalid')

  const matrixSuites = Array.isArray(matrix.suites) ? (matrix.suites as ReadonlyArray<any>) : []
  const matrixSuiteIds = uniqSorted(
    matrixSuites.map((s) => (typeof s?.id === 'string' ? s.id : '')).filter((id) => id.length > 0),
  )
  if (matrixSuiteIds.length === 0) {
    errors.push(`matrix.suites is missing/empty or has no valid suite ids: file=${matrixFile}`)
  }

  const reportSuites = Array.isArray(report.suites) ? (report.suites as ReadonlyArray<any>) : []
  const reportSuiteIds = uniqSorted(
    reportSuites.map((s) => (typeof s?.id === 'string' ? s.id : '')).filter((id) => id.length > 0),
  )
  if (reportSuiteIds.length === 0) {
    errors.push(`report.suites is missing/empty or has no valid suite ids: file=${reportFile}`)
  }

  const matrixSuiteIdSet = new Set(matrixSuiteIds)
  const reportSuiteIdSet = new Set(reportSuiteIds)

  const missingSuites = matrixSuiteIds.filter((id) => !reportSuiteIdSet.has(id))
  const extraSuites = reportSuiteIds.filter((id) => !matrixSuiteIdSet.has(id))

  if (extraSuites.length > 0) {
    errors.push(`report contains suites not in matrix: ${extraSuites.join(', ')}`)
  }

  if (missingSuites.length > 0) {
    const message = `report is missing matrix suites: ${missingSuites.join(', ')}`
    if (allowPartial) {
      notes.push(message)
    } else {
      errors.push(message)
    }
  }

  if (errors.length > 0) {
    throw new Error(
      [
        '[logix-perf] PerfReport validation FAILED.',
        `report=${reportFile}`,
        `matrix=${matrixFile}`,
        '',
        'Errors:',
        ...errors.map((e) => `- ${e}`),
        ...(allowPartial
          ? [
              '',
              'Note: --allow-partial only relaxes missing-suite check; it does NOT relax matrixHash/config requirements.',
            ]
          : [
              '',
              'Tip: if you intentionally collected a subset (--files), re-run with --allow-partial.',
              'Tip: legacy reports without matrixHash are triage-only; re-collect via `pnpm perf collect` for hard conclusions.',
            ]),
      ].join('\n'),
    )
  }

  // eslint-disable-next-line no-console
  console.log(
    `[logix-perf] validate ok: report=${reportFile} matrixId=${String(matrixId)} matrixHash=${matrixHash.slice(0, 8)} suites=${reportSuiteIds.length}`,
  )
  if (notes.length > 0) {
    // eslint-disable-next-line no-console
    console.warn('[logix-perf] validate notes:\n' + notes.map((n) => `- ${n}`).join('\n'))
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})
