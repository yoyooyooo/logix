import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Ref, Stream } from 'effect'
import * as FlowRuntime from '../../../../src/internal/runtime/FlowRuntime.js'

describe('ConcurrencyPolicy (US1): FlowRuntime.runParallel should be bounded by default', () => {
  it('in-flight should not exceed 16 (default)', async () => {
    const program = Effect.gen(function* () {
      const flow = FlowRuntime.make<any, never>(undefined as any)

      const inFlightRef = yield* Ref.make(0)
      const maxInFlightRef = yield* Ref.make(0)

      const job = Effect.gen(function* () {
        const current = yield* Ref.updateAndGet(inFlightRef, (n) => n + 1)
        yield* Ref.update(maxInFlightRef, (m) => Math.max(m, current))
        yield* Effect.sleep('10 millis')
      }).pipe(Effect.ensuring(Ref.update(inFlightRef, (n) => n - 1).pipe(Effect.asVoid)))

      const base = Stream.fromIterable(Array.from({ length: 128 }, (_, i) => i))

      yield* flow.runParallel(() => job)(base)

      return yield* Ref.get(maxInFlightRef)
    })

    const maxInFlight = await Effect.runPromise(program as any)
    expect(maxInFlight).toBeLessThanOrEqual(16)
  })
})
