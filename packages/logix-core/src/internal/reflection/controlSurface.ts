import type { WorkflowDefV1 } from '../workflow/model.js'
import { compileWorkflowStaticIrV1 } from '../workflow/compiler.js'
import type { JsonValue } from '../observability/jsonValue.js'
import { exportControlSurfaceManifest, exportEffectsIndexDigest, exportWorkflowEffectsIndex } from '../observability/controlSurfaceManifest.js'
import type { ControlSurfaceManifestV1 } from '../observability/controlSurfaceManifest.js'
import { exportWorkflowSurface } from '../observability/workflowSurface.js'
import type { WorkflowSurfaceV1 } from '../observability/workflowSurface.js'

export type ExportedWorkflowSurface = {
  readonly moduleId: string
  readonly surface: WorkflowSurfaceV1
}

export type ExportControlSurfaceResult = {
  readonly manifest: ControlSurfaceManifestV1
  readonly workflowSurfaces: ReadonlyArray<ExportedWorkflowSurface>
}

export type ExportControlSurfaceOptions = {
  readonly meta?: { readonly generator?: JsonValue }
}

const MODULE_INTERNAL = Symbol.for('logix.module.internal')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isObjectLike = (value: unknown): value is Record<string, unknown> | ((...args: never[]) => unknown) =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const resolveTagId = (tag: unknown): string | undefined => {
  if (!isObjectLike(tag)) return undefined
  return asNonEmptyString((tag as Record<string, unknown>).id)
}

const resolveModuleIdOrThrow = (module: unknown): string => {
  if (isRecord(module) && module._tag === 'ModuleImpl') {
    const id = resolveTagId(module.module)
    if (id) return id
    throw new Error(
      '[ControlSurfaceManifest] Failed to resolve moduleId from ModuleImpl.module.id.\n' +
        'Fix: pass a configured Module/ModuleImpl (has .id/.tag.id/.module.id), not a read-only handle.',
    )
  }

  if (isRecord(module)) {
    const id = asNonEmptyString(module.id)
    if (id) return id
    const tagId = resolveTagId(module.tag)
    if (tagId) return tagId
  }

  throw new Error(
    '[ControlSurfaceManifest] Failed to resolve moduleId.\n' +
      'Fix: pass a configured Module/ModuleImpl (has .id/.tag.id/.module.id), not a read-only handle.',
  )
}

const resolveWorkflowDefs = (module: unknown): ReadonlyArray<WorkflowDefV1> => {
  if (!isObjectLike(module)) return []
  const internal = (module as Record<PropertyKey, unknown>)[MODULE_INTERNAL]
  const defs = isRecord(internal) ? internal.workflowDefs : undefined
  return Array.isArray(defs) ? (defs as ReadonlyArray<WorkflowDefV1>) : []
}

export const exportControlSurface = (
  modules: ReadonlyArray<unknown>,
  options?: ExportControlSurfaceOptions,
): ExportControlSurfaceResult => {
  const entries: Array<ControlSurfaceManifestV1['modules'][number]> = []
  const workflowSurfaces: Array<ExportedWorkflowSurface> = []

  const seen = new Set<string>()

  for (const module of modules) {
    const moduleId = resolveModuleIdOrThrow(module)
    if (seen.has(moduleId)) {
      throw new Error(`[ControlSurfaceManifest] Duplicate moduleId "${moduleId}".`)
    }
    seen.add(moduleId)

    const defs = resolveWorkflowDefs(module)
    if (defs.length === 0) {
      entries.push({ moduleId, effectsIndex: [] })
      continue
    }

    const workflowIrs = defs.map((def) => compileWorkflowStaticIrV1({ moduleId, def }))
    const surface = exportWorkflowSurface(workflowIrs)
    workflowSurfaces.push({ moduleId, surface })

    const effectsIndex = exportWorkflowEffectsIndex({ moduleId, workflowSurface: surface.programs })
    const effectsIndexDigest = effectsIndex.length > 0 ? exportEffectsIndexDigest(effectsIndex) : undefined

    entries.push({
      moduleId,
      workflowSurface: { digest: surface.digest },
      effectsIndex,
      ...(effectsIndexDigest ? { effectsIndexDigest } : null),
    })
  }

  const manifest = exportControlSurfaceManifest({
    version: 1 as const,
    modules: entries,
    ...(options?.meta ? { meta: options.meta } : null),
  })

  return { manifest, workflowSurfaces }
}
