import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

type Mode =
  | { readonly kind: 'worktree' }
  | { readonly kind: 'cached' }
  | { readonly kind: 'base'; readonly base: string }

type DiffRecord = {
  readonly status: string
  readonly paths: ReadonlyArray<string>
}

type PerfDiff = {
  readonly meta?: {
    readonly comparability?: {
      readonly comparable?: unknown
      readonly configMismatches?: ReadonlyArray<unknown>
      readonly envMismatches?: ReadonlyArray<unknown>
      readonly warnings?: ReadonlyArray<unknown>
    }
  }
  readonly summary?: {
    readonly regressions?: unknown
    readonly budgetViolations?: unknown
  }
}

const CHECK_NAME = 'perf-evidence-hard'
const DEFAULT_DIFF_PATH = 'specs/103-cli-minimal-kernel-self-loop/perf/diff.latest.json'

const parseArgs = (argv: ReadonlyArray<string>): { readonly mode: Mode; readonly diffPath: string } => {
  let mode: Mode = { kind: 'worktree' }
  let diffPath = DEFAULT_DIFF_PATH

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--cached') {
      mode = { kind: 'cached' }
      continue
    }
    if (arg === '--base') {
      const base = argv[i + 1]
      if (!base) throw new Error('Missing value for --base <ref>')
      i += 1
      mode = { kind: 'base', base }
      continue
    }
    if (arg === '--diff') {
      const value = argv[i + 1]
      if (!value) throw new Error('Missing value for --diff <path>')
      i += 1
      diffPath = value
      continue
    }
    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(
        [
          'Usage: tsx scripts/checks/perf-evidence-hard.ts [--cached] [--base <ref>] [--diff <path>]',
          '',
          'Checks governance gate: gate:perf-hard.',
          'Rules:',
          '1) If core/contracts changed, perf evidence files must be updated in the same diff.',
          '2) diff json must be comparable=true and regressions=0 and budgetViolations=0.',
          '',
          `Default diff path: ${DEFAULT_DIFF_PATH}`,
        ].join('\n'),
      )
      process.exit(0)
    }
  }

  return { mode, diffPath }
}

const runGitNameStatus = (mode: Mode): string => {
  const cmd =
    mode.kind === 'cached'
      ? 'git diff --cached --name-status'
      : mode.kind === 'base'
        ? `git diff --name-status ${mode.base}...HEAD`
        : 'git diff --name-status HEAD'

  return execSync(cmd, {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 64,
  }).toString('utf-8')
}

const listUntrackedFiles = (): ReadonlyArray<string> => {
  const output = execSync('git ls-files --others --exclude-standard', {
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024 * 16,
  }).toString('utf-8')

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

const parseNameStatus = (raw: string): ReadonlyArray<DiffRecord> => {
  const records: DiffRecord[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const cols = line.split('\t')
    if (cols.length < 2) continue
    const status = cols[0] ?? ''

    if (status.startsWith('R') || status.startsWith('C')) {
      const from = cols[1]
      const to = cols[2]
      records.push({
        status,
        paths: [from, to].filter((v): v is string => typeof v === 'string' && v.length > 0),
      })
      continue
    }

    const changedPath = cols[1]
    if (!changedPath) continue
    records.push({ status, paths: [changedPath] })
  }
  return records
}

export const statusKind = (status: string): string => (status.length > 0 ? status[0] ?? status : status)

const uniqSorted = (items: ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.from(new Set(items.filter((x) => x.length > 0))).sort()

export const collectEvidenceEligiblePaths = (records: ReadonlyArray<DiffRecord>): ReadonlyArray<string> =>
  uniqSorted(
    records.flatMap((record) => {
      const kind = statusKind(record.status)
      if (kind === 'D') return []
      if (kind === 'R' || kind === 'C') return record.paths.length > 0 ? [record.paths[record.paths.length - 1] ?? ''] : []
      return record.paths
    }),
  )

export const isPerfTriggerPath = (changedPath: string): boolean =>
  changedPath.startsWith('packages/logix-cli/src/') ||
  changedPath.startsWith('specs/103-cli-minimal-kernel-self-loop/contracts/')

export const isPerfEvidencePath = (changedPath: string): boolean =>
  changedPath.startsWith('specs/103-cli-minimal-kernel-self-loop/perf/')

export const evaluatePerfEvidenceGate = (args: {
  readonly changedPaths: ReadonlyArray<string>
  readonly evidenceEligiblePaths: ReadonlyArray<string>
  readonly untrackedPaths: ReadonlyArray<string>
  readonly diffPath: string
}): {
  readonly triggerChanges: ReadonlyArray<string>
  readonly allEvidence: ReadonlyArray<string>
  readonly precheckFailureReasonCode?: 'CLI_PERF_EVIDENCE_MISSING' | 'CLI_PERF_DIFF_NOT_UPDATED'
} => {
  const triggerChanges = args.changedPaths.filter(isPerfTriggerPath)
  const evidenceChanges = args.evidenceEligiblePaths.filter(isPerfEvidencePath)
  const untrackedEvidence = args.untrackedPaths.filter(isPerfEvidencePath)
  const allEvidence = uniqSorted([...evidenceChanges, ...untrackedEvidence])

  if (triggerChanges.length > 0 && allEvidence.length === 0) {
    return {
      triggerChanges,
      allEvidence,
      precheckFailureReasonCode: 'CLI_PERF_EVIDENCE_MISSING',
    }
  }

  if (triggerChanges.length > 0 && !allEvidence.includes(args.diffPath)) {
    return {
      triggerChanges,
      allEvidence,
      precheckFailureReasonCode: 'CLI_PERF_DIFF_NOT_UPDATED',
    }
  }

  return {
    triggerChanges,
    allEvidence,
  }
}

const toModeLabel = (mode: Mode): string =>
  mode.kind === 'cached' ? 'cached' : mode.kind === 'base' ? `base:${mode.base}` : 'worktree'

const fail = (payload: unknown, code = 1): never => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(payload, null, 2))
  process.exit(code)
}

