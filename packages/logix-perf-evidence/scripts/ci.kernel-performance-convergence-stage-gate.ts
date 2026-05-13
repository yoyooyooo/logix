import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

export type KernelPerformanceConvergenceStageId = 'adversarialMatrix' | 'P0' | 'P1' | 'P2'
export type KernelPerformanceConvergenceClassification = 'complete' | 'provisional' | 'blocked' | 'incomplete'
export type KernelPerformanceConvergenceClaimStrength = 'hard' | 'clue' | 'none'
export type KernelPerformanceConvergenceGateStatus = 'pass' | 'fail' | 'missing'
export type KernelPerformanceConvergenceGateSeverity = 'hard' | 'clue'

export const KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_STAGE_IDS = [
  'adversarialMatrix',
  'P0',
  'P1',
  'P2',
] as const

export const KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS = [
  'adversarial.matrix.requiredHotPaths',
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

export const KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS = [
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

export type KernelPerformanceConvergenceRequiredSuiteId =
  (typeof KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS)[number]
export type KernelPerformanceConvergenceRequiredCounterId =
  (typeof KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS)[number]

export type KernelPerformanceConvergenceStageInput = Readonly<{
  readonly id: KernelPerformanceConvergenceStageId | string
  readonly status?: 'not_started' | 'implemented' | 'validated' | 'blocked' | 'deferred' | string
  readonly owner?: string
  readonly evidenceRefs?: ReadonlyArray<string>
  readonly notes?: string
}>

export type KernelPerformanceConvergenceSuiteInput = Readonly<{
  readonly id: string
  readonly status?: 'pass' | 'fail' | 'timeout' | 'missing' | string
}>

export type KernelPerformanceConvergenceManifest = Readonly<{
  readonly schemaVersion: 1
  readonly generatedAt?: string
  readonly envId?: string
  readonly profile?: string
  readonly comparable?: boolean
  readonly regressions?: number
  readonly budgetExceeded?: number
  readonly budgetViolations?: number
  readonly timeouts?: number
  readonly stabilityWarnings?: number
  readonly missingSuites?: number
  readonly stages?: ReadonlyArray<KernelPerformanceConvergenceStageInput>
  readonly suites?: ReadonlyArray<KernelPerformanceConvergenceSuiteInput>
  readonly counters?: Partial<Record<KernelPerformanceConvergenceRequiredCounterId, number>>
  readonly evidenceRefs?: ReadonlyArray<string>
  readonly localCi?: Readonly<{
    readonly commands?: ReadonlyArray<Readonly<{ readonly command: string; readonly result: string; readonly notes?: string }>>
  }>
  readonly migration?: Readonly<{
    readonly migratedCost?: number
    readonly migratedRisk?: number
    readonly acceptedByAuthority?: boolean
    readonly notes?: string
  }>
  readonly cloud?: Readonly<{
    readonly unableToVerify?: ReadonlyArray<string>
  }>
}>

export type KernelPerformanceConvergenceGate = Readonly<{
  readonly id: string
  readonly status: KernelPerformanceConvergenceGateStatus
  readonly severity: KernelPerformanceConvergenceGateSeverity
  readonly detail: string
}>

export type KernelPerformanceConvergenceReport = Readonly<{
  readonly schemaVersion: 1
  readonly kind: 'KernelPerformanceConvergenceReport'
  readonly generatedAt: string
  readonly profile: string
  readonly classification: KernelPerformanceConvergenceClassification
  readonly claimStrength: KernelPerformanceConvergenceClaimStrength
  readonly gates: ReadonlyArray<KernelPerformanceConvergenceGate>
  readonly stages: ReadonlyArray<Readonly<{
    readonly id: KernelPerformanceConvergenceStageId
    readonly status: 'validated' | 'implemented' | 'blocked' | 'missing' | 'deferred'
    readonly evidenceRefs: ReadonlyArray<string>
  }>>
  readonly watchedCounters: ReadonlyArray<Readonly<{
    readonly id: KernelPerformanceConvergenceRequiredCounterId
    readonly value?: number
    readonly passed: boolean
  }>>
  readonly requiredSuites: ReadonlyArray<Readonly<{
    readonly id: KernelPerformanceConvergenceRequiredSuiteId
    readonly status: 'pass' | 'fail' | 'timeout' | 'missing'
  }>>
  readonly blockers: ReadonlyArray<string>
  readonly missingEvidence: ReadonlyArray<string>
  readonly allowedClaims: ReadonlyArray<string>
  readonly forbiddenClaims: ReadonlyArray<string>
  readonly evidenceRefs: ReadonlyArray<string>
  readonly localCi: KernelPerformanceConvergenceManifest['localCi']
  readonly riskOrCostMigration: Readonly<{
    readonly migratedCost?: number
    readonly migratedRisk?: number
    readonly acceptedByAuthority: boolean
    readonly notes?: string
  }>
  readonly cloudLimitations: ReadonlyArray<string>
}>

const DEFAULT_CLOUD_LIMITATIONS = [
  'Cloud LLM did not run pnpm install, package tests, browser perf collection, default/soak perf diff, or local CI.',
  'Cloud LLM generated a staged convergence patch and evidence contract from uploaded source/docs/spec snapshots only.',
  'Any hard performance or release claim requires local comparable default or soak evidence after applying and implementing the stages.',
] as const

const FORBIDDEN_CLAIMS = [
  'Global Runtime performance improved.',
  'No regressions exist globally.',
  'React performance improved globally.',
  'FieldKernel is optimal.',
  'Selector notification path is optimal.',
  'Source/list row scope is fully optimized.',
  'Examples prove kernel performance without isolated runtime evidence.',
  'Quick/smoke evidence proves release-safe performance.',
  'LLM advisory or reviewer notes override machine-readable gates.',
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

const booleanGate = (args: {
  readonly id: string
  readonly severity: KernelPerformanceConvergenceGateSeverity
  readonly value: unknown
  readonly passDetail: string
  readonly failDetail: string
  readonly missingDetail: string
}): KernelPerformanceConvergenceGate => {
  if (typeof args.value !== 'boolean') {
    return { id: args.id, severity: args.severity, status: 'missing', detail: args.missingDetail }
  }
  return args.value
    ? { id: args.id, severity: args.severity, status: 'pass', detail: args.passDetail }
    : { id: args.id, severity: args.severity, status: 'fail', detail: args.failDetail }
}

const scalarGate = (args: {
  readonly id: string
  readonly severity: KernelPerformanceConvergenceGateSeverity
  readonly value: unknown
  readonly pass: (value: number) => boolean
  readonly passDetail: string
  readonly failDetail: (value: number) => string
  readonly missingDetail: string
}): KernelPerformanceConvergenceGate => {
  const value = asNonNegativeInteger(args.value)
  if (value === undefined) {
    return { id: args.id, severity: args.severity, status: 'missing', detail: args.missingDetail }
  }
  if (args.pass(value)) {
    return { id: args.id, severity: args.severity, status: 'pass', detail: args.passDetail }
  }
  return { id: args.id, severity: args.severity, status: 'fail', detail: args.failDetail(value) }
}

const buildProfileGate = (profile: string): KernelPerformanceConvergenceGate => {
  const p = profile.toLowerCase()
  if (p === 'default' || p === 'soak' || p === 'adversarial-default' || p === 'adversarial-soak') {
    return {
      id: 'profile.hardClaimEligible',
      severity: 'clue',
      status: 'pass',
      detail: `profile=${profile}; hard convergence evidence may be interpreted if hard gates pass.`,
    }
  }
  if (p === 'quick' || p === 'smoke' || p === 'adversarial-quick') {
    return {
      id: 'profile.hardClaimEligible',
      severity: 'clue',
      status: 'fail',
      detail: `profile=${profile}; quick/smoke evidence is a diagnostic clue only.`,
    }
  }
  return {
    id: 'profile.hardClaimEligible',
    severity: 'clue',
    status: 'missing',
    detail: 'profile is missing or unknown; hard performance claim is not allowed.',
  }
}

const suiteStatus = (suite: KernelPerformanceConvergenceSuiteInput | undefined): 'pass' | 'fail' | 'timeout' | 'missing' => {
  const status = suite?.status
  if (status === 'pass') return 'pass'
  if (status === 'timeout') return 'timeout'
  if (status === 'fail' || status === 'failed') return 'fail'
  return 'missing'
}

const requiredSuites = (
  manifest: KernelPerformanceConvergenceManifest,
): KernelPerformanceConvergenceReport['requiredSuites'] => {
  const byId = new Map((manifest.suites ?? []).map((suite) => [suite.id, suite]))
  return KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_SUITE_IDS.map((id) => ({ id, status: suiteStatus(byId.get(id)) }))
}

const normalizeStageStatus = (
  input: KernelPerformanceConvergenceStageInput | undefined,
): 'validated' | 'implemented' | 'blocked' | 'missing' | 'deferred' => {
  if (!input) return 'missing'
  if (input.status === 'validated') return 'validated'
  if (input.status === 'implemented') return 'implemented'
  if (input.status === 'blocked') return 'blocked'
  if (input.status === 'deferred' || input.status === 'not_started') return 'deferred'
  return 'missing'
}

const requiredStages = (
  manifest: KernelPerformanceConvergenceManifest,
): KernelPerformanceConvergenceReport['stages'] => {
  const byId = new Map((manifest.stages ?? []).map((stage) => [stage.id, stage]))
  return KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_STAGE_IDS.map((id) => {
    const stage = byId.get(id)
    return {
      id,
      status: normalizeStageStatus(stage),
      evidenceRefs: Array.from(new Set(stage?.evidenceRefs ?? [])).sort(),
    }
  })
}

const stageGate = (manifest: KernelPerformanceConvergenceManifest): KernelPerformanceConvergenceGate => {
  const stages = requiredStages(manifest)
  const blocked = stages.filter((stage) => stage.status === 'blocked')
  const missing = stages.filter((stage) => stage.status === 'missing' || stage.status === 'deferred')
  if (blocked.length > 0) {
    return {
      id: 'stages.allValidatedOrImplemented',
      severity: 'hard',
      status: 'fail',
      detail: `Blocked stages: ${blocked.map((stage) => stage.id).join(', ')}`,
    }
  }
  if (missing.length > 0) {
    return {
      id: 'stages.allValidatedOrImplemented',
      severity: 'hard',
      status: 'missing',
      detail: `Missing/deferred stages: ${missing.map((stage) => `${stage.id}:${stage.status}`).join(', ')}`,
    }
  }
  return {
    id: 'stages.allValidatedOrImplemented',
    severity: 'hard',
    status: 'pass',
    detail: 'All convergence stages are implemented or validated in the manifest.',
  }
}

const suiteGate = (manifest: KernelPerformanceConvergenceManifest): KernelPerformanceConvergenceGate => {
  const suites = requiredSuites(manifest)
  const failed = suites.filter((suite) => suite.status === 'fail' || suite.status === 'timeout')
  const missing = suites.filter((suite) => suite.status === 'missing')
  if (failed.length > 0) {
    return {
      id: 'requiredSuites.presentAndPassing',
      severity: 'hard',
      status: 'fail',
      detail: `Required suite failure/timeout: ${failed.map((suite) => `${suite.id}:${suite.status}`).join(', ')}`,
    }
  }
  if (missing.length > 0) {
    return {
      id: 'requiredSuites.presentAndPassing',
      severity: 'hard',
      status: 'missing',
      detail: `Missing required suites: ${missing.map((suite) => suite.id).join(', ')}`,
    }
  }
  return {
    id: 'requiredSuites.presentAndPassing',
    severity: 'hard',
    status: 'pass',
    detail: 'All required convergence suites are present and passing in the manifest.',
  }
}

const counterGate = (
  manifest: KernelPerformanceConvergenceManifest,
  id: KernelPerformanceConvergenceRequiredCounterId,
): KernelPerformanceConvergenceGate => {
  const value = asNonNegativeInteger(manifest.counters?.[id])
  if (value === undefined) {
    return {
      id: `counter:${id}`,
      severity: 'hard',
      status: 'missing',
      detail: `${id} counter is missing; stage convergence cannot be claimed.`,
    }
  }
  if (value === 0) {
    return { id: `counter:${id}`, severity: 'hard', status: 'pass', detail: `${id}=0` }
  }
  return {
    id: `counter:${id}`,
    severity: 'hard',
    status: 'fail',
    detail: `${id}=${value}; convergence evidence is blocked for the stage set.`,
  }
}

const migrationGate = (manifest: KernelPerformanceConvergenceManifest): KernelPerformanceConvergenceGate => {
  const migratedCost = asNonNegativeInteger(manifest.migration?.migratedCost)
  const migratedRisk = asNonNegativeInteger(manifest.migration?.migratedRisk)
  if (migratedCost === undefined || migratedRisk === undefined) {
    return {
      id: 'migration.noUnacceptedCostOrRisk',
      severity: 'hard',
      status: 'missing',
      detail: 'migration.migratedCost and migration.migratedRisk counts are required before convergence can be claimed.',
    }
  }

  const total = migratedCost + migratedRisk
  if (total === 0) {
    return {
      id: 'migration.noUnacceptedCostOrRisk',
      severity: 'hard',
      status: 'pass',
      detail: 'migratedCost=0 and migratedRisk=0',
    }
  }

  if (manifest.migration?.acceptedByAuthority === true) {
    return {
      id: 'migration.noUnacceptedCostOrRisk',
      severity: 'hard',
      status: 'pass',
      detail: `migratedCost=${migratedCost}, migratedRisk=${migratedRisk}; accepted by authority.`,
    }
  }

  return {
    id: 'migration.noUnacceptedCostOrRisk',
    severity: 'hard',
    status: 'fail',
    detail: `migratedCost=${migratedCost}, migratedRisk=${migratedRisk}; unaccepted migrated cost/risk blocks hard claims.`,
  }
}

const classify = (gates: ReadonlyArray<KernelPerformanceConvergenceGate>): {
  readonly classification: KernelPerformanceConvergenceClassification
  readonly claimStrength: KernelPerformanceConvergenceClaimStrength
} => {
  const hardGates = gates.filter((gate) => gate.severity === 'hard')
  const clueGates = gates.filter((gate) => gate.severity === 'clue')
  const hardFailed = hardGates.some((gate) => gate.status === 'fail')
  const hardMissing = hardGates.some((gate) => gate.status === 'missing')
  const clueReady = clueGates.every((gate) => gate.status === 'pass')

  if (hardFailed) return { classification: 'blocked', claimStrength: 'none' }
  if (hardMissing) return { classification: 'incomplete', claimStrength: 'none' }
  if (!clueReady) return { classification: 'provisional', claimStrength: 'clue' }
  return { classification: 'complete', claimStrength: 'hard' }
}

const allowedClaimsFor = (
  classification: KernelPerformanceConvergenceClassification,
): ReadonlyArray<string> => {
  if (classification === 'complete') {
    return [
      'Kernel P0/P1/P2 convergence hard gates passed for the manifest scope.',
      'The staged convergence work packages are implemented or validated for the recorded repo state.',
      'The listed local default/soak evidence is admissible if repo state, matrix hash, and artifacts match.',
    ]
  }

  if (classification === 'provisional') {
    return [
      'Kernel P0/P1/P2 convergence structural gates are clean for the manifest scope.',
      'Evidence is quick/smoke or otherwise clue-only and cannot support a hard performance success claim.',
    ]
  }

  if (classification === 'incomplete') {
    return ['Kernel P0/P1/P2 convergence cannot be evaluated because required stage, suite, or counter evidence is missing.']
  }

  return ['Kernel P0/P1/P2 convergence is blocked; use blockers to choose the next local fix.']
}

export const classifyKernelPerformanceConvergence = (
  manifest: KernelPerformanceConvergenceManifest,
): KernelPerformanceConvergenceReport => {
  const profile = normalizeProfile(manifest.profile)
  const budgetExceeded = manifest.budgetExceeded ?? manifest.budgetViolations
  const gates: KernelPerformanceConvergenceGate[] = [
    booleanGate({
      id: 'diff.comparable',
      severity: 'hard',
      value: manifest.comparable,
      passDetail: 'comparable=true',
      failDetail: 'comparable=false; before/after convergence evidence cannot support a hard claim.',
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
      value: budgetExceeded,
      pass: (value) => value === 0,
      passDetail: 'budgetExceeded=0',
      failDetail: (value) => `budgetExceeded=${value}`,
      missingDetail: 'budgetExceeded/budgetViolations count is missing.',
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
    stageGate(manifest),
    suiteGate(manifest),
    migrationGate(manifest),
    ...KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS.map((id) => counterGate(manifest, id)),
  ]

  const { classification, claimStrength } = classify(gates)
  const stages = requiredStages(manifest)
  const suites = requiredSuites(manifest)
  const blockers = gates.filter((gate) => gate.status === 'fail').map((gate) => `${gate.id}: ${gate.detail}`)
  const missingEvidence = gates.filter((gate) => gate.status === 'missing').map((gate) => `${gate.id}: ${gate.detail}`)
  const stageRefs = stages.flatMap((stage) => stage.evidenceRefs)

  return {
    schemaVersion: 1,
    kind: 'KernelPerformanceConvergenceReport',
    generatedAt: manifest.generatedAt ?? new Date(0).toISOString(),
    profile,
    classification,
    claimStrength,
    gates,
    stages,
    watchedCounters: KERNEL_PERFORMANCE_CONVERGENCE_REQUIRED_COUNTER_IDS.map((id) => {
      const value = asNonNegativeInteger(manifest.counters?.[id])
      return { id, ...(value === undefined ? {} : { value }), passed: value === 0 }
    }),
    requiredSuites: suites,
    blockers,
    missingEvidence,
    allowedClaims: allowedClaimsFor(classification),
    forbiddenClaims: FORBIDDEN_CLAIMS,
    riskOrCostMigration: {
      ...(asNonNegativeInteger(manifest.migration?.migratedCost) === undefined ? {} : { migratedCost: asNonNegativeInteger(manifest.migration?.migratedCost) }),
      ...(asNonNegativeInteger(manifest.migration?.migratedRisk) === undefined ? {} : { migratedRisk: asNonNegativeInteger(manifest.migration?.migratedRisk) }),
      acceptedByAuthority: manifest.migration?.acceptedByAuthority === true,
      ...(manifest.migration?.notes ? { notes: manifest.migration.notes } : {}),
    },
    evidenceRefs: Array.from(new Set([...(manifest.evidenceRefs ?? []), ...stageRefs])).sort(),
    localCi: manifest.localCi,
    cloudLimitations: [...DEFAULT_CLOUD_LIMITATIONS, ...(manifest.cloud?.unableToVerify ?? [])],
  }
}

const renderList = (items: ReadonlyArray<string>): string => {
  if (items.length === 0) return '- none\n'
  return items.map((item) => `- ${item}`).join('\n') + '\n'
}

export const renderKernelPerformanceConvergenceMarkdown = (
  report: KernelPerformanceConvergenceReport,
): string => {
  const lines = [
    '# Kernel Performance Convergence Report',
    '',
    `- Schema: ${report.schemaVersion}`,
    `- Generated at: ${report.generatedAt}`,
    `- Profile: ${report.profile}`,
    `- Classification: ${report.classification}`,
    `- Claim strength: ${report.claimStrength}`,
    '- UNKNOWN/missing is not PASS.',
    '- This report makes no broad performance success claim.',
    '',
    '## Stages',
    '',
    '| Stage | Status | Evidence Refs |',
    '| --- | --- | --- |',
    ...report.stages.map((stage) => `| ${stage.id} | ${stage.status} | ${stage.evidenceRefs.join(', ')} |`),
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
    '## Risk / Cost Migration',
    '',
    `- migratedCost: ${report.riskOrCostMigration.migratedCost ?? 'missing'}`,
    `- migratedRisk: ${report.riskOrCostMigration.migratedRisk ?? 'missing'}`,
    `- acceptedByAuthority: ${report.riskOrCostMigration.acceptedByAuthority}`,
    ...(report.riskOrCostMigration.notes ? [`- notes: ${report.riskOrCostMigration.notes}`] : []),
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
  pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-stage-gate.ts --manifest <manifest.json> [--out <report.md>] [--json-out <report.json>] [--profile <default|soak|quick>] [--allow-provisional]

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

export const runKernelPerformanceConvergenceCli = async (
  argv: ReadonlyArray<string>,
): Promise<KernelPerformanceConvergenceReport> => {
  const args = parseArgs(argv)
  const manifest = await readJson<KernelPerformanceConvergenceManifest>(args.manifest)
  const report = classifyKernelPerformanceConvergence({
    ...manifest,
    ...(args.profile ? { profile: args.profile } : {}),
  })
  await writeTextIfRequested(args.out, renderKernelPerformanceConvergenceMarkdown(report))
  await writeTextIfRequested(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`)
  return report
}

if (process.argv[1]?.endsWith('ci.kernel-performance-convergence-stage-gate.ts')) {
  runKernelPerformanceConvergenceCli(process.argv.slice(2))
    .then((report) => {
      if (report.classification !== 'complete' && !(report.classification === 'provisional' && process.argv.includes('--allow-provisional'))) {
        process.exitCode = 1
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
