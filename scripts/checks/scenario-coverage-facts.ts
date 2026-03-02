import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

type ScenarioStatus = 'covered' | 'partial' | 'missing'

const CHECK_NAME = 'scenario-coverage-facts'
const DEFAULT_BUNDLE = '.artifacts/scenario-suite-p0p1/verification.bundle.json'

const parseArgs = (argv: ReadonlyArray<string>) => {
  let bundlePath = DEFAULT_BUNDLE
  let maxMissing = 0
  let maxPartial = 6
  let minCovered = 4

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--bundle' && typeof next === 'string') {
      bundlePath = next
      i += 1
      continue
    }
    if (arg === '--maxMissing' && typeof next === 'string') {
      maxMissing = Number(next)
      i += 1
      continue
    }
    if (arg === '--maxPartial' && typeof next === 'string') {
      maxPartial = Number(next)
      i += 1
      continue
    }
    if (arg === '--minCovered' && typeof next === 'string') {
      minCovered = Number(next)
      i += 1
      continue
    }
  }

  return { bundlePath, maxMissing, maxPartial, minCovered }
}

const fail = (payload: unknown, code = 1): never => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(payload, null, 2))
  process.exit(code)
}

const toStatus = (value: unknown): ScenarioStatus | undefined =>
  value === 'covered' || value === 'partial' || value === 'missing' ? value : undefined

const main = () => {
  const args = parseArgs(process.argv.slice(2))
  const resolvedBundlePath = path.resolve(process.cwd(), args.bundlePath)
  if (!fs.existsSync(resolvedBundlePath)) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'SCENARIO_COVERAGE_BUNDLE_NOT_FOUND',
        bundlePath: args.bundlePath,
      },
      2,
    )
  }

  const bundle = JSON.parse(fs.readFileSync(resolvedBundlePath, 'utf8')) as any
  if (!bundle || bundle.kind !== 'VerificationBundle' || bundle.schemaVersion !== 1) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'SCENARIO_COVERAGE_BUNDLE_INVALID',
        bundlePath: args.bundlePath,
      },
      2,
    )
  }

  if (!Array.isArray(bundle.requiredScenarios) || !Array.isArray(bundle.scenarios)) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'SCENARIO_COVERAGE_BUNDLE_SHAPE_INVALID',
        bundlePath: args.bundlePath,
      },
      2,
    )
  }

  const required = bundle.requiredScenarios.filter((item: unknown): item is string => typeof item === 'string')
  const results = bundle.scenarios as ReadonlyArray<any>
  const scenarioIds = results
    .map((item) => (item && typeof item.scenarioId === 'string' ? item.scenarioId : undefined))
    .filter((item): item is string => Boolean(item))

  const missingRequired = required.filter((id) => !scenarioIds.includes(id))
  const duplicateIds = scenarioIds.filter((id, index) => scenarioIds.indexOf(id) !== index)
  if (missingRequired.length > 0 || duplicateIds.length > 0) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'SCENARIO_COVERAGE_REQUIRED_SET_VIOLATION',
        missingRequired,
        duplicateIds: Array.from(new Set(duplicateIds)),
      },
      2,
    )
  }

  const summary = { covered: 0, partial: 0, missing: 0, total: 0 }
  const invalidStatus: string[] = []
  for (const item of results) {
    const status = toStatus(item?.status)
    if (!status) {
      invalidStatus.push(String(item?.scenarioId ?? 'unknown'))
      continue
    }
    summary[status] += 1
    summary.total += 1
  }

  if (invalidStatus.length > 0) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'SCENARIO_COVERAGE_STATUS_INVALID',
        invalidStatus,
      },
      2,
    )
  }

  const declared = bundle.summary ?? {}
  if (
    declared.covered !== summary.covered ||
    declared.partial !== summary.partial ||
    declared.missing !== summary.missing ||
    declared.total !== summary.total
  ) {
    fail(
      {
        check: CHECK_NAME,
        ok: false,
        reasonCode: 'SCENARIO_COVERAGE_SUMMARY_MISMATCH',
        declared,
        computed: summary,
      },
      2,
    )
  }

  const violations: string[] = []
  if (summary.missing > args.maxMissing) violations.push(`missing(${summary.missing}) > maxMissing(${args.maxMissing})`)
  if (summary.partial > args.maxPartial) violations.push(`partial(${summary.partial}) > maxPartial(${args.maxPartial})`)
  if (summary.covered < args.minCovered) violations.push(`covered(${summary.covered}) < minCovered(${args.minCovered})`)

  if (violations.length > 0) {
    fail({
      check: CHECK_NAME,
      ok: false,
      reasonCode: 'SCENARIO_COVERAGE_THRESHOLD_FAILED',
      bundlePath: args.bundlePath,
      summary,
      threshold: {
        maxMissing: args.maxMissing,
        maxPartial: args.maxPartial,
        minCovered: args.minCovered,
      },
      violations,
    })
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      check: CHECK_NAME,
      ok: true,
      reasonCode: 'VERIFY_PASS',
      bundlePath: args.bundlePath,
      summary,
      threshold: {
        maxMissing: args.maxMissing,
        maxPartial: args.maxPartial,
        minCovered: args.minCovered,
      },
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
