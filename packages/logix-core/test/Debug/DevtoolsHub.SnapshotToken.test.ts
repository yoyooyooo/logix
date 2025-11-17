import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

const flushMicrotask = (): Effect.Effect<void> =>
  Effect.promise(() => new Promise<void>((resolve) => queueMicrotask(resolve)))

describe('DevtoolsHub (SnapshotToken)', () => {
  it.effect('snapshotToken should update synchronously and match getter', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()
      const before = Logix.Debug.getDevtoolsSnapshotToken()

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 5,
        diagnosticsLevel: 'light',
      }) as Layer.Layer<any, never, never>

      yield* Logix.Debug.record({
        type: 'trace:test',
        moduleId: 'A',
        instanceId: 'i-1',
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      const after = Logix.Debug.getDevtoolsSnapshotToken()
      expect(after).toBeGreaterThan(before)
      expect(Logix.Debug.getDevtoolsSnapshot().snapshotToken).toBe(after)
    }),
  )

  it.effect('snapshotToken should bump for instances/latest*/exportBudget even when events window disabled', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 0,
        diagnosticsLevel: 'full',
      }) as Layer.Layer<any, never, never>

      const base = Logix.Debug.getDevtoolsSnapshotToken()

      yield* Logix.Debug.record({
        type: 'module:init',
        moduleId: 'M',
        instanceId: 'i-1',
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      const t1 = Logix.Debug.getDevtoolsSnapshotToken()
      expect(t1).toBeGreaterThan(base)
      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(0)
      expect(Logix.Debug.getDevtoolsSnapshot().instances.get('R::M') ?? 0).toBeGreaterThan(0)

      yield* Logix.Debug.record({
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i-1',
        runtimeLabel: 'R',
        txnSeq: 1,
        txnId: 'i-1::t1',
        state: { count: 1 },
        traitSummary: { t: 1 },
      } as any).pipe(Effect.provide(layer))

      const t2 = Logix.Debug.getDevtoolsSnapshotToken()
      expect(t2).toBeGreaterThan(t1)
      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(0)
      expect(Logix.Debug.getDevtoolsSnapshot().latestStates.get('R::M::i-1')).toEqual({ count: 1 })
      expect(Logix.Debug.getDevtoolsSnapshot().latestTraitSummaries.get('R::M::i-1')).toEqual({ t: 1 })

      yield* Logix.Debug.record({
        type: 'action:dispatch',
        moduleId: 'M',
        instanceId: 'i-1',
        runtimeLabel: 'R',
        txnSeq: 2,
        txnId: 'i-1::t2',
        action: { _tag: 'HugeAction', payload: 'x'.repeat(20_000) },
      } as any).pipe(Effect.provide(layer))

      const t3 = Logix.Debug.getDevtoolsSnapshotToken()
      expect(t3).toBeGreaterThan(t2)
      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(0)
      expect(Logix.Debug.getDevtoolsSnapshot().exportBudget.oversized).toBeGreaterThan(0)
    }),
  )

  it.effect('subscribeDevtoolsSnapshot should batch notifications but never miss the latest token', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()
      const start = Logix.Debug.getDevtoolsSnapshotToken()

      let calls = 0
      let seen: Logix.Debug.SnapshotToken | undefined

      const unsubscribe = Logix.Debug.subscribeDevtoolsSnapshot(() => {
        calls += 1
        seen = Logix.Debug.getDevtoolsSnapshotToken()
      })

      yield* Effect.sync(() => {
        Logix.Debug.setDevtoolsRunId('run-a')
        Logix.Debug.setDevtoolsRunId('run-b')
        Logix.Debug.clearDevtoolsEvents()
      })

      yield* flushMicrotask()

      expect(calls).toBe(1)
      expect(seen).toBe(Logix.Debug.getDevtoolsSnapshotToken())
      expect(seen!).toBeGreaterThan(start)

      unsubscribe()
    }),
  )
})
