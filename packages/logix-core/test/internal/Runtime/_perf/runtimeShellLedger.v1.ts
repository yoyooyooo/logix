import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RuntimeShellBoundaryDecision } from '../../../../src/internal/runtime/core/RuntimeShellBoundary.js'
import { summarizeRuntimeShellBoundaryDecisions } from '../../../../src/internal/runtime/core/RuntimeShellBoundary.js'

type LedgerHeaderRecordV1 = {
  readonly recordType: 'header'
  readonly schemaVersion: 1
  readonly capturedAt: string
  readonly generator: {
    readonly kind: 'vitest' | 'node' | 'custom'
    readonly command: string
  }
  readonly git: {
    readonly head: string
    readonly branch?: string
    readonly worktree?: string
  }
  readonly env: {
    readonly os: string
    readonly arch: string
    readonly node: string
  }
  readonly profile?: string
  readonly notes?: string
}

type LedgerSuiteRefV1 = {
  readonly suiteId?: string
  readonly command: string
  readonly artifactRef?: string
}

type LedgerSegmentRecordV1 = {
  readonly recordType: 'segment'
  readonly segmentId: string
  readonly suiteRef: LedgerSuiteRefV1
  readonly config: Record<string, unknown>
}

type LedgerSampleRecordV1 = {
  readonly recordType: 'sample'
  readonly segmentId: string
  readonly sample:
    | {
        readonly kind: 'dispatchShell.phases'
        readonly index: number
        readonly dispatchMs: number
        readonly txnPhase: {
          readonly txnPreludeMs: number
          readonly queueContextLookupMs: number
          readonly queueResolvePolicyMs: number
          readonly bodyShellMs: number
          readonly asyncEscapeGuardMs?: number
          readonly dispatchActionRecordMs?: number
          readonly dispatchActionCommitHubMs?: number
          readonly commitTotalMs: number
        }
        readonly residualMs?: number
      }
    | {
        readonly kind: 'resolveShell.snapshot'
        readonly index: number
        readonly case: 'noSnapshot' | 'snapshot'
        readonly batchMs: number
        readonly decision?: RuntimeShellBoundaryDecision
      }
    | {
        readonly kind: 'operationRunner.txnHotContext'
        readonly index: number
        readonly case: 'shared' | 'fallback'
        readonly batchMs: number
        readonly decision?: RuntimeShellBoundaryDecision
      }
}

type LedgerRecordV1 = LedgerHeaderRecordV1 | LedgerSegmentRecordV1 | LedgerSampleRecordV1

type LedgerSummaryV1 = {
  readonly schemaVersion: 1
  readonly source: {
    readonly artifact: string
  }
  readonly segments: ReadonlyArray<{
    readonly segmentId: string
    readonly metrics: Record<string, unknown>
    readonly notes?: ReadonlyArray<string>
  }>
}

const quantile = (samples: ReadonlyArray<number>, q: number): number => {
  if (samples.length === 0) return 0
  const sorted = Array.from(samples).sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[idx]!
}

const average = (samples: ReadonlyArray<number>): number =>
  samples.length === 0 ? 0 : samples.reduce((sum, value) => sum + value, 0) / samples.length

const sanitize = (value: string): string => value.replace(/[^a-zA-Z0-9._-]+/g, '-')

