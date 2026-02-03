import { Effect } from 'effect'
import * as AnchorEngine from '@logixjs/anchor-engine'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type AnchorIndexInvocation = Extract<CliInvocation, { readonly command: 'anchor.index' }>

export const runAnchorIndex = (inv: AnchorIndexInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const tsconfig = inv.global.tsconfig

    const index = yield* AnchorEngine.Parser.buildAnchorIndex({
      repoRoot: inv.repoRoot,
      ...(tsconfig ? { tsconfig } : null),
    })

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'anchor.index.json',
        outputKey: 'anchorIndex',
        kind: 'AnchorIndex',
        value: index,
      }),
    ]

    return makeCommandResult({
      runId,
      command: 'anchor.index',
      ok: true,
      artifacts,
    })
  }).pipe(
    Effect.catchAllCause((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'anchor.index',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
