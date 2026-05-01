// oxlint-disable-next-line typescript-eslint/triple-slash-reference
/// <reference path="./monaco-env.d.ts" />

import React from 'react'
import type * as MonacoTypes from 'monaco-editor'
import {
  getPlaygroundTypeScriptCompilerOptions,
  type MonacoTypeScriptLanguageNamespace,
} from './monacoTypeScriptOptions.js'

export interface MonacoVirtualFile {
  readonly path: string
  readonly language: string
  readonly content: string
}

export interface MonacoSourceEditorProps {
  readonly path: string
  readonly language: string
  readonly value: string
  readonly files?: ReadonlyArray<MonacoVirtualFile>
  readonly ariaLabel?: string
  readonly className?: string
  readonly onChange: (value: string) => void
  readonly preferMonaco?: boolean
}

type MonacoBootstrap = {
  readonly Editor: typeof import('@monaco-editor/react').Editor
  readonly loader: typeof import('@monaco-editor/react').loader
  readonly monaco: typeof MonacoTypes
  readonly typeBundle: typeof import('./types/monacoTypeBundle.generated.js')
}

let bootstrapPromise: Promise<MonacoBootstrap> | undefined
let typeBundleInstalled = false

const EDITOR_FONT_SIZE = 13
const EDITOR_LINE_HEIGHT = 20
const EDITOR_LINE_NUMBER_MIN_CHARS = 5
const EDITOR_LINE_DECORATIONS_WIDTH = 10
const EDITOR_FOLDING_DECORATION_WIDTH = 16
const EDITOR_VERTICAL_PADDING = 16

const getSourceLineCount = (source: string): number => Math.max(1, source.split(/\r\n|\r|\n/).length)

const getLineNumberSlots = (lineCount: number): number =>
  Math.max(EDITOR_LINE_NUMBER_MIN_CHARS, String(lineCount).length)

const getFallbackGridTemplateColumns = (lineNumberSlots: number): string =>
  `calc(${lineNumberSlots}ch) ${EDITOR_LINE_DECORATIONS_WIDTH + EDITOR_FOLDING_DECORATION_WIDTH}px minmax(0, 1fr)`

const canUseMonacoBrowserRuntime = (): boolean => {
  if (typeof window === 'undefined') return false
  if (typeof document === 'undefined') return false
  if (typeof Worker === 'undefined') return false
  if (typeof HTMLCanvasElement === 'undefined') return false
  const canvas = document.createElement('canvas')
  try {
    return canvas.getContext('2d') !== null
  } catch {
    return false
  }
}

export const toMonacoFileUri = (filePath: string): string => {
  if (filePath.startsWith('file://')) return filePath
  const trimmed = filePath.startsWith('/') ? filePath : `/${filePath}`
  return `file://${trimmed}`
}

const toMonacoLanguage = (language: string): string => {
  if (language === 'ts') return 'typescript'
  if (language === 'tsx') return 'typescript'
  if (language === 'js') return 'javascript'
  if (language === 'jsx') return 'javascript'
  return language
}

const bootstrapMonaco = async (): Promise<MonacoBootstrap> => {
  if (bootstrapPromise) return bootstrapPromise
  bootstrapPromise = (async () => {
    const [{ Editor, loader }, monaco] = await Promise.all([
      import('@monaco-editor/react'),
      import('monaco-editor'),
      import('monaco-editor/esm/vs/language/typescript/monaco.contribution.js'),
      import('monaco-editor/esm/vs/language/json/monaco.contribution.js'),
      import('monaco-editor/esm/vs/language/css/monaco.contribution.js'),
      import('monaco-editor/min/vs/editor/editor.main.css'),
    ])
    const { ensureMonacoWorkers } = await import('./monacoWorkers.js')
    const typeBundle = await import('./types/monacoTypeBundle.generated.js')
    const { registerPrettierDocumentFormatter } = await import('./monacoPrettierFormatter.js')
    ensureMonacoWorkers()
    loader.config({ monaco })
    registerPrettierDocumentFormatter(monaco)
    return { Editor, loader, monaco, typeBundle }
  })()
  return bootstrapPromise
}

const installTypeBundle = (
  monaco: typeof MonacoTypes,
  typeBundle: typeof import('./types/monacoTypeBundle.generated.js'),
): void => {
  if (typeBundleInstalled) return
  typeBundleInstalled = true
  const languages = monaco.languages as unknown as {
    readonly typescript: MonacoTypeScriptLanguageNamespace
  }
  const compilerOptions = getPlaygroundTypeScriptCompilerOptions(languages.typescript)
  languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions)
  languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions)
  for (const [fileName, content] of Object.entries(typeBundle.monacoTypeBundleFiles)) {
    languages.typescript.typescriptDefaults.addExtraLib(content, fileName)
    languages.typescript.javascriptDefaults.addExtraLib(content, fileName)
  }
  languages.typescript.typescriptDefaults.setEagerModelSync(true)
  languages.typescript.javascriptDefaults.setEagerModelSync(true)
}

const syncVirtualModels = (monaco: typeof MonacoTypes, files: ReadonlyArray<MonacoVirtualFile>): void => {
  for (const file of files) {
    const uri = monaco.Uri.parse(toMonacoFileUri(file.path))
    const model = monaco.editor.getModel(uri)
    if (model) {
      if (model.getValue() !== file.content) model.setValue(file.content)
      continue
    }
    monaco.editor.createModel(file.content, toMonacoLanguage(file.language), uri)
  }
}

