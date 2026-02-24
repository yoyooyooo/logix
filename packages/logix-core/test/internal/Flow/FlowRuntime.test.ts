import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Chunk, Effect, Fiber, FiberRef, Schema, Stream } from 'effect'
import * as Logix from '../../../src/index.js'
import * as EffectOp from '../../../src/EffectOp.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as FlowRuntimeImpl from '../../../src/internal/runtime/FlowRuntime.js'
import * as EffectOpCore from '../../../src/internal/runtime/core/EffectOpCore.js'
import { makeRunSession, RunSessionTag } from '../../../src/internal/observability/runSession.js'

const CounterState = Schema.Struct({ count: Schema.Number })
const CounterActions = {
  inc: Schema.Void,
  dec: Schema.Void,
}

type CounterShape = Logix.Module.Shape<typeof CounterState, typeof CounterActions>

describe('FlowRuntime.make (internal kernel)', () => {
  it.skip('fromAction should stream matching actions from ModuleRuntime', async () => {
    const events: Array<string> = []

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const runtime = yield* ModuleRuntimeImpl.make<
        Logix.Module.StateOf<CounterShape>,
        Logix.Module.ActionOf<CounterShape>
      >(
        { count: 0 },
        {
          moduleId: 'FlowRuntimeFromAction',
        },
      )

      const stream = runtime.actions$.pipe(Stream.filter((a: Logix.Module.ActionOf<CounterShape>) => a._tag === 'inc'))

      const effect = Stream.runForEach(stream, (action) =>
        Effect.sync(() => {
          events.push(action._tag as string)
        }),
      )

      const fiber = yield* Effect.fork(effect)

      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })
      yield* runtime.dispatch({ _tag: 'dec', payload: undefined })
      yield* runtime.dispatch({ _tag: 'inc', payload: undefined })

      yield* Effect.sleep('20 millis')
      yield* Fiber.interrupt(fiber)
    })

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(events).toEqual(['inc', 'inc'])
  })

  it('run should apply effect sequentially to all elements', async () => {
    let sum = 0

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>(undefined as any)

      const base = Stream.fromIterable([1, 2, 3])

      yield* flow.run((n: number) =>
        Effect.sync(() => {
          sum += n
        }),
      )(base)
    })

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(sum).toBe(6)
  })

  it('runParallel should process all elements (order not guaranteed)', async () => {
    let sum = 0

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>(undefined as any)

      const base = Stream.fromIterable([1, 2, 3])

      yield* flow.runParallel((n: number) =>
        Effect.sync(() => {
          sum += n
        }),
      )(base)
    })

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(sum).toBe(6)
  })

  it('runLatest should keep only the latest effect result', async () => {
    const events: Array<number> = []

    const base = Stream.fromIterable([1, 2, 3])

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>(undefined as any)

      const effect = flow.runLatest((n: number) =>
        Effect.gen(function* () {
          yield* Effect.sleep('20 millis')
          events.push(n)
        }),
      )(base)

      yield* effect
    })

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(events).toEqual([3])
  })

  it('runExhaust should drop new events while effect is running', async () => {
    const events: Array<number> = []

    const base = Stream.fromIterable([1, 2, 3])

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>(undefined as any)

      const effect = flow.runExhaust((n: number) =>
        Effect.gen(function* () {
          events.push(n)
          yield* Effect.sleep('20 millis')
        }),
      )(base)

      yield* effect
    })

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(events).toEqual([1])
  })

  it('run should preserve parent linkId when middleware stack is empty', async () => {
    const captured: Array<string | undefined> = []

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>({
        instanceId: 'flow-runtime-empty-stack',
      } as any)

      const base = Stream.fromIterable([1, 2])

      yield* Effect.locally(EffectOpCore.currentLinkId, 'parent-link')(
        flow.run(() =>
          Effect.gen(function* () {
            const linkId = yield* FiberRef.get(EffectOpCore.currentLinkId)
            captured.push(linkId)
          }),
        )(base),
      )
    })

    await Effect.runPromise(program as Effect.Effect<void, never, never>)
    expect(captured).toEqual(['parent-link', 'parent-link'])
  })

  it('run should honor meta.linkId consistently with and without middleware', async () => {
    const emptyStackCaptured: Array<string | undefined> = []
    const middlewareCaptured: Array<string | undefined> = []

    const captureMiddleware: EffectOp.Middleware = <A, E, R>(op: EffectOp.EffectOp<A, E, R>) =>
      Effect.sync(() => {
        middlewareCaptured.push(op.meta?.linkId as string | undefined)
      }).pipe(Effect.zipRight(op.effect)) as Effect.Effect<A, EffectOp.OperationError<E>, R>

    const emptyStackProgram: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>({
        instanceId: 'flow-runtime-meta-link-empty-stack',
      } as any)

      const base = Stream.fromIterable([1, 2])
      yield* Effect.locally(EffectOpCore.currentLinkId, 'parent-link')(
        flow.run(
          () =>
            Effect.gen(function* () {
              const linkId = yield* FiberRef.get(EffectOpCore.currentLinkId)
              emptyStackCaptured.push(linkId)
            }),
          { meta: { linkId: 'meta-link' } },
        )(base),
      )
    })

    const middlewareProgram: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>({
        moduleId: 'FlowRuntimeMetaLinkModule',
        instanceId: 'flow-runtime-meta-link-middleware',
      } as any)

      const base = Stream.fromIterable([1, 2])
      yield* Effect.locally(EffectOpCore.currentLinkId, 'parent-link')(
        flow.run(
          () =>
            Effect.gen(function* () {
              const linkId = yield* FiberRef.get(EffectOpCore.currentLinkId)
              middlewareCaptured.push(linkId)
            }),
          { meta: { linkId: 'meta-link' } },
        )(base),
      )
    }).pipe(Effect.provideService(EffectOpCore.EffectOpMiddlewareTag, { stack: [captureMiddleware] }))

    await Effect.runPromise(emptyStackProgram as Effect.Effect<void, never, never>)
    await Effect.runPromise(middlewareProgram as Effect.Effect<void, never, never>)

    expect(emptyStackCaptured).toEqual(['meta-link', 'meta-link'])
    expect(middlewareCaptured).toEqual(['meta-link', 'meta-link', 'meta-link', 'meta-link'])
  })

  it('run should keep middleware semantics and stable opSeq anchors', async () => {
    const captured: Array<{ readonly name: string; readonly linkId: unknown; readonly opSeq: unknown }> = []
    const captureMiddleware: EffectOp.Middleware = <A, E, R>(op: EffectOp.EffectOp<A, E, R>) =>
      Effect.sync(() => {
        captured.push({
          name: op.name,
          linkId: op.meta?.linkId,
          opSeq: op.meta?.opSeq,
        })
      }).pipe(Effect.zipRight(op.effect)) as Effect.Effect<A, EffectOp.OperationError<E>, R>

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>({
        moduleId: 'FlowRuntimeMiddlewareModule',
        instanceId: 'flow-runtime-middleware',
      } as any)

      const base = Stream.fromIterable([1, 2])

      yield* Effect.locally(EffectOpCore.currentLinkId, 'parent-link')(
        flow.run((n: number) =>
          Effect.sync(() => {
            void n
          }),
        )(base),
      )
    }).pipe(
      Effect.provideService(EffectOpCore.EffectOpMiddlewareTag, { stack: [captureMiddleware] }),
      Effect.provideService(
        RunSessionTag,
        makeRunSession({
          runId: 'flow-runtime-test-run',
          startedAt: 0,
          source: { host: 'flow-runtime-test' },
        }),
      ),
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(captured.map((entry) => entry.name)).toEqual(['flow.run', 'flow.run'])
    expect(captured.map((entry) => entry.linkId)).toEqual(['parent-link', 'parent-link'])
    expect(captured.map((entry) => entry.opSeq)).toEqual([1, 2])
  })

  it('fromAction/fromState and debounce/throttle/filter should compose streams', async () => {
    type Action = Logix.Module.ActionOf<CounterShape>

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      // Build a placeholder runtime that only implements actions$/changes, used to validate FlowRuntime API composition.
      const runtime = {
        actions$: Stream.fromIterable<Action>([
          { _tag: 'inc', payload: undefined } as any,
          { _tag: 'dec', payload: undefined } as any,
          { _tag: 'inc', payload: undefined } as any,
        ]),
        changes: (selector: (s: { count: number }) => number) =>
          Stream.fromIterable([{ count: 1 }, { count: 2 }]).pipe(Stream.map(selector)),
      } as any

      const flow = FlowRuntimeImpl.make<CounterShape, never>(runtime)

      // fromAction: select inc only.
      const incStream = flow.fromAction((a: Action): a is Action => (a as any)._tag === 'inc')
      const incChunk = yield* Stream.runCollect(incStream)
      expect(Chunk.toReadonlyArray(incChunk).map((a) => (a as any)._tag)).toEqual(['inc', 'inc'])

      // fromState: project count into a number stream.
      const countStream = flow.fromState((s) => s.count)
      const countChunk = yield* Stream.runCollect(countStream)
      expect(Chunk.toReadonlyArray(countChunk)).toEqual([1, 2])

      // debounce/throttle/filter: only validate composition does not throw.
      const base = Stream.fromIterable([1, 1, 2, 3])
      const debounced = flow.debounce(10)(base)
      const throttled = flow.throttle(5)(base)
      const filtered = flow.filter((n: number) => n > 1)(base)

      yield* Stream.runDrain(debounced)
      yield* Stream.runDrain(throttled)
      const filteredChunk = yield* Stream.runCollect(filtered)
      expect(Chunk.toReadonlyArray(filteredChunk)).toEqual([2, 3])
    })

    await Effect.runPromise(program as Effect.Effect<void, never, never>)
  })
})
