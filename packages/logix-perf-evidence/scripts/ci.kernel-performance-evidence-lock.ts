import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

export type KernelPerformanceEvidenceLockClassification = 'locked' | 'provisional' | 'blocked' | 'incomplete'
export type KernelPerformanceEvidenceLockClaimStrength = 'hard' | 'clue' | 'none'
export type KernelPerformanceEvidenceLockGateStatus = 'pass' | 'fail' | 'missing'
export type KernelPerformanceEvidenceLockGateSeverity = 'hard' | 'clue'

export const KERNEL_PERFORMANCE_EVIDENCE_LOCK_COUNTER_IDS = [
  'dirtyPlan.unknownWrite',
  'dirtyPlan.missingRegistry',
  'dirtyPlan.dirtyAll',
  'dirtyPlan.nonFieldAuthority',
  'dirtyPlan.legacyDirtyInput',
  'source.fullFallback',
  'source.rowFullScan',
  'source.keyEval.unrelatedMutation',
  'selector.evaluateAll',
  'selector.dirtyAllFallback',
  'selector.nonFieldAuthorityFallback',
  'txnQueue.directIdleQueueWaitNonZero',
  'txnQueue.directIdleBackpressureNonZero',
  'dispatch.noTopicFanoutAlloc',
  'runtimeStore.runSyncFallbackAfterBoot',
  'runtimeStore.retainedTopicLeak',
  'diagnosticsOff.payloadCount',
  'listEvidence.stringNormalizeHotPath',
  'examples.kernelPlaygroundCostMixed',
  'examples.publicResidueViolation',
] as const

export const KERNEL_PERFORMANCE_EVIDENCE_LOCK_REQUIRED_SUITES = [
  'negativeBoundaries.dirtyPattern',
  'converge.txnCommit',
  'form.listScopeCheck',
  'externalStore.ingest.tickNotify',
  'runtimeStore.noTearing.tickNotify',
  'react.strictSuspenseJitter',
  'diagnostics.overhead',
  'txnQueue.directIdle',
  'dispatchShell.fixedCost',
  'examples.runtimeWitness',
  'examples.playgroundNoiseIsolation',
] as const

export type KernelPerformanceEvidenceLockCounterId =
  (typeof KERNEL_PERFORMANCE_EVIDENCE_LOCK_COUNTER_IDS)[number]
export type KernelPerformanceEvidenceLockRequiredSuiteId =
  (typeof KERNEL_PERFORMANCE_EVIDENCE_LOCK_REQUIRED_SUITES)[number]

export type KernelPerformanceEvidenceLockSuiteInput = Readonly<{
  readonly id: string
  readonly status?: 'pass' | 'fail' | 'timeout' | 'missing' | string
}>

export type KernelPerformanceEvidenceLockManifest = Readonly<{
  readonly schemaVersion: 1
  readonly generatedAt?: string
  readonly envId?: string
  readonly profile?: string
  readonly comparable?: boolean
  readonly regressions?: number
  readonly budgetExceeded?: number
  readonly timeouts?: number
  readonly stabilityWarnings?: number
  readonly missingSuites?: number
  readonly suites?: ReadonlyArray<KernelPerformanceEvidenceLockSuiteInput>
  readonly counters?: Partial<Record<KernelPerformanceEvidenceLockCounterId, number>>
  readonly evidenceRefs?: ReadonlyArray<string>
  readonly localCi?: Readonly<{
    readonly commands?: ReadonlyArray<Readonly<{ readonly command: string; readonly result: string; readonly notes?: string }>>
  }>
  readonly cloud?: Readonly<{
    readonly unableToVerify?: ReadonlyArray<string>
  }>
}>

export type KernelPerformanceEvidenceLockGate = Readonly<{
  readonly id: string
  readonly status: KernelPerformanceEvidenceLockGateStatus
  readonly severity: KernelPerformanceEvidenceLockGateSeverity
  readonly detail: string
}>

