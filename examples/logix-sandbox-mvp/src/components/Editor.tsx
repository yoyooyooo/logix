import React, { useEffect, useMemo, useRef } from 'react'
import type * as MonacoTypes from 'monaco-editor'
import * as Logix from '@logixjs/core'
import { useDispatch, useLocalModule, useSelector } from '@logixjs/react'
import { Schema } from 'effect'
import 'monaco-editor/min/vs/editor/editor.main.css'
import { ensureTypeSenseInstalled, type TypeSenseStatus } from './editor/typesense'

export type EditorProps = {
  code: string
  onChange: (next: string) => void
  language?: string
  filename?: string
  enableTypeSense?: boolean
  resetKey?: string | number
}

type MonacoBootstrap = {
  readonly MonacoEditor: typeof import('@monaco-editor/react').Editor
  readonly monaco: typeof MonacoTypes
}

const EditorUiModeSchema = Schema.Union(Schema.Literal('textarea'), Schema.Literal('monaco'))
type EditorUiMode = Schema.Schema.Type<typeof EditorUiModeSchema>

const EditorUiFallbackUiSchema = Schema.Union(Schema.Literal('skeleton'), Schema.Literal('textarea'))
type EditorUiFallbackUi = Schema.Schema.Type<typeof EditorUiFallbackUiSchema>

const EditorUiStateSchema = Schema.Struct({
  mode: EditorUiModeSchema,
  inputReadyMs: Schema.NullOr(Schema.Number),
  typeSense: Schema.Any,
  fallbackError: Schema.NullOr(Schema.String),
  fallbackUi: EditorUiFallbackUiSchema,
})

type EditorUiState = {
  readonly mode: EditorUiMode
  readonly inputReadyMs: number | null
  readonly typeSense: TypeSenseStatus
  readonly fallbackError: string | null
  readonly fallbackUi: EditorUiFallbackUi
}

const EditorUiDef = Logix.Module.make('EditorUI', {
  state: EditorUiStateSchema,
  actions: {
    setMode: EditorUiModeSchema,
    setInputReadyMs: Schema.Number,
    setTypeSense: Schema.Any,
    setFallbackError: Schema.NullOr(Schema.String),
    setFallbackUi: EditorUiFallbackUiSchema,
  },
  reducers: {
    setMode: (state, action) => (state.mode === action.payload ? state : { ...state, mode: action.payload }),
    setInputReadyMs: (state, action) =>
      state.inputReadyMs === action.payload ? state : { ...state, inputReadyMs: action.payload },
    setTypeSense: (state, action) =>
      Object.is(state.typeSense, action.payload) ? state : { ...state, typeSense: action.payload },
    setFallbackError: (state, action) =>
      state.fallbackError === action.payload ? state : { ...state, fallbackError: action.payload },
    setFallbackUi: (state, action) =>
      state.fallbackUi === action.payload ? state : { ...state, fallbackUi: action.payload },
  },
})

const MONACO_FALLBACK_DELAY_MS = 120

let monacoBootstrapPromise: Promise<MonacoBootstrap> | null = null

const bootstrapMonaco = async (): Promise<MonacoBootstrap> => {
  if (monacoBootstrapPromise) return await monacoBootstrapPromise

  monacoBootstrapPromise = (async () => {
    const [{ Editor: MonacoEditor, loader }, monaco] = await Promise.all([
      import('@monaco-editor/react'),
      import('monaco-editor'),
      import('monaco-editor/esm/vs/language/typescript/monaco.contribution.js'),
      import('monaco-editor/esm/vs/language/json/monaco.contribution.js'),
      import('monaco-editor/esm/vs/language/css/monaco.contribution.js'),
      import('monaco-editor/esm/vs/language/html/monaco.contribution.js'),
    ])

    const { ensureMonacoWorkers } = await import('./editor/monacoWorkers')
    ensureMonacoWorkers()
    loader.config({ monaco })
    ;(globalThis as any).__LOGIX_MONACO__ = monaco

    return { MonacoEditor, monaco }
  })()

  return await monacoBootstrapPromise
}

const normalizeFileUri = (filename: string): string => {
  if (filename.startsWith('file://')) return filename
  const trimmed = filename.startsWith('/') ? filename.slice(1) : filename
  return `file:///${trimmed}`
}

const toErrorString = (error: unknown): string => {
  if (error instanceof Error) return error.message || String(error)
  return String(error)
}

