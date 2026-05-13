// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'

describe('live host adjunct cleanup guard', () => {
  it('closes the WebSocket and removes installed adapter state on cleanup', async () => {
    const { installLogixLiveBrowserAdapter, clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const key = Symbol.for('@logixjs/react/dev-live-browser-adapter')
    const previousWebSocket = globalThis.WebSocket
    let closeCount = 0

    class FakeWebSocket {
      static readonly OPEN = 1
      readonly readyState = 1

      send() {}

      close() {
        closeCount += 1
      }

      addEventListener() {}
    }

    ;(globalThis as any).WebSocket = FakeWebSocket
    try {
      expect(installLogixLiveBrowserAdapter({ host: '127.0.0.1', port: 8098 })).toBeDefined()
      expect((globalThis as any)[key]).toBeDefined()

      clearInstalledLogixLiveBrowserAdapter()

      expect(closeCount).toBe(1)
      expect((globalThis as any)[key]).toBeUndefined()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
      ;(globalThis as any).WebSocket = previousWebSocket
    }
  })
})
