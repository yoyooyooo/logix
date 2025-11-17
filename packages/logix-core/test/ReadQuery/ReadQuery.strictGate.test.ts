import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Cause, Chunk, Effect, Fiber, Stream } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as ModuleRuntime from '../../src/internal/runtime/ModuleRuntime.js'
import { ReadQueryStrictGateConfigTag } from '../../src/internal/runtime/core/env.js'

describe('ReadQuery.strictGate', () => {
  it.scoped('error mode: fails fast on dynamic selector (txnSeq=0)', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const runtime = yield* Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        ModuleRuntime.make({ count: 0 }, { moduleId: 'M', instanceId: 'i' } as any),
      )

      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
      const stream = runtime.changesReadQueryWithMeta(selector)

      const fiber = yield* Effect.fork(
        Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
          Stream.runCollect(Stream.take(stream, 1)),
        ),
      )

      // 兜底：若 gate 未触发，至少让 stream 不会永久阻塞
      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        runtime.setState({ count: 1 }),
      )

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return

      const defects = [...Cause.defects(exit.cause)]
      const err = defects.find((e) => (e as any)?._tag === 'ReadQueryStrictGateError') as any
      expect(err).toBeDefined()

      const details = err.details as any
      expect(details).toMatchObject({
        moduleId: 'M',
        instanceId: 'i',
        txnSeq: 0,
        selectorId: expect.any(String),
        fallbackReason: expect.any(String),
      })
      expect(['missingDeps', 'unsupportedSyntax', 'unstableSelectorId']).toContain(details.fallbackReason)
      expect(() => JSON.stringify(details)).not.toThrow()
    }).pipe(
      Effect.provideService(ReadQueryStrictGateConfigTag, {
        mode: 'error',
      }),
    ),
  )

  it.scoped('warn mode: emits serializable diagnostic and continues', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const runtime = yield* Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        ModuleRuntime.make({ count: 0 }, { moduleId: 'M', instanceId: 'i' } as any),
      )

      // 通过 toString 退化模拟低区分度来源（例如 [native code]），触发 fallbackReason=unstableSelectorId
      const selector = (s: { count: number }) => s.count
      ;(selector as any).toString = () => 'function () { [native code] }'

      const stream = Stream.take(runtime.changesReadQueryWithMeta(selector), 1)

      const fiber = yield* Effect.fork(
        Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(Stream.runCollect(stream)),
      )
      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        runtime.setState({ count: 1 }),
      )

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Success')
      if (exit._tag !== 'Success') return

      const changes = Chunk.toReadonlyArray(exit.value)
      expect(changes.length).toBe(1)
      expect(changes[0]?.value).toBe(1)

      const diag = ring
        .getSnapshot()
        .find((e) => e.type === 'diagnostic' && e.code === 'read_query::strict_gate') as any

      expect(diag).toBeDefined()
      expect(diag.severity).toBe('warning')
      expect(diag.moduleId).toBe('M')
      expect(diag.instanceId).toBe('i')
      expect(diag.txnSeq).toBe(0)

      const details = diag?.trigger?.details
      expect(details?.fallbackReason).toBe('unstableSelectorId')
      expect(details?.rule).toBe('denyFallbackReason')
      expect(() => JSON.stringify(details)).not.toThrow()
    }).pipe(
      Effect.provideService(ReadQueryStrictGateConfigTag, {
        mode: 'warn',
        requireStatic: {
          selectorIds: ['rq_not_matched'],
        },
        denyFallbackReasons: ['unstableSelectorId'],
      }),
    ),
  )
})
