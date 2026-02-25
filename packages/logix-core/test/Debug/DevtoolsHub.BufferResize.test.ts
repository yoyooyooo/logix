import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

const flushMicrotask = Effect.promise(() => new Promise<void>((resolve) => queueMicrotask(resolve)))

describe('DevtoolsHub (buffer resize)', () => {
  it.effect('configure bufferSize should trim window and notify subscribers', () =>
    Effect.gen(function* () {
      Logix.Debug.clearDevtoolsEvents()

      const moduleId = 'DevtoolsHub.BufferResize.test'
      const runtimeLabel = 'R::DevtoolsHub.BufferResize'
      const instanceId = 'i-devtoolsHub-buffer-resize-1'

      const fullLayer = Logix.Debug.devtoolsHubLayer({
        bufferSize: 5,
        diagnosticsLevel: 'full',
      }) as Layer.Layer<any, never, never>

      let notified = 0
      const unsubscribe = Logix.Debug.subscribeDevtoolsSnapshot(() => {
        notified += 1
      })

      try {
        const seenEventIds: string[] = []
        yield* Effect.gen(function* () {
          for (let i = 1; i <= 7; i++) {
            yield* Logix.Debug.record({
              type: 'trace:bufferResize',
              moduleId,
              instanceId,
              runtimeLabel,
              data: { n: i },
            } as any)

            const events = Logix.Debug.getDevtoolsSnapshot().events
            const last = events[events.length - 1]
            expect(last?.instanceId).toBe(instanceId)
            expect(typeof last?.eventId).toBe('string')
            seenEventIds.push(last!.eventId)
          }
        }).pipe(Effect.provide(fullLayer))

        // flush pending notifications triggered by the record loop
        yield* flushMicrotask

        const before = Logix.Debug.getDevtoolsSnapshot().events.map((e) => e.eventId)
        expect(before).toEqual(seenEventIds.slice(-5))

        notified = 0
        Logix.Debug.devtoolsHubLayer({ bufferSize: 3, diagnosticsLevel: 'full' })
        yield* flushMicrotask

        expect(notified).toBeGreaterThan(0)

        const afterShrink = Logix.Debug.getDevtoolsSnapshot().events
        expect(afterShrink).toHaveLength(3)
        expect(afterShrink.slice(0, 2).map((e) => e.eventId)).toEqual(seenEventIds.slice(-2))
        const shrinkPolicy = afterShrink[2]
        expect(shrinkPolicy?.label).toBe('trace:devtools:ring-trim-policy')
        expect(shrinkPolicy?.meta).toEqual({
          mode: 'strict',
          threshold: 3,
          bufferSize: 3,
        })
        expect(() => JSON.stringify(shrinkPolicy)).not.toThrow()

        notified = 0
        Logix.Debug.devtoolsHubLayer({ bufferSize: 10, diagnosticsLevel: 'full' })
        yield* flushMicrotask

        expect(notified).toBeGreaterThan(0)
        const afterExpand = Logix.Debug.getDevtoolsSnapshot().events
        expect(afterExpand).toHaveLength(4)
        expect(afterExpand.slice(0, 2).map((e) => e.eventId)).toEqual(seenEventIds.slice(-2))
        const expandPolicyEvents = afterExpand.filter((event) => event.label === 'trace:devtools:ring-trim-policy')
        expect(expandPolicyEvents).toHaveLength(2)
        expect(expandPolicyEvents[0]?.meta).toEqual({
          mode: 'strict',
          threshold: 3,
          bufferSize: 3,
        })
        expect(expandPolicyEvents[1]?.meta).toEqual({
          mode: 'strict',
          threshold: 10,
          bufferSize: 10,
        })
      } finally {
        unsubscribe()
      }
    }),
  )
})
