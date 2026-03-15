import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'
import { TestClock } from 'effect/testing'
import * as ConcurrencyDiagnostics from '../../../../src/internal/runtime/core/ConcurrencyDiagnostics.js'
import * as Debug from '../../../../src/Debug.js'

describe('ConcurrencyPolicy (US3): diagnostics degrade', () => {
  it.effect('should merge warnings within cooldown window and expose suppressedCount', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const policy: any = {
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 4096,
        allowUnbounded: false,
        pressureWarningThreshold: { backlogCount: 1, backlogDurationMs: 1 },
        warningCooldownMs: 30,
        configScope: 'provider',
        concurrencyLimitScope: 'runtime_default',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'runtime_default',
        allowUnboundedScope: 'runtime_default',
      }

      const program = Effect.provideService(Effect.gen(function* () {
        const diagnostics = yield* ConcurrencyDiagnostics.make({
          moduleId: 'DiagnosticsDegrade',
          instanceId: 'i-diagnostics-degrade',
        })
      
        yield* diagnostics.emitPressureIfNeeded({
          policy,
          trigger: { kind: 'txnQueue', name: 'enqueueTransaction' },
          backlogCount: 1,
          saturatedDurationMs: 10,
        })
      
        // Within the same cooldown window: it should be suppressed and increment suppressedCount.
        yield* diagnostics.emitPressureIfNeeded({
          policy,
          trigger: { kind: 'txnQueue', name: 'enqueueTransaction' },
          backlogCount: 1,
          saturatedDurationMs: 10,
        })
      
        yield* TestClock.adjust('40 millis')
      
        // After the cooldown window: emit again and carry suppressedCount.
        yield* diagnostics.emitPressureIfNeeded({
          policy,
          trigger: { kind: 'txnQueue', name: 'enqueueTransaction' },
          backlogCount: 1,
          saturatedDurationMs: 10,
        })
      }), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

      yield* program

      const events = ring.getSnapshot().filter((e) => e.type === 'diagnostic' && e.code === 'concurrency::pressure')

      expect(events.length).toBe(2)

      const second: any = events[1]
      const details: any = second?.trigger?.details

      expect(details?.configScope).toBe('provider')
      expect(details?.degradeStrategy).toBe('cooldown')
      expect(details?.suppressedCount).toBeGreaterThanOrEqual(1)
      expect(details?.sampleRate).toBe(1)
      expect(details?.droppedCount).toBe(0)
    }),
  )

  it.effect('should keep actionTopicHub cooldown isolated by topicTag source', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const policy: any = {
        concurrencyLimit: 16,
        losslessBackpressureCapacity: 4096,
        allowUnbounded: false,
        pressureWarningThreshold: { backlogCount: 1, backlogDurationMs: 1 },
        warningCooldownMs: 30_000,
        configScope: 'runtime_default',
        concurrencyLimitScope: 'runtime_default',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'runtime_default',
        allowUnboundedScope: 'runtime_default',
      }

      const program = Effect.provideService(Effect.gen(function* () {
        const diagnostics = yield* ConcurrencyDiagnostics.make({
          moduleId: 'DiagnosticsDegradeTopicIsolation',
          instanceId: 'i-diagnostics-degrade-topic-isolation',
        })
      
        yield* diagnostics.emitPressureIfNeeded({
          policy,
          trigger: {
            kind: 'actionTopicHub',
            name: 'publish',
            details: { dispatchEntry: 'dispatch', channel: 'topic', topicTag: 'inc' },
          },
          backlogCount: 1,
          saturatedDurationMs: 10,
        })
      
        yield* diagnostics.emitPressureIfNeeded({
          policy,
          trigger: {
            kind: 'actionTopicHub',
            name: 'publish',
            details: { dispatchEntry: 'dispatch', channel: 'topic', topicTag: 'dec' },
          },
          backlogCount: 1,
          saturatedDurationMs: 10,
        })
      }), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])

      yield* program

      const events = ring.getSnapshot().filter((e) => e.type === 'diagnostic' && e.code === 'concurrency::pressure')
      expect(events.length).toBe(2)

      const topics = events
        .map((event) => ((event as any)?.trigger?.details?.source as any)?.topicTag)
        .filter((topic): topic is string => typeof topic === 'string')
        .sort()
      expect(topics).toEqual(['dec', 'inc'])
    }),
  )
})