export type KernelPerformanceEvidenceLockReport = Readonly<{
  readonly schemaVersion: 1
  readonly kind: 'KernelPerformanceEvidenceLockReport'
  readonly generatedAt: string
  readonly profile: string
  readonly classification: KernelPerformanceEvidenceLockClassification
  readonly claimStrength: KernelPerformanceEvidenceLockClaimStrength
  readonly gates: ReadonlyArray<KernelPerformanceEvidenceLockGate>
  readonly blockers: ReadonlyArray<string>
  readonly missingEvidence: ReadonlyArray<string>
  readonly watchedCounters: ReadonlyArray<Readonly<{
    readonly id: KernelPerformanceEvidenceLockCounterId
    readonly value?: number
    readonly passed: boolean
  }>>
  readonly requiredSuites: ReadonlyArray<Readonly<{
    readonly id: KernelPerformanceEvidenceLockRequiredSuiteId
    readonly status: 'pass' | 'fail' | 'timeout' | 'missing'
  }>>
  readonly allowedClaims: ReadonlyArray<string>
  readonly forbiddenClaims: ReadonlyArray<string>
  readonly evidenceRefs: ReadonlyArray<string>
  readonly localCi: KernelPerformanceEvidenceLockManifest['localCi']
  readonly cloudLimitations: ReadonlyArray<string>
}>

const DEFAULT_CLOUD_LIMITATIONS = [
  'Cloud LLM did not run pnpm install, package tests, browser perf collection, default/soak perf diff, or local CI.',
  'Cloud LLM only generated the patch and evidence contract from the uploaded source/docs/spec snapshots.',
  'Any performance claim requires local comparable default or soak evidence produced after applying the patch.',
] as const

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

const asNonNegativeInteger = (value: unknown): number | undefined => {
  if (!isFiniteNumber(value) || value < 0) return undefined
  return Math.floor(value)
}

const normalizeProfile = (value: unknown): string => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.length > 0 ? raw : 'unknown'
}

const scalarGate = (args: {
  readonly id: string
  readonly severity: KernelPerformanceEvidenceLockGateSeverity
  readonly value: unknown
  readonly pass: (value: number) => boolean
  readonly passDetail: string
  readonly failDetail: (value: number) => string
  readonly missingDetail: string
}): KernelPerformanceEvidenceLockGate => {
  const value = asNonNegativeInteger(args.value)
  if (value === undefined) {
    return {
      id: args.id,
      severity: args.severity,
      status: 'missing',
      detail: args.missingDetail,
    }
  }

  if (args.pass(value)) {
    return {
      id: args.id,
      severity: args.severity,
      status: 'pass',
      detail: args.passDetail,
    }
  }

  return {
    id: args.id,
    severity: args.severity,
    status: 'fail',
    detail: args.failDetail(value),
  }
}

const booleanGate = (args: {
  readonly id: string
  readonly severity: KernelPerformanceEvidenceLockGateSeverity
  readonly value: unknown
  readonly passDetail: string
  readonly failDetail: string
  readonly missingDetail: string
}): KernelPerformanceEvidenceLockGate => {
  if (typeof args.value !== 'boolean') {
    return {
      id: args.id,
      severity: args.severity,
      status: 'missing',
      detail: args.missingDetail,
    }
  }

  return args.value
    ? {
        id: args.id,
        severity: args.severity,
        status: 'pass',
        detail: args.passDetail,
      }
    : {
        id: args.id,
        severity: args.severity,
        status: 'fail',
        detail: args.failDetail,
      }
}

const suiteStatus = (suite: KernelPerformanceEvidenceLockSuiteInput | undefined): 'pass' | 'fail' | 'timeout' | 'missing' => {
  const status = suite?.status
  if (status === 'pass') return 'pass'
  if (status === 'timeout') return 'timeout'
  if (status === 'fail' || status === 'failed') return 'fail'
  return 'missing'
}

const requiredSuites = (
  manifest: KernelPerformanceEvidenceLockManifest,
): KernelPerformanceEvidenceLockReport['requiredSuites'] => {
  const byId = new Map((manifest.suites ?? []).map((suite) => [suite.id, suite]))
  return KERNEL_PERFORMANCE_EVIDENCE_LOCK_REQUIRED_SUITES.map((id) => ({
    id,
    status: suiteStatus(byId.get(id)),
  }))
}

