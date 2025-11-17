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

        const afterShrink = Logix.Debug.getDevtoolsSnapshot().events.map((e) => e.eventId)
        expect(afterShrink).toEqual(seenEventIds.slice(-3))

        notified = 0
        Logix.Debug.devtoolsHubLayer({ bufferSize: 10, diagnosticsLevel: 'full' })
        yield* flushMicrotask

        expect(notified).toBeGreaterThan(0)
        const afterExpand = Logix.Debug.getDevtoolsSnapshot().events.map((e) => e.eventId)
        expect(afterExpand).toEqual(seenEventIds.slice(-3))
      } finally {
        unsubscribe()
      }
    }),
  )
})
