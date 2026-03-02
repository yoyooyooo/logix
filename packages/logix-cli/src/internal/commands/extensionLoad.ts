import path from 'node:path'

import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import {
  buildExtensionControlState,
  loadExtensionManifestFromFile,
  writeExtensionControlStateFile,
  type ExtensionControlStateV1,
} from '../extension-host/stateFile.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type ExtensionLoadInvocation = Extract<CliInvocation, { readonly command: 'extension.load' }>

type ExtensionStateReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'ExtensionState'
  readonly source: 'load'
  readonly stateFile: string
  readonly state: ExtensionControlStateV1
}

const resolveExtensionStateArtifactFileName = (stateFile: string): string => {
  const stateBaseName = path.basename(path.resolve(process.cwd(), stateFile))
  return `${stateBaseName}.artifact.json`
}

export const runExtensionLoad = (inv: ExtensionLoadInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const loaded = yield* Effect.tryPromise({
      try: () => loadExtensionManifestFromFile(inv.manifestPath),
      catch: (cause) => cause,
    })

    const state = buildExtensionControlState({
      manifestFile: loaded.manifestFile,
      manifest: loaded.manifest,
    })

    const stateFile = yield* Effect.tryPromise({
      try: () => writeExtensionControlStateFile(inv.stateFile, state),
      catch: (cause) => cause,
    })

    const report: ExtensionStateReportV1 = {
      schemaVersion: 1,
      kind: 'ExtensionState',
      source: 'load',
      stateFile: path.resolve(process.cwd(), stateFile),
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
      command: 'extension.load',
      ok: true,
      artifacts,
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'extension.load',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
