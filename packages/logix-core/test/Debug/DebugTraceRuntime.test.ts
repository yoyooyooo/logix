import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import { describe } from '@effect/vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Debug trace events', () => {
  it('should route trace:* Debug events to a DebugSink provided via FiberRef', async () => {
    const events: CoreDebug.Event[] = []

    const sink: CoreDebug.Sink = {
      record: (event: CoreDebug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    }

    await Effect.runPromise(
      Effect.provideService(CoreDebug.record({
        type: 'trace:inc',
        moduleId: 'DebugTraceCounter',
        data: { source: 'DebugTraceRuntime.test' },
      }), CoreDebug.internal.currentDebugSinks as any, [sink]),
    )

    // Verify trace:* events are delivered to the caller via DebugSink.
    const traceEvents = events.filter((e) => typeof e.type === 'string' && e.type.startsWith('trace:'))
    expect(traceEvents.length).toBeGreaterThanOrEqual(1)
    expect(traceEvents.some((e) => e.type === 'trace:inc' && (e as any).moduleId === 'DebugTraceCounter')).toBe(true)
  })
})
