import { describe, expect, it } from 'vitest'
import * as Logix from '../../src/index.js'
import type { RuntimeOptions } from '../../src/Runtime.js'

describe('Runtime HMR lifecycle public surface guard', () => {
  it('does not expose an HMR-specific runtime route', () => {
    expect('hmr' in Logix.Runtime).toBe(false)
    expect('hotLifecycle' in Logix.Runtime).toBe(false)
    expect('disposeForHotReload' in Logix.Runtime).toBe(false)
  })

  it('does not add HMR lifecycle options to Runtime.make', () => {
    const optionKeys = new Set<keyof RuntimeOptions>([
      'layer',
      'middleware',
      'debug',
      'devtools',
      'label',
      'hostScheduler',
      'stateTransaction',
      'schedulingPolicy',
      'readQuery',
      'onError',
    ])

    expect(optionKeys.has('hmr' as keyof RuntimeOptions)).toBe(false)
    expect(optionKeys.has('hotLifecycle' as keyof RuntimeOptions)).toBe(false)
  })
})
