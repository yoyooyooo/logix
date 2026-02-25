import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Cause, Chunk, Effect, Fiber, Stream } from 'effect'
import * as Debug from '../../src/Debug.js'
import * as ModuleRuntime from '../../src/internal/runtime/ModuleRuntime.js'
import { ReadQueryStrictGateConfigTag } from '../../src/internal/runtime/core/env.js'
import * as Logix from '../../src/index.js'

describe('ReadQuery.runtimeConsumption', () => {
  it.scoped('build-graded selector skips runtime strict-gate re-evaluation', () =>
    Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const runtime = yield* Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        ModuleRuntime.make({ count: 0 }, { moduleId: 'M', instanceId: 'i' } as any),
      )

      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
      const graded = Logix.ReadQuery.gradeReadQueryAtBuild({
        moduleId: 'M',
        input: selector,
      })

      expect(graded.compiled.lane).toBe('dynamic')
      expect(graded.compiled.quality?.source).toBe('build')

      const stream = Stream.take(runtime.changesReadQueryWithMeta(graded.compiled), 1)
      const fiber = yield* Effect.fork(
        Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(Stream.runCollect(stream)),
      )

      yield* Effect.locally(Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink])(
        runtime.setState({ count: 1 }),
      )

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Success')
      if (exit._tag !== 'Success') return

      const values = Chunk.toReadonlyArray(exit.value)
      expect(values.length).toBe(1)
      expect(values[0]?.value).toBe(1)

      const strictGateDiag = ring
        .getSnapshot()
        .find((e) => e.type === 'diagnostic' && e.code === 'read_query::strict_gate')
      expect(strictGateDiag).toBeUndefined()
    }).pipe(
      Effect.provideService(ReadQueryStrictGateConfigTag, {
        mode: 'error',
      }),
    ),
  )

  it.scoped('ungraded dynamic selector still uses runtime strict-gate and fails in error mode', () =>
    Effect.gen(function* () {
      const runtime = yield* ModuleRuntime.make({ count: 0 }, { moduleId: 'M', instanceId: 'i' } as any)

      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
      const stream = runtime.changesReadQueryWithMeta(selector)

      const fiber = yield* Effect.fork(Stream.runCollect(Stream.take(stream, 1)))
      yield* runtime.setState({ count: 1 })

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return

      const defects = [...Cause.defects(exit.cause)]
      const err = defects.find((e) => (e as any)?._tag === 'ReadQueryStrictGateError') as any
      expect(err).toBeDefined()
      expect(['missingDeps', 'unsupportedSyntax', 'unstableSelectorId']).toContain(err?.details?.fallbackReason)
    }).pipe(
      Effect.provideService(ReadQueryStrictGateConfigTag, {
        mode: 'error',
      }),
    ),
  )

  it.scoped('build-graded FAIL is enforced at runtime even without runtime strict-gate config', () =>
    Effect.gen(function* () {
      const runtime = yield* ModuleRuntime.make({ count: 0 }, { moduleId: 'M', instanceId: 'i' } as any)

      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
      const graded = Logix.ReadQuery.gradeReadQueryAtBuild({
        moduleId: 'M',
        input: selector,
        strictGate: { mode: 'error' },
      })

      expect(graded.compiled.quality?.strictGate?.verdict).toBe('FAIL')

      const stream = runtime.changesReadQueryWithMeta(graded.compiled)
      const fiber = yield* Effect.fork(Stream.runCollect(Stream.take(stream, 1)))
      yield* runtime.setState({ count: 1 })

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return

      const defects = [...Cause.defects(exit.cause)]
      const err = defects.find((e) => (e as any)?._tag === 'ReadQueryStrictGateError') as any
      expect(err).toBeDefined()
      expect(err?.details?.rule).toBe('requireStatic:global')
    }),
  )

  it('marks runtime dynamic fallback with missingBuildGrade quality marker', () => {
    const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
    const compiled = Logix.ReadQuery.compile(selector)
    const marked = Logix.ReadQuery.markRuntimeMissingBuildGrade(compiled)

    expect(marked.quality?.source).toBe('runtime_dynamic_fallback')
    expect(marked.quality?.strictGate?.fallbackReason).toBe('missingBuildGrade')
  })
})
