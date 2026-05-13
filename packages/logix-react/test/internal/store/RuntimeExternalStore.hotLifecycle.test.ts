import { describe, expect, it } from 'vitest'
import {
  disposeRuntimeExternalStoresForHotLifecycle,
  registerRuntimeExternalStoreDisposer,
  unregisterRuntimeExternalStoreDisposer,
} from '../../../src/internal/store/RuntimeExternalStore.hotLifecycle.js'

describe('RuntimeExternalStore hot lifecycle cleanup', () => {
  it('disposes and clears registered runtime store disposers', () => {
    const runtime = {}
    let closed = 0

    registerRuntimeExternalStoreDisposer(runtime, 'Counter::i1', () => {
      closed += 1
    })

    const first = disposeRuntimeExternalStoresForHotLifecycle(runtime)
    const second = disposeRuntimeExternalStoresForHotLifecycle(runtime)

    expect(first).toEqual({ closed: 1, failed: 0 })
    expect(second).toEqual({ closed: 0, failed: 0 })
    expect(closed).toBe(1)
  })

  it('allows unregistering a disposed store before lifecycle cleanup', () => {
    const runtime = {}
    registerRuntimeExternalStoreDisposer(runtime, 'Counter::i1', () => {
      throw new Error('should not run')
    })
    unregisterRuntimeExternalStoreDisposer(runtime, 'Counter::i1')

    expect(disposeRuntimeExternalStoresForHotLifecycle(runtime)).toEqual({ closed: 0, failed: 0 })
  })
})
