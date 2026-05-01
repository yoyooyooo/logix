import { describe, expect, it } from 'vitest'
import pkg from '../../package.json' with { type: 'json' }
import * as Hooks from '../../src/Hooks.js'

describe('public reachability', () => {
  it('removes wildcard and ModuleScope from development exports', () => {
    expect(pkg.exports['./*' as keyof typeof pkg.exports]).toBeUndefined()
    expect(pkg.exports['./ModuleScope' as keyof typeof pkg.exports]).toBeUndefined()
    expect(Object.keys(pkg.exports).sort()).toEqual([
      '.',
      './FormProjection',
      './Hooks',
      './RuntimeProvider',
      './dev/lifecycle',
      './dev/vite',
      './dev/vitest',
      './internal/*',
      './package.json',
    ])
    expect('useModuleList' in Hooks).toBe(false)
    for (const key of [
      'selectorInternalResilienceMarker',
      'SelectorInternalResilienceMarked',
      'SelectorRouteDecision',
      'SelectorQualityArtifact',
      'toSelectorQualityArtifact',
    ]) {
      expect(key in Hooks).toBe(false)
    }
  })

  it('removes wildcard and ModuleScope from publishConfig exports', () => {
    const exportsMap = pkg.publishConfig.exports
    expect(exportsMap['./*' as keyof typeof exportsMap]).toBeUndefined()
    expect(exportsMap['./ModuleScope' as keyof typeof exportsMap]).toBeUndefined()
    expect(Object.keys(exportsMap).sort()).toEqual([
      '.',
      './FormProjection',
      './Hooks',
      './RuntimeProvider',
      './dev/lifecycle',
      './dev/vite',
      './dev/vitest',
      './internal/*',
      './package.json',
    ])
  })
})
