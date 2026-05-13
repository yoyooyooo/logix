import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

export type ExamplesPlaygroundIsolationClassification = 'isolated' | 'provisional' | 'blocked' | 'incomplete'
export type ExamplesPlaygroundIsolationClaimStrength = 'hard' | 'clue' | 'none'
export type ExamplesPlaygroundIsolationSuiteId = 'examples.runtimeWitness' | 'examples.playgroundNoiseIsolation'

export type ExamplesPlaygroundIsolationInput = Readonly<{
  readonly schemaVersion?: 1
  readonly generatedAt?: string
  readonly profile?: string
  readonly runtime?: Readonly<{
    readonly status?: 'pass' | 'fail' | 'missing' | string
    readonly evidenceRef?: string
    readonly kernelOnly?: boolean
    readonly publicResidueViolation?: number
    readonly notes?: string
  }>
  readonly playground?: Readonly<{
    readonly status?: 'pass' | 'fail' | 'missing' | string
    readonly evidenceRef?: string
    readonly productCostSeparated?: boolean
    readonly kernelPlaygroundCostMixed?: number
    readonly notes?: string
  }>
  readonly cloud?: Readonly<{ readonly unableToVerify?: ReadonlyArray<string> }>
}>

export type ExamplesPlaygroundIsolationReport = Readonly<{
  readonly schemaVersion: 1
  readonly kind: 'ExamplesPlaygroundIsolationReport'
  readonly generatedAt: string
  readonly profile: string
  readonly classification: ExamplesPlaygroundIsolationClassification
  readonly claimStrength: ExamplesPlaygroundIsolationClaimStrength
  readonly suites: ReadonlyArray<Readonly<{ readonly id: ExamplesPlaygroundIsolationSuiteId; readonly status: 'pass' | 'fail' | 'missing' }>>
  readonly counters: Readonly<{
    readonly 'examples.kernelPlaygroundCostMixed': number | 'missing'
    readonly 'examples.publicResidueViolation': number | 'missing'
  }>
  readonly blockers: ReadonlyArray<string>
  readonly missingEvidence: ReadonlyArray<string>
  readonly evidenceRefs: ReadonlyArray<string>
  readonly allowedClaims: ReadonlyArray<string>
  readonly forbiddenClaims: ReadonlyArray<string>
  readonly cloudLimitations: ReadonlyArray<string>
}>

const DEFAULT_CLOUD_LIMITATIONS = [
  'Cloud LLM did not run browser route acceptance, Vite playground startup, Monaco worker startup, Sandpack preview, or perf collection.',
  'This report only classifies local evidence supplied through the input file.',
] as const

const FORBIDDEN_CLAIMS = [
  'Examples prove kernel performance without isolated runtime evidence.',
  'Product playground/editor costs are kernel costs.',
  'Monaco/Sandpack/type-bundle costs can support a kernel performance claim.',
  'Quick/smoke example evidence proves release-safe performance.',
] as const

const asCount = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

const normalizeStatus = (value: unknown): 'pass' | 'fail' | 'missing' => {
  if (value === 'pass') return 'pass'
  if (value === 'fail' || value === 'failed' || value === 'timeout') return 'fail'
  return 'missing'
}

const normalizeProfile = (value: unknown): string => {
  const raw = typeof value === 'string' ? value.trim() : ''
  return raw.length > 0 ? raw : 'unknown'
}

