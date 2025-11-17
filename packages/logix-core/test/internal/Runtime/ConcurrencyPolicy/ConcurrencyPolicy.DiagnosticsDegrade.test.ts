import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, TestClock } from 'effect'
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
        configScope: 'runtime_default',
        concurrencyLimitScope: 'runtime_default',
        requestedConcurrencyLimit: 16,
        requestedConcurrencyLimitScope: 'runtime_default',
        allowUnboundedScope: 'runtime_default',
      }

      const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        Effect.gen(function* () {
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

          // 同一冷却窗口内：应被 suppress，并累计 suppressedCount
          yield* diagnostics.emitPressureIfNeeded({
            policy,
            trigger: { kind: 'txnQueue', name: 'enqueueTransaction' },
            backlogCount: 1,
            saturatedDurationMs: 10,
          })

          yield* TestClock.adjust('40 millis')

          // 冷却窗口后：再次 emit，携带 suppressedCount
          yield* diagnostics.emitPressureIfNeeded({
            policy,
            trigger: { kind: 'txnQueue', name: 'enqueueTransaction' },
            backlogCount: 1,
            saturatedDurationMs: 10,
          })
        }),
      )

      yield* program

      const events = ring.getSnapshot().filter((e) => e.type === 'diagnostic' && e.code === 'concurrency::pressure')

      expect(events.length).toBe(2)

      const second: any = events[1]
      const details: any = second?.trigger?.details

      expect(details?.degradeStrategy).toBe('cooldown')
      expect(details?.suppressedCount).toBeGreaterThanOrEqual(1)
      expect(details?.sampleRate).toBe(1)
      expect(details?.droppedCount).toBe(0)
    }),
  )
})
