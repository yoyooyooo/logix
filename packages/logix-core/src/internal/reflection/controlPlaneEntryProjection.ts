import { fnv1a32, stableStringify } from '../digest.js'

export type EntryControlSurfaceEntryRef = {
  readonly modulePath: string
  readonly exportName: string
}

export type EntryWorkflowSurfaceItem = {
  readonly moduleId: string
  readonly surface: {
    readonly digest: string
    readonly source: string
  }
}

export type EntryControlSurfaceManifest = {
  readonly schemaVersion: 1
  readonly kind: 'ControlSurfaceManifest'
  readonly version: 1
  readonly digest: string
  readonly moduleId?: string
  readonly modules: ReadonlyArray<{
    readonly moduleId: string
    readonly workflowSurface: {
      readonly digest: string
    }
  }>
}

export type EntryControlSurfaceProjection = {
  readonly manifest: EntryControlSurfaceManifest
  readonly workflowSurfaces: ReadonlyArray<EntryWorkflowSurfaceItem>
}

const basename = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] ?? normalized
}

const toEntryModuleId = (entry: EntryControlSurfaceEntryRef): string => `${basename(entry.modulePath)}#${entry.exportName}`

const toDigest = (prefix: string, value: unknown): string => `${prefix}:${fnv1a32(stableStringify(value))}`

export const projectControlSurfaceFromEntryRef = (entry: EntryControlSurfaceEntryRef): EntryControlSurfaceProjection => {
  const moduleId = toEntryModuleId(entry)
  const source = `${entry.modulePath}#${entry.exportName}`
  const workflowSurfaces: ReadonlyArray<EntryWorkflowSurfaceItem> = [
    {
      moduleId,
      surface: {
        digest: toDigest('entry_workflow_surface_v1', { moduleId, source }),
        source,
      },
    },
  ]

  const modules = workflowSurfaces.map((item) => ({
    moduleId: item.moduleId,
    workflowSurface: {
      digest: item.surface.digest,
    },
  }))

  const manifest: EntryControlSurfaceManifest = {
    schemaVersion: 1,
    kind: 'ControlSurfaceManifest',
    version: 1,
    digest: toDigest('entry_control_surface_manifest_v1', { modules }),
    ...(modules.length === 1 ? { moduleId: modules[0]!.moduleId } : null),
    modules,
  }

  return {
    manifest,
    workflowSurfaces,
  }
}
