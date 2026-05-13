import net from 'node:net'

import type { LiveTargetDescriptor } from '@logixjs/core/repo-internal/live-bridge-api'

import { resolveLiveTransportPaths, type LiveTransportPaths } from './liveTransportPaths.js'
import { readLiveDaemonOperatorMetadata, type LiveDaemonOperatorMetadata } from './liveDaemonOperatorSnapshot.js'

export type LiveDaemonIpcCommand =
  | { readonly type: 'status' }
  | { readonly type: 'targets'; readonly tree?: boolean }
  | { readonly type: 'operation'; readonly operation: string; readonly payload?: unknown }
  | { readonly type: 'stop' }

export type LiveDaemonIpcResponse =
  | {
      readonly ok: true
      readonly data: {
        readonly state?: string
        readonly authority?: string
        readonly transport?: unknown
        readonly targets?: ReadonlyArray<LiveTargetDescriptor>
        readonly attachments?: ReadonlyArray<{ readonly attachmentId: string; readonly state: string }>
        readonly gap?: unknown
        readonly package?: unknown
        readonly packageDir?: string
        readonly artifact?: {
          readonly outputKey: string
          readonly kind: string
          readonly value: unknown
        }
      }
    }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }

export type LiveDaemonMetadata = LiveDaemonOperatorMetadata

export const readLiveDaemonMetadata = async (
  paths: LiveTransportPaths = resolveLiveTransportPaths(),
): Promise<LiveDaemonMetadata | undefined> => {
  try {
    return await readLiveDaemonOperatorMetadata(paths)
  } catch {
    return undefined
  }
}

export const requestLiveDaemon = async (
  paths: LiveTransportPaths,
  command: LiveDaemonIpcCommand,
  timeoutMs = 1000,
): Promise<LiveDaemonIpcResponse> =>
  new Promise((resolve) => {
    const socket = net.connect(paths.socketPath)
    let settled = false
    let buffer = ''

    const settle = (response: LiveDaemonIpcResponse) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(response)
    }

    const timer = setTimeout(() => {
      settle({ ok: false, error: { code: 'live-daemon-timeout', message: 'Live daemon request timed out.' } })
    }, timeoutMs)

    socket.once('connect', () => {
      socket.write(`${JSON.stringify(command)}\n`)
    })
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      const lineEnd = buffer.indexOf('\n')
      if (lineEnd < 0) return
      const line = buffer.slice(0, lineEnd)
      try {
        settle(JSON.parse(line) as LiveDaemonIpcResponse)
      } catch {
        settle({ ok: false, error: { code: 'live-daemon-invalid-response', message: 'Live daemon returned invalid JSON.' } })
      }
    })
    socket.once('error', () => {
      settle({ ok: false, error: { code: 'live-daemon-not-running', message: 'Live daemon is not running.' } })
    })
  })

export const requestDefaultLiveDaemon = async (command: LiveDaemonIpcCommand): Promise<LiveDaemonIpcResponse> => {
  const metadata = await readLiveDaemonMetadata()
  const paths = resolveLiveTransportPaths(metadata ? { ...metadata } : {})
  return requestLiveDaemon(paths, command)
}

export const stopLiveDaemon = async (paths: LiveTransportPaths = resolveLiveTransportPaths()): Promise<LiveDaemonIpcResponse> =>
  requestLiveDaemon(paths, { type: 'stop' })
