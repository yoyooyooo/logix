// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'

describe('live host adjunct disabled guard', () => {
  it('keeps host adjunct capture behind explicit dev live adapter installation', async () => {
    const { clearInstalledLogixLiveBrowserAdapter } = await import('../../../src/dev/live.js')
    const key = Symbol.for('@logixjs/react/dev-live-browser-adapter')

    try {
      expect((globalThis as any)[key]).toBeUndefined()
    } finally {
      clearInstalledLogixLiveBrowserAdapter()
    }
  })
})
