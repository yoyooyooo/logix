import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSandboxClient } from '@logixjs/sandbox'

class FakeWorker {
  static instances: Array<FakeWorker> = []

  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false
  readonly messages: Array<unknown> = []

  constructor(
    readonly url: string,
    readonly options: unknown,
  ) {
    FakeWorker.instances.push(this)
  }

  postMessage(message: any): void {
    this.messages.push(message)
    if (message && typeof message === 'object' && message.type === 'INIT') {
      queueMicrotask(() => {
        this.onmessage?.({
          data: {
            protocolVersion: 'v1',
            type: 'READY',
            payload: { version: 'test', compilerReady: true },
          },
        } as any)
      })
    }
  }

  terminate(): void {
    this.terminated = true
  }
}

describe('SandboxClient (bounded caches)', () => {
  const OriginalWorker = globalThis.Worker

  beforeEach(() => {
    FakeWorker.instances = []
    ;(globalThis as any).Worker = FakeWorker
  })

  afterEach(() => {
    ;(globalThis as any).Worker = OriginalWorker
  })

  it('bounds logs/traces/uiIntents according to config', async () => {
    const client = createSandboxClient({ maxLogs: 2, maxTraces: 2, maxUiIntents: 1 })
    await client.init()

    const worker = FakeWorker.instances[0]!

    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'LOG', payload: { level: 'info', args: ['l1'], timestamp: 1 } },
    } as any)
    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'LOG', payload: { level: 'info', args: ['l2'], timestamp: 2 } },
    } as any)
    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'LOG', payload: { level: 'info', args: ['l3'], timestamp: 3 } },
    } as any)

    expect(client.getState().logs.map((l) => l.args[0])).toEqual(['l2', 'l3'])

    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'TRACE', payload: { spanId: 'a', name: 'a', startTime: 1, status: 'running' } },
    } as any)
    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'TRACE', payload: { spanId: 'b', name: 'b', startTime: 2, status: 'running' } },
    } as any)
    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'TRACE', payload: { spanId: 'c', name: 'c', startTime: 3, status: 'running' } },
    } as any)

    expect(client.getState().traces.map((t) => t.spanId)).toEqual(['b', 'c'])

    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'TRACE', payload: { spanId: 'b', name: 'b', startTime: 2, endTime: 4, status: 'success' } },
    } as any)

    expect(client.getState().traces.map((t) => t.spanId)).toEqual(['b', 'c'])
    expect(client.getState().traces[0]?.status).toBe('success')

    worker.onmessage?.({
      data: {
        protocolVersion: 'v1',
        type: 'UI_INTENT',
        payload: { id: 'ui1', component: 'Card', intent: 'mount', props: {}, callbacks: [] },
      },
    } as any)
    worker.onmessage?.({
      data: {
        protocolVersion: 'v1',
        type: 'UI_INTENT',
        payload: { id: 'ui2', component: 'Card', intent: 'mount', props: {}, callbacks: [] },
      },
    } as any)

    expect(client.getState().uiIntents.map((p) => p.id)).toEqual(['ui2'])
  })

  it('supports disabling caches via max=0', async () => {
    const client = createSandboxClient({ maxLogs: 0, maxTraces: 0, maxUiIntents: 0 })
    await client.init()

    const worker = FakeWorker.instances[0]!

    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'LOG', payload: { level: 'info', args: ['x'], timestamp: 1 } },
    } as any)
    worker.onmessage?.({
      data: { protocolVersion: 'v1', type: 'TRACE', payload: { spanId: 'a', name: 'a', startTime: 1, status: 'running' } },
    } as any)
    worker.onmessage?.({
      data: {
        protocolVersion: 'v1',
        type: 'UI_INTENT',
        payload: { id: 'ui1', component: 'Card', intent: 'mount', props: {}, callbacks: [] },
      },
    } as any)

    expect(client.getState().logs).toEqual([])
    expect(client.getState().traces).toEqual([])
    expect(client.getState().uiIntents).toEqual([])
  })
})

