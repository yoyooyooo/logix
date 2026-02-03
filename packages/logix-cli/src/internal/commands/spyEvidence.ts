import { Effect } from 'effect'
import * as Logix from '@logixjs/core'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import { loadProgramModule } from '../loadProgramModule.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import { silentLoggerLayer } from '../silentLogger.js'

type SpyEvidenceInvocation = Extract<CliInvocation, { readonly command: 'spy.evidence' }>

export const runSpyEvidence = (inv: SpyEvidenceInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const maxUsedServices = inv.maxUsedServices
    const maxRawMode = inv.maxRawMode
    const trialRunTimeoutMs = inv.timeoutMs

    const root = yield* loadProgramModule(inv.entry, { host: inv.global.host })

    const report = yield* Logix.Observability.runLoaderSpy(root as any, {
      runId,
      budgets:
        typeof maxUsedServices === 'number' || typeof maxRawMode === 'number'
          ? {
              ...(typeof maxUsedServices === 'number' ? { maxUsedServices } : null),
              ...(typeof maxRawMode === 'number' ? { maxRawMode } : null),
            }
          : undefined,
      trialRun:
        typeof trialRunTimeoutMs === 'number'
          ? { trialRunTimeoutMs, layer: silentLoggerLayer as any }
          : { layer: silentLoggerLayer as any },
    })

    const artifacts: ArtifactOutput[] = []
    artifacts.push(
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'spy.evidence.report.json',
        outputKey: 'spyEvidenceReport',
        kind: 'SpyEvidenceReport',
        value: report,
      }),
    )

    // report-only: always ok unless CLI itself fails.
    return makeCommandResult({
      runId,
      command: 'spy.evidence',
      ok: true,
      artifacts,
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'spy.evidence',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
