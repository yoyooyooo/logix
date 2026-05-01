import { describe, expect, it } from 'vitest'
import { createSandboxClient } from '../../src/Client.js'

describe('SandboxClient run error handling', () => {
  it('rejects the active run when the worker reports a runtime error before COMPLETE', async () => {
    const client = createSandboxClient({ kernelUrl: '/sandbox/logix-core.js', timeout: 1000 })
    const postMessages: Array<unknown> = []
    const testClient = client as any

    testClient.worker = {
      postMessage: (message: unknown) => {
        postMessages.push(message)
      },
    }
    testClient.activeKernelUrl = '/sandbox/logix-core.js'

    const runPromise = client.run({ runId: 'run:test:error', useCompiledCode: true })

    testClient.handleEvent({
      data: {
        type: 'ERROR',
        payload: { code: 'RUNTIME_ERROR', message: 'boom' },
      },
    })
    testClient.handleEvent({
      data: {
        type: 'COMPLETE',
        payload: { runId: 'run:test:error', duration: 1 },
      },
    })

    await expect(runPromise).rejects.toThrow('boom')
    expect(postMessages).toEqual([
      { type: 'RUN', payload: { runId: 'run:test:error', useCompiledCode: true } },
    ])
    expect(client.getState().status).toBe('error')
  })
})
