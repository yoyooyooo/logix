import { describe, expect, it } from 'vitest'

import {
  assertNoIoInTransactionWindow,
  assertStableIdentityEvidence,
  buildSlimEvidence,
} from '../browser/perf-scenarios/shared/runtimeGuards'

describe('perf scenario semantics guard', () => {
  it('accepts stable identity evidence and keeps slim payload serializable', () => {
    expect(() =>
      assertStableIdentityEvidence({
        instanceId: 'inst-1',
        txnSeq: 10,
        opSeq: 99,
      }),
    ).not.toThrow()

    const slim = buildSlimEvidence({
      instanceId: 'inst-1',
      txnSeq: 10,
      opSeq: 99,
      traceDigest: 'abc',
      enabled: true,
    })

    expect(JSON.parse(JSON.stringify(slim))).toEqual(slim)
  })

  it('fails fast when IO appears in transaction window', () => {
    expect(() =>
      assertNoIoInTransactionWindow([
        { tag: 'txn.start' },
        { tag: 'txn.io', ioInTxn: true },
      ]),
    ).toThrow('transaction window IO violation')
  })
})
