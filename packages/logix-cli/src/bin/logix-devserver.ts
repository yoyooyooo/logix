#!/usr/bin/env node
import process from 'node:process'
import fs from 'node:fs/promises'

import { stableStringifyJson } from '../internal/stableJson.js'
import { callDevServer } from '../internal/devserver/client.js'
import {
  DEVSERVER_PROTOCOL_V1,
  type DevServerResponse,
  type DevServerStartFailedV1,
  type DevServerStartedV1,
  type DevServerStateV1,
  type DevServerStatusV1,
  type DevServerStopResultV1,
} from '../internal/devserver/protocol.js'
import { startDevServer } from '../internal/devserver/server.js'
import {
  deleteDevServerStateFile,
  readDevServerStateFile,
  resolveDevServerStateFile,
  writeDevServerStateFile,
} from '../internal/devserver/state.js'

const writeStdout = (text: string): void => {
  process.stdout.write(text.endsWith('\n') ? text : `${text}\n`)
}

const printHelp = (): string => `logix-devserver

用法:
  logix-devserver [start] [--host <ip>] [--port <n>] [--maxMessageBytes <n>] [--shutdownAfterMs <ms>] [--token <token>] [--stateFile <path>] [--allowWrite|--readOnly]
  logix-devserver status [--stateFile <path>] [--timeoutMs <ms>] [--token <token>]
  logix-devserver health [--stateFile <path>] [--timeoutMs <ms>] [--token <token>]
  logix-devserver stop   [--stateFile <path>] [--timeoutMs <ms>] [--token <token>]

  logix-devserver call [--url <ws://...>] [--stateFile <path>] [--token <token>]
    --requestId <id> --method dev.info

  logix-devserver call [--url <ws://...>] [--stateFile <path>] [--token <token>]
    --requestId <id> --method dev.workspace.snapshot [--maxBytes <n>]

  logix-devserver call [--url <ws://...>] [--stateFile <path>] [--token <token>]
    --requestId <id> --method dev.run -- <logix argv...>

  logix-devserver call [--url <ws://...>] [--stateFile <path>] [--token <token>]
    --requestId <id> --method dev.runChecks --checks <typecheck,lint,test> [--timeoutMs <ms>]

  logix-devserver call [--url <ws://...>] [--stateFile <path>] [--token <token>]
    --requestId <id> --method dev.cancel --targetRequestId <id>

环境变量:
  LOGIX_DEVSERVER_STATE_FILE  # state file 路径（flags 优先）
  LOGIX_DEVSERVER_TOKEN       # token（flags 优先）

参数:
  --host <ip>            默认 127.0.0.1
  --port <n>             默认 0（随机可用端口）
  --maxMessageBytes <n>  默认 1000000
  --shutdownAfterMs <ms> 可选：到时自动关闭（用于 CI/测试）
  --stateFile <path>     可选：state file（默认基于 repoRoot 的 tmp 路径）
  --token <token>        可选：启用请求鉴权（客户端需同时提供）
  --allowWrite           可选：显式允许写回（默认只读；会影响 capabilities.write）
  --readOnly             可选：显式只读（与 --allowWrite 互斥；等价于默认）

call 参数:
  --url <ws://...>       可选：devserver url（未提供时从 state file 读取）
  --requestId <id>       必填：关联请求
  --method <name>        必填：dev.info|dev.workspace.snapshot|dev.run|dev.runChecks|dev.cancel|dev.stop
  --timeoutMs <ms>       可选：默认 30000（dev.runChecks 为 120000）
  --includeEvents        可选：把 event 累积到最终 response 的 events 字段
  --trace                dev.run 可选：请求 trace 事件桥接（需同时在 logix argv 中显式包含 --includeTrace）
  --traceMaxBytes <n>    dev.run 可选：trace 预算（默认 524288）
  --traceChunkBytes <n>  dev.run 可选：单个 chunk 预算（默认 16384）
  --checks <csv>         dev.runChecks 必填：typecheck|lint|test（逗号分隔）
  --targetRequestId <id> dev.cancel 必填：目标 requestId
  --maxBytes <n>         dev.workspace.snapshot 可选：cliConfig 返回预算（默认 65536）
  -h, --help             显示帮助
`