const assertNumber = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)

const main = (): void => {
  const { mode, diffPath } = parseArgs(process.argv.slice(2))

  let changedPaths: ReadonlyArray<string> = []
  let evidenceEligiblePaths: ReadonlyArray<string> = []
  let untrackedPaths: ReadonlyArray<string> = []
  try {
    const records = parseNameStatus(runGitNameStatus(mode))
    changedPaths = uniqSorted(records.flatMap((record) => record.paths))
    evidenceEligiblePaths = collectEvidenceEligiblePaths(records)
    untrackedPaths = uniqSorted(listUntrackedFiles())
  } catch (error) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'CLI_PERF_HARD_GIT_DIFF_FAILED',
        mode: toModeLabel(mode),
        message: error instanceof Error ? error.message : String(error),
      },
      2,
    )
  }

  const prechecked = evaluatePerfEvidenceGate({
    changedPaths,
    evidenceEligiblePaths,
    untrackedPaths,
    diffPath,
  })
  const triggerChanges = prechecked.triggerChanges
  const allEvidence = prechecked.allEvidence

  if (prechecked.precheckFailureReasonCode === 'CLI_PERF_EVIDENCE_MISSING') {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'CLI_PERF_EVIDENCE_MISSING',
      message: 'Detected cli core/contracts changes without perf evidence update under specs/103.../perf.',
      mode: toModeLabel(mode),
      changed: {
        trigger: triggerChanges,
        perfEvidence: allEvidence,
      },
    })
  }

  if (prechecked.precheckFailureReasonCode === 'CLI_PERF_DIFF_NOT_UPDATED') {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'CLI_PERF_DIFF_NOT_UPDATED',
      message: `Detected trigger changes but ${diffPath} is not updated in current diff.`,
      mode: toModeLabel(mode),
      changed: {
        trigger: triggerChanges,
        perfEvidence: allEvidence,
      },
    })
  }

  if (!fs.existsSync(diffPath)) {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'CLI_PERF_DIFF_NOT_FOUND',
      message: `Perf diff file not found: ${diffPath}`,
      mode: toModeLabel(mode),
    })
  }

  const diff = JSON.parse(fs.readFileSync(diffPath, 'utf-8')) as PerfDiff
  const comparable = diff.meta?.comparability?.comparable === true
  const regressions = assertNumber(diff.summary?.regressions)
  const budgetViolations = assertNumber(diff.summary?.budgetViolations)

  if (!comparable) {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'CLI_PERF_NOT_COMPARABLE',
      message: 'Perf diff comparability.comparable must be true.',
      diffPath,
      comparability: diff.meta?.comparability ?? null,
    })
  }

  if (typeof regressions !== 'number') {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'CLI_PERF_DIFF_INVALID',
      message: 'Perf diff summary.regressions must be a finite number.',
      diffPath,
    })
  }

  if (typeof budgetViolations !== 'number') {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'CLI_PERF_DIFF_INVALID',
      message: 'Perf diff summary.budgetViolations must be a finite number.',
      diffPath,
    })
  }

  if (regressions > 0) {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'GATE_PERF_HARD_FAILED',
      message: 'Perf diff reports regressions > 0.',
      diffPath,
      regressions,
      budgetViolations,
    })
  }

  if (budgetViolations > 0) {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'GATE_PERF_HARD_FAILED',
      message: 'Perf diff reports budgetViolations > 0.',
      diffPath,
      regressions,
      budgetViolations,
    })
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      check: CHECK_NAME,
      ok: true,
      reasonCode: 'VERIFY_PASS',
      mode: toModeLabel(mode),
      diffPath,
      changed: {
        trigger: triggerChanges,
        perfEvidence: allEvidence,
      },
      summary: {
        regressions,
        budgetViolations,
      },
      comparability: diff.meta?.comparability ?? null,
    }),
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
