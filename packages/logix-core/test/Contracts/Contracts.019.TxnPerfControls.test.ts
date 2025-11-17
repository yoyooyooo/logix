import { expect, test } from 'vitest'
import dirtySetSchema from '../../../../specs/019-txn-perf-controls/contracts/schemas/dirty-set-v2.schema.json' with { type: 'json' }
import txnCommitEvidenceSchema from '../../../../specs/019-txn-perf-controls/contracts/schemas/txn-commit-evidence.schema.json' with { type: 'json' }

test('019 contracts: schema surface sanity', () => {
  expect((dirtySetSchema as any).$schema).toContain('json-schema')
  expect((dirtySetSchema as any).title).toBe('DirtySetV2')
  expect((dirtySetSchema as any).type).toBe('object')
  expect((dirtySetSchema as any).properties?.dirtyAll).toBeTruthy()
  expect((dirtySetSchema as any).properties?.reason?.enum).toEqual([
    'unknownWrite',
    'customMutation',
    'nonTrackablePatch',
    'fallbackPolicy',
  ])

  expect((txnCommitEvidenceSchema as any).$schema).toContain('json-schema')
  expect((txnCommitEvidenceSchema as any).title).toBe('TxnCommitEvidence')
  expect((txnCommitEvidenceSchema as any).type).toBe('object')
  expect((txnCommitEvidenceSchema as any).properties?.dirtySet?.$ref).toBe('./dirty-set-v2.schema.json')
})