const getFlag = (argv: ReadonlyArray<string>, name: string): string | undefined => {
  const idx = argv.lastIndexOf(`--${name}`)
  if (idx < 0) return undefined
  const next = argv[idx + 1]
  if (!next || next.startsWith('--')) throw new Error(`--${name} 缺少参数`)
  return next
}

const hasFlag = (argv: ReadonlyArray<string>, name: string): boolean => argv.includes(`--${name}`)

const parseIntFlag = (argv: ReadonlyArray<string>, name: string): number | undefined => {
  const raw = getFlag(argv, name)
  if (!raw) return undefined
  const n = Number(raw)
  if (!Number.isFinite(n)) throw new Error(`--${name} 必须是数字`)
  return Math.floor(n)
}

const parseCsv = (raw: string): ReadonlyArray<string> =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

const resolveToken = (argv: ReadonlyArray<string>, state?: DevServerStateV1): string | undefined => {
  const flag = getFlag(argv, 'token')?.trim()
  if (flag) return flag
  if (state?.token) return state.token
  const env = process.env.LOGIX_DEVSERVER_TOKEN?.trim()
  return env && env.length > 0 ? env : undefined
}

const makeCallErrorResponse = (args: {
  readonly requestId: string
  readonly code: string
  readonly message: string
  readonly data?: unknown
}): DevServerResponse => ({
  protocol: DEVSERVER_PROTOCOL_V1,
  type: 'response',
  requestId: args.requestId,
  ok: false,
  error: { code: args.code, message: args.message, ...(args.data !== undefined ? { data: args.data } : null) },
})

const runStart = async (argv: ReadonlyArray<string>): Promise<number> => {
  const pkgUrl = new URL('../../package.json', import.meta.url)
  const pkgRaw = JSON.parse(await fs.readFile(pkgUrl, 'utf8')) as { readonly version?: unknown }
  const version = typeof pkgRaw.version === 'string' ? pkgRaw.version : '0.0.0'

  const host = getFlag(argv, 'host') ?? '127.0.0.1'
  const port = parseIntFlag(argv, 'port') ?? 0
  const maxMessageBytes = parseIntFlag(argv, 'maxMessageBytes') ?? 1_000_000
  const shutdownAfterMs = parseIntFlag(argv, 'shutdownAfterMs')
  const token = getFlag(argv, 'token')?.trim() || process.env.LOGIX_DEVSERVER_TOKEN?.trim() || undefined
  const allowWrite = hasFlag(argv, 'allowWrite')
  const readOnly = hasFlag(argv, 'readOnly')
  if (allowWrite && readOnly) {
    const failed: DevServerStartFailedV1 = {
      schemaVersion: 1,
      kind: 'DevServerStartFailed',
      protocol: DEVSERVER_PROTOCOL_V1,
      error: { code: 'ERR_INVALID_ARGS', message: 'flags are mutually exclusive: --allowWrite and --readOnly' },
    }
    writeStdout(stableStringifyJson(failed))
    return 2
  }

  const stateFile = await resolveDevServerStateFile({ cwd: process.cwd(), stateFile: getFlag(argv, 'stateFile') })

  try {
    const runtime = await startDevServer({
      host,
      port,
      maxMessageBytes,
      shutdownAfterMs,
      version,
      cwd: process.cwd(),
      ...(token ? { token } : null),
      allowWrite,
    })

    const state: DevServerStateV1 = {
      schemaVersion: 1,
      kind: 'DevServerState',
      protocol: DEVSERVER_PROTOCOL_V1,
      url: runtime.url,
      pid: process.pid,
      cwd: process.cwd(),
      host: runtime.host,
      port: runtime.port,
      ...(token ? { token } : null),
    }

    try {
      await writeDevServerStateFile(stateFile, state)
    } catch (cause) {
      await runtime.close()
      throw cause
    }

    const started: DevServerStartedV1 = {
      schemaVersion: 1,
      kind: 'DevServerStarted',
      protocol: DEVSERVER_PROTOCOL_V1,
      host: runtime.host,
      port: runtime.port,
      url: runtime.url,
      pid: process.pid,
      stateFile,
    }
    writeStdout(stableStringifyJson(started))

    await runtime.closed
    await deleteDevServerStateFile(stateFile)
    return 0
  } catch (cause) {
    const failed: DevServerStartFailedV1 = {
      schemaVersion: 1,
      kind: 'DevServerStartFailed',
      protocol: DEVSERVER_PROTOCOL_V1,
      error: { code: 'ERR_START_FAILED', message: String(cause) },
    }
    writeStdout(stableStringifyJson(failed))
    return 1
  }
}

