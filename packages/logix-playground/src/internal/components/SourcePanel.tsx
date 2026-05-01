import React from 'react'
import type { PlaygroundWorkspace } from '../session/workspace.js'
import { MonacoSourceEditor } from '../editor/MonacoSourceEditor.js'
import { isPrettierFormatSupported } from '../editor/sourceFormatSupport.js'
import { FormatIcon, GripVerticalIcon, XIcon } from './icons.js'

export interface SourcePanelProps {
  readonly workspace: PlaygroundWorkspace
  readonly activeFilePath?: string
  readonly onEdit: (path: string, content: string) => void
  readonly preferMonaco?: boolean
}

export function SourcePanel({ workspace, activeFilePath, onEdit, preferMonaco }: SourcePanelProps): React.ReactElement {
  const activeFile =
    workspace.files.get(activeFilePath ?? workspace.activeFile) ?? Array.from(workspace.files.values())[0]
  const [formatState, setFormatState] = React.useState<'idle' | 'formatting' | 'formatted' | 'failed'>('idle')
  const [formatError, setFormatError] = React.useState<string | undefined>(undefined)
  const useMonaco =
    preferMonaco ??
    !(
      typeof window !== 'undefined' &&
      (window as Window & { __LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__?: boolean })
        .__LOGIX_PLAYGROUND_PREVIEW_TEST_MODE__ === true
    )
  const activeFilePathParts = activeFile?.path.split('/').filter(Boolean) ?? []
  const activeFileName = activeFilePathParts[activeFilePathParts.length - 1] ?? 'No source files'
  const activeLanguageLabel = activeFile?.language.toUpperCase() ?? ''
  const canFormat = activeFile ? activeFile.editable && isPrettierFormatSupported(activeFile.language) : false

  React.useEffect(() => {
    setFormatState('idle')
    setFormatError(undefined)
  }, [activeFile?.path, activeFile?.content])

  const handleFormatSource = React.useCallback(async () => {
    if (!activeFile || !canFormat || formatState === 'formatting') return

    setFormatState('formatting')
    setFormatError(undefined)
    try {
      const { formatPlaygroundSource } = await import('../editor/prettierSourceFormatter.js')
      const formatted = await formatPlaygroundSource({
        value: activeFile.content,
        language: activeFile.language,
        path: activeFile.path,
      })
      if (formatted !== activeFile.content) {
        onEdit(activeFile.path, formatted)
      }
      setFormatState('formatted')
    } catch (error) {
      setFormatState('failed')
      setFormatError(error instanceof Error ? error.message : String(error))
    }
  }, [activeFile, canFormat, formatState, onEdit])

  return (
    <section aria-label="Program" className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1e1e1e] text-gray-300">
      <div className="flex h-10 shrink-0 items-center overflow-x-auto bg-[#252526]">
        <div className="flex h-full min-w-max cursor-pointer items-center border-t-2 border-t-blue-500 bg-[#1e1e1e] px-4 text-gray-300">
          {activeLanguageLabel ? (
            <span className="mr-2 text-xs font-semibold text-blue-400">{activeLanguageLabel}</span>
          ) : null}
          <span className="font-mono text-xs">{activeFileName}</span>
          <span className="ml-2 mr-2 text-xs font-bold text-yellow-500">M</span>
          <XIcon className="ml-1 h-3.5 w-3.5 rounded hover:bg-gray-700" />
        </div>
        <div className="h-full flex-1 bg-[#252526]" />
        <button
          type="button"
          aria-label="Format source"
          title="Format source"
          disabled={!canFormat || formatState === 'formatting'}
          onClick={handleFormatSource}
          className="mx-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-700 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FormatIcon className="h-4 w-4" />
        </button>
        <span className="sr-only" aria-live="polite">
          {formatState === 'failed'
            ? `Source format failed: ${formatError ?? 'unknown error'}`
            : formatState === 'formatting'
              ? 'Formatting source'
              : formatState === 'formatted'
                ? 'Source formatted'
                : ''}
        </span>
        <div className="px-2">
          <GripVerticalIcon className="h-4 w-4 cursor-pointer text-gray-500 hover:text-gray-300" />
        </div>
      </div>
      {activeFile ? (
        <div className="relative min-h-0 flex-1 overflow-hidden bg-[#1e1e1e]">
          <MonacoSourceEditor
            path={activeFile.path}
            language={activeFile.language}
            value={activeFile.content}
            files={Array.from(workspace.files.values()).map((file) => ({
              path: file.path,
              language: file.language,
              content: file.content,
            }))}
            onChange={(content) => onEdit(activeFile.path, content)}
            preferMonaco={useMonaco}
            className="h-full min-h-0 flex-1 bg-[#1e1e1e]"
          />
        </div>
      ) : (
        <p className="p-4 text-sm text-gray-400">No source files</p>
      )}
    </section>
  )
}
