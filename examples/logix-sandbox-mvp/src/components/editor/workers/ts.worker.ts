import { start } from 'monaco-editor/esm/vs/editor/editor.worker.start.js'
import { create } from 'monaco-editor/esm/vs/language/typescript/tsWorker.js'

type ExtraLib = { readonly content: string; readonly version: number }
type ExtraLibs = Record<string, ExtraLib>

const LOGIX_PRELUDE_FILE = 'file:///__logix_sandbox_prelude__.d.ts'
const LOGIX_PRELUDE_CONTENT = `declare const Logix: typeof import('@logixjs/core')\n`

const crash = (error: unknown): never => {
  const err = error instanceof Error ? error : new Error(String(error))
  setTimeout(() => {
    throw err
  }, 0)
  throw err
}

const loadTypeBundleFiles = async (): Promise<Record<string, string>> => {
  const res = await fetch('/monacoTypeBundle.generated.files.json')
  if (!res.ok) {
    throw new Error(`加载 monacoTypeBundle 失败：HTTP ${res.status}`)
  }
  return (await res.json()) as Record<string, string>
}

const toExtraLibs = (files: Record<string, string>): ExtraLibs => {
  const libs: ExtraLibs = {}
  let version = 1
  for (const [fileName, content] of Object.entries(files)) {
    libs[fileName] = { content, version }
    version += 1
  }
  return libs
}

const patchCompilerOptions = (compilerOptions: any): any => ({
  ...compilerOptions,
  target: 7, // ES2020（至少 ES2015，避免 yield* 的 downlevelIteration 噪声）
  // TS compilerOptions.lib 在“直接传对象”场景下要写成 lib 文件名（不是 tsconfig 里的简写）。
  // 否则 TS 会把 'es2020' 当作路径去 resolve，导致缺失 Array/IterableIterator 等全局类型。
  lib: ['lib.es2020.d.ts', 'lib.webworker.d.ts'],
  moduleResolution: 100, // Bundler (close to Vite semantics)
  module: 99, // ESNext
  noEmit: true,
  downlevelIteration: true,
  jsx: 4, // ReactJSX
})

const bundleFilesPromise = loadTypeBundleFiles()

const boot = (createData: any, bundleFiles: Record<string, string>) => {
  const extraLibs: ExtraLibs = {
    ...(createData.extraLibs ?? {}),
    ...toExtraLibs(bundleFiles),
    [LOGIX_PRELUDE_FILE]: { content: LOGIX_PRELUDE_CONTENT, version: 1 },
  }

  start((ctx: any) => {
    return create(ctx, {
      ...createData,
      extraLibs,
      compilerOptions: patchCompilerOptions(createData.compilerOptions ?? {}),
    })
  })
}

// Monaco 的 createWebWorker 会先 postMessage('ignore')，再 postMessage(createData)。
// 这里对齐官方 ts.worker.js 的握手：首包只用于“激活初始化”，第二包才是 createData。
const looksLikeCreateData = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false
  const record = data as Record<string, unknown>
  return 'compilerOptions' in record || 'extraLibs' in record || 'inlayHintsOptions' in record
}

type InitPhase = 'wakeup' | 'createData' | 'queue'

let initPhase: InitPhase = 'wakeup'
let createData: any | null = null
let bootStarted = false
let queued: MessageEvent[] = []

const bootIfReady = () => {
  if (bootStarted) return
  if (!createData) return
  bootStarted = true

  bundleFilesPromise
    .then((files) => {
      boot(createData, files)
      const flush = queued
      queued = []
      for (const msg of flush) {
        ;(globalThis as any).onmessage?.(msg)
      }
    })
    .catch((e) => {
      console.error('[Sandbox] TS Worker init failed', e)
      crash(e)
    })
}

self.onmessage = (event: MessageEvent) => {
  if (!createData) {
    if (initPhase === 'wakeup') {
      initPhase = 'createData'
      if (!looksLikeCreateData(event.data)) return
    }
    initPhase = 'queue'
    createData = event.data
    bootIfReady()
    return
  }
  queued.push(event)
}