export const classifyExamplesPlaygroundIsolation = (
  input: ExamplesPlaygroundIsolationInput,
): ExamplesPlaygroundIsolationReport => {
  const profile = normalizeProfile(input.profile)
  const runtimeStatus = normalizeStatus(input.runtime?.status)
  const playgroundStatus = normalizeStatus(input.playground?.status)
  const kernelPlaygroundCostMixed = asCount(input.playground?.kernelPlaygroundCostMixed)
  const publicResidueViolation = asCount(input.runtime?.publicResidueViolation)

  const blockers: string[] = []
  const missingEvidence: string[] = []

  if (runtimeStatus === 'fail') blockers.push('examples.runtimeWitness failed.')
  if (runtimeStatus === 'missing') missingEvidence.push('examples.runtimeWitness suite evidence is missing.')
  if (playgroundStatus === 'fail') blockers.push('examples.playgroundNoiseIsolation failed.')
  if (playgroundStatus === 'missing') missingEvidence.push('examples.playgroundNoiseIsolation suite evidence is missing.')

  if (input.runtime?.kernelOnly !== true) {
    if (runtimeStatus === 'pass') blockers.push('runtime example witness is not marked kernelOnly=true.')
    else missingEvidence.push('runtime.kernelOnly marker is missing.')
  }
  if (input.playground?.productCostSeparated !== true) {
    if (playgroundStatus === 'pass') blockers.push('playground product cost is not marked productCostSeparated=true.')
    else missingEvidence.push('playground.productCostSeparated marker is missing.')
  }

  if (kernelPlaygroundCostMixed === undefined) missingEvidence.push('examples.kernelPlaygroundCostMixed counter is missing.')
  else if (kernelPlaygroundCostMixed !== 0) blockers.push(`examples.kernelPlaygroundCostMixed=${kernelPlaygroundCostMixed}.`)

  if (publicResidueViolation === undefined) missingEvidence.push('examples.publicResidueViolation counter is missing.')
  else if (publicResidueViolation !== 0) blockers.push(`examples.publicResidueViolation=${publicResidueViolation}.`)

  const quickLike = profile === 'quick' || profile === 'smoke' || profile === 'adversarial-quick'
  let classification: ExamplesPlaygroundIsolationClassification
  let claimStrength: ExamplesPlaygroundIsolationClaimStrength
  if (blockers.length > 0) {
    classification = 'blocked'
    claimStrength = 'none'
  } else if (missingEvidence.length > 0) {
    classification = 'incomplete'
    claimStrength = 'none'
  } else if (quickLike) {
    classification = 'provisional'
    claimStrength = 'clue'
  } else {
    classification = 'isolated'
    claimStrength = 'hard'
  }

  const evidenceRefs = Array.from(
    new Set([input.runtime?.evidenceRef, input.playground?.evidenceRef].filter((value): value is string => !!value)),
  ).sort()

  return {
    schemaVersion: 1,
    kind: 'ExamplesPlaygroundIsolationReport',
    generatedAt: input.generatedAt ?? new Date(0).toISOString(),
    profile,
    classification,
    claimStrength,
    suites: [
      { id: 'examples.runtimeWitness', status: runtimeStatus },
      { id: 'examples.playgroundNoiseIsolation', status: playgroundStatus },
    ],
    counters: {
      'examples.kernelPlaygroundCostMixed': kernelPlaygroundCostMixed ?? 'missing',
      'examples.publicResidueViolation': publicResidueViolation ?? 'missing',
    },
    blockers,
    missingEvidence,
    evidenceRefs,
    allowedClaims:
      classification === 'isolated'
        ? ['Runtime example witnesses are isolated from product playground/editor cost for the recorded manifest scope.']
        : classification === 'provisional'
          ? ['Runtime example/playground isolation is structurally clean but only clue-level because profile is quick/smoke.']
          : ['Examples/playground isolation cannot support a kernel performance claim.'],
    forbiddenClaims: FORBIDDEN_CLAIMS,
    cloudLimitations: [...DEFAULT_CLOUD_LIMITATIONS, ...(input.cloud?.unableToVerify ?? [])],
  }
}

const renderList = (items: ReadonlyArray<string>): string =>
  items.length === 0 ? '- none\n' : `${items.map((item) => `- ${item}`).join('\n')}\n`

export const renderExamplesPlaygroundIsolationMarkdown = (report: ExamplesPlaygroundIsolationReport): string => {
  const lines = [
    '# Examples / Playground Isolation Report',
    '',
    `- Classification: ${report.classification}`,
    `- Claim strength: ${report.claimStrength}`,
    `- Profile: ${report.profile}`,
    '- UNKNOWN/missing is not PASS.',
    '- This report makes no kernel performance success claim from product playground/editor costs.',
    '',
    '## Suites',
    '',
    '| Suite | Status |',
    '| --- | --- |',
    ...report.suites.map((suite) => `| ${suite.id} | ${suite.status} |`),
    '',
    '## Counters',
    '',
    '| Counter | Value |',
    '| --- | ---: |',
    ...Object.entries(report.counters).map(([id, value]) => `| ${id} | ${value} |`),
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
  pnpm exec tsx packages/logix-perf-evidence/scripts/ci.examples-playground-isolation-report.ts --input <input.json> [--out <report.md>] [--json-out <report.json>] [--profile <profile>]

Notes:
  Reads local examples/playground isolation evidence. It does not launch browser runners or collect performance data.
`

const parseArgs = (argv: ReadonlyArray<string>) => {
  const get = (name: string): string | undefined => {
    const idx = argv.lastIndexOf(name)
    if (idx < 0) return undefined
    const value = argv[idx + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}`)
    return value
  }
  const input = get('--input')
  if (!input) throw new Error(`Missing --input\n\n${usage()}`)
  return { input, out: get('--out'), jsonOut: get('--json-out'), profile: get('--profile') }
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T

const writeTextIfRequested = async (file: string | undefined, content: string): Promise<void> => {
  if (!file) return
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content, 'utf8')
}

export const runExamplesPlaygroundIsolationCli = async (
  argv: ReadonlyArray<string>,
): Promise<ExamplesPlaygroundIsolationReport> => {
  const args = parseArgs(argv)
  const input = await readJson<ExamplesPlaygroundIsolationInput>(args.input)
  const report = classifyExamplesPlaygroundIsolation({ ...input, ...(args.profile ? { profile: args.profile } : {}) })
  await writeTextIfRequested(args.out, renderExamplesPlaygroundIsolationMarkdown(report))
  await writeTextIfRequested(args.jsonOut, `${JSON.stringify(report, null, 2)}\n`)
  return report
}

if (process.argv[1]?.endsWith('ci.examples-playground-isolation-report.ts')) {
  runExamplesPlaygroundIsolationCli(process.argv.slice(2))
    .then((report) => {
      if (report.classification !== 'isolated') process.exitCode = 1
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
