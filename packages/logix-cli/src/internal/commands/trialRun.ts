import { Effect } from 'effect'
import * as Logix from '@logixjs/core'

import { makeArtifactOutput } from '../artifacts.js'
import { silentLoggerLayer } from '../silentLogger.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import { loadProgramModule } from '../loadProgramModule.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

const stripEvidenceFromTrialRunReport = (report: unknown): unknown => {
  if (!report || typeof report !== 'object') return report
  const any: any = report as any
  const { evidence: _evidence, ...rest } = any
  return rest
}

type TrialRunInvocation = Extract<CliInvocation, { readonly command: 'trialrun' }>

export const runTrialRun = (inv: TrialRunInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const diagnosticsLevel = inv.diagnosticsLevel
    const maxEvents = inv.maxEvents
    const trialRunTimeoutMs = inv.timeoutMs
    const includeTrace = inv.includeTrace
    const config = inv.config

    const root = yield* loadProgramModule(inv.entry, { host: inv.global.host })

    const report = yield* Logix.Observability.trialRunModule(root as any, {
      runId,
      source: { host: 'node', label: 'logix-cli:trialrun' },
      buildEnv: { hostKind: 'node', config: Object.keys(config).length > 0 ? config : undefined },
      layer: silentLoggerLayer,
      diagnosticsLevel,
      ...(maxEvents ? { maxEvents } : null),
      ...(trialRunTimeoutMs ? { trialRunTimeoutMs } : null),
    })

    const artifacts: ArtifactOutput[] = []
    const reportNoTrace = stripEvidenceFromTrialRunReport(report)
    artifacts.push(
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'trialrun.report.json',
        outputKey: 'trialRunReport',
        kind: 'TrialRunReport',
        value: reportNoTrace,
      }),
    )

    if (includeTrace && (report as any)?.evidence) {
      artifacts.push(
        yield* makeArtifactOutput({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          fileName: 'trace.slim.json',
          outputKey: 'traceSlim',
          kind: 'EvidencePackage',
          value: (report as any).evidence,
        }),
      )
    }

    const ok = (report as any)?.ok === true
    const error = ok ? undefined : asSerializableErrorSummary((report as any)?.error ?? new Error('[Logix][CLI] trialrun failed'))

    return makeCommandResult({
      runId,
      command: 'trialrun',
      ok,
      artifacts,
      ...(ok ? null : { error }),
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'trialrun',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
