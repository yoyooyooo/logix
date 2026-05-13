// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'

describe('live profile disabled guard', () => {
  it('does not install profile capture when the dev live adapter is disabled by production env', async () => {
    const { installLogixLiveBrowserAdapter, clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const previousEnv = process.env.NODE_ENV
    const previousWebSocket = globalThis.WebSocket
    let opened = 0

    class FakeWebSocket {
      constructor() {
        opened += 1
      }
    }

    process.env.NODE_ENV = 'production'
    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      expect(installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098 })).toBeUndefined()
      expect(opened).toBe(0)
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      process.env.NODE_ENV = previousEnv
      ;(globalThis as any).WebSocket = previousWebSocket
    }
  })
})
