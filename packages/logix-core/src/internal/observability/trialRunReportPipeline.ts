import type { SerializableErrorSummary } from '../runtime/core/errorSummary.js'
import { toSerializableErrorSummary } from '../runtime/core/errorSummary.js'

export type TrialRunReExportField = 'manifest' | 'staticIr' | 'artifacts' | 'evidence'
export type TrialRunReExportStage = TrialRunReExportField | 'budget'
export type TrialRunReExportStatus = 'ok' | 'partial' | 'recovered' | 'failed'

export interface TrialRunReportBudgets {
  readonly maxBytes?: number
}

export interface TrialRunReExportIssue {
  readonly stage: TrialRunReExportStage
  readonly code: string
  readonly message: string
  readonly hint?: string
  readonly recoverable: boolean
}

export interface TrialRunReExportCollection<Manifest, StaticIr, Artifacts, Evidence> {
  readonly manifest?: Manifest
  readonly staticIr?: StaticIr
  readonly artifacts?: Artifacts
  readonly evidence?: Evidence
  readonly issues: ReadonlyArray<TrialRunReExportIssue>
}

export interface TrialRunReportBase<Environment> {
  readonly runId: string
  readonly ok: boolean
  readonly environment?: Environment
  readonly summary?: unknown
  readonly error?: SerializableErrorSummary
}

export type TrialRunReportShape<Manifest, StaticIr, Artifacts, Environment, Evidence> = TrialRunReportBase<Environment> & {
  readonly manifest?: Manifest
  readonly staticIr?: StaticIr
  readonly artifacts?: Artifacts
  readonly evidence?: Evidence
}

const dropOrder: ReadonlyArray<TrialRunReExportField> = ['evidence', 'artifacts', 'staticIr', 'manifest']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asPositiveInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.floor(value)
  return n > 0 ? n : undefined
}

const utf8ByteLength = (value: unknown): number => {
  const json = JSON.stringify(value) ?? 'null'
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(json).length
  }
  return json.length
}

const issueFromCause = (args: {
  readonly stage: TrialRunReExportStage
  readonly code: string
  readonly cause: unknown
  readonly hint?: string
}): TrialRunReExportIssue => {
  const err = toSerializableErrorSummary(args.cause).errorSummary
  return {
    stage: args.stage,
    code: args.code,
    message: err.message,
    hint: args.hint ?? err.hint,
    recoverable: true,
  }
}

const collectSafely = <A>(args: {
  readonly stage: TrialRunReExportStage
  readonly code: string
  readonly hint?: string
  readonly issues: Array<TrialRunReExportIssue>
  readonly collect: () => A | undefined
}): A | undefined => {
  try {
    return args.collect()
  } catch (cause) {
    args.issues.push(
      issueFromCause({
        stage: args.stage,
        code: args.code,
        cause,
        hint: args.hint,
      }),
    )
    return undefined
  }
}

export const collectTrialRunReExport = <Manifest, StaticIr, Artifacts, Evidence>(args: {
  readonly collectManifest: () => Manifest | undefined
  readonly collectStaticIr: () => StaticIr | undefined
  readonly collectArtifacts: (input: { readonly manifest?: Manifest; readonly staticIr?: StaticIr }) => Artifacts | undefined
  readonly collectEvidence: () => Evidence | undefined
}): TrialRunReExportCollection<Manifest, StaticIr, Artifacts, Evidence> => {
  const issues: Array<TrialRunReExportIssue> = []

  const evidence = collectSafely({
    stage: 'evidence',
    code: 'EvidenceExportFailed',
    hint: 'Evidence export failed; report keeps runtime status and drops evidence payload.',
    issues,
    collect: args.collectEvidence,
  })

  const manifest = collectSafely({
    stage: 'manifest',
    code: 'ManifestExportFailed',
    hint: 'Manifest export failed; report keeps runtime status and continues with remaining artifacts.',
    issues,
    collect: args.collectManifest,
  })

  const staticIr = collectSafely({
    stage: 'staticIr',
    code: 'StaticIrExportFailed',
    hint: 'Static IR export failed; report keeps runtime status and continues with remaining artifacts.',
    issues,
    collect: args.collectStaticIr,
  })

  const artifacts = collectSafely({
    stage: 'artifacts',
    code: 'ArtifactExportFailed',
    hint: 'Artifact export failed; report keeps runtime status and falls back to base summary/evidence.',
    issues,
    collect: () =>
      args.collectArtifacts({
        manifest,
        staticIr,
      }),
  })

  issues.sort((a, b) => (a.stage < b.stage ? -1 : a.stage > b.stage ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0))

  return {
    manifest,
    staticIr,
    artifacts,
    evidence,
    issues,
  }
}

