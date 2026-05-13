import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import net from 'node:net'

import type { LiveTransportPaths } from './liveTransportPaths.js'

export interface LiveDaemonOperatorMetadata {
  readonly schemaVersion: 1
  readonly pid: number
  readonly host: string
  readonly port: number
  readonly socketPath: string
  readonly stateDir: string
  readonly startedAt?: number
  readonly logPath?: string
  readonly operator: {
    readonly carrierLocal: true
    readonly publicContract: false
  }
}

export interface LiveDaemonStaleCleanupEvidence {
  readonly cleaned: boolean
  readonly reason: 'invalid-metadata' | 'stale-pid' | 'stale-socket' | 'start-timeout'
  readonly removed: ReadonlyArray<string>
}

export interface LiveDaemonOperatorSnapshot {
  readonly state: 'stopped' | 'ready' | 'degraded'
  readonly authority: 'core-owned-attachment'
  readonly transport: {
    readonly carrier: 'ipc'
    readonly socketPath: string
    readonly health: 'closed' | 'ready' | 'degraded'
  }
  readonly websocket: {
    readonly carrier: 'websocket'
    readonly host: string
    readonly port: number
    readonly health: 'closed' | 'ready' | 'degraded'
  }
  readonly operator: {
    readonly carrierLocal: true
    readonly publicContract: false
    readonly pid?: number
    readonly stateDir: string
    readonly metadataPath: string
    readonly logPath?: string
    readonly reason?: string
    readonly cleanup?: LiveDaemonStaleCleanupEvidence
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const isPidRunning = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export const isSocketAcceptingConnections = async (socketPath: string, timeoutMs = 100): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = net.connect(socketPath)
    let settled = false

    const settle = (ready: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(ready)
    }

    const timer = setTimeout(() => {
      settle(false)
    }, timeoutMs)

    socket.once('connect', () => {
      settle(true)
    })
    socket.once('error', () => {
      settle(false)
    })
  })

const parseOperatorMetadata = (value: unknown): LiveDaemonOperatorMetadata | undefined => {
  if (!isRecord(value)) return undefined
  if (value.schemaVersion !== 1) return undefined
  if (typeof value.pid !== 'number' || !Number.isFinite(value.pid)) return undefined
  if (typeof value.host !== 'string') return undefined
  if (typeof value.port !== 'number' || !Number.isFinite(value.port)) return undefined
  if (typeof value.socketPath !== 'string') return undefined
  if (typeof value.stateDir !== 'string') return undefined
  return {
    schemaVersion: 1,
    pid: Math.floor(value.pid),
    host: value.host,
    port: Math.floor(value.port),
    socketPath: value.socketPath,
    stateDir: value.stateDir,
    ...(typeof value.startedAt === 'number' ? { startedAt: value.startedAt } : null),
    ...(typeof value.logPath === 'string' ? { logPath: value.logPath } : null),
    operator: { carrierLocal: true, publicContract: false },
  }
}

export const makeStoppedLiveDaemonOperatorSnapshot = (paths: LiveTransportPaths): LiveDaemonOperatorSnapshot => ({
  state: 'stopped',
  authority: 'core-owned-attachment',
  transport: { carrier: 'ipc', socketPath: paths.socketPath, health: 'closed' },
  websocket: { carrier: 'websocket', host: paths.host, port: paths.port, health: 'closed' },
  operator: {
    carrierLocal: true,
    publicContract: false,
    stateDir: paths.stateDir,
    metadataPath: paths.metadataPath,
  },
})

export const makeReadyLiveDaemonOperatorSnapshot = (
  paths: LiveTransportPaths,
  metadata: LiveDaemonOperatorMetadata,
): LiveDaemonOperatorSnapshot => ({
  state: 'ready',
  authority: 'core-owned-attachment',
  transport: { carrier: 'ipc', socketPath: metadata.socketPath, health: 'ready' },
  websocket: { carrier: 'websocket', host: metadata.host, port: metadata.port, health: 'ready' },
  operator: {
    carrierLocal: true,
    publicContract: false,
    pid: metadata.pid,
    stateDir: metadata.stateDir,
    metadataPath: paths.metadataPath,
    ...(metadata.logPath ? { logPath: metadata.logPath } : null),
  },
})

