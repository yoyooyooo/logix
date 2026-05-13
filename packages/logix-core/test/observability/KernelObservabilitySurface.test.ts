import { describe, expect, it } from 'vitest'
import * as Observability from '../../src/internal/evidence-api.js'

describe('Kernel observability surface', () => {
  it('should expose control-surface export helpers from the public surface', () => {
    expect(typeof (Observability as any).exportControlSurfaceManifest).toBe('function')
    expect(typeof (Observability as any).exportEffectsIndexDigest).toBe('function')
    expect(typeof (Observability as any).exportControlProgramEffectsIndex).toBe('function')
    expect(typeof (Observability as any).exportControlProgramSurface).toBe('function')
    expect((Observability as any).trialRun).toBeUndefined()
    expect((Observability as any).trialRunModule).toBeUndefined()
  })
})
