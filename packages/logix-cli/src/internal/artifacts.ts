import { Effect } from 'effect'

import { writeJsonFile } from './output.js'
import type { ArtifactOutput, JsonValue } from './result.js'
import { makeOversizedInlineValue } from './result.js'
import { stableStringifyJson } from './stableJson.js'

const toBytes = (text: string): number => new TextEncoder().encode(text).length

export const makeArtifactOutput = (args: {
  readonly outDir?: string
  readonly budgetBytes?: number
  readonly fileName: string
  readonly outputKey: string
  readonly kind: string
  readonly value: unknown
  readonly digest?: string
}): Effect.Effect<ArtifactOutput, unknown> =>
  Effect.gen(function* () {
    const outDir = args.outDir
    if (outDir) {
      const file = yield* writeJsonFile(outDir, args.fileName, args.value)
      return {
        outputKey: args.outputKey,
        kind: args.kind,
        ok: true,
        file,
        ...(args.digest ? { digest: args.digest } : null),
      }
    }

    const json = stableStringifyJson(args.value)
    const bytes = toBytes(json)
    const budget = args.budgetBytes
    if (typeof budget === 'number' && Number.isFinite(budget) && budget > 0 && bytes > budget) {
      const truncated = makeOversizedInlineValue({ stableJson: json, bytes, budgetBytes: budget })
      return {
        outputKey: args.outputKey,
        kind: args.kind,
        ok: true,
        inline: truncated.inline,
        truncated: truncated.truncated,
        budgetBytes: truncated.budgetBytes,
        actualBytes: truncated.actualBytes,
        ...(args.digest ? { digest: args.digest } : null),
      }
    }

    return {
      outputKey: args.outputKey,
      kind: args.kind,
      ok: true,
      inline: JSON.parse(json) as JsonValue,
      ...(args.digest ? { digest: args.digest } : null),
      ...(budget ? { budgetBytes: budget, actualBytes: bytes } : null),
    }
  })