const runStatus = async (argv: ReadonlyArray<string>): Promise<{ readonly code: 0 | 1; readonly out: DevServerStatusV1 }> => {
  const stateFile = await resolveDevServerStateFile({ cwd: process.cwd(), stateFile: getFlag(argv, 'stateFile') })
  const state = await readDevServerStateFile(stateFile)

  if (!state) {
    return {
      code: 1,
      out: {
        schemaVersion: 1,
        kind: 'DevServerStatus',
        protocol: DEVSERVER_PROTOCOL_V1,
        ok: false,
        error: { code: 'ERR_STATE_NOT_FOUND', message: `state file not found: ${stateFile}` },
      },
    }
  }

  const token = resolveToken(argv, state)
  const timeoutMs = parseIntFlag(argv, 'timeoutMs') ?? 10_000

  try {
    const { response } = await callDevServer({
      url: state.url,
      requestId: 'devserver-status',
      method: 'dev.info',
      params: {},
      ...(token ? { token } : null),
      timeoutMs,
      includeEvents: false,
    })

    if (!response.ok) {
      return {
        code: 1,
        out: {
          schemaVersion: 1,
          kind: 'DevServerStatus',
          protocol: DEVSERVER_PROTOCOL_V1,
          ok: false,
          state,
          error: { code: response.error.code, message: response.error.message },
        },
      }
    }

    const info = response.result as any
    if (typeof info?.protocol !== 'string' || typeof info?.version !== 'string' || typeof info?.cwd !== 'string') {
      return {
        code: 1,
        out: {
          schemaVersion: 1,
          kind: 'DevServerStatus',
          protocol: DEVSERVER_PROTOCOL_V1,
          ok: false,
          state,
          error: { code: 'ERR_INVALID_RESPONSE', message: 'invalid dev.info response' },
        },
      }
    }

    return {
      code: 0,
      out: {
        schemaVersion: 1,
        kind: 'DevServerStatus',
        protocol: DEVSERVER_PROTOCOL_V1,
        ok: true,
        state,
        info: { protocol: DEVSERVER_PROTOCOL_V1, version: info.version, cwd: info.cwd },
      },
    }
  } catch (cause) {
    return {
      code: 1,
      out: {
        schemaVersion: 1,
        kind: 'DevServerStatus',
        protocol: DEVSERVER_PROTOCOL_V1,
        ok: false,
        state,
        error: { code: 'ERR_CALL_FAILED', message: String(cause) },
      },
    }
  }
}

const runStop = async (argv: ReadonlyArray<string>): Promise<{ readonly code: 0 | 1; readonly out: DevServerStopResultV1 }> => {
  const stateFile = await resolveDevServerStateFile({ cwd: process.cwd(), stateFile: getFlag(argv, 'stateFile') })
  const state = await readDevServerStateFile(stateFile)
  if (!state) {
    return {
      code: 1,
      out: {
        schemaVersion: 1,
        kind: 'DevServerStopResult',
        protocol: DEVSERVER_PROTOCOL_V1,
        ok: false,
        error: { code: 'ERR_STATE_NOT_FOUND', message: `state file not found: ${stateFile}` },
      },
    }
  }

  const token = resolveToken(argv, state)
  const timeoutMs = parseIntFlag(argv, 'timeoutMs') ?? 10_000

  try {
    const { response } = await callDevServer({
      url: state.url,
      requestId: 'devserver-stop',
      method: 'dev.stop',
      params: {},
      ...(token ? { token } : null),
      timeoutMs,
      includeEvents: false,
    })

    if (!response.ok) {
      return {
        code: 1,
        out: {
          schemaVersion: 1,
          kind: 'DevServerStopResult',
          protocol: DEVSERVER_PROTOCOL_V1,
          ok: false,
          error: { code: response.error.code, message: response.error.message },
        },
      }
    }

    await deleteDevServerStateFile(stateFile)
    return {
      code: 0,
      out: {
        schemaVersion: 1,
        kind: 'DevServerStopResult',
        protocol: DEVSERVER_PROTOCOL_V1,
        ok: true,
        stopped: true,
      },
    }
  } catch (cause) {
    return {
      code: 1,
      out: {
        schemaVersion: 1,
        kind: 'DevServerStopResult',
        protocol: DEVSERVER_PROTOCOL_V1,
        ok: false,
        error: { code: 'ERR_CALL_FAILED', message: String(cause) },
      },
    }
  }
}

