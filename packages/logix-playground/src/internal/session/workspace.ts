import type { PlaygroundProject } from '../../Project.js'
import { normalizeProjectPath, normalizePlaygroundProject } from '../project/project.js'

export interface WorkspaceFile {
  readonly path: string
  readonly language: string
  readonly content: string
  readonly originalContent: string
  readonly editable: boolean
}

export interface PlaygroundWorkspace {
  readonly projectId: string
  readonly originalProject: PlaygroundProject
  readonly sessionSeed: string
  readonly files: ReadonlyMap<string, WorkspaceFile>
  readonly dirtyFiles: ReadonlySet<string>
  readonly activeFile: string
  readonly revision: number
  editFile: (path: string, content: string) => void
  resetFiles: () => void
  setActiveFile: (path: string) => void
}

export interface PlaygroundWorkspaceOptions {
  readonly sessionSeed?: string
}

const createInitialFiles = (project: PlaygroundProject): Map<string, WorkspaceFile> =>
  new Map(
    Object.entries(project.files).map(([path, file]) => {
      const normalizedPath = normalizeProjectPath(path)
      return [
        normalizedPath,
        {
          path: normalizedPath,
          language: file.language,
          content: file.content,
          originalContent: file.content,
          editable: file.editable ?? true,
        },
      ] as const
    }),
  )

export const createPlaygroundWorkspace = (
  projectInput: PlaygroundProject,
  options: PlaygroundWorkspaceOptions = {},
): PlaygroundWorkspace => {
  const project = normalizePlaygroundProject(projectInput)
  let revision = 0
  let activeFile = project.program?.entry ?? project.preview?.entry ?? Object.keys(project.files)[0]!
  let files = createInitialFiles(project)
  let dirtyFiles = new Set<string>()

  const workspace: PlaygroundWorkspace = {
    get projectId() {
      return project.id
    },
    get originalProject() {
      return project
    },
    get sessionSeed() {
      return options.sessionSeed ?? 'default'
    },
    get files() {
      return files
    },
    get dirtyFiles() {
      return dirtyFiles
    },
    get activeFile() {
      return activeFile
    },
    get revision() {
      return revision
    },
    editFile(path, content) {
      const normalizedPath = normalizeProjectPath(path)
      const current = files.get(normalizedPath)
      if (!current) {
        throw new Error(`Cannot edit unknown Playground file: ${path}`)
      }
      if (!current.editable) {
        throw new Error(`Cannot edit readonly Playground file: ${path}`)
      }

      files = new Map(files)
      const nextFile = { ...current, content }
      files.set(normalizedPath, nextFile)

      dirtyFiles = new Set(dirtyFiles)
      if (content === nextFile.originalContent) {
        dirtyFiles.delete(normalizedPath)
      } else {
        dirtyFiles.add(normalizedPath)
      }
      revision += 1
    },
    resetFiles() {
      files = createInitialFiles(project)
      dirtyFiles = new Set()
      revision += 1
    },
    setActiveFile(path) {
      const normalizedPath = normalizeProjectPath(path)
      if (!files.has(normalizedPath)) {
        throw new Error(`Cannot activate unknown Playground file: ${path}`)
      }
      activeFile = normalizedPath
    },
  }

  return workspace
}
