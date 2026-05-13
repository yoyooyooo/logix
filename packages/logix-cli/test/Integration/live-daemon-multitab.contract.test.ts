import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import WebSocket from 'ws'
import { describe, expect, it } from 'vitest'

import { requestLiveDaemon } from '../../src/internal/liveDaemonClient.js'
import { createLiveDaemonServer } from '../../src/internal/liveDaemonServer.js'

const sameTarget = { runtimeId: 'same-runtime', moduleId: 'same-module', instanceId: 'default' }
const sameTargetRef = 'runtime:same-runtime/module:same-module/instance:default'

const waitForOpen = (ws: WebSocket): Promise<void> =>
  new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })

const sendOffer = (ws: WebSocket, id: string, tabId: string) => {
  ws.send(
    JSON.stringify({
      schemaVersion: 1,
      id,
      role: 'browser',
      type: 'host.offer',
      payload: {
        attachmentId: `browser:${id}`,
        adapterKind: 'browser-dev',
        hostCoordinate: { hostKind: 'browser', tabId },
        transport: { carrier: 'websocket', connectionId: id },
        targets: [sameTarget],
      },
    }),
  )
}

const waitForRequest = (ws: WebSocket): Promise<any> =>
  new Promise((resolve) => {
    ws.once('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as { readonly type?: string; readonly payload?: any }
      resolve(msg)
    })
  })

const sendCaptureResponse = (ws: WebSocket, request: any, captureId: string, tab: string) => {
  ws.send(
    JSON.stringify({
      schemaVersion: 1,
      id: `resp:${request.payload.requestId}`,
      role: 'browser',
      type: 'live.operation.response',
      payload: {
        requestId: request.payload.requestId,
        attachmentId: request.payload.attachmentId,
        ok: true,
        artifact: {
          outputKey: 'live-capture:event-window',
          kind: 'LiveCapture',
          value: {
            kind: 'live.capture',
            captureId,
            captureKind: 'event-window',
            target: sameTarget,
            stageClass: 'drilldown-only',
            budget: { maxEvents: 16, maxInlineBytes: 1024 },
            tab,
            artifactRef: { outputKey: 'live-capture:event-window', kind: 'LiveCapture' },
          },
        },
      },
    }),
  )
}

