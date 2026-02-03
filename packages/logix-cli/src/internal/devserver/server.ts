import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { Effect, Fiber } from 'effect'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'

import type { RunOutcome } from '../../Commands.js'
import { main as runLogixCli } from '../../Commands.js'
import { discoverCliConfig } from '../cliConfig.js'
import { stableStringifyJson } from '../stableJson.js'
import { DEVSERVER_PROTOCOL_V1, type DevRunOutcome, type DevServerEvent, type DevServerRequest, type DevServerResponse } from './protocol.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

const asBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

const asStringArray = (value: unknown): ReadonlyArray<string> | undefined => {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') return undefined
    const trimmed = item.trim()
    if (trimmed.length === 0) continue
    out.push(trimmed)
  }
  return out
}

const asPositiveInt = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.floor(n)
}

const toBytes = (text: string): number => Buffer.byteLength(text, 'utf8')

const pathExists = async (p: string): Promise<boolean> => {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

const findRepoRoot = async (cwd: string): Promise<string> => {
  let dir = cwd
  for (;;) {
    if (await pathExists(path.join(dir, '.git'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return cwd
    dir = parent
  }
}

const detectPackageManager = async (repoRoot: string): Promise<'pnpm' | 'npm' | 'yarn' | 'unknown'> => {
  if ((await pathExists(path.join(repoRoot, 'pnpm-workspace.yaml'))) || (await pathExists(path.join(repoRoot, 'pnpm-lock.yaml')))) {
    return 'pnpm'
  }
  if (await pathExists(path.join(repoRoot, 'yarn.lock'))) return 'yarn'
  if (await pathExists(path.join(repoRoot, 'package-lock.json'))) return 'npm'
  return 'unknown'
}

const makeErrorResponse = (args: {
  readonly requestId: string
  readonly code: string
  readonly message: string
  readonly data?: unknown
}): DevServerResponse => ({
  protocol: DEVSERVER_PROTOCOL_V1,
  type: 'response',
  requestId: args.requestId,
  ok: false,
  error: {
    code: args.code,
    message: args.message,
    ...(args.data !== undefined ? { data: args.data } : null),
  },
})

const makeOkResponse = (args: { readonly requestId: string; readonly result: unknown }): DevServerResponse => ({
  protocol: DEVSERVER_PROTOCOL_V1,
  type: 'response',
  requestId: args.requestId,
  ok: true,
  result: args.result,
})

const hasRunId = (argv: ReadonlyArray<string>): boolean => argv.includes('--runId')

const toDevRunOutcome = (outcome: RunOutcome): DevRunOutcome =>
  outcome.kind === 'help'
    ? { kind: 'help', text: outcome.text, exitCode: 0 }
    : { kind: 'result', result: outcome.result, exitCode: outcome.exitCode }

const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const previewText = (stdout: string, stderr: string): string | undefined => {
  const text = `${stdout}${stdout && stderr ? '\n' : ''}${stderr}`.trim()
  if (text.length === 0) return undefined
  const limit = 4096
  return text.length <= limit ? text : `${text.slice(0, limit)}…`
}

type CheckDiagnosticV1 = {
  readonly severity: 'error' | 'warning' | 'info'
  readonly code: string
  readonly message: string
  readonly pointer?: { readonly file: string; readonly line?: number; readonly column?: number }
  readonly action?: { readonly kind: 'run.command'; readonly command: string }
}

const normalizeFile = (file: string): string => file.replace(/\\/g, '/')

const extractPointers = (text: string, max: number): ReadonlyArray<{ readonly file: string; readonly line?: number; readonly column?: number }> => {
  const out: Array<{ readonly file: string; readonly line?: number; readonly column?: number }> = []
  const seen = new Set<string>()

  const push = (file: string, line?: number, column?: number) => {
    const normalized = normalizeFile(file.trim())
    if (normalized.length === 0) return
    if (normalized.includes('node_modules/')) return
    const key = `${normalized}:${line ?? ''}:${column ?? ''}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ file: normalized, ...(typeof line === 'number' ? { line } : null), ...(typeof column === 'number' ? { column } : null) })
  }

  // TypeScript: path/to/file.ts(12,34): error TS1234: ...
  for (const m of text.matchAll(/^(?<file>.+?)\((?<line>\d+),(?<col>\d+)\):\s+(?:error|warning)\s+/gm)) {
    const g = m.groups
    if (!g) continue
    push(g.file, Number(g.line), Number(g.col))
    if (out.length >= max) return out
  }

  // Generic: path/to/file.ts:12:34: ...
  for (const m of text.matchAll(/\b(?<file>(?:[A-Za-z]:)?[^:\n\r\t ]+\.(?:ts|tsx|js|jsx|json|md|css)):(?<line>\d+):(?<col>\d+)\b/g)) {
    const g = m.groups
    if (!g) continue
    push(g.file, Number(g.line), Number(g.col))
    if (out.length >= max) return out
  }

  return out
}

const toCheckDiagnostics = (args: {
  readonly check: 'typecheck' | 'lint' | 'test'
  readonly ok: boolean
  readonly timedOut: boolean
  readonly cancelled: boolean
  readonly preview?: string
}): ReadonlyArray<CheckDiagnosticV1> => {
  const diagnostics: CheckDiagnosticV1[] = []
  const cmd = `pnpm ${args.check}`

  if (args.cancelled) {
    diagnostics.push({
      severity: 'warning',
      code: 'CHECK_CANCELLED',
      message: `check cancelled: ${args.check}`,
      action: { kind: 'run.command', command: cmd },
    })
    return diagnostics
  }

  if (args.timedOut) {
    diagnostics.push({
      severity: 'error',
      code: 'CHECK_TIMEOUT',
      message: `check timed out: ${args.check}`,
      action: { kind: 'run.command', command: cmd },
    })
    return diagnostics
  }

  if (args.ok) return diagnostics

  diagnostics.push({
    severity: 'error',
    code: 'CHECK_FAILED',
    message: `check failed: ${args.check}`,
    action: { kind: 'run.command', command: cmd },
  })

  const pointers = args.preview ? extractPointers(args.preview, 20) : []
  for (const p of pointers) {
    diagnostics.push({
      severity: 'error',
      code: 'CHECK_POINTER',
      message: `see: ${p.file}${typeof p.line === 'number' ? `:${p.line}${typeof p.column === 'number' ? `:${p.column}` : ''}` : ''}`,
      pointer: p,
    })
  }

  return diagnostics
}

const runCheck = async (
  check: 'typecheck' | 'lint' | 'test',
  cwd: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<{
  readonly check: 'typecheck' | 'lint' | 'test'
  readonly ok: boolean
  readonly exitCode: number
  readonly durationMs: number
  readonly preview?: string
  readonly diagnostics: ReadonlyArray<CheckDiagnosticV1>
}> => {
  const startedAt = Date.now()
  let stdout = ''
  let stderr = ''
  let timedOut = false
  let cancelled = false

  const capture = (dst: 'stdout' | 'stderr', chunk: Buffer) => {
    const text = chunk.toString('utf8')
    const limit = 10_000_000
    if (dst === 'stdout') stdout = stdout.length + text.length <= limit ? `${stdout}${text}` : stdout
    else stderr = stderr.length + text.length <= limit ? `${stderr}${text}` : stderr
  }

  const child = spawn(pnpmBin, [check], { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout?.on('data', (c) => capture('stdout', Buffer.from(c)))
  child.stderr?.on('data', (c) => capture('stderr', Buffer.from(c)))

  const kill = () => {
    if (child.killed) return
    child.kill('SIGTERM')
    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL')
    }, 2000)
  }

  const onAbort = () => {
    cancelled = true
    kill()
  }

  signal?.addEventListener('abort', onAbort, { once: true })

  const timer = setTimeout(() => {
    timedOut = true
    kill()
  }, timeoutMs)

  const { exitCode } = await new Promise<{ readonly exitCode: number }>((resolve) => {
    child.once('close', (code) => resolve({ exitCode: typeof code === 'number' ? code : 1 }))
    child.once('error', () => resolve({ exitCode: 1 }))
  })

  clearTimeout(timer)
  signal?.removeEventListener('abort', onAbort)

  const preview = previewText(stdout, stderr)
  const ok = exitCode === 0 && !timedOut && !cancelled

  return {
    check,
    ok,
    exitCode,
    durationMs: Date.now() - startedAt,
    ...(preview ? { preview } : null),
    diagnostics: toCheckDiagnostics({ check, ok, timedOut, cancelled, preview }),
  }
}

export type DevServerStartArgs = {
  readonly host: string
  readonly port: number
  readonly maxMessageBytes: number
  readonly shutdownAfterMs?: number
  readonly version: string
  readonly cwd: string
  readonly token?: string
  readonly allowWrite: boolean
}

export type DevServerRuntime = {
  readonly host: string
  readonly port: number
  readonly url: string
  readonly close: () => Promise<void>
  readonly closed: Promise<void>
}

type InFlightRequest = {
  readonly requestId: string
  readonly ws: WebSocket
  cancelled: boolean
  cancel: (reason?: string) => void
}

const parseRequest = (raw: unknown): { readonly requestId: string; readonly request: DevServerRequest } | DevServerResponse => {
  if (!isRecord(raw)) {
    return makeErrorResponse({ requestId: 'unknown', code: 'ERR_INVALID_REQUEST', message: 'request must be an object' })
  }
  const protocol = raw.protocol
  if (protocol !== DEVSERVER_PROTOCOL_V1) {
    return makeErrorResponse({
      requestId: typeof raw.requestId === 'string' ? raw.requestId : 'unknown',
      code: 'ERR_INVALID_REQUEST',
      message: `unsupported protocol: ${String(protocol)}`,
    })
  }
  if (raw.type !== 'request') {
    return makeErrorResponse({
      requestId: typeof raw.requestId === 'string' ? raw.requestId : 'unknown',
      code: 'ERR_INVALID_REQUEST',
      message: `invalid type: ${String(raw.type)}`,
    })
  }

  const requestId = asNonEmptyString(raw.requestId)
  const method = raw.method
  if (!requestId) {
    return makeErrorResponse({ requestId: 'unknown', code: 'ERR_INVALID_REQUEST', message: 'missing requestId' })
  }
  if (
    method !== 'dev.info' &&
    method !== 'dev.workspace.snapshot' &&
    method !== 'dev.run' &&
    method !== 'dev.runChecks' &&
    method !== 'dev.cancel' &&
    method !== 'dev.stop'
  ) {
    return makeErrorResponse({ requestId, code: 'ERR_METHOD_NOT_FOUND', message: `unknown method: ${String(method)}` })
  }

  const rawAuth = raw.auth
  let auth: DevServerRequest['auth'] | undefined
  if (rawAuth !== undefined) {
    if (!isRecord(rawAuth)) {
      return makeErrorResponse({ requestId, code: 'ERR_INVALID_REQUEST', message: 'auth must be an object' })
    }
    const token = asNonEmptyString(rawAuth.token)
    if (!token) {
      return makeErrorResponse({ requestId, code: 'ERR_INVALID_REQUEST', message: 'auth.token must be non-empty string' })
    }
    auth = { token }
  }

  return {
    requestId,
    request: {
      protocol: DEVSERVER_PROTOCOL_V1,
      type: 'request',
      requestId,
      method,
      ...(raw.params !== undefined ? { params: raw.params } : null),
      ...(auth ? { auth } : null),
    },
  }
}

const handleWorkspaceSnapshot = async (args: {
  readonly requestId: string
  readonly params: unknown
  readonly cwd: string
  readonly version: string
}): Promise<DevServerResponse> => {
  const { requestId, cwd, version } = args
  const params = args.params

  let maxBytes = 65_536
  if (params !== undefined) {
    if (!isRecord(params)) {
      return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params must be an object' })
    }
    maxBytes = asPositiveInt(params.maxBytes) ?? maxBytes
  }

  try {
    const repoRoot = await findRepoRoot(cwd)
    const packageManager = await detectPackageManager(repoRoot)
    const discovered = await Effect.runPromise(discoverCliConfig({ cwd }))

    const cliConfig = (() => {
      if (!discovered.found) return { found: false } as const
      if (!discovered.ok) return { found: true, path: discovered.path, ok: false, error: discovered.error } as const

      const json = stableStringifyJson(discovered.config)
      const bytes = toBytes(json)
      if (bytes > maxBytes) {
        const previewChars = Math.min(json.length, Math.max(0, Math.min(256, maxBytes)))
        const preview = json.slice(0, previewChars)
        return {
          found: true,
          path: discovered.path,
          ok: true,
          config: { _tag: 'oversized', bytes, preview },
          profiles: discovered.profiles,
          truncated: true as const,
        }
      }

      return {
        found: true,
        path: discovered.path,
        ok: true,
        config: discovered.config,
        profiles: discovered.profiles,
      } as const
    })()

    return makeOkResponse({
      requestId,
      result: {
        repoRoot,
        cwd,
        packageManager,
        devserver: { protocol: DEVSERVER_PROTOCOL_V1, version },
        cliConfig,
      },
    })
  } catch (cause) {
    return makeErrorResponse({ requestId, code: 'ERR_INTERNAL', message: 'internal error', data: { cause: String(cause) } })
  }
}

const getArgValue = (argv: ReadonlyArray<string>, name: string): string | undefined => {
  const flag = `--${name}`
  for (let i = argv.length - 1; i >= 0; i--) {
    const token = argv[i]!
    if (token === flag) {
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) return undefined
      return next.trim()
    }
    if (token.startsWith(`${flag}=`)) return token.slice(flag.length + 1).trim()
  }
  return undefined
}

const resolveOutDirForResult = (argv: ReadonlyArray<string>, result: { readonly command: string; readonly runId: string }): string | undefined => {
  const outExplicit = getArgValue(argv, 'out')
  if (outExplicit) return outExplicit
  const outRoot = getArgValue(argv, 'outRoot')
  return outRoot ? path.join(outRoot, result.command, result.runId) : undefined
}

const tryReadTraceText = async (args: {
  readonly cwd: string
  readonly argv: ReadonlyArray<string>
  readonly outcome: RunOutcome
}): Promise<{ readonly available: boolean; readonly text?: string; readonly truncated?: boolean; readonly totalBytes?: number }> => {
  if (args.outcome.kind !== 'result') return { available: false }

  const trace = args.outcome.result.artifacts.find((a) => a.outputKey === 'traceSlim' && a.ok)
  if (!trace) return { available: false }

  if (trace.inline !== undefined) {
    const inline = trace.inline as unknown
    if (isRecord(inline) && inline._tag === 'oversized' && typeof inline.preview === 'string') {
      const totalBytes = typeof inline.bytes === 'number' ? inline.bytes : undefined
      return { available: true, text: inline.preview, truncated: true, ...(totalBytes ? { totalBytes } : null) }
    }
    return { available: true, text: stableStringifyJson(inline), ...(trace.truncated ? { truncated: true } : null) }
  }

  if (typeof trace.file === 'string' && trace.file.trim().length > 0) {
    const outDir = resolveOutDirForResult(args.argv, { command: args.outcome.result.command, runId: args.outcome.result.runId })
    if (!outDir) return { available: false }
    try {
      const dir = path.resolve(args.cwd, outDir)
      const filePath = path.join(dir, trace.file)
      const text = await fs.readFile(filePath, 'utf8')
      return { available: true, text }
    } catch {
      return { available: false }
    }
  }

  return { available: false }
}

const bridgeTraceEvents = async (args: {
  readonly ws: WebSocket
  readonly requestId: string
  readonly cwd: string
  readonly argv: ReadonlyArray<string>
  readonly outcome: RunOutcome
  readonly maxBytes: number
  readonly chunkBytes: number
}): Promise<void> => {
  const { ws, requestId } = args

  const startedPayload = { schemaVersion: 1, kind: 'DevServerTraceStarted', fileName: 'trace.slim.json' }
  sendEvent(ws, {
    protocol: DEVSERVER_PROTOCOL_V1,
    type: 'event',
    requestId,
    event: { kind: 'dev.event.trace.started', payload: startedPayload },
  })

  const trace = await tryReadTraceText({ cwd: args.cwd, argv: args.argv, outcome: args.outcome })
  if (!trace.available || typeof trace.text !== 'string') {
    const finishedPayload = { schemaVersion: 1, kind: 'DevServerTraceFinished', fileName: 'trace.slim.json', available: false }
    sendEvent(ws, {
      protocol: DEVSERVER_PROTOCOL_V1,
      type: 'event',
      requestId,
      event: { kind: 'dev.event.trace.finished', payload: finishedPayload },
    })
    return
  }

  const totalBytes = typeof trace.totalBytes === 'number' ? trace.totalBytes : toBytes(trace.text)
  let sentBytes = 0
  let offset = 0
  let seq = 0

  while (offset < trace.text.length && sentBytes < args.maxBytes) {
    let end = Math.min(trace.text.length, offset + Math.max(1, args.chunkBytes))
    let chunk = trace.text.slice(offset, end)
    let bytes = toBytes(chunk)

    while (bytes > args.chunkBytes && end > offset) {
      end -= 1
      chunk = trace.text.slice(offset, end)
      bytes = toBytes(chunk)
    }

    while (sentBytes + bytes > args.maxBytes && end > offset) {
      end -= 1
      chunk = trace.text.slice(offset, end)
      bytes = toBytes(chunk)
    }

    if (bytes <= 0 || end <= offset) break

    const chunkPayload = { schemaVersion: 1, kind: 'DevServerTraceChunk', seq, text: chunk, bytes }
    sendEvent(ws, {
      protocol: DEVSERVER_PROTOCOL_V1,
      type: 'event',
      requestId,
      event: { kind: 'dev.event.trace.chunk', payload: chunkPayload },
    })

    sentBytes += bytes
    offset = end
    seq += 1
  }

  const droppedBytes = Math.max(0, totalBytes - sentBytes)
  const truncated = Boolean(trace.truncated) || droppedBytes > 0
  const finishedPayload = {
    schemaVersion: 1,
    kind: 'DevServerTraceFinished',
    fileName: 'trace.slim.json',
    available: true,
    ...(truncated ? { truncated: true } : null),
    ...(typeof totalBytes === 'number' ? { totalBytes } : null),
    ...(droppedBytes > 0 ? { droppedBytes } : null),
  }
  sendEvent(ws, {
    protocol: DEVSERVER_PROTOCOL_V1,
    type: 'event',
    requestId,
    event: { kind: 'dev.event.trace.finished', payload: finishedPayload },
  })
}

const handleDevRun = async (args: {
  readonly ws: WebSocket
  readonly requestId: string
  readonly params: unknown
  readonly cwd: string
  readonly allowWrite: boolean
  readonly inflight: Map<string, InFlightRequest>
}): Promise<DevServerResponse> => {
  const { ws, requestId, inflight } = args
  const params = args.params

  if (inflight.has(requestId)) {
    return makeErrorResponse({ requestId, code: 'ERR_DUPLICATE_REQUEST_ID', message: 'duplicate requestId' })
  }

  if (!isRecord(params)) {
    return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params must be an object' })
  }
  const argv = asStringArray(params.argv)
  if (!argv) {
    return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params.argv must be string[]' })
  }

  const traceRaw = (params as any).trace
  let trace: { readonly maxBytes: number; readonly chunkBytes: number } | undefined
  if (traceRaw !== undefined) {
    if (!isRecord(traceRaw)) {
      return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params.trace must be an object' })
    }
    const enabled = asBoolean(traceRaw.enabled)
    if (enabled === undefined) {
      return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params.trace.enabled must be boolean' })
    }
    if (enabled) {
      const maxBytes = asPositiveInt(traceRaw.maxBytes) ?? 524_288
      const chunkBytes = asPositiveInt(traceRaw.chunkBytes) ?? 16_384
      trace = { maxBytes, chunkBytes }
    }
  }

  if (!args.allowWrite) {
    for (let i = 0; i < argv.length; i++) {
      const token = argv[i]!
      if (token === '--mode' && argv[i + 1] === 'write') {
        return makeErrorResponse({ requestId, code: 'ERR_FORBIDDEN', message: 'write mode is forbidden (readOnly)' })
      }
      if (token === '--mode=write') {
        return makeErrorResponse({ requestId, code: 'ERR_FORBIDDEN', message: 'write mode is forbidden (readOnly)' })
      }
    }
  }

  const injectRunId = asBoolean(params.injectRunId) ?? true
  const argv2 = injectRunId && !hasRunId(argv) ? [...argv, '--runId', requestId] : argv

  const fiber = Effect.runFork(runLogixCli(argv2))
  const entry: InFlightRequest = {
    requestId,
    ws,
    cancelled: false,
    cancel: () => {
      entry.cancelled = true
      Effect.runFork(Fiber.interrupt(fiber))
    },
  }
  inflight.set(requestId, entry)

  try {
    const outcome = await Effect.runPromise(Fiber.join(fiber))
    if (trace) {
      await bridgeTraceEvents({
        ws,
        requestId,
        cwd: args.cwd,
        argv: argv2,
        outcome,
        maxBytes: trace.maxBytes,
        chunkBytes: trace.chunkBytes,
      })
    }
    return makeOkResponse({ requestId, result: { outcome: toDevRunOutcome(outcome) } })
  } catch (cause) {
    if (entry.cancelled) {
      return makeErrorResponse({ requestId, code: 'ERR_CANCELLED', message: 'cancelled' })
    }
    return makeErrorResponse({ requestId, code: 'ERR_INTERNAL', message: 'internal error', data: { cause: String(cause) } })
  } finally {
    inflight.delete(requestId)
  }
}

const handleDevRunChecks = async (args: {
  readonly ws: WebSocket
  readonly requestId: string
  readonly params: unknown
  readonly cwd: string
  readonly inflight: Map<string, InFlightRequest>
}): Promise<DevServerResponse> => {
  const { ws, requestId, cwd, inflight } = args
  const params = args.params

  if (inflight.has(requestId)) {
    return makeErrorResponse({ requestId, code: 'ERR_DUPLICATE_REQUEST_ID', message: 'duplicate requestId' })
  }

  if (!isRecord(params)) {
    return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params must be an object' })
  }
  const checksRaw = params.checks
  if (!Array.isArray(checksRaw)) {
    return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params.checks must be an array' })
  }
  const checks: Array<'typecheck' | 'lint' | 'test'> = []
  for (const c of checksRaw) {
    if (c !== 'typecheck' && c !== 'lint' && c !== 'test') {
      return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: `invalid check: ${String(c)}` })
    }
    checks.push(c)
  }

  const timeoutMs = asPositiveInt(params.timeoutMs) ?? 120_000
  const controller = new AbortController()

  const entry: InFlightRequest = {
    requestId,
    ws,
    cancelled: false,
    cancel: () => {
      entry.cancelled = true
      controller.abort()
      sendEvent(ws, {
        protocol: DEVSERVER_PROTOCOL_V1,
        type: 'event',
        requestId,
        event: { kind: 'dev.event.request.cancelled' },
      })
    },
  }
  inflight.set(requestId, entry)

  const results: any[] = []
  try {
    for (const check of checks) {
      if (controller.signal.aborted) break

      sendEvent(ws, {
        protocol: DEVSERVER_PROTOCOL_V1,
        type: 'event',
        requestId,
        event: { kind: 'dev.event.check.started', payload: { check } },
      })

      const r = await runCheck(check, cwd, timeoutMs, controller.signal)
      results.push(r)

      sendEvent(ws, {
        protocol: DEVSERVER_PROTOCOL_V1,
        type: 'event',
        requestId,
        event: { kind: 'dev.event.check.finished', payload: { check, ok: r.ok, exitCode: r.exitCode, durationMs: r.durationMs } },
      })
    }

    if (controller.signal.aborted) {
      return makeErrorResponse({ requestId, code: 'ERR_CANCELLED', message: 'cancelled', data: { results } })
    }

    return makeOkResponse({ requestId, result: { results } })
  } catch (cause) {
    if (entry.cancelled) {
      return makeErrorResponse({ requestId, code: 'ERR_CANCELLED', message: 'cancelled', data: { results } })
    }
    return makeErrorResponse({ requestId, code: 'ERR_INTERNAL', message: 'internal error', data: { cause: String(cause), results } })
  } finally {
    inflight.delete(requestId)
  }
}

const handleDevCancel = async (args: {
  readonly requestId: string
  readonly params: unknown
  readonly inflight: Map<string, InFlightRequest>
}): Promise<DevServerResponse> => {
  const { requestId, inflight } = args
  const params = args.params

  if (!isRecord(params)) {
    return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params must be an object' })
  }
  const targetRequestId = asNonEmptyString(params.targetRequestId)
  if (!targetRequestId) {
    return makeErrorResponse({ requestId, code: 'ERR_INVALID_PARAMS', message: 'params.targetRequestId must be non-empty string' })
  }

  const target = inflight.get(targetRequestId)
  if (!target) {
    return makeErrorResponse({ requestId, code: 'ERR_NOT_FOUND', message: 'request not found', data: { targetRequestId } })
  }

  target.cancel('cancel')
  return makeOkResponse({ requestId, result: { cancelled: true, targetRequestId } })
}

const handleRequest = async (args: {
  readonly ws: WebSocket
  readonly requestId: string
  readonly request: DevServerRequest
  readonly start: DevServerStartArgs
  readonly inflight: Map<string, InFlightRequest>
}): Promise<DevServerResponse> => {
  const { ws, requestId, request, start, inflight } = args

  if (start.token && request.auth?.token !== start.token) {
    return makeErrorResponse({ requestId, code: 'ERR_UNAUTHORIZED', message: 'unauthorized' })
  }

  switch (request.method) {
    case 'dev.info':
      return makeOkResponse({
        requestId,
        result: {
          protocol: DEVSERVER_PROTOCOL_V1,
          version: start.version,
          cwd: start.cwd,
          capabilities: { write: start.allowWrite },
        },
      })
    case 'dev.workspace.snapshot':
      return handleWorkspaceSnapshot({ requestId, params: request.params, cwd: start.cwd, version: start.version })
    case 'dev.run':
      return handleDevRun({ ws, requestId, params: request.params, cwd: start.cwd, allowWrite: start.allowWrite, inflight })
    case 'dev.runChecks':
      return handleDevRunChecks({ ws, requestId, params: request.params, cwd: start.cwd, inflight })
    case 'dev.cancel':
      return handleDevCancel({ requestId, params: request.params, inflight })
    case 'dev.stop':
      return makeOkResponse({ requestId, result: { stopping: true } })
  }
}

const trySend = (ws: WebSocket, value: unknown): void => {
  try {
    ws.send(stableStringifyJson(value))
  } catch {
    // ignore (socket may be closed)
  }
}

const sendResponse = (ws: WebSocket, response: DevServerResponse): void => {
  trySend(ws, response)
}

const sendEvent = (ws: WebSocket, event: DevServerEvent): void => {
  trySend(ws, event)
}

export const startDevServer = async (args: DevServerStartArgs): Promise<DevServerRuntime> => {
  const wss = new WebSocketServer({
    host: args.host,
    port: args.port,
    maxPayload: args.maxMessageBytes,
    perMessageDeflate: false,
  })

  const inflight = new Map<string, InFlightRequest>()

  const closed = new Promise<void>((resolve) => {
    wss.on('close', () => resolve())
  })

  const close = async (): Promise<void> => {
    for (const req of inflight.values()) {
      req.cancel('server_closing')
    }
    for (const client of wss.clients) {
      client.terminate()
    }
    await new Promise<void>((resolve) => wss.close(() => resolve()))
  }

  const shutdownTimer =
    typeof args.shutdownAfterMs === 'number' && Number.isFinite(args.shutdownAfterMs) && args.shutdownAfterMs > 0
      ? setTimeout(() => {
          void close()
        }, args.shutdownAfterMs)
      : undefined

  const onSignal = (): void => {
    void close()
  }
  process.on('SIGINT', onSignal)
  process.on('SIGTERM', onSignal)

  void closed.finally(() => {
    if (shutdownTimer) clearTimeout(shutdownTimer)
    process.off('SIGINT', onSignal)
    process.off('SIGTERM', onSignal)
  })

  wss.on('connection', (ws: WebSocket) => {
    const ownedRequestIds = new Set<string>()

    ws.once('close', () => {
      for (const requestId of ownedRequestIds) {
        inflight.get(requestId)?.cancel('socket_closed')
      }
    })

    ws.on('message', (data) => {
      const text = typeof data === 'string' ? data : data instanceof Uint8Array ? Buffer.from(data).toString('utf8') : ''
      if (text.length === 0) {
        sendResponse(
          ws,
          makeErrorResponse({
            requestId: 'unknown',
            code: 'ERR_INVALID_REQUEST',
            message: 'empty message',
          }),
        )
        return
      }

      let raw: unknown
      try {
        raw = JSON.parse(text) as unknown
      } catch {
        sendResponse(
          ws,
          makeErrorResponse({
            requestId: 'unknown',
            code: 'ERR_INVALID_REQUEST',
            message: 'invalid JSON',
          }),
        )
        return
      }

      const parsed = parseRequest(raw)
      if ('ok' in parsed) {
        sendResponse(ws, parsed)
        return
      }

      ownedRequestIds.add(parsed.requestId)

      void handleRequest({ ws, requestId: parsed.requestId, request: parsed.request, start: args, inflight })
        .then((resp) => {
          sendResponse(ws, resp)
          ownedRequestIds.delete(parsed.requestId)
          if (parsed.request.method === 'dev.stop' && resp.ok) {
            setTimeout(() => {
              void close()
            }, 0)
          }
        })
        .catch((cause) => {
          sendResponse(
            ws,
            makeErrorResponse({
              requestId: parsed.requestId,
              code: 'ERR_INTERNAL',
              message: 'internal error',
              data: { cause: String(cause) },
            }),
          )
          ownedRequestIds.delete(parsed.requestId)
        })
    })
  })

  await new Promise<void>((resolve, reject) => {
    wss.once('listening', () => resolve())
    wss.once('error', (err: any) => reject(err))
  })

  const address = wss.address()
  const port = typeof address === 'object' && address && 'port' in address ? Number((address as any).port) : args.port
  const url = `ws://${args.host}:${port}`

  return {
    host: args.host,
    port,
    url,
    close,
    closed,
  }
}