const counterGate = (
  manifest: KernelPerformanceEvidenceLockManifest,
  id: KernelPerformanceEvidenceLockCounterId,
): KernelPerformanceEvidenceLockGate => {
  const value = manifest.counters?.[id]
  const normalized = asNonNegativeInteger(value)
  if (normalized === undefined) {
    return {
      id: `counter:${id}`,
      severity: 'hard',
      status: 'missing',
      detail: `${id} counter is missing; zero fallback cannot be claimed.`,
    }
  }
  return normalized === 0
    ? {
        id: `counter:${id}`,
        severity: 'hard',
        status: 'pass',
        detail: `${id}=0`,
      }
    : {
        id: `counter:${id}`,
        severity: 'hard',
        status: 'fail',
        detail: `${id}=${normalized}; canonical kernel path is not locked.`,
      }
}

const buildProfileGate = (profile: string): KernelPerformanceEvidenceLockGate => {
  const p = profile.toLowerCase()
  if (p === 'default' || p === 'soak' || p === 'adversarial-default' || p === 'adversarial-soak') {
    return {
      id: 'profile.hardClaimEligible',
      severity: 'clue',
      status: 'pass',
      detail: `profile=${profile}; hard performance evidence may be interpreted if hard gates pass.`,
    }
  }

  if (p === 'quick' || p === 'smoke' || p === 'adversarial-quick') {
    return {
      id: 'profile.hardClaimEligible',
      severity: 'clue',
      status: 'fail',
      detail: `profile=${profile}; quick/smoke evidence is a clue only, not a hard release claim.`,
    }
  }

  return {
    id: 'profile.hardClaimEligible',
    severity: 'clue',
    status: 'missing',
    detail: 'profile is missing or unknown; hard performance claim is not allowed.',
  }
}

const classify = (gates: ReadonlyArray<KernelPerformanceEvidenceLockGate>): {
  readonly classification: KernelPerformanceEvidenceLockClassification
  readonly claimStrength: KernelPerformanceEvidenceLockClaimStrength
} => {
  const hardGates = gates.filter((gate) => gate.severity === 'hard')
  const clueGates = gates.filter((gate) => gate.severity === 'clue')
  const hardFailed = hardGates.some((gate) => gate.status === 'fail')
  const hardMissing = hardGates.some((gate) => gate.status === 'missing')
  const clueReady = clueGates.every((gate) => gate.status === 'pass')

  if (hardFailed) return { classification: 'blocked', claimStrength: 'none' }
  if (hardMissing) return { classification: 'incomplete', claimStrength: 'none' }
  if (!clueReady) return { classification: 'provisional', claimStrength: 'clue' }
  return { classification: 'locked', claimStrength: 'hard' }
}

const allowedClaimsFor = (classification: KernelPerformanceEvidenceLockClassification): ReadonlyArray<string> => {
  if (classification === 'locked') {
    return [
      'Kernel Performance Evidence Lock hard gates passed for the manifest scope.',
      'Canonical hot-path fallback counters are zero for the provided default/soak evidence manifest.',
      'The listed local CI/perf evidence is admissible for this lock report if repo state and artifacts match.',
    ]
  }

  if (classification === 'provisional') {
    return [
      'Kernel Performance Evidence Lock structural counters are clean for the provided manifest scope.',
      'Evidence is a quick/smoke clue only and cannot support a hard performance success claim.',
    ]
  }

  if (classification === 'incomplete') {
    return ['Kernel Performance Evidence Lock cannot be evaluated because required evidence is missing.']
  }

  return ['Kernel Performance Evidence Lock is blocked; use blockers to choose the next local fix.']
}

const FORBIDDEN_CLAIMS = [
  'Global Runtime performance improved.',
  'No regressions exist globally.',
  'React performance improved globally.',
  'FieldKernel is optimal.',
  'Selector notification path is optimal.',
  'Quick/smoke evidence proves release-safe performance.',
] as const

