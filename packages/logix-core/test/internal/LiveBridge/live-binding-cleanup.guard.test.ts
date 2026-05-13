import { describe, expect, it } from 'vitest'

import {
  createLiveBindingRegistry,
  makeLiveTargetCoordinate,
  type RuntimeReflectionManifest,
} from '../../../src/internal/live-bridge-api.js'

const makeManifest = (digest: string): RuntimeReflectionManifest => ({
  manifestVersion: 'runtime-reflection-manifest@167B',
  programId: `program:${digest}`,
  rootModuleId: 'CleanupFixture',
  rootModule: {} as never,
  modules: [],
  actions: [
    {
      actionTag: 'submit',
      payload: {
        kind: 'nonVoid',
        summary: 'string',
        schemaDigest: `schema:${digest}`,
        validatorAvailable: true,
      },
      authority: 'runtime-reflection',
    },
  ],
  logicUnits: [],
  effects: [],
  processes: [],
  imports: [],
  services: [],
  capabilities: { run: 'available', check: 'available', trial: 'available' },
  sourceRefs: [],
  budget: { truncated: false, originalActionCount: 1 },
  digest,
})

const target = makeLiveTargetCoordinate({
  runtimeId: 'runtime-cleanup',
  moduleId: 'CleanupFixture',
  instanceId: 'default',
})

describe('live binding cleanup guard', () => {
  it('cleans target-scoped binding indexes and projection counters on target removal', () => {
    const registry = createLiveBindingRegistry()
    registry.bindTarget({ target, manifest: makeManifest('runtime-manifest:cleanup:1') })

    const firstProjection = registry.projectActions({
      target: { ...target, attachmentId: 'browser:cleanup', adapterKind: 'browser-dev' },
      producer: 'live-binding-cleanup.guard',
    })
    expect(firstProjection.facet.payload).toMatchObject({
      binding: { manifestDigest: 'runtime-manifest:cleanup:1', bindingStatus: 'matched' },
    })
    expect(registry.getDiagnostics()).toMatchObject({
      targetBindingCount: 1,
      manifestIndexCount: 1,
      projectionCacheCount: 1,
      disposedIndexCount: 0,
    })

    registry.unbindTarget(target)

    expect(registry.resolveTarget(target)).toBeUndefined()
    expect(registry.getDiagnostics()).toMatchObject({
      targetBindingCount: 0,
      manifestIndexCount: 0,
      projectionCacheCount: 0,
      disposedIndexCount: 1,
    })
  })

  it('cleans superseded manifest index and projection cache when target rebinds', () => {
    const registry = createLiveBindingRegistry()
    registry.bindTarget({ target, manifest: makeManifest('runtime-manifest:cleanup:old') })
    registry.projectActions({
      target: { ...target, attachmentId: 'browser:cleanup', adapterKind: 'browser-dev' },
      producer: 'live-binding-cleanup.guard',
    })

    registry.bindTarget({ target, manifest: makeManifest('runtime-manifest:cleanup:new') })

    expect(registry.resolveTarget(target)?.manifest.digest).toBe('runtime-manifest:cleanup:new')
    expect(registry.getDiagnostics()).toMatchObject({
      targetBindingCount: 1,
      manifestIndexCount: 1,
      projectionCacheCount: 0,
      disposedIndexCount: 1,
    })
  })
})
