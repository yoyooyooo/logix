import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { Effect } from 'effect'
import { tsImport } from 'tsx/esm/api'

import { makeCliError } from './errors.js'

export interface ProgramEntryRef {
  readonly modulePath: string
  readonly exportName: string
}

const isCliError = (value: unknown): value is ReturnType<typeof makeCliError> =>
  Boolean(value && typeof value === 'object' && typeof (value as any).code === 'string')

const isProgram = (value: unknown): boolean =>
  Boolean(value && typeof value === 'object' && (value as any)._kind === 'Program')

const importEntryModule = async (modulePath: string): Promise<Record<string, unknown>> => {
  const resolved = path.resolve(modulePath)
  const fileUrl = pathToFileURL(resolved).href
  if (resolved.endsWith('.ts') || resolved.endsWith('.tsx')) {
    return (await tsImport(fileUrl, import.meta.url)) as Record<string, unknown>
  }
  return (await import(fileUrl)) as Record<string, unknown>
}

export const loadProgramEntry = (
  entry: ProgramEntryRef,
): Effect.Effect<unknown, ReturnType<typeof makeCliError>> =>
  Effect.tryPromise({
    try: async () => {
      const mod = await importEntryModule(entry.modulePath)
      if (!(entry.exportName in mod)) {
        throw makeCliError({
          code: 'CLI_ENTRY_NO_EXPORT',
          message: `[Logix][CLI] entry export not found: ${entry.exportName}`,
        })
      }

      const value = mod[entry.exportName]
      if (!isProgram(value)) {
        throw makeCliError({
          code: 'CLI_ENTRY_NOT_PROGRAM',
          message: `[Logix][CLI] entry must export Program: ${entry.modulePath}#${entry.exportName}`,
        })
      }
      return value
    },
    catch: (cause) =>
      isCliError(cause)
        ? cause
        : makeCliError({
            code: 'CLI_ENTRY_IMPORT_FAILED',
            message: `[Logix][CLI] failed to import Program entry: ${entry.modulePath}#${entry.exportName}`,
            cause,
          }),
  })
