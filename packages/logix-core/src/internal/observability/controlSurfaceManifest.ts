import { fnv1a32, stableStringify } from '../digest.js'
import type { JsonValue } from './jsonValue.js'
import type { WorkflowStaticIrV1 } from '../workflow/model.js'

export type ControlSurfaceVersion = 1

export type Digest = string
export type ModuleId = string
export type ActionTag = string
export type WorkflowProgramId = string

export type ActionRef = { readonly moduleId: ModuleId; readonly actionTag: ActionTag }

export type EffectTrigger =
  | { readonly kind: 'action'; readonly action: ActionRef }
  | { readonly kind: 'lifecycle'; readonly phase: 'onStart' | 'onInit' }

export type SliceRef = { readonly digest: Digest }

export type WorkflowSurfaceRefV1 = SliceRef

export type ControlEffectIndexEntryV1 =
  | {
      readonly kind: 'workflow'
      readonly effectId: string
      readonly trigger: EffectTrigger
      readonly programId: WorkflowProgramId
      readonly programDigest?: Digest
    }
  | {
      readonly kind: 'opaque'
      readonly effectId: string
      readonly trigger: EffectTrigger
      readonly sourceKey: string
      readonly summary?: string
    }

export type ControlSurfaceManifestV1 = {
  readonly version: ControlSurfaceVersion
  readonly digest: Digest
  readonly modules: ReadonlyArray<{
    readonly moduleId: ModuleId
    readonly workflowSurface?: WorkflowSurfaceRefV1
    readonly effectsIndex: ReadonlyArray<ControlEffectIndexEntryV1>
    readonly effectsIndexDigest?: Digest
  }>
  readonly meta?: { readonly generator?: JsonValue }
}

export type ControlSurfaceManifest = ControlSurfaceManifestV1

const makeDigest = (value: unknown): string => `control_surface_v1:${fnv1a32(stableStringify(value))}`

export const exportEffectsIndexDigest = (entries: ReadonlyArray<ControlEffectIndexEntryV1>): Digest =>
  `effects_index_v1:${fnv1a32(stableStringify(entries))}`

export const exportWorkflowEffectsIndex = (args: {
  readonly moduleId: string
  readonly workflowSurface: ReadonlyArray<WorkflowStaticIrV1>
}): ReadonlyArray<ControlEffectIndexEntryV1> => {
  const moduleId = args.moduleId
  return Array.from(args.workflowSurface)
    .sort((a, b) => a.programId.localeCompare(b.programId))
    .map((ir) => {
      const localId = ir.programId.startsWith(`${moduleId}.`) ? ir.programId.slice(moduleId.length + 1) : ir.programId
      const trigger =
        ir.nodes.find((n) => n.kind === 'trigger')?.trigger?.kind === 'action'
          ? ({
              kind: 'action',
              action: { moduleId, actionTag: (ir.nodes.find((n) => n.kind === 'trigger') as any)?.trigger?.actionTag ?? 'unknown' },
            } satisfies EffectTrigger)
          : ({
              kind: 'lifecycle',
              phase: ((ir.nodes.find((n) => n.kind === 'trigger') as any)?.trigger?.phase ?? 'onStart') as 'onStart' | 'onInit',
            } satisfies EffectTrigger)

      return {
        kind: 'workflow',
        effectId: `${moduleId}::workflow:${localId}`,
        trigger,
        programId: ir.programId,
        programDigest: ir.digest,
      } satisfies ControlEffectIndexEntryV1
    })
}

export const exportControlSurfaceManifest = (input: Omit<ControlSurfaceManifestV1, 'digest'>): ControlSurfaceManifestV1 => {
  const modules = Array.from(input.modules).sort((a, b) => a.moduleId.localeCompare(b.moduleId))
  const meta = input.meta

  const base = {
    version: 1 as const,
    modules,
    ...(meta ? { meta } : null),
  } satisfies Omit<ControlSurfaceManifestV1, 'digest'>

  return {
    ...base,
    digest: makeDigest(base),
  }
}
