import { describe, expect, it } from 'vitest'
import { makeScenarioBundlePatchRef } from '../../../src/internal/verification/scenarioCarrierFeed.js'

describe('ScenarioBundlePatchRef', () => {
  it('builds deterministic refs from bundlePatchPath seeds', () => {
    expect(makeScenarioBundlePatchRef({ bundlePatchPath: 'items.warehouseId' })).toBe('bundlePatch:items.warehouseId')
    expect(makeScenarioBundlePatchRef({ bundlePatchPath: 'items.warehouseId' })).toBe('bundlePatch:items.warehouseId')
  })

  it('keeps different seeds distinct', () => {
    expect(makeScenarioBundlePatchRef({ bundlePatchPath: 'items.warehouseId' })).not.toBe(
      makeScenarioBundlePatchRef({ bundlePatchPath: 'items.countryId' }),
    )
  })

  it('can include an internal domain prefix without parsing domain payload', () => {
    expect(makeScenarioBundlePatchRef({ domain: 'form', bundlePatchPath: 'items.warehouseId' })).toBe(
      'bundlePatch:form:items.warehouseId',
    )
  })

  it('fails closed for empty bundlePatchPath seeds', () => {
    expect(() => makeScenarioBundlePatchRef({ bundlePatchPath: '   ' })).toThrow(
      '[Logix] bundlePatchPath must be non-empty',
    )
  })
})
