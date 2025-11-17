import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'

describe('Debug.RuntimeDebugEventRef serialization', () => {
  it.effect('lifecycle:error cause should be downgraded into serializable errorSummary + downgrade marker', () =>
    Effect.sync(() => {
      // bigint + cycle + function: JSON.stringify should throw if not downgraded.
      const cause: any = {
        bigint: 1n,
        fn: () => undefined,
      }
      cause.self = cause

      const event = {
        type: 'lifecycle:error',
        moduleId: 'M',
        instanceId: 'i-1',
        cause,
      } as any

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(event) as any

      expect(ref).toBeDefined()
      expect(ref.instanceId).toBe('i-1')
      expect(ref.errorSummary?.message).toEqual(expect.any(String))
      expect(ref.downgrade?.reason).toBe('non_serializable')
      expect(() => JSON.stringify(ref)).not.toThrow()
    }),
  )

  it.effect('trace:trait:check should be exportable as RuntimeDebugEventRef (light/full)', () =>
    Effect.sync(() => {
      const event = {
        type: 'trace:trait:check',
        moduleId: 'M',
        instanceId: 'i-1',
        txnSeq: 1,
        txnId: 'i-1::t1',
        data: {
          ruleId: 'items#uniqueWarehouse',
          scopeFieldPath: ['items'],
          mode: 'valueChange',
          trigger: { kind: 'action:setValue', path: ['items', 'warehouseId'], op: 'set' },
          summary: { scannedRows: 100, affectedRows: 3, changedRows: 3, durationMs: 1.23 },
          rowIdMode: 'trackBy',
        },
      } as any

      const refFull = Logix.Debug.internal.toRuntimeDebugEventRef(event, {
        diagnosticsLevel: 'full',
      }) as any
      expect(refFull).toBeDefined()
      expect(refFull.kind).toBe('trait:check')
      expect(refFull.label).toBe('trait:check')
      expect(refFull.meta?.ruleId).toBe('items#uniqueWarehouse')
      expect(() => JSON.stringify(refFull)).not.toThrow()

      const refLight = Logix.Debug.internal.toRuntimeDebugEventRef(event, {
        diagnosticsLevel: 'light',
      }) as any
      expect(refLight).toBeDefined()
      expect(refLight.kind).toBe('trait:check')
      expect(refLight.meta?.ruleId).toBe('items#uniqueWarehouse')
      expect(() => JSON.stringify(refLight)).not.toThrow()
    }),
  )
})
