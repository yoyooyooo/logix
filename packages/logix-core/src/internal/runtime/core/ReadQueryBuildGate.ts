import { fnv1a32, stableStringify } from '../../digest.js'
import {
  compile,
  evaluateStrictGate,
  isReadQueryCompiled,
  type ReadQueryCompiled,
  type ReadQueryFallbackReason,
  type ReadQueryInput,
  type ReadQueryStrictGateConfig,
  type ReadQueryStrictGateDecision,
  type ReadQueryStrictGateRule,
} from './ReadQuery.js'

export interface SelectorQualityEntry {
  readonly moduleId: string
  readonly selectorId: string
  readonly debugKey?: string
  readonly lane: ReadQueryCompiled<any, any>['lane']
  readonly producer: ReadQueryCompiled<any, any>['producer']
  readonly readsDigest?: ReadQueryCompiled<any, any>['readsDigest']
  readonly fallbackReason?: ReadQueryFallbackReason
  readonly strictGateVerdict: 'PASS' | 'WARN' | 'FAIL'
  readonly strictGateRule?: ReadQueryStrictGateRule
  readonly diagnosticCode?: 'read_query::strict_gate'
}

export interface SelectorQualitySummary {
  readonly total: number
  readonly staticCount: number
  readonly dynamicCount: number
  readonly warnCount: number
  readonly failCount: number
  readonly fallbackBreakdown: Readonly<Record<string, number>>
}

export interface SelectorQualityReport {
  readonly reportId: string
  readonly moduleId: string
  readonly generatedAt: string
  readonly entries: ReadonlyArray<SelectorQualityEntry>
  readonly summary: SelectorQualitySummary
}

export interface BuildReadQueryGradeResult<S, V> {
  readonly compiled: ReadQueryCompiled<S, V>
  readonly entry: SelectorQualityEntry
  readonly strictGateDecision: ReadQueryStrictGateDecision
}

const toVerdict = (decision: ReadQueryStrictGateDecision): 'PASS' | 'WARN' | 'FAIL' => decision.verdict

const toRule = (decision: ReadQueryStrictGateDecision): ReadQueryStrictGateRule | undefined => {
  if (decision.verdict === 'PASS') return undefined
  return decision.details.rule
}

const toFallbackReason = (
  decision: ReadQueryStrictGateDecision,
  compiled: ReadQueryCompiled<any, any>,
): ReadQueryFallbackReason | undefined => {
  if (decision.verdict !== 'PASS') return decision.details.fallbackReason
  return compiled.fallbackReason
}

export const gradeReadQueryAtBuild = <S, V>(args: {
  readonly moduleId: string
  readonly input: ReadQueryInput<S, V> | ReadQueryCompiled<S, V>
  readonly strictGate?: ReadQueryStrictGateConfig
  readonly reportId?: string
}): BuildReadQueryGradeResult<S, V> => {
  const compiled = isReadQueryCompiled<S, V>(args.input) ? args.input : compile(args.input)

  const strictGateDecision: ReadQueryStrictGateDecision =
    args.strictGate && args.strictGate.mode !== 'off'
      ? evaluateStrictGate({
          config: args.strictGate,
          moduleId: args.moduleId,
          instanceId: 'build',
          txnSeq: 0,
          compiled,
        })
      : { verdict: 'PASS' }

  const strictGateVerdict = toVerdict(strictGateDecision)
  const strictGateRule = toRule(strictGateDecision)
  const fallbackReason = toFallbackReason(strictGateDecision, compiled)

  const entry: SelectorQualityEntry = {
    moduleId: args.moduleId,
    selectorId: compiled.selectorId,
    debugKey: compiled.debugKey,
    lane: compiled.lane,
    producer: compiled.producer,
    readsDigest: compiled.readsDigest,
    fallbackReason,
    strictGateVerdict,
    strictGateRule,
    diagnosticCode: strictGateVerdict === 'PASS' ? undefined : 'read_query::strict_gate',
  }

  const graded: ReadQueryCompiled<S, V> = {
    ...compiled,
    quality: {
      source: 'build',
      reportId: args.reportId,
      strictGate: {
        evaluatedAt: 'build',
        verdict: strictGateVerdict,
        rule: strictGateRule,
        fallbackReason,
      },
    },
  }

  return {
    compiled: graded,
    entry,
    strictGateDecision,
  }
}

const summarizeEntries = (entries: ReadonlyArray<SelectorQualityEntry>): SelectorQualitySummary => {
  let staticCount = 0
  let dynamicCount = 0
  let warnCount = 0
  let failCount = 0
  const fallbackBreakdown: Record<string, number> = {}

  for (const entry of entries) {
    if (entry.lane === 'static') {
      staticCount += 1
    } else {
      dynamicCount += 1
    }

    if (entry.strictGateVerdict === 'WARN') warnCount += 1
    if (entry.strictGateVerdict === 'FAIL') failCount += 1

    if (entry.fallbackReason) {
      fallbackBreakdown[entry.fallbackReason] = (fallbackBreakdown[entry.fallbackReason] ?? 0) + 1
    }
  }

  return {
    total: entries.length,
    staticCount,
    dynamicCount,
    warnCount,
    failCount,
    fallbackBreakdown,
  }
}

const makeReportId = (moduleId: string, entries: ReadonlyArray<SelectorQualityEntry>): string => {
  const digestInput = entries.map((entry) => ({
    selectorId: entry.selectorId,
    lane: entry.lane,
    producer: entry.producer,
    fallbackReason: entry.fallbackReason,
    strictGateVerdict: entry.strictGateVerdict,
    strictGateRule: entry.strictGateRule,
    readsDigest: entry.readsDigest,
  }))

  return `rq_report_${fnv1a32(stableStringify({ moduleId, entries: digestInput }))}`
}

export interface SelectorQualityReportResult {
  readonly report: SelectorQualityReport
  readonly graded: ReadonlyArray<BuildReadQueryGradeResult<any, any>>
}

export const buildSelectorQualityReport = (args: {
  readonly moduleId: string
  readonly selectors: ReadonlyArray<ReadQueryInput<any, any> | ReadQueryCompiled<any, any>>
  readonly strictGate?: ReadQueryStrictGateConfig
  readonly generatedAt?: string
}): SelectorQualityReportResult => {
  const gradedWithoutReportId = args.selectors.map((input) =>
    gradeReadQueryAtBuild({
      moduleId: args.moduleId,
      input,
      strictGate: args.strictGate,
    }),
  )

  const reportId = makeReportId(
    args.moduleId,
    gradedWithoutReportId.map((it) => it.entry),
  )

  const graded = gradedWithoutReportId.map((result) => {
    const quality = result.compiled.quality
    if (!quality) {
      throw new Error('gradeReadQueryAtBuild must attach quality metadata')
    }

    return {
      ...result,
      compiled: {
        ...result.compiled,
        quality: {
          ...quality,
          reportId,
        },
      },
    }
  })

  const entries = graded.map((it) => it.entry)
  const summary = summarizeEntries(entries)

  const report: SelectorQualityReport = {
    reportId,
    moduleId: args.moduleId,
    generatedAt: args.generatedAt ?? new Date().toISOString(),
    entries,
    summary,
  }

  return {
    report,
    graded,
  }
}

export const hasBuildGateFailure = (report: SelectorQualityReport): boolean => report.summary.failCount > 0
