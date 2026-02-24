import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Chunk, Effect, Fiber, Schema, Stream } from 'effect'
import * as Logix from '../../../src/index.js'
import * as EffectOp from '../../../src/EffectOp.js'
import * as ModuleRuntimeImpl from '../../../src/internal/runtime/ModuleRuntime.js'
import * as EffectOpCore from '../../../src/internal/runtime/core/EffectOpCore.js'
import * as FlowRuntimeImpl from '../../../src/internal/runtime/FlowRuntime.js'
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

  it('run should keep operation metadata semantics and allocate per-op opSeq in RunSession', async () => {
    const events: Array<EffectOp.EffectOp<any, any, any>> = []
    const middleware: EffectOp.Middleware = (op) =>
      Effect.gen(function* () {
        events.push(op)
        return yield* op.effect
      })

    const runtime = {
      moduleId: 'FlowRuntimeMeta',
      instanceId: 'FlowRuntimeMeta#1',
      actions$: Stream.empty,
      changes: () => Stream.empty,
    } as any

    const flow = FlowRuntimeImpl.make<CounterShape, never>(runtime)
    const session = makeRunSession({
      runId: 'run-flow-metadata',
      source: { host: 'vitest', label: 'FlowRuntime.test' },
      startedAt: 1,
    })

    const program = flow.run(
      (_n: number) => Effect.void,
      {
        policy: { disableObservers: true },
        tags: ['flow-tag'],
        trace: ['flow-trace'],
        meta: { custom: 'value' },
      },
    )(Stream.fromIterable([1, 2]))

    await Effect.runPromise(
      Effect.scoped(
        Effect.provideService(
          Effect.provideService(program as any, EffectOpCore.EffectOpMiddlewareTag, { stack: [middleware] }),
          RunSessionTag,
          session,
        ),
      ) as Effect.Effect<void, never, never>,
    )

    expect(events).toHaveLength(2)

    const first = events[0]!
    const second = events[1]!

    expect(first.kind).toBe('flow')
    expect(first.name).toBe('flow.run')
    expect(first.meta?.policy).toEqual({ disableObservers: true })
    expect(first.meta?.tags).toEqual(['flow-tag'])
    expect(first.meta?.trace).toEqual(['flow-trace'])
    expect(first.meta?.custom).toBe('value')
    expect(first.meta?.moduleId).toBe('FlowRuntimeMeta')
    expect(first.meta?.instanceId).toBe('FlowRuntimeMeta#1')
    expect(first.meta?.opSeq).toBe(1)
    expect(second.meta?.opSeq).toBe(2)
  })

  it('runParallel/runLatest/runExhaust should keep metadata semantics and stable opSeq anchors', async () => {
    const runtime = {
      moduleId: 'FlowRuntimeMeta',
      instanceId: 'FlowRuntimeMeta#1',
      actions$: Stream.empty,
      changes: () => Stream.empty,
    } as any

    const options = {
      policy: { disableObservers: true },
      tags: ['flow-tag'],
      trace: ['flow-trace'],
      meta: { custom: 'value' },
    }

    const runWithCapture = async (
      runId: string,
      runProgram: (flow: any) => Effect.Effect<void, never, any>,
    ): Promise<Array<EffectOp.EffectOp<any, any, any>>> => {
      const events: Array<EffectOp.EffectOp<any, any, any>> = []
      const middleware: EffectOp.Middleware = (op) =>
        Effect.gen(function* () {
          events.push(op)
          return yield* op.effect
        })

      const flow = FlowRuntimeImpl.make<CounterShape, never>(runtime)
      const session = makeRunSession({
        runId,
        source: { host: 'vitest', label: 'FlowRuntime.test' },
        startedAt: 1,
      })

      await Effect.runPromise(
        Effect.scoped(
          Effect.provideService(
            Effect.provideService(runProgram(flow) as any, EffectOpCore.EffectOpMiddlewareTag, { stack: [middleware] }),
            RunSessionTag,
            session,
          ),
        ) as Effect.Effect<void, never, never>,
      )

      return events
    }

    const expectMetaAndOpSeq = (events: Array<EffectOp.EffectOp<any, any, any>>, name: string) => {
      expect(events.length).toBeGreaterThan(0)
      for (const event of events) {
        expect(event.kind).toBe('flow')
        expect(event.name).toBe(name)
        expect(event.meta?.policy).toEqual({ disableObservers: true })
        expect(event.meta?.tags).toEqual(['flow-tag'])
        expect(event.meta?.trace).toEqual(['flow-trace'])
        expect(event.meta?.custom).toBe('value')
        expect(event.meta?.moduleId).toBe('FlowRuntimeMeta')
        expect(event.meta?.instanceId).toBe('FlowRuntimeMeta#1')
      }
      const opSeqs = events.map((event) => Number(event.meta?.opSeq)).sort((a, b) => a - b)
      expect(opSeqs).toEqual(Array.from({ length: opSeqs.length }, (_, index) => index + 1))
    }

    const parallelEvents = await runWithCapture('run-flow-metadata-parallel', (flow) =>
      flow.runParallel(
        () =>
          Effect.gen(function* () {
            yield* Effect.sleep('2 millis')
          }),
        options,
      )(Stream.fromIterable([1, 2, 3])),
    )
    expect(parallelEvents).toHaveLength(3)
    expectMetaAndOpSeq(parallelEvents, 'flow.runParallel')

    const latestEvents = await runWithCapture('run-flow-metadata-latest', (flow) =>
      flow.runLatest(
        () =>
          Effect.gen(function* () {
            yield* Effect.sleep('20 millis')
          }),
        options,
      )(Stream.fromIterable([1, 2, 3])),
    )
    expect(latestEvents).toHaveLength(3)
    expectMetaAndOpSeq(latestEvents, 'flow.runLatest')

    const exhaustEvents = await runWithCapture('run-flow-metadata-exhaust', (flow) =>
      flow.runExhaust(
        () =>
          Effect.gen(function* () {
            yield* Effect.sleep('20 millis')
          }),
        options,
      )(Stream.fromIterable([1, 2, 3])),
    )
    expect(exhaustEvents).toHaveLength(1)
    expectMetaAndOpSeq(exhaustEvents, 'flow.runExhaust')
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

  it('run* should read middleware stack once per invocation instead of per payload', async () => {
    const stackReads = {
      run: 0,
      runParallel: 0,
      runLatest: 0,
      runExhaust: 0,
    }

    const makeMiddlewareEnv = (key: keyof typeof stackReads) =>
      ({
        get stack() {
          stackReads[key] += 1
          return []
        },
      }) as any

    const program: Effect.Effect<void, never, any> = Effect.gen(function* () {
      const flow = FlowRuntimeImpl.make<CounterShape, never>(undefined as any)
      const payloads = () => Stream.fromIterable([1, 2, 3])

      yield* Effect.provideService(
        flow.run((n: number) => Effect.succeed(n))(payloads()),
        EffectOpCore.EffectOpMiddlewareTag,
        makeMiddlewareEnv('run'),
      )

      yield* Effect.provideService(
        flow.runParallel((n: number) => Effect.succeed(n))(payloads()),
        EffectOpCore.EffectOpMiddlewareTag,
        makeMiddlewareEnv('runParallel'),
      )

      yield* Effect.provideService(
        flow.runLatest((n: number) => Effect.succeed(n))(payloads()),
        EffectOpCore.EffectOpMiddlewareTag,
        makeMiddlewareEnv('runLatest'),
      )

      yield* Effect.provideService(
        flow.runExhaust((n: number) => Effect.succeed(n))(payloads()),
        EffectOpCore.EffectOpMiddlewareTag,
        makeMiddlewareEnv('runExhaust'),
      )
    })

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(stackReads).toEqual({
      run: 1,
      runParallel: 1,
      runLatest: 1,
      runExhaust: 1,
    })
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
