import { describe, expect, it } from 'vitest'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'

const makeQuery = (overrides: Partial<RuntimeContracts.Selector.ReadQueryCompiled<any, any>> = {}) =>
  ({
    selectorId: overrides.selectorId ?? 'selector:profile.name',
    debugKey: overrides.debugKey,
    reads: overrides.reads ?? ['profile.name'],
    select: (state: any) => state.profile.name,
    equalsKind: overrides.equalsKind ?? 'objectIs',
    lane: overrides.lane ?? 'static',
    producer: overrides.producer ?? 'manual',
    readsDigest: overrides.readsDigest ?? { count: 1, hash: 91 },
    fallbackReason: overrides.fallbackReason,
    staticIr: {
      selectorId: overrides.selectorId ?? 'selector:profile.name',
      debugKey: overrides.debugKey,
      lane: overrides.lane ?? 'static',
      producer: overrides.producer ?? 'manual',
      reads: overrides.reads ?? ['profile.name'],
      readsDigest: overrides.readsDigest ?? { count: 1, hash: 91 },
      fallbackReason: overrides.fallbackReason,
      equalsKind: overrides.equalsKind ?? 'objectIs',
    },
  }) satisfies RuntimeContracts.Selector.ReadQueryCompiled<any, any>

describe('runtime selector precision diagnostics contract', () => {
  it('serializes exact selector-quality artifacts as slim static evidence', () => {
    const route = RuntimeContracts.Selector.route(makeQuery())
    const artifact = RuntimeContracts.Selector.toSelectorQualityArtifact({
      stage: 'static',
      producer: 'runtime.check',
      route,
      sourceRef: 'test:profile.name',
    })

    expect(artifact).toEqual({
      stage: 'static',
      producer: 'runtime.check',
      selectorFingerprint: route.selectorFingerprint.value,
      precisionQuality: 'exact',
      routeKind: 'exact',
      sourceRef: 'test:profile.name',
    })
    expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact)
    expect('readQuery' in artifact).toBe(false)
    expect('select' in artifact).toBe(false)
  })

  it('serializes rejected selector-quality artifacts with repair hints only', () => {
    const route = RuntimeContracts.Selector.route(
      makeQuery({
        selectorId: 'selector:dynamic',
        reads: [],
        readsDigest: undefined,
        lane: 'dynamic',
        producer: 'dynamic',
        fallbackReason: 'unsupportedSyntax',
      }),
    )
    const artifact = RuntimeContracts.Selector.toSelectorQualityArtifact({
      stage: 'host-harness',
      producer: 'react.useSelector',
      route,
    })

    expect(artifact).toMatchObject({
      stage: 'host-harness',
      producer: 'react.useSelector',
      selectorFingerprint: route.selectorFingerprint.value,
      precisionQuality: 'dynamic',
      routeKind: 'reject',
      fallbackKind: 'unsupportedSyntax',
      repairHint: expect.stringContaining('exact selector input'),
    })
    expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact)
  })
})
