import { describe } from '@effect/vitest'
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

  it.effect('trace:txn-phase should be exportable as RuntimeDebugEventRef (light/full)', () =>
    Effect.sync(() => {
      const event = {
        type: 'trace:txn-phase',
        moduleId: 'M',
        instanceId: 'i-1',
        txnSeq: 7,
        txnId: 'i-1::t7',
        data: {
          kind: 'txn-phase',
          originKind: 'action',
          originName: 'bump',
          commitMode: 'normal',
          priority: 'normal',
          queue: {
            lane: 'urgent',
            resolvePolicyMs: 0.1,
            backpressureMs: 0.2,
            enqueueBookkeepingMs: 0.3,
            queueWaitMs: 0.4,
            startHandoffMs: 0.5,
            startMode: 'direct_idle',
          },
          bodyShellMs: 1.2,
          asyncEscapeGuardMs: 0.2,
          traitConvergeMs: 0.3,
          scopedValidateMs: 0.4,
          sourceSyncMs: 0.1,
          commit: {
            totalMs: 2.2,
            rowIdSyncMs: 0.1,
            publishCommitMs: 0.6,
            stateUpdateDebugRecordMs: 0.7,
            onCommitBeforeStateUpdateMs: 0,
            onCommitAfterStateUpdateMs: 0.3,
          },
        },
      } as any

      const refFull = Logix.Debug.internal.toRuntimeDebugEventRef(event, {
        diagnosticsLevel: 'full',
      }) as any
      expect(refFull).toBeDefined()
      expect(refFull.label).toBe('trace:txn-phase')
      expect(refFull.meta?.queue?.lane).toBe('urgent')
      expect(refFull.meta?.bodyShellMs).toBe(1.2)
      expect(refFull.meta?.commit?.totalMs).toBe(2.2)
      expect(() => JSON.stringify(refFull)).not.toThrow()

      const refLight = Logix.Debug.internal.toRuntimeDebugEventRef(event, {
        diagnosticsLevel: 'light',
      }) as any
      expect(refLight).toBeDefined()
      expect(refLight.meta?.queue?.queueWaitMs).toBe(0.4)
      expect(refLight.meta?.commit?.publishCommitMs).toBe(0.6)
      expect(() => JSON.stringify(refLight)).not.toThrow()
    }),
  )
})