const withTimeout = async <T,>(promise: Promise<T>, { ms, label }: { ms: number; label: string }): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export const Editor = React.memo(function Editor({
  code,
  onChange,
  language = 'plaintext',
  filename = 'input.txt',
  enableTypeSense = false,
  resetKey,
}: EditorProps) {
  const editorUi = useLocalModule(EditorUiDef, {
    key: 'examples.logix-sandbox-mvp:EditorUI',
    initial: {
      mode: 'textarea',
      inputReadyMs: null,
      typeSense: { status: 'idle' },
      fallbackError: null,
      fallbackUi: enableTypeSense ? 'skeleton' : 'textarea',
    },
    deps: [enableTypeSense],
  })

  const dispatchEditorUi = useDispatch(editorUi)
  const view = useSelector(editorUi, (s) => ({
    mode: s.mode,
    inputReadyMs: s.inputReadyMs,
    typeSense: s.typeSense as TypeSenseStatus,
    fallbackError: s.fallbackError,
    fallbackUi: s.fallbackUi,
  }))

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const startedAtMsRef = useRef<number>(performance.now())
  const monacoEditorRef = useRef<MonacoBootstrap['MonacoEditor'] | null>(null)

  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null)
  const resetKeyRef = useRef<string | number | undefined>(undefined)

  const filenameUri = useMemo(() => normalizeFileUri(filename), [filename])
  const theme = useMemo(() => {
    try {
      return document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
    } catch {
      return 'light'
    }
  }, [])

  // 非受控：输入时不由 React 反复回写 value，避免 selection/cursor 被重置到末尾。
  // 仅当外部 code 发生变化（初始化/重置/切换）且与当前 DOM 值不同，才同步写回。
  useEffect(() => {
    if (view.mode !== 'textarea') return
    const el = textareaRef.current
    if (!el) return
    if (el.value !== code) {
      el.value = code
    }
  }, [code, view.mode])

  useEffect(() => {
    if (view.inputReadyMs !== null) return
    dispatchEditorUi({
      _tag: 'setInputReadyMs',
      payload: Math.max(0, Math.round(performance.now() - startedAtMsRef.current)),
    })
  }, [dispatchEditorUi, view.inputReadyMs])

  useEffect(() => {
    if (!enableTypeSense) {
      dispatchEditorUi({ _tag: 'setMode', payload: 'textarea' })
      return
    }
    if (view.mode === 'monaco') return

    let canceled = false
    dispatchEditorUi({ _tag: 'setFallbackError', payload: null })

    bootstrapMonaco()
      .then(({ MonacoEditor }) => {
        if (canceled) return
        monacoEditorRef.current = MonacoEditor
        dispatchEditorUi({ _tag: 'setMode', payload: 'monaco' })
      })
      .catch((e) => {
        if (canceled) return
        dispatchEditorUi({ _tag: 'setFallbackError', payload: `Monaco 加载失败：${toErrorString(e)}` })
        dispatchEditorUi({ _tag: 'setMode', payload: 'textarea' })
      })

    return () => {
      canceled = true
    }
  }, [dispatchEditorUi, enableTypeSense, view.mode])

  useEffect(() => {
    if (!enableTypeSense) {
      dispatchEditorUi({ _tag: 'setFallbackUi', payload: 'textarea' })
      return
    }
    if (view.mode === 'monaco') return
    if (view.fallbackError) {
      dispatchEditorUi({ _tag: 'setFallbackUi', payload: 'textarea' })
      return
    }

    dispatchEditorUi({ _tag: 'setFallbackUi', payload: 'skeleton' })
    const timeout = setTimeout(
      () => dispatchEditorUi({ _tag: 'setFallbackUi', payload: 'textarea' }),
      MONACO_FALLBACK_DELAY_MS,
    )
    return () => clearTimeout(timeout)
  }, [dispatchEditorUi, enableTypeSense, view.fallbackError, view.mode])

  useEffect(() => {
    if (resetKey === undefined) return
    if (resetKeyRef.current === undefined) {
      resetKeyRef.current = resetKey
      return
    }
    if (resetKeyRef.current === resetKey) return
    resetKeyRef.current = resetKey

    const editor = editorRef.current
    if (!editor) return

    editor.setPosition({ lineNumber: 1, column: 1 })
    editor.setScrollTop(0)
  }, [resetKey])

  const handleFormatDocument = () => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run()
  }

  const handleFormatSelection = () => {
    editorRef.current?.getAction('editor.action.formatSelection')?.run()
  }

  const showTypeSense = enableTypeSense && (language === 'typescript' || language === 'javascript')

  const MonacoEditor = monacoEditorRef.current
  const monacoReady = view.mode === 'monaco' && MonacoEditor

  return (
    <div className="absolute inset-0">
      {monacoReady ? (
        <div className="absolute inset-0">
          <MonacoEditor
            value={code}
            language={language}
            path={filenameUri}
            theme={theme as any}
            keepCurrentModel
            saveViewState
            options={{
              fontSize: 13,
              lineHeight: 20,
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
            onMount={(editor, monaco) => {
              editorRef.current = editor
              const monacoApi = monaco as unknown as typeof MonacoTypes

              if (!showTypeSense) {
                dispatchEditorUi({ _tag: 'setTypeSense', payload: { status: 'idle' } satisfies TypeSenseStatus })
                return
              }

              dispatchEditorUi({ _tag: 'setTypeSense', payload: { status: 'loading' } satisfies TypeSenseStatus })

              ensureTypeSenseInstalled(monacoApi)
                .then(async ({ meta }) => {
                  const workerFactory = await withTimeout(monacoApi.typescript.getTypeScriptWorker(), {
                    ms: 10_000,
                    label: 'getTypeScriptWorker',
                  })
                  const uri = monacoApi.Uri.parse(filenameUri)
                  const worker = await withTimeout(workerFactory(uri), { ms: 10_000, label: 'workerFactory' })
                  await withTimeout(worker.getSemanticDiagnostics(uri.toString()), {
                    ms: 10_000,
                    label: 'getSemanticDiagnostics',
                  })

                  dispatchEditorUi({
                    _tag: 'setTypeSense',
                    payload: {
                      status: 'ready',
                      typeSenseReadyMs: Math.max(0, Math.round(performance.now() - startedAtMsRef.current)),
                      meta,
                    } satisfies TypeSenseStatus,
                  })
                })
                .catch((e) => {
                  const error = toErrorString(e)
                  dispatchEditorUi({
                    _tag: 'setTypeSense',
                    payload: {
                      status: 'error',
                      error,
                      suggestion:
                        '建议：刷新页面；或运行 pnpm -C examples/logix-sandbox-mvp gen:monaco:types（必要时加 -- --force）后重试。',
                    } satisfies TypeSenseStatus,
                  })
                  dispatchEditorUi({ _tag: 'setFallbackError', payload: `Type Sense 初始化失败：${error}` })
                  dispatchEditorUi({ _tag: 'setMode', payload: 'textarea' })
                })
            }}
            onChange={(value) => onChange(value ?? '')}
          />

          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={handleFormatDocument}
              className="px-2 py-1 text-[11px] rounded border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/70 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-950"
            >
              Format
            </button>
            <button
              type="button"
              onClick={handleFormatSelection}
              className="px-2 py-1 text-[11px] rounded border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/70 text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-950"
            >
              Selection
            </button>
          </div>

          <div className="absolute bottom-2 left-2 z-10 max-w-[80%] rounded border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/70 px-2 py-1 text-[10px] text-zinc-600 dark:text-zinc-300">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>inputReadyMs: {view.inputReadyMs ?? '-'}</span>
              {showTypeSense ? (
                view.typeSense.status === 'ready' ? (
                  <span>typeSense: ready ({view.typeSense.typeSenseReadyMs}ms)</span>
                ) : view.typeSense.status === 'loading' ? (
                  <span>typeSense: loading…</span>
                ) : view.typeSense.status === 'error' ? (
                  <span>typeSense: error</span>
                ) : (
                  <span>typeSense: idle</span>
                )
              ) : null}
              {view.typeSense.status === 'ready' && view.typeSense.meta?.stats ? (
                <span>
                  bundle: {view.typeSense.meta.stats.filesCount} files /{' '}
                  {formatBytes(view.typeSense.meta.stats.totalBytes)}
                </span>
              ) : null}
            </div>

            {view.typeSense.status === 'ready' && view.typeSense.meta?.packages?.length ? (
              <details className="mt-1">
                <summary className="cursor-pointer select-none">packages</summary>
                <div className="mt-1 grid grid-cols-1 gap-0.5">
                  {view.typeSense.meta.packages.map((p) => (
                    <div key={p.name} className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                      {p.name}@{p.version}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            {view.typeSense.status === 'error' ? (
              <div className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 break-words">
                {view.typeSense.error}
                {view.typeSense.suggestion ? (
                  <div className="mt-0.5 text-zinc-600 dark:text-zinc-400">{view.typeSense.suggestion}</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0">
          {view.fallbackError ? (
            <div className="absolute top-2 left-2 z-10 max-w-[90%] rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              {view.fallbackError}
            </div>
          ) : null}

          {enableTypeSense && !view.fallbackError && view.fallbackUi === 'skeleton' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-zinc-950/20">
              <div className="rounded border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/70 px-3 py-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                正在加载 Monaco…
              </div>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              defaultValue={code}
              onChange={(e) => onChange(e.currentTarget.value)}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-4 font-mono text-[13px] leading-relaxed bg-transparent text-zinc-700 dark:text-zinc-300 resize-none focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
              style={{ tabSize: 2 }}
            />
          )}
        </div>
      )}
    </div>
  )
})
