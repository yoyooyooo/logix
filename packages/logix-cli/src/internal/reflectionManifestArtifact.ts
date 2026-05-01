import { Effect } from 'effect'
import * as CoreReflection from '@logixjs/core/repo-internal/reflection-api'

import { makeArtifactOutput } from './artifacts.js'
import type { ArtifactOutput } from './result.js'

const toJsonPayload = (value: unknown): any => JSON.parse(JSON.stringify(value))

export const makeReflectionManifestArtifact = (args: {
  readonly outDir?: string
  readonly budgetBytes?: number
  readonly program: unknown
}): Effect.Effect<ArtifactOutput, unknown> =>
  Effect.gen(function* () {
    const manifest = CoreReflection.extractRuntimeReflectionManifest(args.program as any)
    return yield* makeArtifactOutput({
      outDir: args.outDir,
      budgetBytes: args.budgetBytes,
      fileName: 'reflection.manifest.json',
      outputKey: 'reflectionManifest',
      kind: 'RuntimeReflectionManifest',
      value: toJsonPayload(manifest),
      digest: manifest.digest,
    })
  })
