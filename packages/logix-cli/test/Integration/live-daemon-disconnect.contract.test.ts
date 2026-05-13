import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import WebSocket from 'ws'
import { describe, expect, it } from 'vitest'

import { requestLiveDaemon } from '../../src/internal/liveDaemonClient.js'
import { createLiveDaemonServer } from '../../src/internal/liveDaemonServer.js'

const waitForOpen = (ws: WebSocket): Promise<void> =>
  new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })

describe('live daemon disconnect lifecycle', () => {
  it('marks browser attachments disconnected after socket close', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-disconnect-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    const ws = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    try {
      await waitForOpen(ws)
      ws.send(
        JSON.stringify({
          schemaVersion: 1,
          id: 'offer-1',
          role: 'browser',
          type: 'host.offer',
          payload: {
            attachmentId: 'browser:conn-1',
            adapterKind: 'browser-dev',
            hostCoordinate: { hostKind: 'browser', tabId: 'tab-a' },
            transport: { carrier: 'websocket', connectionId: 'conn-1' },
            targets: [{ runtimeId: 'r', moduleId: 'm', instanceId: 'i' }],
          },
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 30))
      ws.close()
      await new Promise((resolve) => setTimeout(resolve, 30))

      const response = await requestLiveDaemon(daemon.paths, { type: 'status' })
      expect(response).toMatchObject({
        ok: true,
        data: {
          attachments: [expect.objectContaining({ attachmentId: 'browser:conn-1', state: 'disconnected' })],
        },
      })
    } finally {
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })
})
