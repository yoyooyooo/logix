import type { PlaygroundCapabilities } from '../../Project.js'
import type { PlaygroundWorkspace, WorkspaceFile } from '../session/workspace.js'
import { makeEnvSeed, stableHash } from './identity.js'

export interface ProjectSnapshotFile {
  readonly path: string
  readonly language: string
  readonly content: string
  readonly originalContent: string
  readonly revision: number
  readonly hash: string
  readonly editable: boolean
  readonly generatedFrom?: string
}

export interface ProjectSnapshot {
  readonly projectId: string
  readonly revision: number
  readonly files: ReadonlyMap<string, ProjectSnapshotFile>
  readonly generatedFiles: ReadonlyMap<string, ProjectSnapshotFile>
  readonly previewEntry?: { readonly entry: string }
  readonly programEntry?: { readonly entry: string }
  readonly dependencies: Readonly<Record<string, string>>
  readonly fixtures: unknown
  readonly diagnostics: { readonly check: boolean; readonly trialStartup: boolean }
  readonly envSeed: string
}

const defaultDependencies = {
  '@logixjs/core': 'workspace',
  '@logixjs/react': 'workspace',
  effect: '4.0.0-beta.28',
  react: '19',
  'react-dom': '19',
} as const

const defaultCapability = (capabilities: PlaygroundCapabilities | undefined, key: keyof PlaygroundCapabilities): boolean =>
  capabilities?.[key] ?? false

const toSnapshotFile = (workspaceFile: WorkspaceFile, revision: number): ProjectSnapshotFile => ({
  path: workspaceFile.path,
  language: workspaceFile.language,
  content: workspaceFile.content,
  originalContent: workspaceFile.originalContent,
  revision,
  hash: stableHash(`${workspaceFile.path}:${workspaceFile.content}`),
  editable: workspaceFile.editable,
})

export const createProjectSnapshot = (workspace: PlaygroundWorkspace): ProjectSnapshot => {
  const project = workspace.originalProject
  const files = new Map<string, ProjectSnapshotFile>()
  for (const [path, file] of workspace.files) {
    files.set(path, toSnapshotFile(file, workspace.revision))
  }

  return {
    projectId: workspace.projectId,
    revision: workspace.revision,
    files,
    generatedFiles: new Map(),
    previewEntry: project.preview,
    programEntry: project.program,
    dependencies: defaultDependencies,
    fixtures: project.fixtures ?? {},
    diagnostics: {
      check: defaultCapability(project.capabilities, 'check'),
      trialStartup: defaultCapability(project.capabilities, 'trialStartup'),
    },
    envSeed: makeEnvSeed(workspace.projectId, workspace.sessionSeed),
  }
}
