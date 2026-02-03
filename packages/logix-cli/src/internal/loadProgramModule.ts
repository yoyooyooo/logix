import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { Effect } from 'effect'
import { tsImport } from 'tsx/esm/api'

import type { CliHost, EntryRef } from './args.js'
import { makeCliError } from './errors.js'
import { getHostAdapter } from './host/Host.js'

const detectMissingBrowserGlobal = (cause: unknown): string | undefined => {
  const msg =
    cause && typeof cause === 'object' && 'message' in (cause as any) ? String((cause as any).message) : typeof cause === 'string' ? cause : ''

  // Common ReferenceError messages in Node.
  for (const g of ['window', 'document', 'navigator', 'location', 'self'] as const) {
    if (msg.includes(`${g} is not defined`)) return g
  }
  return undefined
}

export const loadProgramModule = (entry: EntryRef, options?: { readonly host: CliHost }): Effect.Effect<unknown, unknown> =>
  Effect.tryPromise({
    try: async () => {
      const host = options?.host ?? 'node'
      const restore = await getHostAdapter(host).install()
      try {
      const abs = path.resolve(process.cwd(), entry.modulePath)
      const mod = await tsImport(pathToFileURL(abs).toString(), { parentURL: import.meta.url })

      if (entry.exportName === 'default') {
        if (!('default' in mod)) {
          throw makeCliError({
            code: 'CLI_ENTRY_NO_EXPORT',
            message: `入口没有 default export：${entry.modulePath}`,
          })
        }
        return (mod as any).default
      }

      if (!(entry.exportName in mod)) {
        const keys = Object.keys(mod).sort().join(', ')
        throw makeCliError({
          code: 'CLI_ENTRY_NO_EXPORT',
          message: `入口缺少 export "${entry.exportName}"：${entry.modulePath}`,
          hint: keys.length > 0 ? `available=[${keys}]` : undefined,
        })
      }

      return (mod as any)[entry.exportName]
      } finally {
        await restore()
      }
    },
    catch: (cause) => {
      const host = options?.host ?? 'node'
      const missing = detectMissingBrowserGlobal(cause)
      if (missing) {
        if (host === 'node') {
          return makeCliError({
            code: 'CLI_HOST_MISSING_BROWSER_GLOBAL',
            message: `入口依赖浏览器全局（${missing}），但当前 host=node：${entry.modulePath}`,
            hint: '尝试加上：--host browser-mock（或把浏览器代码移出模块顶层）',
            cause,
          })
        }
        return makeCliError({
          code: 'CLI_HOST_MISMATCH',
          message: `入口加载失败（host=${host} 仍缺少浏览器全局：${missing}）：${entry.modulePath}`,
          hint: '请检查 browser-mock 能力覆盖面，或把浏览器代码移出模块顶层。',
          cause,
        })
      }

      return makeCliError({
        code: 'CLI_ENTRY_IMPORT_FAILED',
        message: `入口加载失败：${entry.modulePath}`,
        cause,
      })
    },
  })
