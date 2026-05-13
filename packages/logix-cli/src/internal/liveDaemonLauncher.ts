import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

import {
  cleanupStaleLiveDaemonSnapshot,
  readLiveDaemonOperatorSnapshot,
  type LiveDaemonOperatorSnapshot,
} from './liveDaemonOperatorSnapshot.js'
import { resolveLiveTransportPaths } from './liveTransportPaths.js'

const require = createRequire(import.meta.url)
const DEFAULT_LIVE_DAEMON_START_TIMEOUT_MS = 5000
const LIVE_DAEMON_READY_POLL_MS = 50

export interface LiveDaemonLaunchSpec {
  readonly command: string
  readonly args: ReadonlyArray<string>
}

const parseLaunchOverride = (): LiveDaemonLaunchSpec | undefined => {
  const command = process.env.LOGIX_INTERNAL_LIVE_DAEMON_COMMAND?.trim()
  const rawArgs = process.env.LOGIX_INTERNAL_LIVE_DAEMON_ARGS_JSON?.trim()
  if (!command) return undefined
  if (!rawArgs) return { command, args: [] }

  try {
    const parsed = JSON.parse(rawArgs) as unknown
    return { command, args: Array.isArray(parsed) ? parsed.map(String) : [] }
  } catch {
    return { command, args: [] }
  }
}

const parseExecArgvOverride = (): ReadonlyArray<string> | undefined => {
  const raw = process.env.LOGIX_INTERNAL_CLI_EXECARGV_JSON?.trim()
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : undefined
  } catch {
    return undefined
  }
}

const resolveStartTimeoutMs = (): number => {
  const parsed = Number(process.env.LOGIX_INTERNAL_LIVE_DAEMON_START_TIMEOUT_MS)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_LIVE_DAEMON_START_TIMEOUT_MS
}

export const resolveLiveDaemonLaunchSpec = (): LiveDaemonLaunchSpec => {
  const override = parseLaunchOverride()
  if (override) return override

  const cliEntry = process.env.LOGIX_INTERNAL_CLI_ENTRY?.trim() || process.argv[1]?.trim()
  if (!cliEntry) {
    throw new Error('Unable to resolve current CLI entrypoint for live daemon launch.')
  }

  const execArgv = parseExecArgvOverride() ?? process.execArgv
  return {
    command: process.execPath,
    args: [...execArgv, cliEntry, '__internal_live_daemon'],
  }
}

export const startLiveDaemonProcess = async (): Promise<{
  readonly started: boolean
  readonly port?: number
  readonly snapshot?: LiveDaemonOperatorSnapshot
}> => {
  const paths = resolveLiveTransportPaths()
  const existing = await readLiveDaemonOperatorSnapshot(paths)
  if (existing.state === 'ready') {
    return { started: false, port: existing.websocket.port, snapshot: existing }
  }
  if (existing.state === 'degraded') {
    const reason = existing.operator.reason === 'stale-pid' || existing.operator.reason === 'invalid-metadata' ? existing.operator.reason : 'stale-socket'
    await cleanupStaleLiveDaemonSnapshot(paths, reason)
  }

  const launch = resolveLiveDaemonLaunchSpec()
  const child = spawn(launch.command, [...launch.args], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  })
  child.unref()

  const deadline = Date.now() + resolveStartTimeoutMs()
  while (Date.now() < deadline) {
    const snapshot = await readLiveDaemonOperatorSnapshot(paths)
    if (snapshot.state === 'ready') return { started: true, port: snapshot.websocket.port, snapshot }
    await new Promise((resolve) => setTimeout(resolve, LIVE_DAEMON_READY_POLL_MS))
  }

  await cleanupStaleLiveDaemonSnapshot(paths, 'start-timeout')
  throw new Error('Live daemon did not become ready in time.')
}

export const makeTestLiveDaemonLaunchOverride = (cliEntryPath: string): {
  readonly command: string
  readonly args: ReadonlyArray<string>
} => ({
  command: process.execPath,
  args: [require.resolve('tsx/cli'), cliEntryPath, '__internal_live_daemon'],
})
