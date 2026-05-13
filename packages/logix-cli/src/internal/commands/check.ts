import { Effect } from 'effect'
import * as Runtime from '@logixjs/core/Runtime'

import { makeArtifactOutput, resolvePrimaryReportOutDir } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import { makeEvidenceInputArtifacts, readEvidenceInputs } from '../evidenceInput.js'
import { loadProgramEntry } from '../programEntry.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult, makeErrorCommandResult } from '../result.js'
import { makeReflectionManifestArtifact } from '../reflectionManifestArtifact.js'
import { makeSourceArtifactOutput } from '../sourceArtifact.js'

type CheckInvocation = Extract<CliInvocation, { readonly command: 'check' }>

const toJsonPayload = (value: unknown): any => JSON.parse(JSON.stringify(value))

const coordinate = (inv: CheckInvocation) => ({
  command: 'check',
  ...(inv.global.argvSnapshot ? { argvSnapshot: inv.global.argvSnapshot } : null),
  entry: inv.entry,
  ...(inv.evidence ? { evidence: inv.evidence } : null),
  ...(inv.selection ? { selection: inv.selection } : null),
} as const)

export const runCheck = (inv: CheckInvocation): Effect.Effect<CommandResult, never> =>
  Effect.gen(function* () {
    const evidenceInputs = yield* readEvidenceInputs({
      evidence: inv.evidence,
      selection: inv.selection,
    })
    const program = yield* loadProgramEntry(inv.entry)
    const report = yield* Runtime.check(program as any, { runId: inv.global.runId })
    const reportWithProvenance = {
      ...report,
      environment: {
        ...(report.environment && typeof report.environment === 'object' && !Array.isArray(report.environment) ? report.environment : {}),
        host: inv.global.host,
        entry: inv.entry,
        ...(evidenceInputs.evidence ? { evidence: evidenceInputs.evidence } : null),
        ...(evidenceInputs.selection ? { selection: evidenceInputs.selection } : null),
      },
    }

    const outDir = resolvePrimaryReportOutDir({
      outDir: inv.global.outDir,
      budgetBytes: inv.global.budgetBytes,
      command: 'check',
      runId: inv.global.runId,
    })

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'check.report.json',
        outputKey: 'checkReport',
        kind: 'VerificationControlPlaneReport',
        value: toJsonPayload(reportWithProvenance),
      }),
      yield* makeSourceArtifactOutput({
        outDir,
        budgetBytes: inv.global.budgetBytes,
        entry: inv.entry,
      }),
      yield* makeReflectionManifestArtifact({
        outDir,
        budgetBytes: inv.global.budgetBytes,
        program,
      }),
      ...(yield* makeEvidenceInputArtifacts({
        inputs: evidenceInputs,
        outDir,
        budgetBytes: inv.global.budgetBytes,
      })),
    ]

    if (report.verdict === 'PASS') {
      return makeCommandResult({
        runId: inv.global.runId,
        command: 'check',
        ok: true,
        inputCoordinate: coordinate(inv),
        primaryReportOutputKey: 'checkReport',
        artifacts,
      })
    }

    return makeCommandResult({
      runId: inv.global.runId,
      command: 'check',
      ok: false,
      inputCoordinate: coordinate(inv),
      primaryReportOutputKey: 'checkReport',
      artifacts,
      error: {
        code: report.errorCode ?? 'CLI_VIOLATION_CHECK',
        message: report.summary,
      },
    })
  }).pipe(
    Effect.catch((cause) =>
      Effect.succeed(
        makeErrorCommandResult({
          runId: inv.global.runId,
          command: 'check',
          inputCoordinate: coordinate(inv),
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
