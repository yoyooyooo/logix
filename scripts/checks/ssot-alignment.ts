import { execSync } from 'node:child_process'
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

const CHECK_NAME = 'ssot-alignment'

const parseArgs = (argv: ReadonlyArray<string>): Mode => {
  let mode: Mode = { kind: 'worktree' }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--cached') {
      mode = { kind: 'cached' }
      continue
    }
    if (arg === '--base') {
      const base = argv[i + 1]
      if (!base) {
        throw new Error('Missing value for --base <ref>')
      }
      i += 1
      mode = { kind: 'base', base }
      continue
    }
    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(
        [
          'Usage: tsx scripts/checks/ssot-alignment.ts [--cached] [--base <ref>]',
          '',
          'Checks SSoT drift for spec 103.',
          'If logix-cli core or 103 contracts changed, the same diff must include',
          'docs evidence (docs/ssot/** or specs/103 non-contract docs).',
          '',
          'Modes:',
          '  (default)        git diff --name-status HEAD',
          '  --cached         git diff --cached --name-status',
          '  --base <ref>     git diff --name-status <ref>...HEAD',
        ].join('\n'),
      )
      process.exit(0)
    }
  }

  return mode
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

export const isCliCorePath = (changedPath: string): boolean =>
  changedPath.startsWith('packages/logix-cli/src/') ||
  changedPath === 'packages/logix-cli/package.json' ||
  changedPath === 'packages/logix-cli/tsup.config.ts'

export const isSpec103ContractPath = (changedPath: string): boolean =>
  changedPath.startsWith('specs/103-cli-minimal-kernel-self-loop/contracts/')

export const isSsotEvidencePath = (changedPath: string): boolean => {
  if (changedPath.startsWith('docs/ssot/')) return true
  if (!changedPath.startsWith('specs/103-cli-minimal-kernel-self-loop/')) return false

  return (
    changedPath === 'specs/103-cli-minimal-kernel-self-loop/spec.md' ||
    changedPath === 'specs/103-cli-minimal-kernel-self-loop/plan.md' ||
    changedPath === 'specs/103-cli-minimal-kernel-self-loop/research.md' ||
    changedPath === 'specs/103-cli-minimal-kernel-self-loop/data-model.md' ||
    changedPath === 'specs/103-cli-minimal-kernel-self-loop/quickstart.md' ||
    changedPath === 'specs/103-cli-minimal-kernel-self-loop/tasks.md' ||
    changedPath === 'specs/103-cli-minimal-kernel-self-loop/migration-template.md' ||
    changedPath.startsWith('specs/103-cli-minimal-kernel-self-loop/notes/')
  )
}

export const evaluateSsotDrift = (args: {
  readonly changedPaths: ReadonlyArray<string>
  readonly evidenceEligiblePaths: ReadonlyArray<string>
}): {
  readonly cliCoreChanges: ReadonlyArray<string>
  readonly contractChanges: ReadonlyArray<string>
  readonly evidenceChanges: ReadonlyArray<string>
  readonly hasTriggerChanges: boolean
  readonly hasEvidence: boolean
} => {
  const cliCoreChanges = args.changedPaths.filter(isCliCorePath)
  const contractChanges = args.changedPaths.filter(isSpec103ContractPath)
  const evidenceChanges = args.evidenceEligiblePaths.filter(isSsotEvidencePath)
  const hasTriggerChanges = cliCoreChanges.length > 0 || contractChanges.length > 0
  const hasEvidence = evidenceChanges.length > 0

  return {
    cliCoreChanges,
    contractChanges,
    evidenceChanges,
    hasTriggerChanges,
    hasEvidence,
  }
}

const toModeLabel = (mode: Mode): string =>
  mode.kind === 'cached' ? 'cached' : mode.kind === 'base' ? `base:${mode.base}` : 'worktree'

const fail = (payload: unknown, code = 1): never => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(payload, null, 2))
  process.exit(code)
}

const main = (): void => {
  const mode = parseArgs(process.argv.slice(2))

  let raw: string
  try {
    raw = runGitNameStatus(mode)
  } catch (error) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'CLI_SSOT_DRIFT_GIT_DIFF_FAILED',
        mode: toModeLabel(mode),
        message: error instanceof Error ? error.message : String(error),
      },
      2,
    )
  }

  const records = parseNameStatus(raw)
  const changedPaths = uniqSorted(records.flatMap((record) => record.paths))
  const evidenceEligiblePaths = collectEvidenceEligiblePaths(records)

  const evaluated = evaluateSsotDrift({
    changedPaths,
    evidenceEligiblePaths,
  })

  if (!evaluated.hasTriggerChanges) {
    return
  }

  if (evaluated.hasEvidence) {
    return
  }

  fail({
    check: CHECK_NAME,
    ok: false,
    reasonCode: 'CLI_SSOT_DRIFT_MISSING_EVIDENCE',
    message:
      'Detected logix-cli core/spec contracts changes without SSoT evidence; update docs/ssot/** or specs/103 non-contract docs.',
    mode: toModeLabel(mode),
    rule: {
      trigger: {
        cliCorePath: [
          'packages/logix-cli/src/**',
          'packages/logix-cli/package.json',
          'packages/logix-cli/tsup.config.ts',
        ],
        contractPath: ['specs/103-cli-minimal-kernel-self-loop/contracts/**'],
      },
      requireAnyOf: [
        'docs/ssot/**',
        'specs/103-cli-minimal-kernel-self-loop/{spec,plan,research,data-model,quickstart,tasks,migration-template}.md',
        'specs/103-cli-minimal-kernel-self-loop/notes/**',
      ],
    },
    changed: {
      cliCorePath: evaluated.cliCoreChanges,
      contractPath: evaluated.contractChanges,
      evidence: evaluated.evidenceChanges,
    },
  })
}

const isDirectRun = (): boolean => {
  const entry = process.argv[1]
  if (!entry) return false
  return pathToFileURL(path.resolve(entry)).href === import.meta.url
}

if (isDirectRun()) {
  main()
}
