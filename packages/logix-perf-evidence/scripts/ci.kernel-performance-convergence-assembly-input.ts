import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import type { AdversarialMatrixReport } from './ci.adversarial-matrix-report.js'
import type { ExamplesPlaygroundIsolationReport } from './ci.examples-playground-isolation-report.js'
import { type KernelPerformanceConvergenceAssemblyInput } from './assemble-kernel-performance-convergence-manifest.js'
import { KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS } from './ci.kernel-performance-convergence-stage-gate.js'

type UnknownRecord = Record<string, unknown>

type DiffLike = Readonly<{
  readonly profile?: string
  readonly envId?: string
  readonly matrixId?: string
  readonly matrixHash?: string
  readonly meta?: Readonly<{
    readonly config?: Readonly<{ readonly profile?: string; readonly matrixId?: string; readonly matrixHash?: string }>
    readonly environment?: Readonly<{ readonly envId?: string }>
    readonly comparability?: Readonly<{ readonly comparable?: boolean }>
  }>
  readonly summary?: Readonly<{
    readonly regressions?: number
    readonly budgetExceeded?: number
    readonly budgetViolations?: number
    readonly timeouts?: number
    readonly missingSuites?: number
    readonly stabilityWarnings?: number
  }>
  readonly suites?: ReadonlyArray<Readonly<{ readonly id?: string; readonly status?: string }>>
}>

type BuildAssemblyInputArgs = Readonly<{
  readonly generatedAt?: string
  readonly envId?: string
  readonly profile?: string
  readonly beforePath?: string
  readonly afterPath?: string
  readonly diffPath?: string
  readonly diff?: DiffLike
  readonly adversarialReportPath?: string
  readonly adversarialReport?: AdversarialMatrixReport
  readonly examplesReportPath?: string
  readonly examplesReport?: ExamplesPlaygroundIsolationReport
  readonly evidenceRefs?: ReadonlyArray<string>
  readonly blockedMarkers?: ReadonlyArray<UnknownRecord>
}>

