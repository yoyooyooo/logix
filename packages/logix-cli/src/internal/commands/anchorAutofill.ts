import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary, makeCliError } from '../errors.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type AnchorAutofillInvocation = Extract<CliInvocation, { readonly command: 'anchor.autofill' }>
type AnchorAutofillMode = 'report' | 'write'

type AnchorIndex = {
  readonly schemaVersion: 1
  readonly repoRoot: string
  readonly tsconfig: string | null
}

type PatchPlan = {
  readonly schemaVersion: 1
  readonly runId: string
  readonly mode: AnchorAutofillMode
  readonly patches: ReadonlyArray<never>
}

type AutofillReport = {
  readonly schemaVersion: 1
  readonly runId: string
  readonly mode: AnchorAutofillMode
  readonly repoRoot: string
  readonly summary: {
    readonly candidates: number
    readonly applied: number
    readonly failed: number
  }
}

type WriteBackResult = {
  readonly applied: ReadonlyArray<never>
  readonly failed: ReadonlyArray<never>
}

type AutofillOutput = {
  readonly patchPlan: PatchPlan
  readonly report: AutofillReport
  readonly writeBackResult?: WriteBackResult
}

const buildAnchorIndex = (args: {
  readonly repoRoot: string
  readonly tsconfig?: string
}): Effect.Effect<AnchorIndex, never> =>
  Effect.succeed({
    schemaVersion: 1,
    repoRoot: args.repoRoot,
    tsconfig: args.tsconfig ?? null,
  })

const autofillAnchors = (args: {
  readonly repoRoot: string
  readonly mode: AnchorAutofillMode
  readonly runId: string
  readonly anchorIndex: AnchorIndex
}): Effect.Effect<AutofillOutput, never> =>
  Effect.succeed({
    patchPlan: {
      schemaVersion: 1,
      runId: args.runId,
      mode: args.mode,
      patches: [],
    },
    report: {
      schemaVersion: 1,
      runId: args.runId,
      mode: args.mode,
      repoRoot: args.anchorIndex.repoRoot,
      summary: {
        candidates: 0,
        applied: 0,
        failed: 0,
      },
    },
    ...(args.mode === 'write'
      ? {
          writeBackResult: {
            applied: [],
            failed: [],
          } satisfies WriteBackResult,
        }
      : null),
  })

export const runAnchorAutofill = (inv: AnchorAutofillInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId
  const mode = (inv.global.mode ?? 'report') as AnchorAutofillMode

  return Effect.gen(function* () {
    const tsconfig = inv.global.tsconfig

    const index = yield* buildAnchorIndex({
      repoRoot: inv.repoRoot,
      ...(tsconfig ? { tsconfig } : null),
    })

    const out = yield* autofillAnchors({
      repoRoot: inv.repoRoot,
      mode,
      runId,
      anchorIndex: index,
    })

    const autofillReasonCodes =
      mode === 'write'
        ? (out.writeBackResult?.failed.length ?? 0) > 0
          ? ['AUTOFILL_WRITE_FAILED']
          : ['AUTOFILL_WRITE_APPLIED']
        : ['AUTOFILL_REPORT_ONLY']

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
        reasonCodes: autofillReasonCodes,
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
    Effect.catchCause((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'anchor.autofill',
          mode,
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      )),
  )
}
