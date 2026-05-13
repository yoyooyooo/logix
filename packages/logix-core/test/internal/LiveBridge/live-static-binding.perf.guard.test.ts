import { describe, expect, it } from 'vitest'

import {
  createLiveActionsProjection,
  createStaticLiveBindingIndex,
  makeLiveTargetCoordinate,
  type RuntimeReflectionManifest,
} from '../../../src/internal/live-bridge-api.js'

const target = {
  ...makeLiveTargetCoordinate({
    runtimeId: 'runtime-large',
    moduleId: 'LargeManifest',
    instanceId: 'default',
  }),
  attachmentId: 'browser:large',
  adapterKind: 'browser-dev' as const,
}

const makeLargeManifest = (count: number): RuntimeReflectionManifest => ({
  manifestVersion: 'runtime-reflection-manifest@167B',
  programId: 'large-manifest.program',
  rootModuleId: 'LargeManifest',
  rootModule: {} as never,
  modules: [],
  actions: Array.from({ length: count }, (_, index) => ({
    actionTag: `action.${index}`,
    payload: {
      kind: index % 2 === 0 ? 'void' : 'nonVoid',
      ...(index % 2 === 0 ? {} : { summary: 'number', schemaDigest: `schema:action.${index}` }),
      validatorAvailable: index % 2 !== 0,
    },
    authority: 'runtime-reflection',
  })),
  logicUnits: [],
  effects: [],
  processes: [],
  imports: [],
  services: [],
  capabilities: { run: 'available', check: 'available', trial: 'available' },
  sourceRefs: [],
  budget: { truncated: false, originalActionCount: count },
  digest: `runtime-manifest:large:${count}`,
})

describe('live static binding cost guards', () => {
  it('uses a manifest-scoped index for repeated large-manifest action lookup', () => {
    const manifest = makeLargeManifest(2_000)
    const index = createStaticLiveBindingIndex(manifest)

    for (const actionTag of ['action.1999', 'action.0', 'action.1337']) {
      expect(index.getAction(actionTag)?.actionTag).toBe(actionTag)
    }

    expect(index.getDiagnostics()).toEqual({
      manifestDigest: manifest.digest,
      actionCount: 2_000,
      indexedActionCount: 2_000,
      actionLookupCount: 3,
      linearScanCount: 0,
      projectionRowAllocationCount: 0,
      disposed: false,
    })
  })

  it('does not allocate action projection rows while only binding index exists', () => {
    const manifest = makeLargeManifest(32)
    const index = createStaticLiveBindingIndex(manifest)

    expect(index.getDiagnostics().projectionRowAllocationCount).toBe(0)

    createLiveActionsProjection({
      target,
      producer: 'live-static-binding.perf.guard',
      manifest,
      actionIndex: index,
      budget: { maxEvents: 16, maxInlineBytes: 2048 },
    })

    expect(index.getDiagnostics().projectionRowAllocationCount).toBe(32)
  })

  it('bounds explicit inspect action projection by manifest budget', () => {
    const manifest = makeLargeManifest(64)
    const index = createStaticLiveBindingIndex(manifest)

    const artifact = createLiveActionsProjection({
      target,
      producer: 'live-static-binding.perf.guard',
      manifest,
      actionIndex: index,
      maxActions: 10,
      budget: { maxEvents: 16, maxInlineBytes: 4096 },
    })

    expect((artifact.facet.payload as { readonly actions: ReadonlyArray<unknown> }).actions).toHaveLength(10)
    expect(artifact.facet.degraded).toEqual({ reason: 'actions-truncated' })
    expect(index.getDiagnostics().projectionRowAllocationCount).toBe(10)
  })
})
