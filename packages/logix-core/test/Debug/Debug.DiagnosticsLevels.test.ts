import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import * as Logix from '../../src/index.js'

describe('Debug diagnosticsLevel (off|light|full)', () => {
  it.effect('off should suppress exportable RuntimeDebugEventRef', () =>
    Effect.sync(() => {
      const ref = CoreDebug.internal.toRuntimeDebugEventRef(
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
        fieldSummary: { top: [{ key: 'x', cost: 1 }] },
        replayEvent: { _tag: 'ResourceSnapshot', resourceId: 'R', keyHash: 'K' },
      } as any

      const light = CoreDebug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'light' }) as any
      const full = CoreDebug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'full' }) as any

      expect(light).toBeDefined()
      expect(full).toBeDefined()

      expect(light.meta?.state).toEqual({ count: 1 })
      expect(light.meta?.dirtySet).toEqual({ dirtyAll: false, paths: [['a']] })
      expect(light.meta?.commitMode).toBe('normal')
      expect(light.meta?.priority).toBe('normal')
      expect(light.meta?.fieldSummary).toBeUndefined()
      expect(light.meta?.replayEvent).toBeUndefined()

      expect(full.meta?.state).toEqual({ count: 1 })
      expect(full.meta?.dirtySet).toEqual({ dirtyAll: false, paths: [['a']] })
      expect(full.meta?.commitMode).toBe('normal')
      expect(full.meta?.priority).toBe('normal')
      expect(full.meta?.fieldSummary).toBeDefined()
      expect(full.meta?.replayEvent).toBeDefined()

      expect(() => JSON.stringify(light)).not.toThrow()
      expect(() => JSON.stringify(full)).not.toThrow()
    }),
  )

  it.effect('state:update should strip historical dirtySet.rootPaths even when staticIrDigest is missing', () =>
    Effect.sync(() => {
      const event = {
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-historical',
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

      const ref = CoreDebug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'full' }) as any
      expect(ref).toBeDefined()
      expect(ref.meta?.staticIrDigest).toBeUndefined()
      expect(ref.meta?.dirtySet?.rootPaths).toBeUndefined()
      expect(ref.meta?.dirtySet?.rootIds).toEqual([0])
    }),
  )

  it.effect('trace:field:converge(full) should strip historical dirty.rootPaths and keep id-first dirty roots', () =>
    Effect.sync(() => {
      const event = {
        type: 'trace:field:converge',
        moduleId: 'M',
        instanceId: 'i-historical-trait',
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

      const ref = CoreDebug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'full' }) as any
      expect(ref).toBeDefined()
      expect(ref.meta?.dirty?.rootPaths).toBeUndefined()
      expect(ref.meta?.dirty?.rootIds).toEqual([1])
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

      const ref = CoreDebug.internal.toRuntimeDebugEventRef(event, { diagnosticsLevel: 'full' }) as any
      expect(ref).toBeDefined()
      expect(ref.downgrade?.reason).toBe('oversized')
      expect(typeof ref.meta?.action?.payload).toBe('string')
      expect(ref.meta.action.payload.length).toBeLessThanOrEqual(256)
      expect(() => JSON.stringify(ref)).not.toThrow()
    }),
  )

  it.effect('DevtoolsHub should not record ring buffer events in off level', () =>
    Effect.gen(function* () {
      CoreDebug.clearDevtoolsEvents()

      const event = {
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-off',
        txnSeq: 1,
        state: { count: 1n }, // would throw if ever enters exportable payload
      } satisfies CoreDebug.Event

      yield* CoreDebug.record(event).pipe(
        (effect) => Effect.provideService(effect, CoreDebug.internal.currentDiagnosticsLevel, 'off'),
        Effect.provide(CoreDebug.devtoolsHubLayer({ bufferSize: 10 })),
      )

      expect(CoreDebug.getDevtoolsSnapshot().events.length).toBe(0)
    }),
  )
})