const mergeSummaryWithReExport = (args: {
  readonly baseSummary: unknown
  readonly status: TrialRunReExportStatus
  readonly issues: ReadonlyArray<TrialRunReExportIssue>
  readonly maxEvents?: number
  readonly maxBytes?: number
  readonly dropped?: ReadonlyArray<TrialRunReExportField>
  readonly originalBytes?: number
  readonly finalBytes?: number
}): unknown => {
  const reExport = {
    status: args.status,
    budgets: {
      ...(typeof args.maxEvents === 'number' && Number.isFinite(args.maxEvents) ? { maxEvents: Math.floor(args.maxEvents) } : {}),
      ...(typeof args.maxBytes === 'number' && Number.isFinite(args.maxBytes) ? { maxBytes: Math.floor(args.maxBytes) } : {}),
    },
    issues: args.issues,
    ...(args.dropped && args.dropped.length > 0 ? { dropped: Array.from(args.dropped) } : {}),
    ...(typeof args.originalBytes === 'number' ? { originalBytes: args.originalBytes } : {}),
    ...(typeof args.finalBytes === 'number' ? { finalBytes: args.finalBytes } : {}),
  }

  if (isRecord(args.baseSummary)) {
    const prevLogix = isRecord(args.baseSummary.__logix) ? args.baseSummary.__logix : {}
    return {
      ...args.baseSummary,
      __logix: {
        ...prevLogix,
        reExport,
      },
    }
  }

  return {
    __logix: {
      reExport,
    },
  }
}

const fitReportByBudget = <Report extends { readonly runId: string; readonly ok: boolean }>(
  report: Report,
  maxBytes: number | undefined,
): {
  readonly adjusted: Report
  readonly dropped: ReadonlyArray<TrialRunReExportField>
  readonly originalBytes?: number
  readonly finalBytes?: number
  readonly recovered: boolean
  readonly failed: boolean
} => {
  if (maxBytes === undefined) {
    return {
      adjusted: report,
      dropped: [],
      recovered: false,
      failed: false,
    }
  }

  const originalBytes = utf8ByteLength(report)
  if (originalBytes <= maxBytes) {
    return {
      adjusted: report,
      dropped: [],
      originalBytes,
      finalBytes: originalBytes,
      recovered: false,
      failed: false,
    }
  }

  const dropped: Array<TrialRunReExportField> = []
  const working: Record<string, unknown> = { ...(report as unknown as Record<string, unknown>) }

  for (const field of dropOrder) {
    if (working[field] === undefined) continue
    delete working[field]
    dropped.push(field)
    const bytes = utf8ByteLength(working)
    if (bytes <= maxBytes) {
      return {
        adjusted: working as Report,
        dropped,
        originalBytes,
        finalBytes: bytes,
        recovered: true,
        failed: false,
      }
    }
  }

  const finalBytes = utf8ByteLength(working)

  return {
    adjusted: working as Report,
    dropped,
    originalBytes,
    finalBytes,
    recovered: false,
    failed: true,
  }
}

