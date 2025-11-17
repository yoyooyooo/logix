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
