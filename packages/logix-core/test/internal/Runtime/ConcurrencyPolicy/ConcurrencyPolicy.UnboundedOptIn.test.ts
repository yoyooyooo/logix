import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Ref, Stream } from 'effect'
import * as Debug from '../../../../src/Debug.js'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import * as FlowRuntime from '../../../../src/internal/runtime/FlowRuntime.js'
import { getRuntimeInternals } from '../../../../src/internal/runtime/core/runtimeInternalsAccessor.js'
import { ConcurrencyPolicyTag } from '../../../../src/internal/runtime/core/env.js'

describe('ConcurrencyPolicy (US2): unbounded opt-in', () => {
  it('should emit concurrency::unbounded_enabled once and allow unbounded concurrency', async () => {
    const ring = Debug.makeRingBufferSink(256)

    const program = Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
      Effect.scoped(
        Effect.gen(function* () {
          const runtime = yield* ModuleRuntime.make({ count: 0 } as any, { moduleId: 'UnboundedOptIn' } as any)

          const internals = getRuntimeInternals(runtime as any)
          const flow = FlowRuntime.make<any, never>(runtime as any, internals)

          const inFlightRef = yield* Ref.make(0)
          const maxInFlightRef = yield* Ref.make(0)

          const job = Effect.gen(function* () {
            const current = yield* Ref.updateAndGet(inFlightRef, (n) => n + 1)
            yield* Ref.update(maxInFlightRef, (m) => Math.max(m, current))
            yield* Effect.sleep('20 millis')
          }).pipe(Effect.ensuring(Ref.update(inFlightRef, (n) => n - 1).pipe(Effect.asVoid)))

          const base = Stream.fromIterable(Array.from({ length: 128 }, (_, i) => i))
          yield* flow.runParallel(() => job)(base)

          const maxInFlight = yield* Ref.get(maxInFlightRef)
          expect(maxInFlight).toBeGreaterThan(16)

          const diags = ring
            .getSnapshot()
            .filter((e) => e.type === 'diagnostic' && e.code === 'concurrency::unbounded_enabled')

          expect(diags.length).toBe(1)

          const diag: any = diags[0]
          expect(diag.severity).toBe('error')
          expect(diag.moduleId).toBe('UnboundedOptIn')

          const details = diag?.trigger?.details
          expect(details?.limit).toBe('unbounded')
          expect(typeof details?.configScope).toBe('string')
          expect(Object.keys(details ?? {})).toEqual(['configScope', 'limit'])
        }).pipe(
          Effect.provideService(ConcurrencyPolicyTag, {
            concurrencyLimit: 'unbounded',
            allowUnbounded: true,
          }),
        ),
      ),
    )

    await Effect.runPromise(program as any)
  })
})
