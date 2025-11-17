import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

describe('DevtoolsHub (core)', () => {
  it.effect('devtoolsHubLayer should append hub sink and collect events into snapshot', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const collected: Logix.Debug.Event[] = []
      const instanceId = 'i-1'
      const userSink: Logix.Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            collected.push(event)
          }),
      }

      const layer = Logix.Debug.devtoolsHubLayer(Logix.Debug.replace([userSink]), { bufferSize: 10 }) as Layer.Layer<
        any,
        never,
        never
      >

      // 记录几类不同事件
      yield* Logix.Debug.record({
        type: 'module:init',
        moduleId: 'A',
        instanceId,
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: 'action:dispatch',
        moduleId: 'A',
        instanceId,
        action: { _tag: 'inc', payload: undefined },
        txnId: 't-1',
        txnSeq: 1,
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: 'state:update',
        moduleId: 'A',
        instanceId,
        state: { count: 1 },
        txnId: 't-1',
        txnSeq: 1,
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: 'trace:foo',
        moduleId: 'A',
        instanceId,
        data: { x: 1 },
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      // Hub snapshot 为全局单例，断言至少包含本次事件与派生视图。
      const snapshot = Logix.Debug.getDevtoolsSnapshot()
      expect(snapshot.snapshotToken).toBe(Logix.Debug.getDevtoolsSnapshotToken())
      expect(snapshot.events.length).toBeGreaterThanOrEqual(4)
      expect(snapshot.instances.get('R::A') ?? 0).toBeGreaterThanOrEqual(1)
      expect(snapshot.latestStates.get('R::A::i-1')).toEqual({ count: 1 })
      expect(snapshot.exportBudget.dropped).toBeGreaterThan(0)
      expect(snapshot.exportBudget.oversized).toBe(0)
      expect(() => JSON.stringify(snapshot)).not.toThrow()

      const evidence = Logix.Debug.exportEvidencePackage({
        runId: 'run-test',
        source: { host: 'test' },
      })
      expect(evidence.protocolVersion).toBe(Logix.Observability.protocolVersion)
      expect(evidence.events.length).toBeGreaterThan(0)
      expect(() => JSON.stringify(evidence)).not.toThrow()

      // appendSinks 不应覆盖调用方已有 sinks
      expect(collected).toHaveLength(4)
    }),
  )

  it.effect('exportBudget should accumulate dropped/oversized counts from JsonValue projection', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 10,
        diagnosticsLevel: 'full',
      }) as Layer.Layer<any, never, never>

      yield* Logix.Debug.record({
        type: 'action:dispatch',
        moduleId: 'A',
        instanceId: 'i-1',
        action: { _tag: 'HugeAction', payload: 'x'.repeat(20_000) },
        txnSeq: 1,
        txnId: 't-1',
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      const snapshot = Logix.Debug.getDevtoolsSnapshot()
      expect(snapshot.exportBudget.oversized).toBeGreaterThan(0)
      expect(() => JSON.stringify(snapshot)).not.toThrow()
    }),
  )

  it.effect('clearDevtoolsEvents should only clear hub ring buffer', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const layer = Logix.Debug.devtoolsHubLayer({ bufferSize: 5 }) as Layer.Layer<any, never, never>

      yield* Logix.Debug.record({
        type: 'trace:test',
        moduleId: 'B',
        instanceId: 'i-2',
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBeGreaterThan(0)
      expect(Logix.Debug.getDevtoolsSnapshot().exportBudget.dropped).toBeGreaterThan(0)

      Logix.Debug.clearDevtoolsEvents()

      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(0)
      expect(Logix.Debug.getDevtoolsSnapshot().exportBudget.dropped).toBe(0)
    }),
  )

  it.effect('startDevtoolsRun should reset per-instance eventSeq', () =>
    Effect.gen(function* () {
      Logix.Debug.startDevtoolsRun('run-test-1')

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 5,
        diagnosticsLevel: 'light',
      }) as Layer.Layer<any, never, never>

      yield* Logix.Debug.record({
        type: 'trace:test',
        moduleId: 'B',
        instanceId: 'i-1',
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      const first = Logix.Debug.getDevtoolsSnapshot().events[0]
      expect(first?.instanceId).toBe('i-1')
      expect(first?.eventSeq).toBe(1)

      Logix.Debug.startDevtoolsRun('run-test-2')

      yield* Logix.Debug.record({
        type: 'trace:test',
        moduleId: 'B',
        instanceId: 'i-1',
        runtimeLabel: 'R',
      } as any).pipe(Effect.provide(layer))

      const second = Logix.Debug.getDevtoolsSnapshot().events[0]
      expect(second?.instanceId).toBe('i-1')
      expect(second?.eventSeq).toBe(1)
    }),
  )
})
