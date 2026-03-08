import { Effect } from 'effect'
import path from 'node:path'

import { makeArtifactOutput } from '../artifacts.js'
import type { CliInvocation } from '../args.js'
import { asSerializableErrorSummary } from '../errors.js'
import type { ArtifactOutput, CommandResult } from '../result.js'
import { makeCommandResult } from '../result.js'
import { sha256DigestOfJson } from '../stableJson.js'

type IrExportInvocation = Extract<CliInvocation, { readonly command: 'ir.export' }>

type WorkflowSurfaceItem = {
  readonly moduleId: string
  readonly surface: {
    readonly digest: string
    readonly source: string
  }
}

const toModuleId = (entry: IrExportInvocation['entry']): string => `${path.basename(entry.modulePath)}#${entry.exportName}`

const makeWorkflowSurfaces = (entry: IrExportInvocation['entry']): ReadonlyArray<WorkflowSurfaceItem> => {
  const moduleId = toModuleId(entry)
  const source = `${entry.modulePath}#${entry.exportName}`
  const digest = sha256DigestOfJson({ moduleId, source })
  return [
    {
      moduleId,
      surface: { digest, source },
    },
  ]
}

const makeManifest = (workflowSurfaces: ReadonlyArray<WorkflowSurfaceItem>) => {
  const modules = workflowSurfaces.map((item) => ({
    moduleId: item.moduleId,
    workflowSurface: { digest: item.surface.digest },
  }))
  const digest = sha256DigestOfJson({ modules })
  return {
    schemaVersion: 1,
    kind: 'ControlSurfaceManifest',
    version: 1,
    digest,
    modules,
  } as const
}

export const runIrExport = (inv: IrExportInvocation): Effect.Effect<CommandResult, never> => {
  const runId = inv.global.runId

  return Effect.gen(function* () {
    const workflowSurfaces = makeWorkflowSurfaces(inv.entry)
    const manifest = makeManifest(workflowSurfaces)

    const artifacts: ArtifactOutput[] = [
      yield* makeArtifactOutput({
        outDir: inv.global.outDir,
        budgetBytes: inv.global.budgetBytes,
        fileName: 'control-surface.manifest.json',
        outputKey: 'controlSurfaceManifest',
        kind: 'ControlSurfaceManifest',
        value: manifest,
        digest: manifest.digest,
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
    Effect.catch((cause) =>
      Effect.succeed(
        makeCommandResult({
          runId,
          command: 'ir.export',
          ok: false,
          artifacts: [],
          error: asSerializableErrorSummary(cause),
        }),
      )),
  )
}
