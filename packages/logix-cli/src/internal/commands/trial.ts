import { Effect } from 'effect'
import * as Runtime from '@logixjs/core/Runtime'

import { makeArtifactOutput, resolvePrimaryReportOutDir } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import { makeEvidenceInputArtifacts, readEvidenceInputs } from '../evidenceInput.js'
import { loadProgramEntry } from '../programEntry.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult, makeErrorCommandResult } from '../result.js'
import { makeReflectionManifestArtifact } from '../reflectionManifestArtifact.js'
import { makeSourceArtifactOutput } from '../sourceArtifact.js'

type TrialInvocation = Extract<CliInvocation, { readonly command: 'trial' }>

const toJsonPayload = (value: unknown): any => JSON.parse(JSON.stringify(value))

const coordinate = (inv: TrialInvocation) => ({
  command: 'trial',
  ...(inv.global.argvSnapshot ? { argvSnapshot: inv.global.argvSnapshot } : null),
  entry: inv.entry,
  trialMode: inv.trialMode,
  diagnosticsLevel: inv.diagnosticsLevel,
  includeTrace: inv.includeTrace,
  ...(typeof inv.maxEvents === 'number' ? { maxEvents: inv.maxEvents } : null),
  ...(typeof inv.timeoutMs === 'number' ? { timeoutMs: inv.timeoutMs } : null),
  ...(Object.keys(inv.config).length > 0 ? { config: inv.config } : null),
  ...(inv.scenario ? { scenario: inv.scenario } : null),
  ...(inv.evidence ? { evidence: inv.evidence } : null),
  ...(inv.selection ? { selection: inv.selection } : null),
} as const)

export const runTrial = (inv: TrialInvocation): Effect.Effect<CommandResult, never> =>
  Effect.gen(function* () {
    if (inv.trialMode === 'scenario' || inv.scenario) {
      return makeErrorCommandResult({
        runId: inv.global.runId,
        command: 'trial',
        inputCoordinate: coordinate(inv),
        error: asSerializableErrorSummary(
          makeCliError({
            code: inv.trialMode === 'scenario' && !inv.scenario ? 'CLI_SCENARIO_INPUT_REQUIRED' : 'CLI_SCENARIO_NOT_IMPLEMENTED',
            message:
              inv.trialMode === 'scenario' && !inv.scenario
                ? 'trial --mode scenario 需要 --scenario <file>'
                : 'trial scenario mode requires a core-owned scenario executor before CLI can route it.',
          }),
        ),
      })
    }

    const evidenceInputs = yield* readEvidenceInputs({
      evidence: inv.evidence,
      selection: inv.selection,
    })
    const program = yield* loadProgramEntry(inv.entry)
    const report = yield* Effect.scoped(
      Runtime.trial(program as any, {
        runId: inv.global.runId,
        buildEnv: {
          hostKind: inv.global.host,
          config: inv.config,
        },
        diagnosticsLevel: inv.diagnosticsLevel,
        ...(typeof inv.maxEvents === 'number' ? { maxEvents: inv.maxEvents } : null),
        ...(typeof inv.timeoutMs === 'number' ? { timeoutMs: inv.timeoutMs } : null),
      } as any),
    )
    const reportWithProvenance = {
      ...report,
      environment: {
        ...(report.environment && typeof report.environment === 'object' && !Array.isArray(report.environment) ? report.environment : {}),
        host: inv.global.host,
        entry: inv.entry,
        trialMode: inv.trialMode,
        ...(inv.scenario ? { scenario: inv.scenario } : null),
        ...(evidenceInputs.evidence ? { evidence: evidenceInputs.evidence } : null),
        ...(evidenceInputs.selection ? { selection: evidenceInputs.selection } : null),
      },
    }

    const outDir = resolvePrimaryReportOutDir({
      outDir: inv.global.outDir,
      budgetBytes: inv.global.budgetBytes,
      command: 'trial',
      runId: inv.global.runId,
    })

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'trial.report.json',
        outputKey: 'trialReport',
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
        command: 'trial',
        ok: true,
        inputCoordinate: coordinate(inv),
        primaryReportOutputKey: 'trialReport',
        artifacts,
      })
    }

    return makeCommandResult({
      runId: inv.global.runId,
      command: 'trial',
      ok: false,
      inputCoordinate: coordinate(inv),
      primaryReportOutputKey: 'trialReport',
      artifacts,
      error: {
        code: report.errorCode ?? 'CLI_VIOLATION_TRIAL',
        message: report.summary,
      },
    })
  }).pipe(
    Effect.catch((cause) =>
      Effect.succeed(
        makeErrorCommandResult({
          runId: inv.global.runId,
          command: 'trial',
          inputCoordinate: coordinate(inv),
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
