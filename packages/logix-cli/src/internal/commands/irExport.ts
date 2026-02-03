import { Effect } from 'effect'
import * as Logix from '@logixjs/core'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import { loadProgramModule } from '../loadProgramModule.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'

type IrExportInvocation = Extract<CliInvocation, { readonly command: 'ir.export' }>

export const runIrExport = (inv: IrExportInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const root = yield* loadProgramModule(inv.entry, { host: inv.global.host })
    const exported = Logix.Reflection.exportControlSurface([root as any])

    const artifacts: ArtifactOutput[] = []
    artifacts.push(
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'control-surface.manifest.json',
        outputKey: 'controlSurfaceManifest',
        kind: 'ControlSurfaceManifest',
        value: exported.manifest,
        digest: (exported.manifest as any)?.digest ? String((exported.manifest as any).digest) : undefined,
      }),
    )

    if (exported.workflowSurfaces.length > 0) {
      artifacts.push(
        yield* makeArtifactOutput({
          outDir: inv.global.outDir,
          budgetBytes: inv.global.budgetBytes,
          fileName: 'workflow.surface.json',
          outputKey: 'workflowSurface',
          kind: 'WorkflowSurfaceBundle',
          value: exported.workflowSurfaces,
        }),
      )
    }

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