const isoLocalDate = (d: Date): string => {
  // YYYY-MM-DD in local time; stable enough for ledger artifact naming.
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getRepoRootFromImportMeta = (): string => {
  const abs = fileURLToPath(import.meta.url)
  const marker = `${Path.sep}packages${Path.sep}logix-core${Path.sep}`
  const idx = abs.lastIndexOf(marker)
  if (idx < 0) return process.cwd()
  return abs.slice(0, idx)
}

const REPO_ROOT = getRepoRootFromImportMeta()
const DEFAULT_OUT_DIR = Path.join(
  REPO_ROOT,
  'specs/103-effect-v4-forward-cutover/perf/.local/runtime-shell-ledger',
)

let cachedGitHead: string | undefined
let cachedGitBranch: string | undefined

const tryExecGit = (args: string[]): string | undefined => {
  try {
    return ChildProcess.execFileSync('git', args, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim()
  } catch {
    return undefined
  }
}

const getGitHead = (): string => {
  if (cachedGitHead) return cachedGitHead
  cachedGitHead = tryExecGit(['rev-parse', 'HEAD']) ?? 'unknown'
  return cachedGitHead
}

const getGitBranch = (): string | undefined => {
  if (cachedGitBranch) return cachedGitBranch
  cachedGitBranch = tryExecGit(['rev-parse', '--abbrev-ref', 'HEAD'])
  return cachedGitBranch
}

const getEnvOs = (): string => {
  switch (process.platform) {
    case 'darwin':
      return 'macOS'
    case 'win32':
      return 'windows'
    case 'linux':
      return 'linux'
    default:
      return process.platform
  }
}

const toMs = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const relativeToRepo = (absPath: string): string => {
  const rel = Path.relative(REPO_ROOT, absPath)
  return rel.startsWith('..') ? absPath : rel
}

export type RuntimeShellLedgerV1WriteArgs = {
  readonly segmentId: string
  readonly suiteRef: LedgerSuiteRefV1
  readonly config: Record<string, unknown>
  readonly samples: ReadonlyArray<LedgerSampleRecordV1['sample']>
  readonly summaryMetrics: Record<string, unknown>
  readonly summaryNotes?: ReadonlyArray<string>
  readonly profile?: string
  readonly notes?: string
}

export const writeRuntimeShellLedgerV1 = (args: RuntimeShellLedgerV1WriteArgs): { ledgerPath: string; summaryPath: string } => {
  const outDir = process.env.LOGIX_PERF_LEDGER_OUT_DIR
    ? Path.resolve(process.env.LOGIX_PERF_LEDGER_OUT_DIR)
    : DEFAULT_OUT_DIR
  Fs.mkdirSync(outDir, { recursive: true })

  const profile = args.profile ?? process.env.LOGIX_PERF_PROFILE ?? 'quick'
  const envId = sanitize(`${process.platform}-${process.arch}.node${process.version}`)
  const date = isoLocalDate(new Date())
  const segmentSlug = sanitize(args.segmentId)

  const baseName = `${date}-n-2-runtime-shell-ledger.${segmentSlug}.${envId}.${sanitize(profile)}`
  const ledgerPath = Path.join(outDir, `${baseName}.ledger.v1.ndjson`)
  const summaryPath = Path.join(outDir, `${baseName}.ledger.summary.v1.json`)

  const header: LedgerHeaderRecordV1 = {
    recordType: 'header',
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    generator: { kind: 'vitest', command: args.suiteRef.command },
    git: {
      head: getGitHead(),
      branch: getGitBranch(),
      worktree: REPO_ROOT,
    },
    env: {
      os: getEnvOs(),
      arch: process.arch,
      node: process.version,
    },
    profile,
    notes: args.notes,
  }

  const segment: LedgerSegmentRecordV1 = {
    recordType: 'segment',
    segmentId: args.segmentId,
    suiteRef: args.suiteRef,
    config: args.config,
  }

  const records: LedgerRecordV1[] = [header, segment]
  for (let i = 0; i < args.samples.length; i += 1) {
    const sample = args.samples[i]!
    records.push({
      recordType: 'sample',
      segmentId: args.segmentId,
      sample: sample as any,
    })
  }

  const summary: LedgerSummaryV1 = {
    schemaVersion: 1,
    source: { artifact: relativeToRepo(ledgerPath) },
    segments: [
      {
        segmentId: args.segmentId,
        metrics: args.summaryMetrics,
        notes: args.summaryNotes,
      },
    ],
  }

  try {
    const ndjson = records.map((record) => JSON.stringify(record)).join('\n') + '\n'
    Fs.writeFileSync(ledgerPath, ndjson, { encoding: 'utf8' })
    Fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n', { encoding: 'utf8' })
    // eslint-disable-next-line no-console
    console.log(`[ledger] wrote ${relativeToRepo(ledgerPath)} + ${relativeToRepo(summaryPath)}`)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[ledger] failed to write runtime-shell ledger artifacts: ${String(err)}`)
  }

  return { ledgerPath, summaryPath }
}

export const ledgerSummaryForDispatchShellPhases = (dispatchSamplesMs: ReadonlyArray<number>, residualSamplesMs: ReadonlyArray<number>) => ({
  'dispatch.p50.ms': Number(quantile(dispatchSamplesMs, 0.5).toFixed(3)),
  'dispatch.p95.ms': Number(quantile(dispatchSamplesMs, 0.95).toFixed(3)),
  'residual.avg.ms': Number(average(residualSamplesMs).toFixed(3)),
})

export const ledgerSummaryForResolveShellSnapshot = (noSnapshotSamplesMs: ReadonlyArray<number>, snapshotSamplesMs: ReadonlyArray<number>) => {
  const noSnapshotAvg = average(noSnapshotSamplesMs)
  const snapshotAvg = average(snapshotSamplesMs)
  const speedup = snapshotAvg > 0 ? noSnapshotAvg / snapshotAvg : 0
  return {
    'noSnapshot.avg.ms': Number(noSnapshotAvg.toFixed(3)),
    'snapshot.avg.ms': Number(snapshotAvg.toFixed(3)),
    'speedup.x': Number(speedup.toFixed(3)),
  }
}

export const ledgerSummaryForOperationRunnerTxnHotContext = (sharedSamplesMs: ReadonlyArray<number>, fallbackSamplesMs: ReadonlyArray<number>) => {
  const sharedAvg = average(sharedSamplesMs)
  const fallbackAvg = average(fallbackSamplesMs)
  const speedup = sharedAvg > 0 ? fallbackAvg / sharedAvg : 0
  return {
    'shared.avg.ms': Number(sharedAvg.toFixed(3)),
    'fallback.avg.ms': Number(fallbackAvg.toFixed(3)),
    'speedup.x': Number(speedup.toFixed(3)),
  }
}

export const mergeRuntimeShellAttributionMetrics = (args: {
  readonly metrics: Record<string, unknown>
  readonly decisions: ReadonlyArray<RuntimeShellBoundaryDecision>
}): Record<string, unknown> => {
  const attribution = summarizeRuntimeShellBoundaryDecisions(args.decisions)
  if (!attribution) {
    return args.metrics
  }
  return {
    ...args.metrics,
    attribution: {
      reasonShare: attribution.reasonShare,
      boundaryClassShare: attribution.boundaryClassShare,
      noSnapshotTopReason: attribution.noSnapshotTopReason,
    },
  }
}

export const toTxnPhaseTraceV1 = (trace: any) => ({
  txnPreludeMs: toMs(trace?.txnPreludeMs),
  queueContextLookupMs: toMs(trace?.queue?.contextLookupMs),
  queueResolvePolicyMs: toMs(trace?.queue?.resolvePolicyMs),
  bodyShellMs: toMs(trace?.bodyShellMs),
  asyncEscapeGuardMs: toMs(trace?.asyncEscapeGuardMs),
  dispatchActionRecordMs: toMs(trace?.dispatchActionRecordMs),
  dispatchActionCommitHubMs: toMs(trace?.dispatchActionCommitHubMs),
  commitTotalMs: toMs(trace?.commit?.totalMs),
})
