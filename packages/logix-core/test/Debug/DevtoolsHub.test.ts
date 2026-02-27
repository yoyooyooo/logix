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

      const layer = Logix.Debug.devtoolsHubLayer(Logix.Debug.replace([userSink]), {
        bufferSize: 10,
        projectionTier: 'full',
      }) as Layer.Layer<any, never, never>

      // Record a few different event kinds.
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

      // Hub snapshot is a global singleton; assert it contains these events and derived views.
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

      // appendSinks must not override caller-provided sinks.
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

  it.effect('configure bufferSize should emit ring trim policy diagnostics with slim payload', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      Logix.Debug.devtoolsHubLayer({
        bufferSize: 5,
        diagnosticsLevel: 'light',
      })
      Logix.Debug.clearDevtoolsEvents()

      Logix.Debug.devtoolsHubLayer({
        bufferSize: 6,
        diagnosticsLevel: 'light',
      })

      const events = Logix.Debug.getDevtoolsSnapshot().events
      const policyEvent = events[events.length - 1]
      expect(policyEvent?.label).toBe('trace:devtools:ring-trim-policy')
      expect(policyEvent?.meta).toEqual({
        mode: 'strict',
        threshold: 6,
        bufferSize: 6,
      })
      expect(() => JSON.stringify(policyEvent?.meta)).not.toThrow()

      Logix.Debug.clearDevtoolsEvents()
      Logix.Debug.devtoolsHubLayer({
        bufferSize: 7,
        diagnosticsLevel: 'off',
      })
      expect(Logix.Debug.getDevtoolsSnapshot().events.length).toBe(0)
    }),
  )

  it.effect('getDevtoolsSnapshotByRuntimeLabel should isolate runtime buckets', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 20,
        diagnosticsLevel: 'full',
        projectionTier: 'full',
      }) as Layer.Layer<any, never, never>

      yield* Logix.Debug.record({
        type: 'module:init',
        moduleId: 'A',
        instanceId: 'i-r1',
        runtimeLabel: 'R1',
      } as any).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: 'state:update',
        moduleId: 'A',
        instanceId: 'i-r1',
        runtimeLabel: 'R1',
        txnSeq: 1,
        state: { count: 1 },
      } as any).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: 'module:init',
        moduleId: 'A',
        instanceId: 'i-r2',
        runtimeLabel: 'R2',
      } as any).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: 'state:update',
        moduleId: 'A',
        instanceId: 'i-r2',
        runtimeLabel: 'R2',
        txnSeq: 1,
        state: { count: 2 },
      } as any).pipe(Effect.provide(layer))

      const r1 = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel('R1')
      const r2 = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel('R2')

      expect(r1.events.length).toBeGreaterThan(0)
      expect(r2.events.length).toBeGreaterThan(0)
      expect(r1.events.every((event) => event.runtimeLabel === 'R1')).toBe(true)
      expect(r2.events.every((event) => event.runtimeLabel === 'R2')).toBe(true)
      expect(r1.latestStates.get('R1::A::i-r1')).toEqual({ count: 1 })
      expect(r2.latestStates.get('R2::A::i-r2')).toEqual({ count: 2 })
      expect(r1.latestStates.has('R2::A::i-r2')).toBe(false)
      expect(r2.latestStates.has('R1::A::i-r1')).toBe(false)
      expect(Array.from(r1.instances.keys()).every((key) => key.startsWith('R1::'))).toBe(true)
      expect(Array.from(r2.instances.keys()).every((key) => key.startsWith('R2::'))).toBe(true)
    }),
  )

  it.effect('clearDevtoolsEvents(runtimeLabel) should clear only target runtime bucket', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 20,
        diagnosticsLevel: 'full',
      }) as Layer.Layer<any, never, never>

      yield* Logix.Debug.record({
        type: 'action:dispatch',
        moduleId: 'A',
        instanceId: 'i-r1',
        runtimeLabel: 'R1',
        txnSeq: 1,
        txnId: 'i-r1::t1',
        action: { _tag: 'HugeAction', payload: 'x'.repeat(20_000) },
      } as any).pipe(Effect.provide(layer))

      yield* Logix.Debug.record({
        type: 'action:dispatch',
        moduleId: 'A',
        instanceId: 'i-r2',
        runtimeLabel: 'R2',
        txnSeq: 1,
        txnId: 'i-r2::t1',
        action: { _tag: 'HugeAction', payload: 'y'.repeat(20_000) },
      } as any).pipe(Effect.provide(layer))

      const beforeR1 = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel('R1')
      const beforeR2 = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel('R2')
      expect(beforeR1.events.length).toBeGreaterThan(0)
      expect(beforeR2.events.length).toBeGreaterThan(0)
      expect(beforeR1.exportBudget.oversized).toBeGreaterThan(0)
      expect(beforeR2.exportBudget.oversized).toBeGreaterThan(0)

      Logix.Debug.clearDevtoolsEvents('R1')

      const afterR1 = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel('R1')
      const afterR2 = Logix.Debug.getDevtoolsSnapshotByRuntimeLabel('R2')
      expect(afterR1.events.length).toBe(0)
      expect(afterR1.exportBudget.oversized).toBe(0)
      expect(afterR2.events.length).toBeGreaterThan(0)
      expect(afterR2.exportBudget.oversized).toBeGreaterThan(0)

      const globalSnapshot = Logix.Debug.getDevtoolsSnapshot()
      expect(globalSnapshot.events.some((event) => event.runtimeLabel === 'R1')).toBe(false)
      expect(globalSnapshot.events.some((event) => event.runtimeLabel === 'R2')).toBe(true)
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
      expect(Logix.Debug.getDevtoolsSnapshotByRuntimeLabel('R').events.length).toBe(0)
      expect(Logix.Debug.getDevtoolsSnapshotByRuntimeLabel('R').exportBudget.dropped).toBe(0)
    }),
  )

  it.effect('exportEvidencePackage should use RuntimeDebugEventRef.eventSeq and fallback safely when missing', () =>
    Effect.gen(function* () {
      Logix.Debug.startDevtoolsRun('run-export-seq')

      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 3,
        diagnosticsLevel: 'light',
      }) as Layer.Layer<any, never, never>

      for (let i = 1; i <= 5; i++) {
        yield* Logix.Debug.record({
          type: 'trace:test',
          moduleId: 'B',
          instanceId: 'i-seq',
          runtimeLabel: 'R',
          data: { i },
        } as any).pipe(Effect.provide(layer))
      }

      const snapshot = Logix.Debug.getDevtoolsSnapshot()
      const eventSeqs = snapshot.events.map((event) => event.eventSeq)
      expect(eventSeqs).toHaveLength(3)
      expect(eventSeqs[0]).toBeGreaterThan(0)
      expect(eventSeqs[1]).toBe(eventSeqs[0] + 1)
      expect(eventSeqs[2]).toBe(eventSeqs[1] + 1)

      const exported = Logix.Debug.exportEvidencePackage({
        runId: 'run-export-seq',
        source: { host: 'test' },
      })
      expect(exported.events.map((event) => event.seq)).toEqual(eventSeqs)

      ;(snapshot.events[0] as any).eventSeq = undefined
      const fallbackExported = Logix.Debug.exportEvidencePackage({
        runId: 'run-export-seq-fallback',
        source: { host: 'test' },
      })
      expect(fallbackExported.events.map((event) => event.seq)).toEqual([1, eventSeqs[1], eventSeqs[2]])
    }),
  )

  it.effect('startDevtoolsRun should reset per-instance eventSeq', () =>
    Effect.gen(function* () {
      const layer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 5,
        diagnosticsLevel: 'light',
      }) as Layer.Layer<any, never, never>

      Logix.Debug.startDevtoolsRun('run-test-1')

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
