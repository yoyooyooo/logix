import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, PubSub, Ref, Stream } from 'effect'
import * as ModuleRuntime from '../../../../src/internal/runtime/ModuleRuntime.js'
import * as FlowRuntime from '../../../../src/internal/runtime/FlowRuntime.js'
import { getRuntimeInternals } from '../../../../src/internal/runtime/core/runtimeInternalsAccessor.js'
import { ConcurrencyPolicyTag } from '../../../../src/internal/runtime/core/env.js'

describe('ConcurrencyPolicy (US1): nested concurrency', () => {
  it('nested runParallel should still apply bounded concurrency at each layer', async () => {
    const program = Effect.scoped(
      Effect.gen(function* () {
        const actionHub = yield* PubSub.unbounded<any>({ replay: 16 })
        const runtime = yield* ModuleRuntime.make(
          { count: 0 } as any,
          {
            moduleId: 'NestedConcurrency',
            createActionHub: Effect.succeed(actionHub),
          } as any,
        )

        const internals = getRuntimeInternals(runtime as any)
        const flow = FlowRuntime.make<any, never>(runtime as any, internals)

        const outerInFlightRef = yield* Ref.make(0)
        const maxOuterInFlightRef = yield* Ref.make(0)
        const innerInFlightRef = yield* Ref.make(0)
        const maxInnerInFlightRef = yield* Ref.make(0)

        const innerJob = Effect.gen(function* () {
          const current = yield* Ref.updateAndGet(innerInFlightRef, (n) => n + 1)
          yield* Ref.update(maxInnerInFlightRef, (m) => Math.max(m, current))
          yield* Effect.sleep('10 millis')
        }).pipe(Effect.ensuring(Ref.update(innerInFlightRef, (n) => n - 1).pipe(Effect.asVoid)))

        const outerHandler = (_action: any) =>
          Effect.gen(function* () {
            const current = yield* Ref.updateAndGet(outerInFlightRef, (n) => n + 1)
            yield* Ref.update(maxOuterInFlightRef, (m) => Math.max(m, current))

            const base = Stream.fromIterable(Array.from({ length: 16 }, (_, i) => i))
            yield* flow.runParallel(() => innerJob)(base)
          }).pipe(Effect.ensuring(Ref.update(outerInFlightRef, (n) => n - 1).pipe(Effect.asVoid)))

        // 外层：对 action 触发做并行处理；内层：每次 action 再做一次并行 fan-out。
        const worker = flow.runParallel(outerHandler)(runtime.actions$.pipe(Stream.take(4)))

        const fiber = yield* Effect.fork(worker as any)

        for (let i = 0; i < 4; i++) {
          yield* runtime.dispatch({ _tag: 'inc', payload: undefined } as any)
        }

        yield* fiber

        const maxOuter = yield* Ref.get(maxOuterInFlightRef)
        const maxInner = yield* Ref.get(maxInnerInFlightRef)

        // policy.concurrencyLimit=2：外层 in-flight ≤2；内层每个外层最多 2，因此全局 inner ≤4。
        expect(maxOuter).toBeLessThanOrEqual(2)
        expect(maxInner).toBeLessThanOrEqual(4)
      }).pipe(
        Effect.provideService(ConcurrencyPolicyTag, {
          concurrencyLimit: 2,
        }),
      ),
    )

    await Effect.runPromise(program as any)
  })
})