const dedupeIssues = (issues: ReadonlyArray<TrialRunReExportIssue>): ReadonlyArray<TrialRunReExportIssue> => {
  const out: TrialRunReExportIssue[] = []
  const seen = new Set<string>()
  for (const issue of issues) {
    const key = `${issue.stage}:${issue.code}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(issue)
  }
  out.sort((a, b) => (a.stage < b.stage ? -1 : a.stage > b.stage ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0))
  return out
}

export const summarizeTrialRunReExport = (args: {
  readonly baseSummary: unknown
  readonly issues: ReadonlyArray<TrialRunReExportIssue>
  readonly maxEvents?: number
  readonly maxBytes?: number
  readonly dropped?: ReadonlyArray<TrialRunReExportField>
  readonly originalBytes?: number
  readonly finalBytes?: number
  readonly status: TrialRunReExportStatus
}): unknown =>
  mergeSummaryWithReExport({
    baseSummary: args.baseSummary,
    status: args.status,
    issues: args.issues,
    maxEvents: args.maxEvents,
    maxBytes: args.maxBytes,
    dropped: args.dropped,
    originalBytes: args.originalBytes,
    finalBytes: args.finalBytes,
  })

export const reExportTrialRunReport = <Manifest, StaticIr, Artifacts, Environment, Evidence>(args: {
  readonly base: TrialRunReportBase<Environment>
  readonly collection: TrialRunReExportCollection<Manifest, StaticIr, Artifacts, Evidence>
  readonly maxEvents?: number
  readonly budgets?: TrialRunReportBudgets
}): TrialRunReportShape<Manifest, StaticIr, Artifacts, Environment, Evidence> => {
  const maxBytes = asPositiveInt(args.budgets?.maxBytes)

  const draft: TrialRunReportShape<Manifest, StaticIr, Artifacts, Environment, Evidence> = {
    runId: args.base.runId,
    ok: args.base.ok,
    manifest: args.collection.manifest,
    staticIr: args.collection.staticIr,
    artifacts: args.collection.artifacts,
    environment: args.base.environment,
    evidence: args.collection.evidence,
    summary: args.base.summary,
    error: args.base.error,
  }

  const budgetFit = fitReportByBudget(draft, maxBytes)

  const issues: Array<TrialRunReExportIssue> = [...args.collection.issues]

  if (maxBytes !== undefined && typeof budgetFit.originalBytes === 'number' && budgetFit.originalBytes > maxBytes) {
    issues.push(
      budgetFit.failed
        ? {
            stage: 'budget',
            code: 'Oversized',
            message: `[Logix] TrialRunReport exceeded maxBytes (${budgetFit.originalBytes} > ${maxBytes})`,
            hint: 'Reduce maxEvents or budgets.maxBytes, or split manifest/evidence artifacts in CI.',
            recoverable: false,
          }
        : {
            stage: 'budget',
            code: 'ReExportBudgetRecovered',
            message: `[Logix] TrialRunReport exceeded maxBytes (${budgetFit.originalBytes} > ${maxBytes}) and was slimmed by dropping heavy exports.`,
            hint: 'Increase budgets.maxBytes to retain more reflection/evidence payloads.',
            recoverable: true,
          },
    )
  }

  const issuesDeduped = dedupeIssues(issues)

  const status: TrialRunReExportStatus = budgetFit.failed
    ? 'failed'
    : budgetFit.recovered
      ? 'recovered'
      : issuesDeduped.length > 0
        ? 'partial'
        : 'ok'

  const summary = summarizeTrialRunReExport({
    baseSummary: args.base.summary,
    issues: issuesDeduped,
    maxEvents: args.maxEvents,
    maxBytes,
    dropped: budgetFit.dropped,
    originalBytes: budgetFit.originalBytes,
    finalBytes: budgetFit.finalBytes,
    status,
  })

  let error = args.base.error
  if (budgetFit.failed && !error) {
    error = {
      message: `[Logix] TrialRunReport exceeded maxBytes (${budgetFit.originalBytes ?? 'unknown'} > ${maxBytes})`,
      code: 'Oversized',
      hint: 'Reduce maxEvents or budgets.maxBytes, or split manifest/evidence artifacts in CI.',
    }
  }

  const report = {
    ...budgetFit.adjusted,
    ok: budgetFit.failed ? false : args.base.ok,
    summary,
    ...(error ? { error } : {}),
  } satisfies TrialRunReportShape<Manifest, StaticIr, Artifacts, Environment, Evidence>

  if (maxBytes !== undefined) {
    const serializedBytes = utf8ByteLength(report)
    if (serializedBytes > maxBytes) {
      const overflowIssue: TrialRunReExportIssue = {
        stage: 'budget',
        code: 'Oversized',
        message: `[Logix] TrialRunReport exceeded maxBytes (${serializedBytes} > ${maxBytes})`,
        hint: 'Reduce maxEvents or budgets.maxBytes, or split manifest/evidence artifacts in CI.',
        recoverable: false,
      }

      const fallbackIssues = dedupeIssues([...issuesDeduped, overflowIssue])

      const fallbackSummary = summarizeTrialRunReExport({
        baseSummary: undefined,
        issues: fallbackIssues,
        maxEvents: args.maxEvents,
        maxBytes,
        dropped: ['manifest', 'staticIr', 'artifacts', 'evidence'],
        originalBytes: budgetFit.originalBytes ?? serializedBytes,
        finalBytes: serializedBytes,
        status: 'failed',
      })

      const fallbackError: SerializableErrorSummary = error ?? {
        message: `[Logix] TrialRunReport exceeded maxBytes (${serializedBytes} > ${maxBytes})`,
        code: 'Oversized',
        hint: 'Reduce maxEvents or budgets.maxBytes, or split manifest/evidence artifacts in CI.',
      }

      return {
        runId: args.base.runId,
        ok: false,
        environment: args.base.environment,
        summary: fallbackSummary,
        error: fallbackError,
      }
    }
  }

  return report
}
