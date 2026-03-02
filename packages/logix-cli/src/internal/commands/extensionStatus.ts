import path from 'node:path'

import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import { readExtensionControlStateFile, type ExtensionControlStateV1 } from '../extension-host/stateFile.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type ExtensionStatusInvocation = Extract<CliInvocation, { readonly command: 'extension.status' }>

type ExtensionStateReportV1 = {
  readonly schemaVersion: 1
  readonly kind: 'ExtensionState'
  readonly source: 'status'
  readonly stateFile: string
  readonly json: boolean
  readonly state: ExtensionControlStateV1
}

const resolveExtensionStateArtifactFileName = (stateFile: string): string => {
  const stateBaseName = path.basename(path.resolve(process.cwd(), stateFile))
  return `${stateBaseName}.artifact.json`
}

export const runExtensionStatus = (inv: ExtensionStatusInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const state = yield* Effect.tryPromise({
      try: () => readExtensionControlStateFile(inv.stateFile),
      catch: (cause) => cause,
    })

    const report: ExtensionStateReportV1 = {
      schemaVersion: 1,
      kind: 'ExtensionState',
      source: 'status',
      stateFile: path.resolve(process.cwd(), inv.stateFile),
      json: inv.json,
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
      command: 'extension.status',
      ok: true,
      artifacts,
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'extension.status',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
