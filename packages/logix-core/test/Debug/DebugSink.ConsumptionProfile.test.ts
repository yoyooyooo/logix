import { describe, expect, it } from '@effect/vitest'
import { Effect, FiberRef, Layer } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as DebugSink from '../../src/internal/runtime/core/DebugSink.js'

describe('DebugSink consumption profile', () => {
  it.effect('isErrorOnlyOnlySinks should be true for Debug.layer(mode=prod)', () =>
    Effect.gen(function* () {
      const sinks = yield* FiberRef.get(DebugSink.currentDebugSinks)
      expect(DebugSink.isErrorOnlyOnlySinks(sinks)).toBe(true)
    }).pipe(Effect.provide(Debug.layer({ mode: 'prod' }))),
  )

  it.effect('isErrorOnlyOnlySinks should be false once an extra sink is appended', () =>
    Effect.gen(function* () {
      const sinks = yield* FiberRef.get(DebugSink.currentDebugSinks)
      expect(DebugSink.isErrorOnlyOnlySinks(sinks)).toBe(false)
    }).pipe(
      Effect.provide(
        Layer.provideMerge(
          Debug.appendSinks([
            {
              record: () => Effect.void,
            },
          ]),
          Debug.layer({ mode: 'prod' }),
        ),
      ),
    ),
  )
})

