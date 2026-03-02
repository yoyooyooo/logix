import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { Window } from 'happy-dom'
import { Effect } from 'effect'
import { tsImport } from 'tsx/esm/api'

import type { CliHost, EntryRef } from './args.js'
import { makeCliError } from './errors.js'

const browserGlobalErrorMarkers: ReadonlyArray<string> = [
  'window is not defined',
  'document is not defined',
  'navigator is not defined',
  'location is not defined',
  'localstorage is not defined',
  'sessionstorage is not defined',
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const toErrorMessage = (cause: unknown): string => {
  if (typeof cause === 'string') return cause
  if (cause instanceof Error) return cause.message
  if (isRecord(cause) && typeof cause.message === 'string') return cause.message
  return ''
}

const isBrowserGlobalImportFailure = (cause: unknown): boolean => {
  const msg = toErrorMessage(cause).toLowerCase()
  return browserGlobalErrorMarkers.some((marker) => msg.includes(marker))
}

const hasCliErrorCode = (cause: unknown): boolean =>
  isRecord(cause) && typeof cause.code === 'string' && cause.code.startsWith('CLI_')

let browserMockWindow: Window | undefined

const installGlobal = (key: string, value: unknown): void => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, key)
  if (!desc) {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: false,
    })
    return
  }

  if (desc.writable || typeof desc.set === 'function') {
    ;(globalThis as Record<string, unknown>)[key] = value
    return
  }

  if (desc.configurable) {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: desc.enumerable ?? false,
    })
  }
}

const ensureBrowserMockGlobals = async (): Promise<void> => {
  if (browserMockWindow) return
  const mod = await import('happy-dom')
  const window = new mod.Window()
  browserMockWindow = window

  installGlobal('window', window)
  installGlobal('self', window)
  installGlobal('document', window.document)
  installGlobal('navigator', window.navigator)
  installGlobal('location', window.location)
  installGlobal('HTMLElement', window.HTMLElement)
  installGlobal('Node', window.Node)
  installGlobal('Event', window.Event)
  installGlobal('CustomEvent', window.CustomEvent)
  installGlobal('MutationObserver', window.MutationObserver)
  installGlobal('requestAnimationFrame', window.requestAnimationFrame.bind(window))
  installGlobal('cancelAnimationFrame', window.cancelAnimationFrame.bind(window))
}

const importEntryModule = async (modulePathAbs: string): Promise<Record<string, unknown>> => {
  const fileUrl = pathToFileURL(modulePathAbs).href
  const loaded = await tsImport(fileUrl, { parentURL: import.meta.url })
  if (!isRecord(loaded)) return {}
  return loaded
}

const toImportFailure = (args: {
  readonly entry: EntryRef
  readonly host: CliHost
  readonly cause: unknown
}): unknown => {
  if (hasCliErrorCode(args.cause)) return args.cause

  if (isBrowserGlobalImportFailure(args.cause)) {
    return makeCliError({
      code: args.host === 'node' ? 'CLI_HOST_MISSING_BROWSER_GLOBAL' : 'CLI_HOST_MISMATCH',
      message:
        args.host === 'node'
          ? `[Logix][CLI] 入口依赖浏览器全局：${args.entry.modulePath}#${args.entry.exportName}`
          : `[Logix][CLI] browser-mock 与入口语义可能不匹配：${args.entry.modulePath}#${args.entry.exportName}`,
      hint:
        args.host === 'node'
          ? '可使用 --host browser-mock 重跑，或把浏览器依赖移出入口模块顶层。'
          : '请检查入口是否直接访问真实浏览器能力（window/document），或调整入口导出语义。',
      cause: args.cause,
    })
  }

  return makeCliError({
    code: 'CLI_ENTRY_IMPORT_FAILED',
    message: `[Logix][CLI] 入口加载失败：${args.entry.modulePath}#${args.entry.exportName}`,
    cause: args.cause,
  })
}

export const loadEntryExport = (args: {
  readonly entry: EntryRef
  readonly host: CliHost
}): Effect.Effect<unknown, unknown> =>
  Effect.tryPromise({
    try: async () => {
      const modulePathAbs = path.resolve(process.cwd(), args.entry.modulePath)
      if (args.host === 'browser-mock') {
        await ensureBrowserMockGlobals()
      }

      const loaded = await importEntryModule(modulePathAbs)
      if (!(args.entry.exportName in loaded) || loaded[args.entry.exportName] === undefined) {
        throw makeCliError({
          code: 'CLI_ENTRY_NO_EXPORT',
          message: `[Logix][CLI] 入口缺少导出：${args.entry.modulePath}#${args.entry.exportName}`,
          hint: '请确认 --entry 的 exportName 存在且为可执行入口。',
        })
      }

      return loaded[args.entry.exportName]
    },
    catch: (cause) =>
      toImportFailure({
        entry: args.entry,
        host: args.host,
        cause,
      }),
  })
