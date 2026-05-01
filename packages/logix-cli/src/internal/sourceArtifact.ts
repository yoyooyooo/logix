import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'

import { Effect } from 'effect'

import type { EntryRef } from './args.js'
import { makeArtifactOutput } from './artifacts.js'
import { makeCliError } from './errors.js'
import type { ArtifactOutput } from './result.js'

export interface CliSourceArtifact {
  readonly schemaVersion: 1
  readonly kind: 'CliSourceArtifact'
  readonly producer: 'cli-source'
  readonly authority: 'provenance-only'
  readonly sourceRef: string
  readonly entry: EntryRef
  readonly sourceDigest: string
}

const digestBytes = (bytes: Uint8Array): string => `sha256:${createHash('sha256').update(bytes).digest('hex')}`

export const makeSourceArtifactOutput = (args: {
  readonly entry: EntryRef
  readonly outDir?: string
  readonly budgetBytes?: number
}): Effect.Effect<ArtifactOutput, unknown> =>
  Effect.gen(function* () {
    const bytes = yield* Effect.tryPromise({
      try: () => fs.readFile(args.entry.modulePath),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_IO_ERROR',
          message: `[Logix][CLI] 无法读取 source artifact：${args.entry.modulePath}`,
          cause,
        }),
    })

    const value: CliSourceArtifact = {
      schemaVersion: 1,
      kind: 'CliSourceArtifact',
      producer: 'cli-source',
      authority: 'provenance-only',
      sourceRef: args.entry.modulePath,
      entry: args.entry,
      sourceDigest: digestBytes(bytes),
    }

    return yield* makeArtifactOutput({
      outDir: args.outDir,
      budgetBytes: args.budgetBytes,
      fileName: 'source.artifact.json',
      outputKey: 'sourceArtifact',
      kind: 'CliSourceArtifact',
      value,
      schemaVersion: 1,
    })
  })