export const makeDegradedLiveDaemonOperatorSnapshot = (
  paths: LiveTransportPaths,
  reason: string,
  cleanup?: LiveDaemonStaleCleanupEvidence,
  metadata?: LiveDaemonOperatorMetadata,
): LiveDaemonOperatorSnapshot => ({
  state: 'degraded',
  authority: 'core-owned-attachment',
  transport: { carrier: 'ipc', socketPath: metadata?.socketPath ?? paths.socketPath, health: 'degraded' },
  websocket: { carrier: 'websocket', host: metadata?.host ?? paths.host, port: metadata?.port ?? paths.port, health: 'degraded' },
  operator: {
    carrierLocal: true,
    publicContract: false,
    ...(metadata ? { pid: metadata.pid } : null),
    stateDir: metadata?.stateDir ?? paths.stateDir,
    metadataPath: paths.metadataPath,
    ...(metadata?.logPath ? { logPath: metadata.logPath } : null),
    reason,
    ...(cleanup ? { cleanup } : null),
  },
})

export const writeLiveDaemonOperatorSnapshot = async (
  paths: LiveTransportPaths,
  input: { readonly pid: number; readonly startedAt?: number; readonly logPath?: string },
): Promise<LiveDaemonOperatorMetadata> => {
  const metadata: LiveDaemonOperatorMetadata = {
    schemaVersion: 1,
    pid: input.pid,
    host: paths.host,
    port: paths.port,
    socketPath: paths.socketPath,
    stateDir: paths.stateDir,
    ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : null),
    ...(input.logPath ? { logPath: input.logPath } : null),
    operator: { carrierLocal: true, publicContract: false },
  }
  await mkdir(dirname(paths.metadataPath), { recursive: true })
  await writeFile(paths.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  return metadata
}

export const readLiveDaemonOperatorMetadata = async (
  paths: LiveTransportPaths,
): Promise<LiveDaemonOperatorMetadata | undefined> => {
  const parsed = parseOperatorMetadata(JSON.parse(await readFile(paths.metadataPath, 'utf8')))
  return parsed
}

export const readLiveDaemonOperatorSnapshot = async (paths: LiveTransportPaths): Promise<LiveDaemonOperatorSnapshot> => {
  try {
    await readFile(paths.metadataPath, 'utf8')
  } catch {
    return makeStoppedLiveDaemonOperatorSnapshot(paths)
  }

  const metadata = await readLiveDaemonOperatorMetadata(paths).catch(() => undefined)
  if (!metadata) return makeDegradedLiveDaemonOperatorSnapshot(paths, 'invalid-metadata')
  if (!isPidRunning(metadata.pid)) return makeDegradedLiveDaemonOperatorSnapshot(paths, 'stale-pid')
  if (!(await isSocketAcceptingConnections(metadata.socketPath))) {
    return makeDegradedLiveDaemonOperatorSnapshot(paths, 'stale-socket', undefined, metadata)
  }
  return makeReadyLiveDaemonOperatorSnapshot(paths, metadata)
}

export const cleanupStaleLiveDaemonSnapshot = async (
  paths: LiveTransportPaths,
  reason: LiveDaemonStaleCleanupEvidence['reason'],
): Promise<LiveDaemonStaleCleanupEvidence> => {
  const removed: string[] = []
  for (const file of [paths.metadataPath, paths.socketPath]) {
    try {
      await rm(file, { force: true })
      removed.push(file)
    } catch {
      // best-effort cleanup only
    }
  }
  return { cleaned: removed.length > 0, reason, removed }
}
