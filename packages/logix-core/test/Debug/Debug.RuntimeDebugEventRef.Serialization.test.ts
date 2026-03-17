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
          txnPreludeMs: 0.05,
          queue: {
            lane: 'urgent',
            contextLookupMs: 0.05,
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
      expect(refFull.meta?.txnPreludeMs).toBe(0.05)
      expect(refFull.meta?.queue?.contextLookupMs).toBe(0.05)
      expect(refFull.meta?.queue?.lane).toBe('urgent')
      expect(refFull.meta?.bodyShellMs).toBe(1.2)
      expect(refFull.meta?.commit?.totalMs).toBe(2.2)
      expect(() => JSON.stringify(refFull)).not.toThrow()

      const refLight = Logix.Debug.internal.toRuntimeDebugEventRef(event, {
        diagnosticsLevel: 'light',
      }) as any
      expect(refLight).toBeDefined()
      expect(refLight.meta?.txnPreludeMs).toBe(0.05)
      expect(refLight.meta?.queue?.contextLookupMs).toBe(0.05)
      expect(refLight.meta?.queue?.queueWaitMs).toBe(0.4)
      expect(refLight.meta?.commit?.publishCommitMs).toBe(0.6)
      expect(() => JSON.stringify(refLight)).not.toThrow()
    }),
  )

  it.effect('RuntimeDebugEventRef should classify runtime/controlplane/devtools cost classes with slim gate metadata', () =>
    Effect.sync(() => {
      const stateRef = Logix.Debug.internal.toRuntimeDebugEventRef({
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-1',
        txnSeq: 1,
        txnId: 'i-1::t1',
        state: { count: 1 },
        stateWrite: {
          source: 'boundApi.update',
          coverage: 'customMutation',
          degradeReason: 'customMutation',
          anchor: {
            instanceId: 'i-1',
            txnSeq: 1,
            opSeq: 0,
          },
          pathIdsTopK: [0],
        },
      } as any) as any
      expect(stateRef.costClass).toBe('runtime_core')
      expect(stateRef.gateClass).toBe('hard')
      expect(stateRef.samplingPolicy).toBe('always')
      expect(stateRef.meta?.stateWrite?.source).toBe('boundApi.update')
      expect(stateRef.meta?.stateWrite?.coverage).toBe('customMutation')

      const txnPhaseRef = Logix.Debug.internal.toRuntimeDebugEventRef({
        type: 'trace:txn-phase',
        moduleId: 'M',
        instanceId: 'i-1',
        txnSeq: 2,
        txnId: 'i-1::t2',
        data: {
          kind: 'txn-phase',
          queue: { lane: 'urgent' },
        },
      } as any) as any
      expect(txnPhaseRef.costClass).toBe('controlplane_phase')
      expect(txnPhaseRef.gateClass).toBe('soft')
      expect(txnPhaseRef.samplingPolicy).toBe('budgeted')

      const selectorRef = Logix.Debug.internal.toRuntimeDebugEventRef({
        type: 'trace:react-selector',
        moduleId: 'M',
        instanceId: 'i-1',
        txnSeq: 3,
        txnId: 'i-1::t3',
        data: {
          componentLabel: 'SelectorProbe',
          selectorKey: 'probe',
        },
      } as any) as any
      expect(selectorRef.costClass).toBe('devtools_projection')
      expect(selectorRef.gateClass).toBe('soft')
      expect(selectorRef.samplingPolicy).toBe('sampled')
      expect(() => JSON.stringify(selectorRef)).not.toThrow()
    }),
  )
})
