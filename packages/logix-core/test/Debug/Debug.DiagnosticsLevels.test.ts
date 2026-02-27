import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'

describe('Debug diagnosticsLevel (off|light|full)', () => {
  it.effect('off should suppress exportable RuntimeDebugEventRef', () =>
    Effect.sync(() => {
      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(
        {
          type: 'module:init',
          moduleId: 'M',
          instanceId: 'i-1',
        } as any,
        { diagnosticsLevel: 'off' },
      )
      expect(ref).toBeUndefined()
    }),
  )

  it.effect('light should omit high-cost meta fields while staying JSON-serializable', () =>
    Effect.sync(() => {
      const event = {
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-1',
        txnSeq: 1,
        state: { count: 1 },
        dirtySet: { dirtyAll: false, paths: [['a']] },
        commitMode: 'normal',
        priority: 'normal',
        traitSummary: { top: [{ key: 'x', cost: 1 }] },
        replayEvent: { _tag: 'ResourceSnapshot', resourceId: 'R', keyHash: 'K' },
      } as any

      const light = Logix.Debug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'light' }) as any
      const full = Logix.Debug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'full' }) as any

      expect(light).toBeDefined()
      expect(full).toBeDefined()

      expect(light.meta?.state).toEqual({ count: 1 })
      expect(light.meta?.dirtySet).toEqual({ dirtyAll: false, paths: [['a']] })
      expect(light.meta?.commitMode).toBe('normal')
      expect(light.meta?.priority).toBe('normal')
      expect(light.meta?.traitSummary).toBeUndefined()
      expect(light.meta?.replayEvent).toBeUndefined()

      expect(full.meta?.state).toEqual({ count: 1 })
      expect(full.meta?.dirtySet).toEqual({ dirtyAll: false, paths: [['a']] })
      expect(full.meta?.commitMode).toBe('normal')
      expect(full.meta?.priority).toBe('normal')
      expect(full.meta?.traitSummary).toBeDefined()
      expect(full.meta?.replayEvent).toBeDefined()

      expect(() => JSON.stringify(light)).not.toThrow()
      expect(() => JSON.stringify(full)).not.toThrow()
    }),
  )

  it.effect('state:update should strip legacy dirtySet.rootPaths even when staticIrDigest is missing', () =>
    Effect.sync(() => {
      const event = {
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-legacy',
        txnSeq: 2,
        state: { count: 2 },
        staticIrDigest: undefined,
        dirtySet: {
          dirtyAll: false,
          rootIds: [0],
          rootCount: 1,
          keySize: 1,
          keyHash: 42,
          rootIdsTruncated: false,
          rootPaths: [['count']],
        },
        patchCount: 1,
        patchesTruncated: false,
        commitMode: 'normal',
        priority: 'normal',
      } as any

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'full' }) as any
      expect(ref).toBeDefined()
      expect(ref.meta?.staticIrDigest).toBeUndefined()
      expect(ref.meta?.dirtySet?.rootPaths).toBeUndefined()
      expect(ref.meta?.dirtySet?.rootIds).toEqual([0])
    }),
  )

  it.effect('state:update should materialize traceLookupKey/traceDigestPayload when lookup key is provided', () =>
    Effect.sync(() => {
      const event = {
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-digest',
        txnSeq: 11,
        txnId: 'i-digest::t11',
        state: { count: 11 },
        traceLookupKey: {
          staticIrDigest: 'converge_ir_v2:digest',
          nodeId: 3,
        },
        dirtySet: {
          dirtyAll: false,
          rootIds: [3],
          rootCount: 1,
          keySize: 1,
          keyHash: 7,
          rootIdsTruncated: false,
        },
      } as any

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'light' }) as any
      expect(ref).toBeDefined()
      expect(ref.meta?.traceLookupKey).toEqual({
        staticIrDigest: 'converge_ir_v2:digest',
        nodeId: 3,
      })
      expect(ref.meta?.traceDigestPayload?.schemaVersion).toBe(1)
      expect(ref.meta?.traceDigestPayload?.digestAlgoVersion).toBe('converge_ir_v2')
      expect(ref.meta?.traceDigestPayload?.lookupKey).toEqual({
        staticIrDigest: 'converge_ir_v2:digest',
        nodeId: 3,
      })
      expect(ref.meta?.traceDigestPayload?.anchor?.instanceId).toBe('i-digest')
      expect(ref.meta?.traceDigestPayload?.anchor?.txnSeq).toBe(11)
      expect(ref.meta?.traceDigestDegrade).toBeUndefined()
    }),
  )

  it.effect('state:update should prefer runtime staticIrDigest when lookup digest mismatches', () =>
    Effect.sync(() => {
      const event = {
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-digest-mismatch',
        txnSeq: 17,
        staticIrDigest: 'converge_ir_v2:new',
        traceLookupKey: {
          staticIrDigest: 'converge_ir_v2:old',
          nodeId: 3,
        },
        dirtySet: {
          dirtyAll: false,
          rootIds: [5],
          rootCount: 1,
          keySize: 1,
          keyHash: 9,
          rootIdsTruncated: false,
        },
      } as any

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'light' }) as any
      expect(ref).toBeDefined()
      expect(ref.meta?.staticIrDigest).toBe('converge_ir_v2:new')
      expect(ref.meta?.traceLookupKey?.staticIrDigest).toBe('converge_ir_v2:new')
      expect(ref.meta?.traceLookupKey?.nodeId).toBe(5)
      expect(ref.meta?.traceDigestPayload?.lookupKey?.staticIrDigest).toBe('converge_ir_v2:new')
      expect(ref.meta?.traceDigestPayload?.lookupKey?.nodeId).toBe(5)
      expect(ref.meta?.traceDigestDegrade?.reasonCode).toBe('digest_mismatch')
    }),
  )

  it.effect('trace:trait:converge(full) should strip legacy dirty.rootPaths and keep id-first dirty roots', () =>
    Effect.sync(() => {
      const event = {
        type: 'trace:trait:converge',
        moduleId: 'M',
        instanceId: 'i-legacy-trait',
        data: {
          staticIrDigest: 'converge_ir_v2:test',
          dirty: {
            dirtyAll: false,
            rootIds: [1],
            rootIdsTruncated: false,
            rootPaths: [['profile', 'name']],
          },
        },
      } as any

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'full' }) as any
      expect(ref).toBeDefined()
      expect(ref.meta?.dirty?.rootPaths).toBeUndefined()
      expect(ref.meta?.dirty?.rootIds).toEqual([1])
      expect(ref.meta?.traceLookupKey?.staticIrDigest).toBe('converge_ir_v2:test')
      expect(ref.meta?.traceLookupKey?.nodeId).toBe(1)
      expect(ref.meta?.traceDigestPayload?.lookupKey?.staticIrDigest).toBe('converge_ir_v2:test')
      expect(ref.meta?.traceDigestPayload?.lookupKey?.nodeId).toBe(1)
      expect(ref.meta?.traceDigestPayload?.anchor?.instanceId).toBe('i-legacy-trait')
      expect(ref.meta?.traceDigestPayload?.anchor?.txnSeq).toBe(0)
    }),
  )

  it.effect('full should enforce a hard JSON size budget and mark downgrade=oversized', () =>
    Effect.sync(() => {
      const huge = 'x'.repeat(20_000)
      const event = {
        type: 'action:dispatch',
        moduleId: 'M',
        instanceId: 'i-1',
        action: { _tag: 'HugeAction', payload: huge },
      } as any

      const ref = Logix.Debug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'full' }) as any
      expect(ref).toBeDefined()
      expect(ref.downgrade?.reason).toBe('oversized')
      expect(typeof ref.meta?.action?.payload).toBe('string')
      expect(ref.meta.action.payload.length).toBeLessThanOrEqual(256)
      expect(() => JSON.stringify(ref)).not.toThrow()
    }),
  )

  it.effect('DevtoolsHub should not record ring buffer events in off level', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const event = {
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-off',
        txnSeq: 1,
        state: { count: 1n }, // would throw if ever enters exportable payload
      } satisfies Logix.Debug.Event

      yield* Logix.Debug.record(event).pipe(
        Effect.locally(Logix.Debug.internal.currentDiagnosticsLevel, 'off'),
        Effect.provide(Logix.Debug.devtoolsHubLayer({ bufferSize: 10 })),
      )

      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(0)
    }),
  )
})
