import type { PlaygroundProject } from '../../Project.js'
import { normalizeServiceFiles } from '../source/serviceFiles.js'

const projectIdPattern = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/

export const normalizeProjectPath = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

const assertNoForbiddenProgramKeys = (program: unknown): void => {
  if (typeof program !== 'object' || program === null) return
  if ('programExport' in program || 'mainExport' in program) {
    throw new Error('Playground Program entries use fixed exports Program and main')
  }
}

export const normalizePlaygroundProject = (project: PlaygroundProject): PlaygroundProject => {
  if (!projectIdPattern.test(project.id)) {
    throw new Error(`Invalid PlaygroundProject id: ${project.id}`)
  }
  if (!project.preview && !project.program) {
    throw new Error(`PlaygroundProject ${project.id} must define preview or program`)
  }

  const files = Object.fromEntries(
    Object.entries(project.files).map(([filePath, file]) => [normalizeProjectPath(filePath), file]),
  )

  const hasFile = (filePath: string | undefined): boolean =>
    filePath !== undefined && Object.prototype.hasOwnProperty.call(files, normalizeProjectPath(filePath))

  if (project.preview && !hasFile(project.preview.entry)) {
    throw new Error(`Preview entry does not exist: ${project.preview.entry}`)
  }

  assertNoForbiddenProgramKeys(project.program)
  if (project.program && !hasFile(project.program.entry)) {
    throw new Error(`Program entry does not exist: ${project.program.entry}`)
  }

  const normalizedServiceFiles = normalizeServiceFiles(project.serviceFiles, new Set(Object.keys(files)))

  return {
    ...project,
    files,
    preview: project.preview ? { entry: normalizeProjectPath(project.preview.entry) } : undefined,
    program: project.program ? { entry: normalizeProjectPath(project.program.entry) } : undefined,
    serviceFiles: normalizedServiceFiles.length ? normalizedServiceFiles : undefined,
  }
}
