import { describe, expect, it } from 'vitest'

import {
  classifyPlatformChain,
  classifyPlatformLayerByCodePath,
  getPlatformLayerOwnerSpecs,
  shouldAcceptLayerUplift,
} from '../../src/internal/platform/layeredMapPolicy.js'

describe('Platform layered map policy', () => {
  it('classifies code paths into the five layered-map layers', () => {
    expect(classifyPlatformLayerByCodePath('packages/logix-core/src/Program.ts')).toBe('surface-authoring')
    expect(classifyPlatformLayerByCodePath('packages/logix-form/src/index.ts')).toBe('surface-authoring')
    expect(classifyPlatformLayerByCodePath('packages/logix-form/src/internal/form/fields.ts')).toBe('field-kernel')
    expect(classifyPlatformLayerByCodePath('packages/logix-core/src/internal/field-kernel/install.ts')).toBe(
      'field-kernel',
    )
    expect(
      classifyPlatformLayerByCodePath('packages/logix-core/src/internal/runtime/core/ModuleRuntime.dispatch.ts'),
    ).toBe('runtime-core')
    expect(classifyPlatformLayerByCodePath('packages/logix-core/src/ControlPlane.ts')).toBe('runtime-control-plane')
    expect(classifyPlatformLayerByCodePath('examples/logix-react/src/demos/GlobalRuntimeLayout.tsx')).toBe(
      'ui-projection',
    )
    expect(classifyPlatformLayerByCodePath('packages/domain/package.json')).toBe('unknown')
  })

  it('maps layers to the three chains and owner specs', () => {
    expect(classifyPlatformChain('surface-authoring')).toBe('implementation')
    expect(classifyPlatformChain('field-kernel')).toBe('implementation')
    expect(classifyPlatformChain('runtime-core')).toBe('implementation')
    expect(classifyPlatformChain('runtime-control-plane')).toBe('governance')
    expect(classifyPlatformChain('ui-projection')).toBe('host-projection')
    expect(classifyPlatformChain('unknown')).toBe('unknown')

    expect(getPlatformLayerOwnerSpecs('surface-authoring')).toEqual(['122', '125', '127'])
    expect(getPlatformLayerOwnerSpecs('field-kernel')).toEqual(['125'])
    expect(getPlatformLayerOwnerSpecs('runtime-core')).toEqual(['123'])
    expect(getPlatformLayerOwnerSpecs('runtime-control-plane')).toEqual(['124'])
    expect(getPlatformLayerOwnerSpecs('ui-projection')).toEqual(['126'])
    expect(getPlatformLayerOwnerSpecs('unknown')).toEqual([])
  })

  it('enforces the uplift gate against narrative-only proposals', () => {
    expect(
      shouldAcceptLayerUplift({
        benefit: 'platform-narrative-only',
        hasCodeRoots: true,
        hasOwnerSpecs: true,
      }),
    ).toBe(false)

    expect(
      shouldAcceptLayerUplift({
        benefit: 'runtime-clarity',
        hasCodeRoots: false,
        hasOwnerSpecs: true,
      }),
    ).toBe(false)

    expect(
      shouldAcceptLayerUplift({
        benefit: 'diagnostics',
        hasCodeRoots: true,
        hasOwnerSpecs: true,
      }),
    ).toBe(true)
  })
})
