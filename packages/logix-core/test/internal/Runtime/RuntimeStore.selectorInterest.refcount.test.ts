import { describe, it, expect } from 'vitest'
import { makeModuleInstanceKey, makeRuntimeStore } from '../../../src/internal/runtime/core/RuntimeStore.js'

describe('RuntimeStore selector interest refCount', () => {
  it('tracks retain/release by (moduleInstanceKey, selectorId) and clears on zero', () => {
    const store = makeRuntimeStore()
    const moduleKey = makeModuleInstanceKey('SelectorInterestRefCount', 'i-1')
    store.registerModuleInstance({
      moduleId: 'SelectorInterestRefCount',
      instanceId: 'i-1',
      moduleInstanceKey: moduleKey,
      initialState: { value: 0 },
    })

    expect(store.hasSelectorInterest(moduleKey, 'a')).toBe(false)

    const releaseA1 = store.retainSelectorInterest(moduleKey, 'a')
    const releaseA2 = store.retainSelectorInterest(moduleKey, 'a')
    const releaseB1 = store.retainSelectorInterest(moduleKey, 'b')

    expect(store.hasSelectorInterest(moduleKey, 'a')).toBe(true)
    expect(store.hasSelectorInterest(moduleKey, 'b')).toBe(true)

    releaseA1()
    expect(store.hasSelectorInterest(moduleKey, 'a')).toBe(true)
    releaseA1()
    expect(store.hasSelectorInterest(moduleKey, 'a')).toBe(true)

    releaseA2()
    expect(store.hasSelectorInterest(moduleKey, 'a')).toBe(false)
    expect(store.hasSelectorInterest(moduleKey, 'b')).toBe(true)

    releaseB1()
    expect(store.hasSelectorInterest(moduleKey, 'b')).toBe(false)
  })

  it('drops selector interest bucket on module unregister', () => {
    const store = makeRuntimeStore()
    const moduleKey = makeModuleInstanceKey('SelectorInterestUnregister', 'i-1')
    store.registerModuleInstance({
      moduleId: 'SelectorInterestUnregister',
      instanceId: 'i-1',
      moduleInstanceKey: moduleKey,
      initialState: { value: 0 },
    })

    const release = store.retainSelectorInterest(moduleKey, 'view')
    expect(store.hasSelectorInterest(moduleKey, 'view')).toBe(true)

    store.unregisterModuleInstance(moduleKey)
    expect(store.hasSelectorInterest(moduleKey, 'view')).toBe(false)

    release()
    expect(store.hasSelectorInterest(moduleKey, 'view')).toBe(false)
  })
})