export const classifyKernelPerformanceEvidenceLock = (
  manifest: KernelPerformanceEvidenceLockManifest,
): KernelPerformanceEvidenceLockReport => {
  const profile = normalizeProfile(manifest.profile)
  const suites = requiredSuites(manifest)
  const suiteStatuses = suites.map((suite) => suite.status)
  const suiteGate: KernelPerformanceEvidenceLockGate = suiteStatuses.every((status) => status === 'pass')
    ? {
        id: 'requiredSuites.presentAndPassing',
        severity: 'hard',
        status: 'pass',
        detail: 'All required hot-path suites are present and passing in the manifest.',
      }
    : suiteStatuses.some((status) => status === 'fail' || status === 'timeout')
      ? {
          id: 'requiredSuites.presentAndPassing',
          severity: 'hard',
          status: 'fail',
          detail: `Required suite failure/timeout: ${suites
            .filter((suite) => suite.status === 'fail' || suite.status === 'timeout')
            .map((suite) => `${suite.id}:${suite.status}`)
            .join(', ')}`,
        }
      : {
          id: 'requiredSuites.presentAndPassing',
          severity: 'hard',
          status: 'missing',
          detail: `Missing required suites: ${suites
            .filter((suite) => suite.status === 'missing')
            .map((suite) => suite.id)
            .join(', ')}`,
        }

  const gates: KernelPerformanceEvidenceLockGate[] = [
    booleanGate({
      id: 'diff.comparable',
      severity: 'hard',
      value: manifest.comparable,
      passDetail: 'comparable=true',
      failDetail: 'comparable=false; before/after evidence cannot support a hard claim.',
      missingDetail: 'comparable flag is missing.',
    }),
    buildProfileGate(profile),
    scalarGate({
      id: 'summary.regressions',
      severity: 'hard',
      value: manifest.regressions,
      pass: (value) => value === 0,
      passDetail: 'regressions=0',
      failDetail: (value) => `regressions=${value}`,
      missingDetail: 'regressions count is missing.',
    }),
    scalarGate({
      id: 'summary.budgetExceeded',
      severity: 'hard',
      value: manifest.budgetExceeded,
      pass: (value) => value === 0,
      passDetail: 'budgetExceeded=0',
      failDetail: (value) => `budgetExceeded=${value}`,
      missingDetail: 'budgetExceeded count is missing.',
    }),
    scalarGate({
      id: 'summary.timeouts',
      severity: 'hard',
      value: manifest.timeouts,
      pass: (value) => value === 0,
      passDetail: 'timeouts=0',
      failDetail: (value) => `timeouts=${value}`,
      missingDetail: 'timeouts count is missing.',
    }),
    scalarGate({
      id: 'summary.stabilityWarnings',
      severity: 'hard',
      value: manifest.stabilityWarnings,
      pass: (value) => value === 0,
      passDetail: 'stabilityWarnings=0',
      failDetail: (value) => `stabilityWarnings=${value}`,
      missingDetail: 'stabilityWarnings count is missing.',
    }),
    scalarGate({
      id: 'summary.missingSuites',
      severity: 'hard',
      value: manifest.missingSuites,
      pass: (value) => value === 0,
      passDetail: 'missingSuites=0',
      failDetail: (value) => `missingSuites=${value}`,
      missingDetail: 'missingSuites count is missing.',
    }),
    suiteGate,
    ...KERNEL_PERFORMANCE_EVIDENCE_LOCK_COUNTER_IDS.map((id) => counterGate(manifest, id)),
  ]

  const { classification, claimStrength } = classify(gates)
  const blockers = gates.filter((gate) => gate.status === 'fail').map((gate) => `${gate.id}: ${gate.detail}`)
  const missingEvidence = gates.filter((gate) => gate.status === 'missing').map((gate) => `${gate.id}: ${gate.detail}`)

  return {
    schemaVersion: 1,
    kind: 'KernelPerformanceEvidenceLockReport',
    generatedAt: manifest.generatedAt ?? new Date(0).toISOString(),
    profile,
    classification,
    claimStrength,
    gates,
    blockers,
    missingEvidence,
    watchedCounters: KERNEL_PERFORMANCE_EVIDENCE_LOCK_COUNTER_IDS.map((id) => {
      const value = asNonNegativeInteger(manifest.counters?.[id])
      return { id, ...(value === undefined ? null : { value }), passed: value === 0 }
    }),
    requiredSuites: suites,
    allowedClaims: allowedClaimsFor(classification),
    forbiddenClaims: FORBIDDEN_CLAIMS,
    evidenceRefs: Array.from(new Set(manifest.evidenceRefs ?? [])).sort(),
    localCi: manifest.localCi,
    cloudLimitations: [...DEFAULT_CLOUD_LIMITATIONS, ...(manifest.cloud?.unableToVerify ?? [])],
  }
}

