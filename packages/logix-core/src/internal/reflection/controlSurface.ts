import {
  exportControlSurfaceManifest,
  type ControlSurfaceManifestV1,
  type ControlProgramSurfaceV1,
  type JsonValue,
} from '../evidence-api.js'

export type ExportedWorkflowSurface = {
  readonly moduleId: string
  readonly surface: ControlProgramSurfaceV1
}

export type ExportControlSurfaceResult = {
  readonly manifest: ControlSurfaceManifestV1
  readonly controlProgramSurfaces: ReadonlyArray<ExportedWorkflowSurface>
}

export type ExportControlSurfaceOptions = {
  readonly meta?: { readonly generator?: JsonValue }
}

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
  if (isRecord(module) && module._tag === 'ProgramRuntimeBlueprint') {
    const id = resolveTagId(module.module)
    if (id) return id
    throw new Error(
      '[ControlSurfaceManifest] Failed to resolve moduleId from ProgramRuntimeBlueprint.module.id.\n' +
        'Fix: pass a configured Module/ProgramRuntimeBlueprint (has .id/.tag.id/.module.id), not a read-only handle.',
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
      'Fix: pass a configured Module/ProgramRuntimeBlueprint (has .id/.tag.id/.module.id), not a read-only handle.',
  )
}

export const exportControlSurface = (
  modules: ReadonlyArray<unknown>,
  options?: ExportControlSurfaceOptions,
): ExportControlSurfaceResult => {
  const entries: Array<ControlSurfaceManifestV1['modules'][number]> = []
  const controlProgramSurfaces: Array<ExportedWorkflowSurface> = []

  const seen = new Set<string>()

  for (const module of modules) {
    const moduleId = resolveModuleIdOrThrow(module)
    if (seen.has(moduleId)) {
      throw new Error(`[ControlSurfaceManifest] Duplicate moduleId "${moduleId}".`)
    }
    seen.add(moduleId)

    entries.push({
      moduleId,
      effectsIndex: [],
    })
  }

  const manifest = exportControlSurfaceManifest({
    version: 1 as const,
    modules: entries,
    ...(options?.meta ? { meta: options.meta } : null),
  })

  return { manifest, controlProgramSurfaces }
}
