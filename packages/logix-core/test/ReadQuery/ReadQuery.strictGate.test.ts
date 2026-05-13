import { describe, it, expect } from 'vitest'
import * as RuntimeContracts from '../../src/internal/runtime-contracts.js'
import { Cause, Effect, Fiber, Stream } from 'effect'
import * as Debug from '../../src/internal/debug-api.js'
import * as ModuleRuntime from '../../src/internal/runtime/core/ModuleRuntime.js'
import * as Logix from '../../src/index.js'

const waitForStartup = () =>
  Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 10)
      }),
  )

describe('ReadQuery.strictGate', () => {
  it('build-grade error is enforced at runtime without re-evaluating runtime strict-gate config', async () => {
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
        strictGate: { mode: 'error' },
      })
      const stream = runtime.changesReadQueryWithMeta(graded.compiled)

      const fiber = yield* Effect.forkChild(
        Effect.provideService(Stream.runCollect(Stream.take(stream, 1)), Debug.internal.currentDebugSinks as any, [
          ring.sink as Debug.Sink,
        ]),
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

      const details = err.details as any
      expect(details).toMatchObject({
        moduleId: 'M',
        instanceId: 'i',
        txnSeq: 0,
        selectorId: expect.any(String),
        fallbackReason: expect.any(String),
      })
      expect(['missingDeps', 'unsupportedSyntax', 'unstableSelectorId', 'missingBuildGrade']).toContain(
        details.fallbackReason,
      )
      expect(() => JSON.stringify(details)).not.toThrow()

      const diag = ring
        .getSnapshot()
        .find((e) => e.type === 'diagnostic' && e.code === 'read_query::strict_gate') as any
      expect(diag).toBeDefined()
      expect(diag.severity).toBe('error')
      expect(diag.trigger?.details?.rule).toBe('requireStatic:global')
    })))
  })

  it('build-grade warn emits serializable diagnostic and keeps stream behavior', async () => {
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
        strictGate: { mode: 'warn' },
      })

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

      const changes = Array.from(exit.value as Iterable<any>)
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
      expect(['missingDeps', 'unsupportedSyntax', 'unstableSelectorId', 'missingBuildGrade']).toContain(
        details?.fallbackReason,
      )
      expect(details?.rule).toBe('requireStatic:global')
      expect(() => JSON.stringify(details)).not.toThrow()
    })))
  })
})
