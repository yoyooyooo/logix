import path from 'node:path'

import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import {
  buildExtensionControlState,
  loadExtensionManifestFromFile,
  readExtensionControlStateFile,
  writeExtensionControlStateFile,
  type ExtensionControlStateV1,
} from '../extension-host/stateFile.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type ExtensionReloadInvocation = Extract<CliInvocation, { readonly command: 'extension.reload' }>

type ExtensionStateReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'ExtensionState'
  readonly source: 'reload'
  readonly stateFile: string
  readonly previousRevision: string
  readonly state: ExtensionControlStateV1
}

const resolveExtensionStateArtifactFileName = (stateFile: string): string => {
  const stateBaseName = path.basename(path.resolve(process.cwd(), stateFile))
  return `${stateBaseName}.artifact.json`
}

export const runExtensionReload = (inv: ExtensionReloadInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const previous = yield* Effect.tryPromise({
      try: () => readExtensionControlStateFile(inv.stateFile),
      catch: (cause) => cause,
    })

    const loaded = yield* Effect.tryPromise({
      try: () => loadExtensionManifestFromFile(previous.manifestFile),
      catch: (cause) => cause,
    })

    const state = buildExtensionControlState({
      manifestFile: loaded.manifestFile,
      manifest: loaded.manifest,
      previous,
    })

    const stateFile = yield* Effect.tryPromise({
      try: () => writeExtensionControlStateFile(inv.stateFile, state),
      catch: (cause) => cause,
    })

    const report: ExtensionStateReportV1 = {
      schemaVersion: 1,
      kind: 'ExtensionState',
      source: 'reload',
      stateFile: path.resolve(process.cwd(), stateFile),
      previousRevision: previous.manifest.revision,
      state,
    }

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: resolveExtensionStateArtifactFileName(inv.stateFile),
        outputKey: 'extensionState',
        kind: 'ExtensionState',
        value: report,
      }),
    ]

    return makeCommandResult({
      runId,
      command: 'extension.reload',
      ok: true,
      artifacts,
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'extension.reload',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
