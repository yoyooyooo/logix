import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import * as Logix from '../../src/index.js'

describe('DebugSink record (diagnostics off)', () => {
  it.effect('does not inject timestamp for high-frequency events', () =>
    Effect.gen(function* () {
      const captured: Array<unknown> = []

      const sink: Logix.Debug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            captured.push(event)
          }),
      }

      const layer = Layer.mergeAll(Logix.Debug.replace([sink]), Logix.Debug.diagnosticsLevel('off')) as Layer.Layer<
        any,
        never,
        any
      >

      yield* Logix.Debug.record({
        type: 'state:update',
        moduleId: 'M',
        instanceId: 'i',
        state: { a: 1 },
      } as any).pipe(Effect.provide(layer))

      expect(captured.length).toBe(1)
      expect((captured[0] as any).timestamp).toBeUndefined()
    }),
  )
})
