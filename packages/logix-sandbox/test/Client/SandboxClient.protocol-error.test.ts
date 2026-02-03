import { describe, it, expect } from 'vitest'
import { createSandboxClient } from '@logixjs/sandbox'

describe('SandboxClient: protocol error handling', () => {
  it('turns invalid Worker events into PROTOCOL_ERROR', () => {
    const client = createSandboxClient()

    ;(client as any).handleEvent({ data: { nope: true } })

    const state = client.getState()
    expect(state.status).toBe('error')
    expect(state.error?.code).toBe('PROTOCOL_ERROR')
    expect(state.error?.protocol?.direction).toBe('WorkerToHost')
  })
})

