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

describe('SandboxClient (watchdog / hard reset)', () => {
  const OriginalWorker = globalThis.Worker

  beforeEach(() => {
    FakeWorker.instances = []
    ;(globalThis as any).Worker = FakeWorker
  })

  afterEach(() => {
    ;(globalThis as any).Worker = OriginalWorker
  })

  it('hard-resets worker on run timeout', async () => {
    const client = createSandboxClient({ timeout: 120 })
    await client.init()

    const worker = FakeWorker.instances[0]!
    await expect(client.run({ runId: 't-run' })).rejects.toThrow('运行超时')

    expect(worker.terminated).toBe(true)
    expect(client.getState().status).toBe('error')
    expect(client.getState().error?.code).toBe('TIMEOUT')
  })

  it('hard-resets worker on compile timeout', async () => {
    const client = createSandboxClient({ timeout: 120 })
    await client.init()

    const worker = FakeWorker.instances[0]!
    await expect(client.compile('export const x = 1')).rejects.toThrow('编译超时')

    expect(worker.terminated).toBe(true)
    expect(client.getState().status).toBe('error')
    expect(client.getState().error?.code).toBe('TIMEOUT')
  })

  it('terminate() hard-resets worker and returns to idle', async () => {
    const client = createSandboxClient({ timeout: 120 })
    await client.init()

    const worker = FakeWorker.instances[0]!
    client.terminate()

    expect(worker.terminated).toBe(true)
    expect(client.getState().status).toBe('idle')
    expect(client.getState().error).toBe(null)
  })
})