const renderList = (items: ReadonlyArray<string>): string => {
  if (items.length === 0) return '- none\n'
  return items.map((item) => `- ${item}`).join('\n') + '\n'
}

export const renderKernelPerformanceEvidenceLockMarkdown = (
  report: KernelPerformanceEvidenceLockReport,
): string => {
  const lines = [
    '# Kernel Performance Evidence Lock Report',
    '',
    `- Schema: ${report.schemaVersion}`,
    `- Generated at: ${report.generatedAt}`,
    `- Profile: ${report.profile}`,
    `- Classification: ${report.classification}`,
    `- Claim strength: ${report.claimStrength}`,
    '- UNKNOWN/missing is not PASS.',
    '- This report makes no broad performance success claim.',
    '',
    '## Gates',
    '',
    '| Gate | Severity | Status | Detail |',
    '| --- | --- | --- | --- |',
    ...report.gates.map((gate) => `| ${gate.id} | ${gate.severity} | ${gate.status} | ${gate.detail} |`),
    '',
    '## Watched Counters',
    '',
    '| Counter | Value | Passed |',
    '| --- | ---: | --- |',
    ...report.watchedCounters.map((counter) => `| ${counter.id} | ${counter.value ?? ''} | ${counter.passed} |`),
    '',
    '## Required Suites',
    '',
    '| Suite | Status |',
    '| --- | --- |',
    ...report.requiredSuites.map((suite) => `| ${suite.id} | ${suite.status} |`),
    '',
    '## Blockers',
    '',
    renderList(report.blockers).trimEnd(),
    '',
    '## Missing Evidence',
    '',
    renderList(report.missingEvidence).trimEnd(),
    '',
    '## Allowed Claims',
    '',
    renderList(report.allowedClaims).trimEnd(),
    '',
    '## Forbidden Claims',
    '',
    renderList(report.forbiddenClaims).trimEnd(),
    '',
    '## Cloud LLM Validation Limitations',
    '',
    renderList(report.cloudLimitations).trimEnd(),
    '',
  ]

  return `${lines.join('\n')}\n`
}

const usage = (): string => `\
Usage:
  pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts --manifest <manifest.json> [--out <report.md>] [--json-out <report.json>] [--profile <default|soak|quick>] [--allow-provisional]

Notes:
  Reads an existing local evidence manifest. It does not collect benchmarks and does not create performance success claims.
`

const parseArgs = (argv: ReadonlyArray<string>) => {
  const get = (name: string): string | undefined => {
    const idx = argv.lastIndexOf(name)
    if (idx < 0) return undefined
    const value = argv[idx + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
    return value
  }

  const manifest = get('--manifest')
  if (!manifest) throw new Error(`Missing --manifest\n\n${usage()}`)

  return {
    manifest,
    out: get('--out'),
    jsonOut: get('--json-out'),
    profile: get('--profile'),
    allowProvisional: argv.includes('--allow-provisional'),
  }
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T

const writeTextIfRequested = async (file: string | undefined, content: string): Promise<void> => {
  if (!file) return
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content, 'utf8')
}

export const runKernelPerformanceEvidenceLockCli = async (argv: ReadonlyArray<string>): Promise<KernelPerformanceEvidenceLockReport> => {
  const args = parseArgs(argv)
  const manifest = await readJson<KernelPerformanceEvidenceLockManifest>(args.manifest)
  const report = classifyKernelPerformanceEvidenceLock({
    ...manifest,
    ...(args.profile ? { profile: args.profile } : null),
  })
  await writeTextIfRequested(args.out, renderKernelPerformanceEvidenceLockMarkdown(report))
  await writeTextIfRequested(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`)
  return report
}

if (process.argv[1]?.endsWith('ci.kernel-performance-evidence-lock.ts')) {
  runKernelPerformanceEvidenceLockCli(process.argv.slice(2))
    .then((report) => {
      if (report.classification !== 'locked' && !(report.classification === 'provisional' && process.argv.includes('--allow-provisional'))) {
        process.exitCode = 1
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
