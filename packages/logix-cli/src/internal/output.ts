import fs from 'node:fs/promises'
import path from 'node:path'

import { Effect } from 'effect'

import { makeCliError } from './errors.js'
import { stableStringifyJson } from './stableJson.js'

const ensureDir = (dir: string): Effect.Effect<void, unknown> =>
  Effect.tryPromise({
    try: () => fs.mkdir(dir, { recursive: true }),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_IO_ERROR',
        message: `[Logix][CLI] 无法创建目录：${dir}`,
        cause,
      }),
  })

export const writeJsonFile = (outDir: string, fileName: string, value: unknown): Effect.Effect<string, unknown> =>
  Effect.gen(function* () {
    const dir = path.resolve(process.cwd(), outDir)
    yield* ensureDir(dir)
    const filePath = path.join(dir, fileName)
    yield* Effect.tryPromise({
      try: () => fs.writeFile(filePath, `${stableStringifyJson(value, 2)}\n`, 'utf8'),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_IO_ERROR',
          message: `[Logix][CLI] 写入失败：${filePath}`,
          cause,
        }),
    })
    return filePath
  })

export const readJsonFile = (filePath: string): Effect.Effect<unknown, unknown> =>
  Effect.tryPromise({
    try: () => fs.readFile(filePath, 'utf8'),
    catch: (cause) =>
      makeCliError({
        code: 'CLI_IO_ERROR',
        message: `[Logix][CLI] 读取失败：${filePath}`,
        cause,
      }),
  }).pipe(
    Effect.flatMap((text) =>
      Effect.try({
        try: () => JSON.parse(text),
        catch: (cause) =>
          makeCliError({
            code: 'CLI_INVALID_INPUT',
            message: `[Logix][CLI] 无法解析 JSON：${filePath}`,
            cause,
          }),
      }),
    ),
  )

const readTextFromStdin = (stdin: NodeJS.ReadStream): Promise<string> =>
  new Promise((resolve, reject) => {
    let text = ''
    try {
      if (typeof stdin.setEncoding === 'function') {
        stdin.setEncoding('utf8')
      }
    } catch {
      // ignore
    }
    stdin.on('data', (chunk) => {
      text += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8')
    })
    stdin.on('end', () => resolve(text))
    stdin.on('error', (err) => reject(err))
  })

const isTtyStdin = (stdin: NodeJS.ReadStream): boolean => Boolean(stdin.isTTY)

export const readJsonInput = (
  input: string,
  options?: { readonly label?: string; readonly stdin?: NodeJS.ReadStream },
): Effect.Effect<unknown, unknown> => {
  const trimmed = String(input).trim()

  if (trimmed === '-') {
    const label = options?.label ?? 'stdin'
    const stdin = options?.stdin ?? process.stdin
    if (isTtyStdin(stdin)) {
      return Effect.fail(
        makeCliError({
          code: 'CLI_STDIN_IS_TTY',
          message: `[Logix][CLI] 无法读取：${label}（stdin 是 TTY；请通过管道输入 JSON，或改用文件路径）`,
        }),
      )
    }

    return Effect.tryPromise({
      try: () => readTextFromStdin(stdin),
      catch: (cause) =>
        makeCliError({
          code: 'CLI_IO_ERROR',
          message: `[Logix][CLI] 读取失败：${label}（stdin）`,
          cause,
        }),
    }).pipe(
      Effect.flatMap((text) =>
        Effect.try({
          try: () => JSON.parse(text),
          catch: (cause) =>
            makeCliError({
              code: 'CLI_INVALID_INPUT',
              message: `[Logix][CLI] 无法解析 JSON：${label}（stdin）`,
              cause,
            }),
        }),
      ),
    )
  }

  return readJsonFile(input)
}