const runCall = async (
  argv: ReadonlyArray<string>,
): Promise<{ readonly code: 0 | 1 | 2; readonly out: DevServerResponse | (DevServerResponse & { readonly events: unknown }) }> => {
  try {
    const requestId = getFlag(argv, 'requestId')
    const methodRaw = getFlag(argv, 'method')
    const method =
      methodRaw === 'dev.info' ||
      methodRaw === 'dev.workspace.snapshot' ||
      methodRaw === 'dev.run' ||
      methodRaw === 'dev.runChecks' ||
      methodRaw === 'dev.cancel' ||
      methodRaw === 'dev.stop'
        ? methodRaw
        : undefined

    if (!requestId) {
      return { code: 2, out: makeCallErrorResponse({ requestId: 'unknown', code: 'ERR_INVALID_ARGS', message: 'missing --requestId' }) }
    }
    if (!method) {
      return {
        code: 2,
        out: makeCallErrorResponse({
          requestId,
          code: 'ERR_INVALID_ARGS',
          message: 'missing/invalid --method (dev.info|dev.workspace.snapshot|dev.run|dev.runChecks|dev.cancel|dev.stop)',
        }),
      }
    }

    const stateFile = await resolveDevServerStateFile({ cwd: process.cwd(), stateFile: getFlag(argv, 'stateFile') })
    const state = await readDevServerStateFile(stateFile)
    const url = getFlag(argv, 'url') ?? state?.url
    if (!url) {
      return {
        code: 2,
        out: makeCallErrorResponse({ requestId, code: 'ERR_INVALID_ARGS', message: 'missing --url (and no state file found)' }),
      }
    }

    const token = resolveToken(argv, state)
    const includeEvents = hasFlag(argv, 'includeEvents')

    if (method === 'dev.info') {
      const { response, events } = await callDevServer({
        url,
        requestId,
        method,
        params: {},
        ...(token ? { token } : null),
        timeoutMs: parseIntFlag(argv, 'timeoutMs') ?? 30_000,
        includeEvents,
      })
      return { code: response.ok ? 0 : 1, out: includeEvents ? { ...response, events } : response }
    }

    if (method === 'dev.workspace.snapshot') {
      const maxBytes = parseIntFlag(argv, 'maxBytes')
      const { response, events } = await callDevServer({
        url,
        requestId,
        method,
        params: maxBytes ? { maxBytes } : {},
        ...(token ? { token } : null),
        timeoutMs: parseIntFlag(argv, 'timeoutMs') ?? 30_000,
        includeEvents,
      })
      return { code: response.ok ? 0 : 1, out: includeEvents ? { ...response, events } : response }
    }

    if (method === 'dev.run') {
      const dd = argv.indexOf('--')
      const logixArgv = dd >= 0 ? argv.slice(dd + 1) : []
      if (logixArgv.length === 0) {
        return {
          code: 2,
          out: makeCallErrorResponse({ requestId, code: 'ERR_INVALID_ARGS', message: 'dev.run requires argv after `--`' }),
        }
      }

      const traceEnabled = hasFlag(argv, 'trace')
      const traceMaxBytes = parseIntFlag(argv, 'traceMaxBytes')
      const traceChunkBytes = parseIntFlag(argv, 'traceChunkBytes')
      const trace = traceEnabled
        ? {
            enabled: true,
            ...(typeof traceMaxBytes === 'number' ? { maxBytes: traceMaxBytes } : null),
            ...(typeof traceChunkBytes === 'number' ? { chunkBytes: traceChunkBytes } : null),
          }
        : undefined

      const { response, events } = await callDevServer({
        url,
        requestId,
        method,
        params: { argv: logixArgv, ...(trace ? { trace } : null) },
        ...(token ? { token } : null),
        timeoutMs: parseIntFlag(argv, 'timeoutMs') ?? 30_000,
        includeEvents,
      })
      return { code: response.ok ? 0 : 1, out: includeEvents ? { ...response, events } : response }
    }

    if (method === 'dev.runChecks') {
      const checksRaw = getFlag(argv, 'checks')
      const checks = checksRaw ? parseCsv(checksRaw) : []
      if (checks.length === 0) {
        return { code: 2, out: makeCallErrorResponse({ requestId, code: 'ERR_INVALID_ARGS', message: 'dev.runChecks requires --checks <csv>' }) }
      }
      for (const c of checks) {
        if (c !== 'typecheck' && c !== 'lint' && c !== 'test') {
          return { code: 2, out: makeCallErrorResponse({ requestId, code: 'ERR_INVALID_ARGS', message: `invalid check: ${c}` }) }
        }
      }

      const timeoutMs = parseIntFlag(argv, 'timeoutMs') ?? 120_000
      const { response, events } = await callDevServer({
        url,
        requestId,
        method,
        params: { checks, timeoutMs },
        ...(token ? { token } : null),
        timeoutMs,
        includeEvents,
      })
      return { code: response.ok ? 0 : 1, out: includeEvents ? { ...response, events } : response }
    }

    if (method === 'dev.cancel') {
      const targetRequestId = getFlag(argv, 'targetRequestId')
      if (!targetRequestId) {
        return {
          code: 2,
          out: makeCallErrorResponse({ requestId, code: 'ERR_INVALID_ARGS', message: 'dev.cancel requires --targetRequestId <id>' }),
        }
      }
      const { response, events } = await callDevServer({
        url,
        requestId,
        method,
        params: { targetRequestId },
        ...(token ? { token } : null),
        timeoutMs: parseIntFlag(argv, 'timeoutMs') ?? 30_000,
        includeEvents,
      })
      return { code: response.ok ? 0 : 1, out: includeEvents ? { ...response, events } : response }
    }

    // dev.stop
    const { response, events } = await callDevServer({
      url,
      requestId,
      method,
      params: {},
      ...(token ? { token } : null),
      timeoutMs: parseIntFlag(argv, 'timeoutMs') ?? 30_000,
      includeEvents,
    })
    return { code: response.ok ? 0 : 1, out: includeEvents ? { ...response, events } : response }
  } catch (cause) {
    const requestId = getFlag(argv, 'requestId') ?? 'unknown'
    return { code: 1, out: makeCallErrorResponse({ requestId, code: 'ERR_CALL_FAILED', message: String(cause) }) }
  }
}

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    writeStdout(printHelp())
    return 0
  }

  const cmd = argv[0]
  if (cmd === 'call') {
    const out = await runCall(argv.slice(1))
    writeStdout(stableStringifyJson(out.out))
    return out.code
  }
  if (cmd === 'status' || cmd === 'health') {
    const out = await runStatus(argv.slice(1))
    writeStdout(stableStringifyJson(out.out))
    return out.code
  }
  if (cmd === 'stop') {
    const out = await runStop(argv.slice(1))
    writeStdout(stableStringifyJson(out.out))
    return out.code
  }

  // start (default)
  const startArgv = cmd === 'start' ? argv.slice(1) : argv
  return runStart(startArgv)
}

void main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((cause) => {
    const failed: DevServerStartFailedV1 = {
      schemaVersion: 1,
      kind: 'DevServerStartFailed',
      protocol: DEVSERVER_PROTOCOL_V1,
      error: { code: 'ERR_UNHANDLED', message: String(cause) },
    }
    writeStdout(stableStringifyJson(failed))
    process.exitCode = 1
  })