describe('live daemon multi-tab carrier', () => {
  it('keeps two browser connections as distinct attachment rows', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-multitab-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    const ws1 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    const ws2 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    try {
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)])
      sendOffer(ws1, 'conn-1', 'tab-a')
      sendOffer(ws2, 'conn-2', 'tab-b')
      await new Promise((resolve) => setTimeout(resolve, 30))

      const response = await requestLiveDaemon(daemon.paths, { type: 'targets', tree: true })
      expect(response.ok).toBe(true)
      if (!response.ok) throw new Error('expected ok response')
      expect(response.data.targets).toEqual([
        expect.objectContaining({ attachmentId: 'browser:conn-1', hostCoordinate: expect.objectContaining({ tabId: 'tab-a' }) }),
        expect.objectContaining({ attachmentId: 'browser:conn-2', hostCoordinate: expect.objectContaining({ tabId: 'tab-b' }) }),
      ])
    } finally {
      ws1.close()
      ws2.close()
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('returns an ambiguity gap instead of choosing the first tab when target matches multiple attachments', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-multitab-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    const ws1 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    const ws2 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    let requestCount = 0
    try {
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)])
      ws1.on('message', () => {
        requestCount += 1
      })
      ws2.on('message', () => {
        requestCount += 1
      })
      sendOffer(ws1, 'conn-1', 'tab-a')
      sendOffer(ws2, 'conn-2', 'tab-b')
      await new Promise((resolve) => setTimeout(resolve, 30))

      const response = await requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'snapshot.read',
        payload: { target: sameTargetRef },
      })

      expect(response).toMatchObject({
        ok: true,
        data: {
          gap: expect.objectContaining({
            code: 'ambiguous-live-target',
          }),
        },
      })
      expect(JSON.stringify(response)).toContain('browser:conn-1')
      expect(JSON.stringify(response)).toContain('browser:conn-2')
      expect(requestCount).toBe(0)
    } finally {
      ws1.close()
      ws2.close()
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('routes concurrent requests to explicit attachments without crossing tab data', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-multitab-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    const ws1 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    const ws2 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    try {
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)])
      sendOffer(ws1, 'conn-1', 'tab-a')
      sendOffer(ws2, 'conn-2', 'tab-b')
      await new Promise((resolve) => setTimeout(resolve, 30))

      const tabARequest = waitForRequest(ws1)
      const tabBRequest = waitForRequest(ws2)
      const tabAResponse = requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'capture.eventWindow',
        payload: { target: sameTargetRef, attachmentId: 'browser:conn-1' },
      })
      const tabBResponse = requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'capture.eventWindow',
        payload: { target: sameTargetRef, attachmentId: 'browser:conn-2' },
      })

      const [reqA, reqB] = await Promise.all([tabARequest, tabBRequest])
      expect(reqA.payload.attachmentId).toBe('browser:conn-1')
      expect(reqB.payload.attachmentId).toBe('browser:conn-2')
      sendCaptureResponse(ws2, reqB, 'capture:tab-b', 'tab-b')
      sendCaptureResponse(ws1, reqA, 'capture:tab-a', 'tab-a')

      await expect(tabAResponse).resolves.toMatchObject({
        ok: true,
        data: { artifact: { value: expect.objectContaining({ captureId: 'capture:tab-a', tab: 'tab-a' }) } },
      })
      await expect(tabBResponse).resolves.toMatchObject({
        ok: true,
        data: { artifact: { value: expect.objectContaining({ captureId: 'capture:tab-b', tab: 'tab-b' }) } },
      })
    } finally {
      ws1.close()
      ws2.close()
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('ignores a forged response from a different browser connection for the same request id', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-multitab-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    const ws1 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    const ws2 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    try {
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)])
      sendOffer(ws1, 'conn-1', 'tab-a')
      sendOffer(ws2, 'conn-2', 'tab-b')
      await new Promise((resolve) => setTimeout(resolve, 30))

      const selectedRequest = waitForRequest(ws1)
      const responsePromise = requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'capture.eventWindow',
        payload: { target: sameTargetRef, attachmentId: 'browser:conn-1' },
      })
      const request = await selectedRequest

      sendCaptureResponse(ws2, request, 'capture:forged-tab-b', 'tab-b')
      await new Promise((resolve) => setTimeout(resolve, 30))
      sendCaptureResponse(ws1, request, 'capture:selected-tab-a', 'tab-a')

      await expect(responsePromise).resolves.toMatchObject({
        ok: true,
        data: { artifact: { value: expect.objectContaining({ captureId: 'capture:selected-tab-a', tab: 'tab-a' }) } },
      })
    } finally {
      ws1.close()
      ws2.close()
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })

  it('exports evidence by daemon lineage and rejects ambiguous bare capture refs', async () => {
    const stateDir = await mkdtemp(path.join(os.tmpdir(), 'logix-live-multitab-'))
    const daemon = await createLiveDaemonServer({ stateDir, host: '127.0.0.1', port: 0 }).start()
    const ws1 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    const ws2 = new WebSocket(`ws://127.0.0.1:${daemon.port}`)
    try {
      await Promise.all([waitForOpen(ws1), waitForOpen(ws2)])
      sendOffer(ws1, 'conn-1', 'tab-a')
      sendOffer(ws2, 'conn-2', 'tab-b')
      await new Promise((resolve) => setTimeout(resolve, 30))

      const requestA = waitForRequest(ws1)
      const snapshotA = requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'capture.eventWindow',
        payload: { target: sameTargetRef, attachmentId: 'browser:conn-1' },
      })
      const reqA = await requestA
      sendCaptureResponse(ws1, reqA, 'capture:duplicate', 'tab-a')
      const resultA = await snapshotA

      const requestB = waitForRequest(ws2)
      const snapshotB = requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'capture.eventWindow',
        payload: { target: sameTargetRef, attachmentId: 'browser:conn-2' },
      })
      const reqB = await requestB
      sendCaptureResponse(ws2, reqB, 'capture:duplicate', 'tab-b')
      const resultB = await snapshotB

      expect(resultA.ok).toBe(true)
      expect(resultB.ok).toBe(true)
      if (!resultA.ok || !resultB.ok) throw new Error('expected snapshot responses')
      const refA = (resultA.data.artifact?.value as any)?.artifactRef?.file
      const refB = (resultB.data.artifact?.value as any)?.artifactRef?.file
      expect(refA).toEqual(expect.stringContaining('live-artifact:'))
      expect(refB).toEqual(expect.stringContaining('live-artifact:'))
      expect(refA).not.toBe(refB)

      const exportA = await requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'export.evidence',
        payload: { from: refA },
      })
      const exportB = await requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'export.evidence',
        payload: { from: refB },
      })
      const exportBare = await requestLiveDaemon(daemon.paths, {
        type: 'operation',
        operation: 'export.evidence',
        payload: { from: 'capture:duplicate' },
      })

      expect(exportA).toMatchObject({ ok: true, data: { package: { events: [expect.objectContaining({ tab: 'tab-a' })] } } })
      expect(exportB).toMatchObject({ ok: true, data: { package: { events: [expect.objectContaining({ tab: 'tab-b' })] } } })
      expect(exportBare).toMatchObject({
        ok: true,
        data: {
          package: {
            events: [
              expect.objectContaining({
                code: 'ambiguous-live-artifact-ref',
              }),
            ],
          },
        },
      })
    } finally {
      ws1.close()
      ws2.close()
      await daemon.stop()
      await rm(stateDir, { recursive: true, force: true })
    }
  })
})
