import { describe, expect, it } from 'vitest'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'

const exactQuery = {
  selectorId: 'selector:profile.name',
  reads: ['profile.name'],
  select: (state: any) => state.profile.name,
  equalsKind: 'objectIs',
  lane: 'static',
  producer: 'manual',
  readsDigest: { count: 1, hash: 91 },
  staticIr: {
    selectorId: 'selector:profile.name',
    lane: 'static',
    producer: 'manual',
    reads: ['profile.name'],
    readsDigest: { count: 1, hash: 91 },
    equalsKind: 'objectIs',
  },
} satisfies RuntimeContracts.Selector.ReadQueryCompiled<any, any>

describe('runtime selector route decision contract', () => {
  it('returns exact route decisions with fingerprint identity', () => {
    const decision = RuntimeContracts.Selector.route(exactQuery)

    expect(decision.kind).toBe('exact')
    expect(decision.selectorIdLabel).toBe('selector:profile.name')
    expect(decision.selectorFingerprint.value).toMatch(/^sf_/)
    expect(decision.precisionQuality).toBe('exact')
  })

  it('returns structured reject decisions with repair hints', () => {
    const decision = RuntimeContracts.Selector.route({
      ...exactQuery,
      selectorId: 'selector:dynamic',
      lane: 'dynamic',
      producer: 'dynamic',
      reads: [],
      readsDigest: undefined,
      fallbackReason: 'missingDeps',
      staticIr: {
        ...exactQuery.staticIr,
        selectorId: 'selector:dynamic',
        lane: 'dynamic',
        producer: 'dynamic',
        reads: [],
        readsDigest: undefined,
        fallbackReason: 'missingDeps',
      },
    })

    expect(decision.kind).toBe('reject')
    expect(decision.failureCode).toBe('selector.dynamic_fallback')
    expect(decision.repairHint).toContain('exact selector input')
  })
})
