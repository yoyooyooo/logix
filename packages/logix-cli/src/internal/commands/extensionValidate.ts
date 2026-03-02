import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import { loadExtensionManifestFromFile } from '../extension-host/stateFile.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type ExtensionValidateInvocation = Extract<CliInvocation, { readonly command: 'extension.validate' }>

type ExtensionManifestCheckV1 = {
  readonly schemaVersion: 1
  readonly kind: 'ExtensionManifestCheck'
  readonly manifestFile: string
  readonly manifestDigest: string
  readonly extensionId: string
  readonly revision: string
  readonly runtime: {
    readonly apiVersion: string
    readonly entry: string
    readonly hooks: ReadonlyArray<string>
  }
}

export const runExtensionValidate = (inv: ExtensionValidateInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const loaded = yield* Effect.tryPromise({
      try: () => loadExtensionManifestFromFile(inv.manifestPath),
      catch: (cause) => cause,
    })

    const report: ExtensionManifestCheckV1 = {
      schemaVersion: 1,
      kind: 'ExtensionManifestCheck',
      manifestFile: loaded.manifestFile,
      manifestDigest: loaded.manifestDigest,
      extensionId: loaded.manifest.extensionId,
      revision: loaded.manifest.revision,
      runtime: {
        apiVersion: loaded.manifest.runtime.apiVersion,
        entry: loaded.manifest.runtime.entry,
        hooks: loaded.manifest.runtime.hooks ?? [],
      },
    }

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'extension.validate.report.json',
        outputKey: 'extensionManifestCheck',
        kind: 'ExtensionManifestCheck',
        value: report,
      }),
    ]

    return makeCommandResult({
      runId,
      command: 'extension.validate',
      ok: true,
      artifacts,
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'extension.validate',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
