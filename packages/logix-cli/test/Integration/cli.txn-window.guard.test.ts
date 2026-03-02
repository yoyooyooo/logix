import { describe, expect, it } from 'vitest'

import { withTxnIoGuard, type TxnGuardEvent } from '../../src/internal/runtime/txnGuard.js'

describe('logix-cli integration (txn window guard)', () => {
  it('blocks io in txn phase and emits guard event', () => {
    const events: TxnGuardEvent[] = []

    expect(() =>
      withTxnIoGuard(
        'normalize',
        'write',
        () => 'should-not-run',
        (event) => {
          events.push(event)
        },
      ),
    ).toThrowError(/事务窗口禁止 IO/)

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      schemaVersion: 1,
      kind: 'TxnGuardEvent',
      event: 'txn.io.blocked',
      phase: 'normalize',
      ioIntent: 'write',
      code: 'CLI_VIOLATION_TXN_IO',
    })
  })

  it('allows io outside txn phase', () => {
    const value = withTxnIoGuard('emit', 'write', () => 'ok')
    expect(value).toBe('ok')
  })
})
