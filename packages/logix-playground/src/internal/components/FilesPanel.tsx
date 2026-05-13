import React from 'react'
import { FileTree, useFileTree } from '@pierre/trees/react'
import type { PlaygroundWorkspace } from '../session/workspace.js'

export interface FilesPanelProps {
  readonly workspace: PlaygroundWorkspace
  readonly activeFilePath?: string
  readonly onSelectFile: (path: string) => void
}

const toTreePath = (path: string): string => path.replace(/^\//, '')
const fromTreePath = (path: string): string => path.startsWith('/') ? path : `/${path}`

export function FilesPanel({
  workspace,
  activeFilePath,
  onSelectFile,
}: FilesPanelProps): React.ReactElement {
  const activePath = activeFilePath ?? workspace.activeFile
  const activeTreePath = toTreePath(activePath)
  const treePaths = React.useMemo(
    () => Array.from(workspace.files.keys(), toTreePath),
    [workspace],
  )
  const latestWorkspaceRef = React.useRef(workspace)
  const latestOnSelectFileRef = React.useRef(onSelectFile)
  const header = React.useMemo(
    () => (
      <div className="flex h-8 items-center px-3 text-xs font-semibold uppercase tracking-wider text-gray-700">
        Files
      </div>
    ),
    [],
  )
  React.useEffect(() => {
    latestWorkspaceRef.current = workspace
    latestOnSelectFileRef.current = onSelectFile
  }, [onSelectFile, workspace])
  const { model } = useFileTree({
    density: 'compact',
    flattenEmptyDirectories: true,
    initialExpansion: 'open',
    initialSelectedPaths: [activeTreePath],
    itemHeight: 26,
    onSelectionChange: (paths) => {
      const selectedPath = paths[paths.length - 1]
      if (selectedPath == null) return
      const workspacePath = fromTreePath(selectedPath)
      if (latestWorkspaceRef.current.files.has(workspacePath)) {
        latestOnSelectFileRef.current(workspacePath)
      }
    },
    paths: treePaths,
    search: false,
    unsafeCSS: `
      :host {
        --trees-bg-override: #f8f9fa;
        --trees-fg-override: #4b5563;
        --trees-fg-muted-override: #9ca3af;
        --trees-accent-override: #3b82f6;
        --trees-selected-bg-override: rgb(219 234 254 / 0.65);
        --trees-selected-fg-override: #1d4ed8;
        --trees-border-color-override: transparent;
        --trees-font-family-override: ui-sans-serif, system-ui, sans-serif;
        --trees-font-size-override: 13px;
        --trees-padding-inline-override: 4px;
      }
    `,
  })

  React.useEffect(() => {
    model.resetPaths(treePaths, { initialExpandedPaths: treePaths })
  }, [model, treePaths])

  React.useEffect(() => {
    const selectedPaths = model.getSelectedPaths()
    for (const selectedPath of selectedPaths) {
      if (selectedPath !== activeTreePath) {
        model.getItem(selectedPath)?.deselect()
      }
    }
    if (!selectedPaths.includes(activeTreePath)) {
      model.getItem(activeTreePath)?.select()
    }
    model.focusNearestPath(activeTreePath)
  }, [activeTreePath, model])

  return (
    <nav aria-label="File navigator" className="h-full min-h-0 bg-[#f8f9fa] text-[13px] text-gray-700">
      <FileTree
        aria-label="File navigator"
        header={header}
        model={model}
        style={{ height: '100%', width: '100%' }}
      />
    </nav>
  )
}
