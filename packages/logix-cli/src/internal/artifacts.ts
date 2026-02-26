import { Effect } from 'effect'

import { writeJsonFile } from './output.js'
import type { ArtifactOutput, JsonValue } from './result.js'
import { makeOversizedInlineValue } from './result.js'
import { sha256DigestOfJson, stableStringifyJson } from './stableJson.js'

const toBytes = (text: string): number => new TextEncoder().encode(text).length

export const makeArtifactOutput = (args: {
  readonly outDir?: string
  readonly budgetBytes?: number
  readonly fileName: string
  readonly outputKey: string
  readonly kind: string
  readonly value: unknown
  readonly schemaVersion?: number
  readonly reasonCodes?: ReadonlyArray<string>
  readonly digest?: string
}): Effect.Effect<ArtifactOutput, unknown> =>
  Effect.gen(function* () {
    const schemaVersion = (() => {
      if (typeof args.schemaVersion === 'number' && Number.isFinite(args.schemaVersion) && args.schemaVersion >= 0) {
        return Math.floor(args.schemaVersion)
      }
      if (args.value && typeof args.value === 'object' && 'schemaVersion' in (args.value as Record<string, unknown>)) {
        const sv = (args.value as Record<string, unknown>).schemaVersion
        if (typeof sv === 'number' && Number.isFinite(sv) && sv >= 0) return Math.floor(sv)
      }
      return undefined
    })()

    const reasonCodes = (() => {
      if (Array.isArray(args.reasonCodes) && args.reasonCodes.length > 0) {
        return Array.from(new Set(args.reasonCodes.filter((code): code is string => typeof code === 'string' && code.length > 0))).sort()
      }

      const seen = new Set<string>()
      const visit = (value: unknown, depth: number): void => {
        if (depth > 8 || value === null || value === undefined) return
        if (Array.isArray(value)) {
          for (const item of value) visit(item, depth + 1)
          return
        }
        if (typeof value !== 'object') return
        const record = value as Record<string, unknown>
        const fromCurrent = record.reasonCodes
        if (Array.isArray(fromCurrent)) {
          for (const item of fromCurrent) {
            if (typeof item === 'string' && item.length > 0) seen.add(item)
          }
        }
        for (const item of Object.values(record)) visit(item, depth + 1)
      }
      visit(args.value, 0)
      return seen.size > 0 ? Array.from(seen).sort() : undefined
    })()

    const digest = args.digest ?? sha256DigestOfJson(args.value)

    const outDir = args.outDir
    if (outDir) {
      const file = yield* writeJsonFile(outDir, args.fileName, args.value)
      return {
        outputKey: args.outputKey,
        kind: args.kind,
        ok: true,
        file,
        ...(typeof schemaVersion === 'number' ? { schemaVersion } : null),
        ...(reasonCodes ? { reasonCodes } : null),
        digest,
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
        ...(typeof schemaVersion === 'number' ? { schemaVersion } : null),
        ...(reasonCodes ? { reasonCodes } : null),
        digest,
      }
    }

    return {
      outputKey: args.outputKey,
      kind: args.kind,
      ok: true,
      inline: JSON.parse(json) as JsonValue,
      ...(typeof schemaVersion === 'number' ? { schemaVersion } : null),
      ...(reasonCodes ? { reasonCodes } : null),
      digest,
      ...(budget ? { budgetBytes: budget, actualBytes: bytes } : null),
    }
  })
