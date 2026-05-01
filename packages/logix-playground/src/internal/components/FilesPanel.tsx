import React from 'react'
import type { PlaygroundWorkspace } from '../session/workspace.js'
import { groupWorkspaceFilesByServiceRole, normalizeServiceFiles } from '../source/serviceFiles.js'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileJsonIcon,
  FilePlusIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  RefreshCwIcon,
} from './icons.js'

export interface FilesPanelProps {
  readonly workspace: PlaygroundWorkspace
  readonly activeFilePath?: string
  readonly onSelectFile: (path: string) => void
}

export function FilesPanel({
  workspace,
  activeFilePath,
  onSelectFile,
}: FilesPanelProps): React.ReactElement {
  const activePath = activeFilePath ?? workspace.activeFile
  const serviceFiles = normalizeServiceFiles(workspace.originalProject.serviceFiles, new Set(workspace.files.keys()))
  const fileGroups = groupWorkspaceFilesByServiceRole(workspace.files.keys(), serviceFiles)

  const fileName = (path: string): string => {
    const parts = path.split('/').filter(Boolean)
    return parts[parts.length - 1] ?? path
  }
  const fileIcon = (path: string, language: string): React.ReactElement => {
    if (language === 'json') return <FileJsonIcon className="mr-1.5 h-4 w-4 shrink-0 text-blue-400" />
    if (language === 'md') {
      return (
        <span className="mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-semibold text-blue-500">
          M
        </span>
      )
    }
    if (path.endsWith('.json')) {
      return (
        <span className="mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center text-yellow-500">
          {'{ }'}
        </span>
      )
    }
    return (
      <span className="mr-1.5 flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-semibold text-blue-500">
        {language.toUpperCase()}
      </span>
    )
  }

  const renderFileButton = (path: string) => {
    const file = workspace.files.get(path)
    if (!file) return null
    const active = file.path === activePath

    return (
      <button
        key={file.path}
        type="button"
        title={file.path}
        aria-label={file.path}
        aria-pressed={file.path === activePath}
        onClick={() => onSelectFile(file.path)}
        className={[
          'flex w-full cursor-pointer items-center truncate border-l-2 px-2 py-1 text-left text-[13px] transition-colors hover:bg-gray-200',
          active
            ? 'border-blue-500 bg-blue-100/50 pl-6 text-blue-700'
            : 'border-transparent pl-8 text-gray-600',
        ].join(' ')}
      >
        {fileIcon(file.path, file.language)}
        <span className="min-w-0 flex-1 truncate">{fileName(file.path)}</span>
        {active ? <span className="mr-2 text-[10px] font-bold text-blue-500">M</span> : null}
      </button>
    )
  }

  return (
    <nav aria-label="File navigator" className="h-full min-h-0 overflow-y-auto bg-[#f8f9fa] py-1 text-[13px] text-gray-700">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-700">
        <span>Files</span>
        <div className="flex items-center gap-1 text-gray-400">
          <FilePlusIcon className="h-3.5 w-3.5 cursor-pointer hover:text-gray-700" />
          <FolderPlusIcon className="h-3.5 w-3.5 cursor-pointer hover:text-gray-700" />
          <RefreshCwIcon className="h-3.5 w-3.5 cursor-pointer hover:text-gray-700" />
        </div>
      </div>
      {fileGroups.map((group) => (
        <div key={group.id} role="group" aria-label={group.label} className="mb-1">
          <div className="flex cursor-pointer items-center px-2 py-1 hover:bg-gray-200">
            {group.id === 'runtime-source' ? (
              <>
                <ChevronDownIcon className="mr-0.5 h-4 w-4 text-gray-400" />
                <FolderOpenIcon className="mr-1.5 h-4 w-4 text-blue-400" />
              </>
            ) : (
              <>
                <ChevronRightIcon className="mr-0.5 h-4 w-4 text-gray-400" />
                <FolderIcon className="mr-1.5 h-4 w-4 text-gray-400" />
              </>
            )}
            <span className="truncate">{group.id === 'runtime-source' ? 'src' : group.label}</span>
          </div>
          {group.paths.map(renderFileButton)}
        </div>
      ))}
    </nav>
  )
}
