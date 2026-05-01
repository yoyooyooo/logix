import { describe, it, expect } from 'vitest'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { Cause, Effect, Fiber, Stream } from 'effect'
import * as Debug from '../../src/internal/debug-api.js'
import * as ModuleRuntime from '../../src/internal/runtime/core/ModuleRuntime.js'
import { ReadQueryStrictGateConfigTag } from '../../src/internal/runtime/core/env.js'
import * as Logix from '../../src/index.js'

const waitForStartup = () =>
  Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 10)
      }),
  )

describe('ReadQuery.runtimeConsumption', () => {
  it('build-graded selector skips runtime strict-gate re-evaluation', async () => {
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const runtime = yield* Effect.provideService(
        ModuleRuntime.make({ count: 0 }, { moduleId: 'M', instanceId: 'i' } as any),
        Debug.internal.currentDebugSinks as any,
        [ring.sink as Debug.Sink],
      )

      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
      const graded = RuntimeContracts.Selector.gradeReadQueryAtBuild({
        moduleId: 'M',
        input: selector,
      })

      expect(graded.compiled.lane).toBe('dynamic')
      expect(graded.compiled.quality?.source).toBe('build')

      const stream = Stream.take(runtime.changesReadQueryWithMeta(graded.compiled), 1)
      const fiber = yield* Effect.forkChild(
        Effect.provideService(Stream.runCollect(stream), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink]),
      )

      yield* waitForStartup()
      yield* Effect.provideService(runtime.setState({ count: 1 }), Debug.internal.currentDebugSinks as any, [
        ring.sink as Debug.Sink,
      ])

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Success')
      if (exit._tag !== 'Success') return

      const values = Array.from(exit.value as Iterable<any>)
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
    )))
  })

  it('ungraded dynamic selector is observable under runtime strict-gate config (missingBuildGrade)', async () => {
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const ring = Debug.makeRingBufferSink(64)

      const runtime = yield* Effect.provideService(
        ModuleRuntime.make({ count: 0 }, { moduleId: 'M', instanceId: 'i' } as any),
        Debug.internal.currentDebugSinks as any,
        [ring.sink as Debug.Sink],
      )

      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
      const stream = Stream.take(runtime.changesReadQueryWithMeta(selector), 1)

      const fiber = yield* Effect.forkChild(
        Effect.provideService(Stream.runCollect(stream), Debug.internal.currentDebugSinks as any, [ring.sink as Debug.Sink]),
      )

      yield* waitForStartup()
      yield* Effect.provideService(runtime.setState({ count: 1 }), Debug.internal.currentDebugSinks as any, [
        ring.sink as Debug.Sink,
      ])

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return

      const defects = exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
      const err = defects.find((e) => (e as any)?._tag === 'ReadQueryStrictGateError') as any
      expect(err).toBeDefined()
      expect(err?.details?.fallbackReason).toBe('missingBuildGrade')

      const strictGateDiag = ring
        .getSnapshot()
        .find((e) => e.type === 'diagnostic' && e.code === 'read_query::strict_gate') as any
      expect(strictGateDiag).toBeDefined()
      expect(strictGateDiag?.trigger?.details?.fallbackReason).toBe('missingBuildGrade')

      const compiled = RuntimeContracts.Selector.compile(selector)
      const marked = RuntimeContracts.Selector.markRuntimeMissingBuildGrade(compiled)
      expect(marked.fallbackReason).toBe('missingBuildGrade')
      expect(marked.quality?.source).toBe('runtime_dynamic_fallback')
      expect(marked.quality?.missingBuildGrade).toBe(true)
    }).pipe(
      Effect.provideService(ReadQueryStrictGateConfigTag, {
        mode: 'error',
      }),
    )))
  })

  it('build-graded FAIL is enforced at runtime even without runtime strict-gate config', async () => {
    await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const runtime = yield* ModuleRuntime.make({ count: 0 }, { moduleId: 'M', instanceId: 'i' } as any)

      const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
      const graded = RuntimeContracts.Selector.gradeReadQueryAtBuild({
        moduleId: 'M',
        input: selector,
        strictGate: { mode: 'error' },
      })

      expect(graded.compiled.quality?.strictGate?.verdict).toBe('FAIL')

      const stream = runtime.changesReadQueryWithMeta(graded.compiled)
      const fiber = yield* Effect.forkChild(Stream.runCollect(Stream.take(stream, 1)))

      yield* waitForStartup()
      yield* runtime.setState({ count: 1 })

      const exit = yield* Fiber.await(fiber)
      expect(exit._tag).toBe('Failure')
      if (exit._tag !== 'Failure') return

      const defects = exit.cause.reasons.filter(Cause.isDieReason).map((reason) => reason.defect)
      const err = defects.find((e) => (e as any)?._tag === 'ReadQueryStrictGateError') as any
      expect(err).toBeDefined()
      expect(err?.details?.rule).toBe('requireStatic:global')
    })))
  })

  it('marks runtime dynamic fallback with missingBuildGrade quality marker', () => {
    const selector = (s: { count: number }) => (s.count > 0 ? s.count : 0)
    const compiled = RuntimeContracts.Selector.compile(selector)
    const marked = RuntimeContracts.Selector.markRuntimeMissingBuildGrade(compiled)

    expect(marked.quality?.source).toBe('runtime_dynamic_fallback')
    expect(marked.quality?.missingBuildGrade).toBe(true)
    expect(marked.fallbackReason).toBe('missingBuildGrade')
    expect(marked.staticIr.fallbackReason).toBe('missingBuildGrade')
    expect(marked.quality?.strictGate).toBeUndefined()
  })
})
