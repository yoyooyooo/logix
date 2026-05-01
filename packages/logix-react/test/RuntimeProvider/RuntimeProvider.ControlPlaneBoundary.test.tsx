import { describe, expect, it } from 'vitest'
import * as RuntimeProviderNS from '../../src/RuntimeProvider.js'

describe('React host adapter control-plane boundary', () => {
  it('should expose RuntimeProvider directly as the host adapter component without metadata shell', () => {
    expect(RuntimeProviderNS.RuntimeProvider).toBeDefined()
    expect('hostAdapterSurface' in (RuntimeProviderNS as any)).toBe(false)
    expect('controlPlaneBoundary' in (RuntimeProviderNS as any)).toBe(false)
  })
})