interface EditorFallbackSurfaceProps {
  readonly value: string
  readonly ariaLabel: string
  readonly onChange: (value: string) => void
}

function EditorFallbackSurface({ value, ariaLabel, onChange }: EditorFallbackSurfaceProps): React.ReactElement {
  const gutterRef = React.useRef<HTMLDivElement | null>(null)
  const lineCount = React.useMemo(() => getSourceLineCount(value), [value])
  const lineNumbers = React.useMemo(() => Array.from({ length: lineCount }, (_, index) => index + 1), [lineCount])
  const lineNumberSlots = getLineNumberSlots(lineCount)

  return (
    <div
      data-testid="monaco-source-editor-fallback-surface"
      data-editor-stable-gutter="true"
      className="grid h-full min-h-0 w-full overflow-hidden bg-[#1e1e1e] font-mono text-[13px] leading-5 text-[#d4d4d4]"
      style={{ gridTemplateColumns: getFallbackGridTemplateColumns(lineNumberSlots) }}
    >
      <div
        ref={gutterRef}
        data-testid="monaco-source-editor-fallback-gutter"
        aria-hidden="true"
        className="h-full overflow-hidden py-4 text-right tabular-nums text-[#858585] select-none"
      >
        {lineNumbers.map((lineNumber) => (
          <div key={lineNumber} className="h-5 leading-5">
            {lineNumber}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="h-full border-r border-white/5" />
      <textarea
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onScroll={(event) => {
          if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop
        }}
        spellCheck={false}
        className="block h-full min-h-0 w-full resize-none border-0 bg-transparent py-4 pr-4 pl-0 font-mono text-[13px] leading-5 text-[#d4d4d4] outline-none selection:bg-sky-500/40"
      />
    </div>
  )
}

export function MonacoSourceEditor({
  path,
  language,
  value,
  files = [],
  ariaLabel = 'Source editor',
  className,
  onChange,
  preferMonaco = true,
}: MonacoSourceEditorProps): React.ReactElement {
  const monacoRuntimeAvailable = preferMonaco && canUseMonacoBrowserRuntime()
  const [bootstrap, setBootstrap] = React.useState<MonacoBootstrap | undefined>(undefined)
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'fallback'>(
    monacoRuntimeAvailable ? 'loading' : 'fallback',
  )
  const [fallbackReason, setFallbackReason] = React.useState<string | undefined>(
    monacoRuntimeAvailable ? undefined : 'textarea fallback',
  )
  const [typeBundleFileCount, setTypeBundleFileCount] = React.useState(0)
  const filesRef = React.useRef(files)

  React.useEffect(() => {
    filesRef.current = files
  }, [files])

  React.useEffect(() => {
    if (!monacoRuntimeAvailable) {
      setStatus('fallback')
      setFallbackReason('textarea fallback')
      return
    }
    let canceled = false
    setStatus('loading')
    setFallbackReason(undefined)
    void bootstrapMonaco().then(
      (result) => {
        if (canceled) return
        installTypeBundle(result.monaco, result.typeBundle)
        syncVirtualModels(result.monaco, filesRef.current)
        setBootstrap(result)
        setTypeBundleFileCount(result.typeBundle.monacoTypeBundleMeta.stats.filesCount)
        setStatus('ready')
      },
      (error: unknown) => {
        if (canceled) return
        setStatus('fallback')
        setFallbackReason(error instanceof Error ? error.message : String(error))
      },
    )
    return () => {
      canceled = true
    }
  }, [monacoRuntimeAvailable])

  React.useEffect(() => {
    if (!bootstrap || status !== 'ready') return
    syncVirtualModels(bootstrap.monaco, files)
  }, [bootstrap, files, status])

  const languageId = toMonacoLanguage(language)
  const uri = toMonacoFileUri(path)
  const Editor = bootstrap?.Editor
  const lineNumberSlots = getLineNumberSlots(getSourceLineCount(value))

  return (
    <div
      data-testid="monaco-source-editor"
      className={className ?? 'relative min-h-0 flex-1'}
      data-editor-engine={status === 'ready' ? 'monaco' : 'textarea'}
      data-editor-type-bundle={typeBundleFileCount}
    >
      <div role="status" className="sr-only">
        {status === 'ready' ? 'monaco ready' : (fallbackReason ?? 'monaco loading')}
      </div>
      {status === 'ready' && Editor ? (
        <Editor
          value={value}
          language={languageId}
          path={uri}
          theme="vs-dark"
          keepCurrentModel
          saveViewState
          options={{
            ariaLabel,
            fontSize: EDITOR_FONT_SIZE,
            lineHeight: EDITOR_LINE_HEIGHT,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            folding: true,
            glyphMargin: false,
            lineDecorationsWidth: EDITOR_LINE_DECORATIONS_WIDTH,
            lineNumbersMinChars: lineNumberSlots,
            minimap: { enabled: true, maxColumn: 80, renderCharacters: false, showSlider: 'mouseover' },
            padding: { top: EDITOR_VERTICAL_PADDING, bottom: EDITOR_VERTICAL_PADDING },
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
          onChange={(next) => onChange(next ?? '')}
        />
      ) : (
        <EditorFallbackSurface value={value} ariaLabel={ariaLabel} onChange={onChange} />
      )}
    </div>
  )
}
