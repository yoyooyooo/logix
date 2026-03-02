import { Effect } from 'effect'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import { projectEntryControlSurface } from './workflowSurface.js'

type IrExportInvocation = Extract<CliInvocation, { readonly command: 'ir.export' }>

export const runIrExport = (inv: IrExportInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const projection = projectEntryControlSurface(inv.entry)
    const workflowSurfaces = projection.workflowSurfaces
    const manifest = projection.manifest

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'control-surface.manifest.json',
        outputKey: 'controlSurfaceManifest',
        kind: 'ControlSurfaceManifest',
        value: manifest,
      }),
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'workflow.surface.json',
        outputKey: 'workflowSurface',
        kind: 'WorkflowSurfaceBundle',
        value: workflowSurfaces,
      }),
    ]

    return makeCommandResult({
      runId,
      command: 'ir.export',
      ok: true,
      artifacts,
    })
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'ir.export',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      ),
    ),
  )
}
