import { Effect } from 'effect'

import { buildProject } from './internal/project.js'
import type { AnchorEntry, RawModeEntry } from './internal/entries.js'
import { scanMissingAnchors } from './internal/scanMissingAnchors.js'
import { scanModuleMake } from './internal/scanModuleMake.js'
import { scanServiceUse } from './internal/scanServiceUse.js'
import { scanWorkflowDef } from './internal/scanWorkflowDef.js'
import { sortByFileSpan } from './internal/stableSort.js'

export type AnchorIndexV1 = {
  readonly schemaVersion: 1
  readonly kind: 'AnchorIndex'
  readonly repoRoot: string
  readonly entries: ReadonlyArray<AnchorEntry>
  readonly rawMode: ReadonlyArray<RawModeEntry>
  readonly summary: {
    readonly filesScanned: number
    readonly entriesTotal: number
    readonly rawModeTotal: number
    readonly modulesTotal: number
    readonly serviceUsesTotal: number
    readonly autofillTargetsTotal: number
    readonly workflowsTotal: number
    readonly workflowCallUsesTotal: number
  }
}

export type BuildAnchorIndexArgs = {
  readonly repoRoot: string
  readonly tsconfig?: string
  readonly includeGlobs?: ReadonlyArray<string>
  readonly excludeGlobs?: ReadonlyArray<string>
}

export const buildAnchorIndex = (args: BuildAnchorIndexArgs): Effect.Effect<AnchorIndexV1, unknown> =>
  Effect.gen(function* () {
    const { repoRootAbs, filesAbs, project } = yield* buildProject(args)

    const entries: AnchorEntry[] = []
    const rawMode: RawModeEntry[] = []

    for (const sf of project.getSourceFiles()) {
      const moduleMake = scanModuleMake({ repoRootAbs, sourceFile: sf })
      entries.push(...moduleMake.entries)
      rawMode.push(...moduleMake.rawMode)

      const missing = scanMissingAnchors({ repoRootAbs, sourceFile: sf })
      entries.push(...missing.entries)
      rawMode.push(...missing.rawMode)

      const serviceUse = scanServiceUse({ repoRootAbs, sourceFile: sf })
      entries.push(...serviceUse.entries)
      rawMode.push(...serviceUse.rawMode)

      const workflow = scanWorkflowDef({ repoRootAbs, sourceFile: sf })
      entries.push(...workflow.entries)
      entries.push(...workflow.callUses)
      entries.push(...workflow.autofillTargets)
      rawMode.push(...workflow.rawMode)
      rawMode.push(...workflow.workflowRawMode)
    }

    const entriesSorted = sortByFileSpan(entries)
    const rawModeSorted = sortByFileSpan(rawMode)

    const countKind = (kind: AnchorEntry['kind']): number => entriesSorted.filter((e) => e.kind === kind).length

    const index: AnchorIndexV1 = {
      schemaVersion: 1,
      kind: 'AnchorIndex',
      repoRoot: repoRootAbs,
      entries: entriesSorted,
      rawMode: rawModeSorted,
      summary: {
        filesScanned: filesAbs.length,
        entriesTotal: entriesSorted.length,
        rawModeTotal: rawModeSorted.length,
        modulesTotal: countKind('ModuleDef'),
        serviceUsesTotal: countKind('ServiceUse'),
        autofillTargetsTotal: countKind('AutofillTarget'),
        workflowsTotal: countKind('WorkflowDef'),
        workflowCallUsesTotal: countKind('WorkflowCallUse'),
      },
    }

    return index
  })