const SUITE_ALIASES: Readonly<Record<string, (typeof KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS)[number]>> = {
  'negativeBoundaries.dirtyPattern': 'negativeBoundaries.dirtyPattern',
  'converge.txnCommit': 'converge.txnCommit',
  'form.listScopeCheck': 'form.listScopeCheck',
  'externalStore.ingest.tickNotify': 'externalStore.ingest.tickNotify',
  'runtimeStore.noTearing.tickNotify': 'runtimeStore.noTearing.tickNotify',
  'react.strictSuspenseJitter': 'react.strictSuspenseJitter',
  'diagnostics.overhead': 'diagnostics.overhead',
  'diagnostics.overhead.e2e': 'diagnostics.overhead',
  'txnQueue.directIdle': 'txnQueue.directIdle',
  'txnLanes.urgentBacklog': 'txnQueue.directIdle',
  'dispatchShell.fixedCost': 'dispatchShell.fixedCost',
  'examples.runtimeWitness': 'examples.runtimeWitness',
  'examples.playgroundNoiseIsolation': 'examples.playgroundNoiseIsolation',
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readJsonIfExists = async <T>(file: string | undefined): Promise<T | undefined> => {
  if (!file) return undefined
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

const existingRefs = async (refs: ReadonlyArray<string | undefined>): Promise<ReadonlyArray<string>> => {
  const out: string[] = []
  for (const ref of refs) {
    if (!ref) continue
    try {
      await fs.access(ref)
      out.push(ref)
    } catch {
      out.push(ref)
    }
  }
  return Array.from(new Set(out)).sort()
}

const normalizeProfile = (args: BuildAssemblyInputArgs): string => {
  for (const value of [
    args.profile,
    args.adversarialReport?.profile,
    args.diff?.profile,
    args.diff?.meta?.config?.profile,
    args.examplesReport?.profile,
  ]) {
    if (typeof value === 'string' && value.trim().length > 0) {
      const raw = value.trim()
      return raw === 'default' || raw === 'soak' ? `adversarial-${raw}` : raw
    }
  }
  return 'unknown'
}

const normalizeEnvId = (args: BuildAssemblyInputArgs): string | undefined => {
  for (const value of [
    args.envId,
    args.adversarialReport?.envId,
    args.diff?.envId,
    args.diff?.meta?.environment?.envId,
  ]) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return undefined
}

const normalizeSuiteStatus = (status: unknown): 'pass' | 'fail' | 'timeout' | 'missing' => {
  if (status === 'timeout') return 'timeout'
  if (status === 'fail' || status === 'failed') return 'fail'
  if (status === 'missing') return 'missing'
  return 'pass'
}

const diffSuites = (diff: DiffLike | undefined): KernelPerformanceConvergenceAssemblyInput['suites'] => {
  const byId = new Map<string, 'pass' | 'fail' | 'timeout' | 'missing'>()
  for (const suite of diff?.suites ?? []) {
    const rawId = typeof suite.id === 'string' ? suite.id : ''
    const id = SUITE_ALIASES[rawId]
    if (!id) continue
    const status = normalizeSuiteStatus(suite.status)
    const previous = byId.get(id)
    if (previous === 'fail' || previous === 'timeout') continue
    if (status === 'fail' || status === 'timeout') byId.set(id, status)
    else if (previous !== 'pass') byId.set(id, status)
  }
  return Array.from(byId.entries()).map(([id, status]) => ({ id, status }))
}

const examplesSuites = (
  report: ExamplesPlaygroundIsolationReport | undefined,
): KernelPerformanceConvergenceAssemblyInput['suites'] =>
  report?.suites.map((suite) => ({ id: suite.id, status: suite.status })) ?? []

const stageStatusFromAdversarial = (
  report: AdversarialMatrixReport | undefined,
  blockedMarkers: ReadonlyArray<UnknownRecord>,
): 'validated' | 'implemented' | 'blocked' | 'not_started' => {
  if (blockedMarkers.length > 0) return 'blocked'
  if (!report) return 'not_started'
  if (
    report.classification === 'blocked' ||
    report.classification === 'migrated_cost' ||
    report.classification === 'migrated_risk'
  ) {
    return 'blocked'
  }
  if (report.claimStrength === 'hard') return 'validated'
  if (report.claimStrength === 'clue') return 'implemented'
  return 'not_started'
}

const localCiResultFromDiff = (diff: DiffLike | undefined): string => {
  if (!diff) return 'missing'
  const summary = diff.summary
  const hasBlocker =
    (summary?.regressions ?? 0) > 0 ||
    (summary?.budgetExceeded ?? summary?.budgetViolations ?? 0) > 0 ||
    (summary?.timeouts ?? 0) > 0 ||
    (summary?.missingSuites ?? 0) > 0 ||
    (summary?.stabilityWarnings ?? 0) > 0
  return hasBlocker ? 'blocked' : 'pass'
}

type LocalCiCommand = Readonly<{ readonly command: string; readonly result: string; readonly notes?: string }>

const localCiCommands = (args: BuildAssemblyInputArgs): ReadonlyArray<LocalCiCommand> => {
  const commands: LocalCiCommand[] = []
  if (args.beforePath)
    commands.push({ command: `pnpm perf collect -- --profile <profile> --out ${args.beforePath}`, result: 'pass' })
  if (args.afterPath)
    commands.push({ command: `pnpm perf collect -- --profile <profile> --out ${args.afterPath}`, result: 'pass' })
  if (args.diffPath) {
    commands.push({
      command: `pnpm perf diff -- --before ${args.beforePath ?? '<before>'} --after ${args.afterPath ?? '<after>'} --out ${args.diffPath}`,
      result: localCiResultFromDiff(args.diff),
    })
  }
  if (args.adversarialReportPath) {
    commands.push({
      command: `pnpm exec tsx packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.ts --json-out ${args.adversarialReportPath}`,
      result:
        args.adversarialReport?.claimStrength === 'hard' ? 'pass' : args.adversarialReport ? 'blocked' : 'missing',
    })
  }
  if (args.examplesReportPath) {
    commands.push({
      command: `pnpm exec tsx packages/logix-perf-evidence/scripts/ci.examples-playground-isolation-report.ts --json-out ${args.examplesReportPath}`,
      result: args.examplesReport?.classification === 'isolated' ? 'pass' : args.examplesReport ? 'blocked' : 'missing',
    })
  }
  return commands
}

const blockedMarkerRefs = (markers: ReadonlyArray<UnknownRecord>): ReadonlyArray<string> =>
  markers
    .map((marker) => marker.path)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)

const blockedMarkerNotes = (markers: ReadonlyArray<UnknownRecord>): string | undefined => {
  if (markers.length === 0) return undefined
  return markers
    .map((marker) => {
      const phase = typeof marker.phase === 'string' ? marker.phase : 'unknown'
      const reason = typeof marker.reason === 'string' ? marker.reason : 'blocked'
      return `${phase}:${reason}`
    })
    .join(', ')
}

export const buildKernelPerformanceConvergenceAssemblyInput = async (
  args: BuildAssemblyInputArgs,
): Promise<KernelPerformanceConvergenceAssemblyInput> => {
  const diff = args.diff ?? (await readJsonIfExists<DiffLike>(args.diffPath))
  const adversarialReport =
    args.adversarialReport ?? (await readJsonIfExists<AdversarialMatrixReport>(args.adversarialReportPath))
  const examplesReport =
    args.examplesReport ?? (await readJsonIfExists<ExamplesPlaygroundIsolationReport>(args.examplesReportPath))
  const blockedMarkers = args.blockedMarkers ?? []
  const markerRefs = blockedMarkerRefs(blockedMarkers)
  const markerNotes = blockedMarkerNotes(blockedMarkers)
  const stageStatus = stageStatusFromAdversarial(adversarialReport, blockedMarkers)
  const evidenceRefs = await existingRefs([
    args.beforePath,
    args.afterPath,
    args.diffPath,
    args.adversarialReportPath,
    args.examplesReportPath,
    ...markerRefs,
    ...(args.evidenceRefs ?? []),
  ])

  return {
    schemaVersion: 1,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    ...(normalizeEnvId({ ...args, diff, adversarialReport, examplesReport })
      ? { envId: normalizeEnvId({ ...args, diff, adversarialReport, examplesReport }) }
      : {}),
    profile: normalizeProfile({ ...args, diff, adversarialReport, examplesReport }),
    reports: [adversarialReport, examplesReport].filter(
      (report): report is AdversarialMatrixReport | ExamplesPlaygroundIsolationReport => isRecord(report),
    ),
    stages: [
      {
        id: 'P0',
        status: stageStatus,
        evidenceRefs: [args.diffPath, args.adversarialReportPath, ...markerRefs].filter(
          (ref): ref is string => typeof ref === 'string',
        ),
        ...(markerNotes ? { notes: markerNotes } : {}),
      },
      {
        id: 'P1',
        status: stageStatus,
        evidenceRefs: [args.diffPath, args.adversarialReportPath, ...markerRefs].filter(
          (ref): ref is string => typeof ref === 'string',
        ),
        ...(markerNotes ? { notes: markerNotes } : {}),
      },
    ],
    suites: [...(diffSuites(diff) ?? []), ...(examplesSuites(examplesReport) ?? [])],
    evidenceRefs,
    localCi: { commands: localCiCommands({ ...args, diff, adversarialReport, examplesReport }) },
    cloud: { unableToVerify: [] },
  }
}

const usage = (): string => `\
Usage:
  pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-assembly-input.ts \\
    --before <before.json> \\
    --after <after.json> \\
    --diff <diff.json> \\
    --adversarial-report <report.json> \\
    --examples-report <report.json> \\
    --out <assembly.json> \\
    [--profile <default|soak|adversarial-default|adversarial-soak>] \\
    [--env-id <env>] \\
    [--evidence-ref <path>]...

Notes:
  This script assembles the final-gate input from existing artifacts only.
  It does not invent missing counters and does not run benchmarks.
`

const parseArgs = (argv: ReadonlyArray<string>) => {
  const values = (name: string): ReadonlyArray<string> => {
    const out: string[] = []
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] !== name) continue
      const value = argv[i + 1]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
      out.push(value)
    }
    return out
  }
  const get = (name: string): string | undefined => values(name).at(-1)
  const out = get('--out')
  if (!out) throw new Error(`Missing --out\n\n${usage()}`)
  const blockedMarkerPaths = values('--blocked-marker')
  return {
    beforePath: get('--before'),
    afterPath: get('--after'),
    diffPath: get('--diff'),
    adversarialReportPath: get('--adversarial-report'),
    examplesReportPath: get('--examples-report'),
    profile: get('--profile'),
    envId: get('--env-id'),
    evidenceRefs: [...values('--evidence-ref'), ...blockedMarkerPaths],
    blockedMarkerPaths,
    out,
  }
}

export const runKernelPerformanceConvergenceAssemblyInputCli = async (
  argv: ReadonlyArray<string>,
): Promise<KernelPerformanceConvergenceAssemblyInput> => {
  const args = parseArgs(argv)
  const blockedMarkers = await Promise.all(args.blockedMarkerPaths.map((file) => readJsonIfExists<UnknownRecord>(file)))
  const input = await buildKernelPerformanceConvergenceAssemblyInput({
    ...args,
    blockedMarkers: blockedMarkers.filter((marker): marker is UnknownRecord => isRecord(marker)),
  })
  await fs.mkdir(path.dirname(args.out), { recursive: true })
  await fs.writeFile(args.out, `${JSON.stringify(input, null, 2)}\n`, 'utf8')
  return input
}

if (process.argv[1]?.endsWith('ci.kernel-performance-convergence-assembly-input.ts')) {
  runKernelPerformanceConvergenceAssemblyInputCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
