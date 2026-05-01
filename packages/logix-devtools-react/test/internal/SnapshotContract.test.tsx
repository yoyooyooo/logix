import { describe, expect, it } from 'vitest'
import * as SnapshotNS from '../../src/internal/snapshot/index.js'

describe('Devtools snapshot contract', () => {
  it('should expose snapshot adapter APIs directly without metadata shell', () => {
    expect(typeof SnapshotNS.clearDevtoolsEvents).toBe('function')
    expect(typeof SnapshotNS.setInstanceLabel).toBe('function')
    expect(typeof SnapshotNS.getInstanceLabel).toBe('function')
    expect('devtoolsSnapshotSurface' in (SnapshotNS as any)).toBe(false)
  })
})
