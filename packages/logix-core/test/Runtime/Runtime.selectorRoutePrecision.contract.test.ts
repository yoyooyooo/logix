import { describe, expect, it } from 'vitest'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'

const makeQuery = (overrides: Partial<RuntimeContracts.Selector.ReadQueryCompiled<any, any>> = {}) =>
  ({
    selectorId: overrides.selectorId ?? 'selector:count',
    debugKey: overrides.debugKey,
    reads: overrides.reads ?? ['count'],
    select: (state: any) => state.count,
    equalsKind: overrides.equalsKind ?? 'objectIs',
    lane: overrides.lane ?? 'static',
    producer: overrides.producer ?? 'manual',
    readsDigest: overrides.readsDigest ?? { count: 1, hash: 123 },
    fallbackReason: overrides.fallbackReason,
    staticIr: {
      selectorId: overrides.selectorId ?? 'selector:count',
      lane: overrides.lane ?? 'static',
      producer: overrides.producer ?? 'manual',
      reads: overrides.reads ?? ['count'],
      readsDigest: overrides.readsDigest ?? { count: 1, hash: 123 },
      fallbackReason: overrides.fallbackReason,
      equalsKind: overrides.equalsKind ?? 'objectIs',
    },
  }) satisfies RuntimeContracts.Selector.ReadQueryCompiled<any, any>

describe('runtime selector route precision contract', () => {
  it('classifies exact static reads', () => {
    const record = RuntimeContracts.Selector.classifyPrecision(makeQuery())
    const route = RuntimeContracts.Selector.route(makeQuery())

    expect(record.precisionQuality).toBe('exact')
    expect(route.kind).toBe('exact')
  })

  it('rejects dynamic fallback', () => {
    const route = RuntimeContracts.Selector.route(
      makeQuery({
        lane: 'dynamic',
        producer: 'dynamic',
        reads: [],
        readsDigest: undefined,
        fallbackReason: 'unsupportedSyntax',
      }),
    )

    expect(route.precisionQuality).toBe('dynamic')
    expect(route.kind).toBe('reject')
    expect(route.failureCode).toBe('selector.dynamic_fallback')
  })

  it('rejects broad root reads', () => {
    const route = RuntimeContracts.Selector.route(
      makeQuery({
        selectorId: 'selector:root',
        reads: [''],
        readsDigest: { count: 1, hash: 1 },
      }),
    )

    expect(route.precisionQuality).toBe('broad-root')
    expect(route.kind).toBe('reject')
    expect(route.failureCode).toBe('selector.broad_root')
  })
})
