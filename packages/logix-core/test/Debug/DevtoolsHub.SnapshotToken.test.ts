import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

const flushMicrotask = (): Effect.Effect<void> =>
  Effect.promise(() => new Promise<void>((resolve) => queueMicrotask(resolve)))

describe('DevtoolsHub (SnapshotToken)', () => {
  it.effect('snapshotToken should update synchronously and match getter', () =>
    Effect.gen(function* () {
      CoreDebug.clearDevtoolsEvents()
      const before = CoreDebug.getDevtoolsSnapshotToken()

      const layer = CoreDebug.devtoolsHubLayer({
        bufferSize: 5,
        diagnosticsLevel: 'light',
      }) as Layer.Layer<any, never, never>

      yield* CoreDebug.record({
        type: 'trace:test',
        moduleId: 'A',
        instanceId: 'i-1',
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      const after = CoreDebug.getDevtoolsSnapshotToken()
      expect(after).toBeGreaterThan(before)
      expect(CoreDebug.getDevtoolsSnapshot().snapshotToken).toBe(after)
    }),
  )

  it.effect('snapshotToken should bump for instances/latest*/exportBudget even when events window disabled', () =>
    Effect.gen(function* () {
      CoreDebug.clearDevtoolsEvents()

      const layer = CoreDebug.devtoolsHubLayer({
        bufferSize: 0,
        diagnosticsLevel: 'full',
      }) as Layer.Layer<any, never, never>

      const base = CoreDebug.getDevtoolsSnapshotToken()

      yield* CoreDebug.record({
        type: 'module:init',
        moduleId: 'M',
        instanceId: 'i-1',
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      const t1 = CoreDebug.getDevtoolsSnapshotToken()
      expect(t1).toBeGreaterThan(base)
      expect(CoreDebug.getDevtoolsSnapshot().events.length).toBe(0)
      expect(CoreDebug.getDevtoolsSnapshot().instances.get('R::M') ?? 0).toBeGreaterThan(0)

      yield* CoreDebug.record({
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-1',
        runtimeLabel: 'R',
        txnSeq: 1,
        txnId: 'i-1::t1',
        state: { count: 1 },
        fieldSummary: { t: 1 },
      } as any).pipe(Effect.provide(layer))

      const t2 = CoreDebug.getDevtoolsSnapshotToken()
      expect(t2).toBeGreaterThan(t1)
      expect(CoreDebug.getDevtoolsSnapshot().events.length).toBe(0)
      expect(CoreDebug.getDevtoolsSnapshot().latestStates.get('R::M::i-1')).toEqual({ count: 1 })
      expect(CoreDebug.getDevtoolsSnapshot().latestFieldSummaries.get('R::M::i-1')).toEqual({ t: 1 })

      yield* CoreDebug.record({
        type: 'action:dispatch',
        moduleId: 'M',
        instanceId: 'i-1',
        runtimeLabel: 'R',
        txnSeq: 2,
        txnId: 'i-1::t2',
        action: { _tag: 'HugeAction', payload: 'x'.repeat(20_000) },
      } as any).pipe(Effect.provide(layer))

      const t3 = CoreDebug.getDevtoolsSnapshotToken()
      expect(t3).toBeGreaterThan(t2)
      expect(CoreDebug.getDevtoolsSnapshot().events.length).toBe(0)
      expect(CoreDebug.getDevtoolsSnapshot().exportBudget.oversized).toBeGreaterThan(0)
    }),
  )

  it.effect('subscribeDevtoolsSnapshot should batch notifications but never miss the latest token', () =>
    Effect.gen(function* () {
      CoreDebug.clearDevtoolsEvents()
      const start = CoreDebug.getDevtoolsSnapshotToken()

      let calls = 0
      let seen: CoreDebug.SnapshotToken | undefined

      const unsubscribe = CoreDebug.subscribeDevtoolsSnapshot(() => {
        calls += 1
        seen = CoreDebug.getDevtoolsSnapshotToken()
      })

      yield* Effect.sync(() => {
        CoreDebug.setDevtoolsRunId('run-a')
        CoreDebug.setDevtoolsRunId('run-b')
        CoreDebug.clearDevtoolsEvents()
      })

      yield* flushMicrotask()

      expect(calls).toBe(1)
      expect(seen).toBe(CoreDebug.getDevtoolsSnapshotToken())
      expect(seen!).toBeGreaterThan(start)

      unsubscribe()
    }),
  )
})
