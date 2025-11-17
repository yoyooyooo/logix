import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import type * as Debug from '../../../src/Debug.js'
import * as InternalContracts from '../../../src/internal/InternalContracts.js'
import { makeConvergeAutoFixture, pickConvergeTraceEvents } from '../../StateTrait/StateTrait.ConvergeAuto.fixtures.js'

const lastConvergeEvent = (
  ring: Debug.RingBufferSink,
): Extract<Debug.Event, { readonly type: 'trace:trait:converge' }> | undefined => {
  const events = pickConvergeTraceEvents(ring.getSnapshot())
  return events.length > 0 ? events[events.length - 1] : undefined
}

describe('StateTrait converge auto trace event', () => {
  it.scoped('emits JsonValue evidence in light/full; off emits none', () =>
    Effect.gen(function* () {
      const runOnce = (diagnosticsLevel: Debug.DiagnosticsLevel) =>
        Effect.gen(function* () {
          const { M, ring, runtime } = makeConvergeAutoFixture({
            diagnosticsLevel,
          })

          const program = Effect.gen(function* () {
            const rt: any = yield* M.tag
            yield* InternalContracts.runWithStateTransaction(rt, { kind: 'test', name: 'trace-evidence' }, () =>
              Effect.gen(function* () {
                const prev = yield* rt.getState
                yield* rt.setState({ ...prev, a: prev.a + 1 })
                InternalContracts.recordStatePatch(rt, 'a', 'unknown')
              }),
            )
          })

          yield* Effect.promise(() => runtime.runPromise(program))
          return { ring, runtime }
        })

      // light
      {
        const { ring } = yield* runOnce('light')
        const ev = lastConvergeEvent(ring)
        expect(ev).toBeDefined()
        expect(typeof ev?.moduleId).toBe('string')
        expect(typeof ev?.instanceId).toBe('string')
        expect(typeof ev?.txnSeq).toBe('number')
        expect(typeof ev?.txnId).toBe('string')

        const data = (ev as any).data
        expect(() => JSON.stringify(data)).not.toThrow()
        expect(data.requestedMode).toBeDefined()
        expect(data.executedMode).toBeDefined()
        expect(data.outcome).toBeDefined()
        expect(data.configScope).toBeDefined()
        expect(typeof data.staticIrDigest).toBe('string')
        expect(Array.isArray(data.reasons)).toBe(true)
        expect(data.reasons.length).toBeGreaterThan(0)
      }

      // full
      {
        const { ring } = yield* runOnce('full')
        const ev = lastConvergeEvent(ring)
        expect(ev).toBeDefined()
        expect(() => JSON.stringify((ev as any).data)).not.toThrow()
      }

      // off
      {
        const { ring } = yield* runOnce('off')
        const events = pickConvergeTraceEvents(ring.getSnapshot())
        expect(events.length).toBe(0)
      }
    }),
  )
})
