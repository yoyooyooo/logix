import { describe, it, expect } from '@effect/vitest'
import * as StateTransaction from '../../../../src/internal/runtime/core/StateTransaction.js'
import { makeFieldPathIdRegistry } from '../../../../src/internal/field-path.js'

describe('StateTransaction.recordPatchArrayFast', () => {
  it('should preserve field dirty evidence and list index evidence from array paths', () => {
    const registry = makeFieldPathIdRegistry([
      ['items', 'name'],
      ['items', 'meta', 'flag'],
    ])

    const ctx = StateTransaction.makeContext({
      instrumentation: 'light',
      captureSnapshots: false,
      getFieldPathIdRegistry: () => registry,
      getListPathSet: () => new Set(['items']),
      now: () => 0,
    })

    StateTransaction.beginTransaction(
      ctx,
      { kind: 'test', name: 'recordPatchArrayFast' },
      {
        items: [{ name: 'a', meta: { flag: false } }],
      },
    )

    StateTransaction.recordPatchArrayFast(
      ctx,
      ['items', '0', 'name'],
      'unknown',
      'a',
      'b',
    )

    const evidence = StateTransaction.readDirtyEvidence(ctx)
    expect(evidence?.dirtyAll).toBe(false)
    expect(evidence?.dirtyPathIds.size).toBe(1)
    expect(evidence?.list?.indexBindings.get('items@@')?.has(0)).toBe(true)
  })
})
