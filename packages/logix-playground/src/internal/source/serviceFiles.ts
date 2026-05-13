import type {
  PlaygroundProjectServiceFiles,
  PlaygroundServiceFileGroup,
} from '../../Project.js'
import type { ClassifiedPlaygroundFailure } from '../session/errors.js'
import { classifyError } from '../session/errors.js'

export interface ServiceNavigationGroup {
  readonly id: string
  readonly label: string
  readonly paths: ReadonlyArray<string>
}

const normalizeProjectPath = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export const normalizeServiceFiles = (
  serviceFiles: PlaygroundProjectServiceFiles | undefined,
  availablePaths: ReadonlySet<string>,
): PlaygroundProjectServiceFiles => {
  if (!serviceFiles?.length) return []

  return serviceFiles.map((group) => ({
    ...group,
    files: group.files.map((file) => {
      const path = normalizeProjectPath(file.path)
      if (!availablePaths.has(path)) {
        throw new Error(`Service file reference does not exist: ${path}`)
      }
      return { ...file, path }
    }),
  }))
}

export const groupWorkspaceFilesByServiceRole = (
  paths: Iterable<string>,
  serviceFiles: ReadonlyArray<PlaygroundServiceFileGroup>,
): ReadonlyArray<ServiceNavigationGroup> => {
  const normalizedPaths = Array.from(paths, normalizeProjectPath)
  const servicePathSet = new Set(serviceFiles.flatMap((group) => group.files.map((file) => file.path)))
  const runtimePaths = normalizedPaths.filter((path) => !servicePathSet.has(path))
  const groups: Array<ServiceNavigationGroup> = []

  if (runtimePaths.length > 0) {
    groups.push({ id: 'runtime-source', label: 'Runtime source', paths: runtimePaths })
  }

  for (const group of serviceFiles) {
    groups.push({
      id: group.id,
      label: group.label,
      paths: group.files.map((file) => file.path),
    })
  }

  return groups
}

export const classifyServiceFileFailure = (error: unknown): ClassifiedPlaygroundFailure =>
  classifyError('service-source', error)
