import { describe, expect, it } from 'vitest'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'

const makeQuery = (reads: ReadonlyArray<string>, equalsKind: RuntimeContracts.Selector.EqualsKind = 'objectIs') =>
  ({
    selectorId: 'same-label',
    reads,
    select: (state: any) => state,
    equalsKind,
    lane: 'static',
    producer: 'manual',
    readsDigest: { count: reads.length, hash: reads.join('|').length },
    staticIr: {
      selectorId: 'same-label',
      lane: 'static',
      producer: 'manual',
      reads,
      readsDigest: { count: reads.length, hash: reads.join('|').length },
      equalsKind,
    },
  }) satisfies RuntimeContracts.Selector.ReadQueryCompiled<any, any>

describe('runtime selector fingerprint identity contract', () => {
  it('does not reuse identity by selector id label alone', () => {
    const a = RuntimeContracts.Selector.computeFingerprint(makeQuery(['a']))
    const b = RuntimeContracts.Selector.computeFingerprint(makeQuery(['b']))

    expect(a.value).not.toBe(b.value)
  })

  it('includes equality semantics', () => {
    const objectIs = RuntimeContracts.Selector.computeFingerprint(makeQuery(['a'], 'objectIs'))
    const shallowStruct = RuntimeContracts.Selector.computeFingerprint(makeQuery(['a'], 'shallowStruct'))

    expect(objectIs.value).not.toBe(shallowStruct.value)
  })

  it('includes path authority epoch', () => {
    const query = makeQuery(['a'])
    const epoch1 = RuntimeContracts.Selector.computeFingerprint(query, 1)
    const epoch2 = RuntimeContracts.Selector.computeFingerprint(query, 2)

    expect(epoch1.value).not.toBe(epoch2.value)
  })
})
