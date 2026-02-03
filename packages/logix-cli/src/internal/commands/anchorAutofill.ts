import { Effect } from 'effect'
import * as AnchorEngine from '@logixjs/anchor-engine'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type AnchorAutofillInvocation = Extract<CliInvocation, { readonly command: 'anchor.autofill' }>

export const runAnchorAutofill = (inv: AnchorAutofillInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId
  const mode = inv.global.mode ?? 'report'

  return Effect.gen(function* () {
    const tsconfig = inv.global.tsconfig

    const index = yield* AnchorEngine.Parser.buildAnchorIndex({
      repoRoot: inv.repoRoot,
      ...(tsconfig ? { tsconfig } : null),
    })

    const out = yield* AnchorEngine.Autofill.autofillAnchors({
      repoRoot: inv.repoRoot,
      mode,
      runId,
      anchorIndex: index,
    })

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'patch.plan.json',
        outputKey: 'patchPlan',
        kind: 'PatchPlan',
        value: out.patchPlan,
      }),
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'autofill.report.json',
        outputKey: 'autofillReport',
        kind: 'AutofillReport',
        value: out.report,
      }),
      ...(out.writeBackResult
        ? [
            yield* makeArtifactOutput({
              outDir: inv.global.outDir,
              budgetBytes: inv.global.budgetBytes,
              fileName: 'writeback.result.json',
              outputKey: 'writeBackResult',
              kind: 'WriteBackResult',
              value: out.writeBackResult,
            }),
          ]
        : []),
    ]

    const writeFailed = mode === 'write' && (out.writeBackResult?.failed.length ?? 0) > 0
    if (!writeFailed) {
      return makeCommandResult({
        runId,
        command: 'anchor.autofill',
        mode,
        ok: true,
        artifacts,
      })
    }

    return makeCommandResult({
      runId,
      command: 'anchor.autofill',
      mode,
      ok: false,
      artifacts,
      error: asSerializableErrorSummary(
        makeCliError({
          code: 'CLI_VIOLATION_ANCHOR_AUTOFILL',
          message: '[Logix][CLI] anchor autofill: write-back 未完全成功',
        }),
      ),
    })
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'anchor.autofill',
          mode,
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
