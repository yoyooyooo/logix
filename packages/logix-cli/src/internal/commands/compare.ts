import { Effect } from 'effect'
import {
  compareVerificationControlPlaneReports,
  isVerificationControlPlaneReport,
  type JsonValue,
} from '@logixjs/core/ControlPlane'

import { makeArtifactOutput, resolvePrimaryReportOutDir } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { readEvidenceInputs } from '../evidenceInput.js'
import { readJsonFile } from '../output.js'
import { loadProgramEntry } from '../programEntry.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult, makeErrorCommandResult } from '../result.js'

type CompareInvocation = Extract<CliInvocation, { readonly command: 'compare' }>

const coordinate = (inv: CompareInvocation) => ({
  command: 'compare',
  ...(inv.global.argvSnapshot ? { argvSnapshot: inv.global.argvSnapshot } : null),
  beforeReport: inv.beforeReport,
  afterReport: inv.afterReport,
  ...(inv.beforeEvidence ? { beforeEvidence: inv.beforeEvidence } : null),
  ...(inv.afterEvidence ? { afterEvidence: inv.afterEvidence } : null),
  ...(inv.entry ? { entry: inv.entry } : null),
} as const)

const readReport = (ref: string) =>
  readJsonFile(ref).pipe(
    Effect.flatMap((value) =>
      isVerificationControlPlaneReport(value)
        ? Effect.succeed(value)
        : Effect.fail(
            makeCliError({
              code: 'CLI_INVALID_INPUT',
              message: `[Logix][CLI] compare input must be VerificationControlPlaneReport: ${ref}`,
            }),
          ),
    ),
  )

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null) return true
  const kind = typeof value
  if (kind === 'boolean' || kind === 'number' || kind === 'string') return true
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (kind !== 'object') return false
  return Object.values(value as Record<string, unknown>).every(isJsonValue)
}

const toJsonPayload = (value: unknown): JsonValue => {
  const parsed: unknown = JSON.parse(JSON.stringify(value))
  if (isJsonValue(parsed)) return parsed
  throw new Error('[Logix][CLI] value cannot be projected to JsonValue')
}

const makeCompareEvidencePayload = (args: {
  readonly before?: unknown
  readonly after?: unknown
}): JsonValue | undefined => {
  if (!args.before && !args.after) return undefined
  return toJsonPayload({
    ...(args.before ? { before: args.before } : null),
    ...(args.after ? { after: args.after } : null),
  })
}

export const runCompare = (inv: CompareInvocation): Effect.Effect<CommandResult, never> =>
  Effect.gen(function* () {
    if (inv.entry) {
      yield* loadProgramEntry(inv.entry)
    }
    const before = yield* readReport(inv.beforeReport)
    const after = yield* readReport(inv.afterReport)
    const beforeEvidence = yield* readEvidenceInputs({ evidence: inv.beforeEvidence })
    const afterEvidence = yield* readEvidenceInputs({ evidence: inv.afterEvidence })
    const compareEvidence = makeCompareEvidencePayload({
      before: beforeEvidence.evidence,
      after: afterEvidence.evidence,
    })
    const report = compareVerificationControlPlaneReports({
      runId: inv.global.runId,
      before,
      after,
      ...(compareEvidence ? { evidence: compareEvidence } : null),
    })
    const reportWithProvenance = {
      ...report,
      environment: {
        ...(report.environment && typeof report.environment === 'object' && !Array.isArray(report.environment) ? report.environment : {}),
        host: inv.global.host,
        beforeReport: inv.beforeReport,
        afterReport: inv.afterReport,
        ...(inv.entry ? { entry: inv.entry } : null),
      },
    }

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: resolvePrimaryReportOutDir({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          command: 'compare',
          runId: inv.global.runId,
        }),
        budgetBytes: inv.global.budgetBytes,
        fileName: 'compare.report.json',
        outputKey: 'compareReport',
        kind: 'VerificationControlPlaneReport',
        value: toJsonPayload(reportWithProvenance),
      }),
      yield* makeArtifactOutput({
        outDir: undefined,
        budgetBytes: undefined,
        fileName: 'before.report-ref.json',
        outputKey: 'beforeReportRef',
        kind: 'VerificationControlPlaneReportRef',
        value: {
          ref: inv.beforeReport,
          role: 'before',
        },
        schemaVersion: 1,
      }),
      yield* makeArtifactOutput({
        outDir: undefined,
        budgetBytes: undefined,
        fileName: 'after.report-ref.json',
        outputKey: 'afterReportRef',
        kind: 'VerificationControlPlaneReportRef',
        value: {
          ref: inv.afterReport,
          role: 'after',
        },
        schemaVersion: 1,
      }),
    ]

    if (report.verdict === 'PASS') {
      return makeCommandResult({
        runId: inv.global.runId,
        command: 'compare',
        ok: true,
        inputCoordinate: coordinate(inv),
        primaryReportOutputKey: 'compareReport',
        artifacts,
      })
    }

    return makeCommandResult({
      runId: inv.global.runId,
      command: 'compare',
      ok: false,
      inputCoordinate: coordinate(inv),
      primaryReportOutputKey: 'compareReport',
      artifacts,
      error: {
        code: report.errorCode ?? 'CLI_VIOLATION_COMPARE',
        message: report.summary,
      },
    })
  }).pipe(
    Effect.catch((cause) =>
      Effect.succeed(
        makeErrorCommandResult({
          runId: inv.global.runId,
          command: 'compare',
          inputCoordinate: coordinate(inv),
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
