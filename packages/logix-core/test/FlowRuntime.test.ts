import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Chunk, Effect, Fiber, Schema, Stream } from "effect"
import * as Logix from "../src/index.js"
import * as ModuleRuntimeImpl from "../src/internal/runtime/ModuleRuntime.js"
import * as FlowRuntimeImpl from "../src/internal/runtime/FlowRuntime.js"

const CounterState = Schema.Struct({ count: Schema.Number })
const CounterActions = {
  inc: Schema.Void,
  dec: Schema.Void,
}

type CounterShape = Logix.Module.Shape<
  typeof CounterState,
  typeof CounterActions
>

describe("FlowRuntime.make (internal kernel)", () => {
  it.skip("fromAction should stream matching actions from ModuleRuntime", async () => {
    const events: Array<string> = []

    const program: Effect.Effect<void, never, any> = Effect.gen(
      function* () {
        const runtime = yield* ModuleRuntimeImpl.make<
          Logix.Module.StateOf<CounterShape>,
          Logix.Module.ActionOf<CounterShape>
        >(
          { count: 0 },
          {
            moduleId: "FlowRuntimeFromAction",
          },
        )

        const stream = runtime.actions$.pipe(
          Stream.filter(
            (a: Logix.Module.ActionOf<CounterShape>) =>
              a._tag === "inc",
          ),
        )

        const effect = Stream.runForEach(stream, (action) =>
          Effect.sync(() => {
            events.push(action._tag as string)
          }),
        )

        const fiber = yield* Effect.fork(effect)

        yield* runtime.dispatch({ _tag: "inc", payload: undefined })
        yield* runtime.dispatch({ _tag: "dec", payload: undefined })
        yield* runtime.dispatch({ _tag: "inc", payload: undefined })

        yield* Effect.sleep("20 millis")
        yield* Fiber.interrupt(fiber)
      },
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(events).toEqual(["inc", "inc"])
  })

  it("run should apply effect sequentially to all elements", async () => {
    let sum = 0

    const program: Effect.Effect<void, never, any> = Effect.gen(
      function* () {
        const flow = FlowRuntimeImpl.make<CounterShape, never>(
          undefined as any,
        )

        const base = Stream.fromIterable([1, 2, 3])

        yield* flow.run((n: number) =>
          Effect.sync(() => {
            sum += n
          }),
        )(base)
      },
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(sum).toBe(6)
  })

  it("runParallel should process all elements (order not guaranteed)", async () => {
    let sum = 0

    const program: Effect.Effect<void, never, any> = Effect.gen(
      function* () {
        const flow = FlowRuntimeImpl.make<CounterShape, never>(
          undefined as any,
        )

        const base = Stream.fromIterable([1, 2, 3])

        yield* flow.runParallel((n: number) =>
          Effect.sync(() => {
            sum += n
          }),
        )(base)
      },
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(sum).toBe(6)
  })

  it("runLatest should keep only the latest effect result", async () => {
    const events: Array<number> = []

    const base = Stream.fromIterable([1, 2, 3])

    const program: Effect.Effect<void, never, any> = Effect.gen(
      function* () {
        const flow = FlowRuntimeImpl.make<CounterShape, never>(
          undefined as any,
        )

        const effect = flow.runLatest((n: number) =>
          Effect.gen(function* () {
            yield* Effect.sleep("20 millis")
            events.push(n)
          }),
        )(base)

        yield* effect
      },
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(events).toEqual([3])
  })

  it("runExhaust should drop new events while effect is running", async () => {
    const events: Array<number> = []

    const base = Stream.fromIterable([1, 2, 3])

    const program: Effect.Effect<void, never, any> = Effect.gen(
      function* () {
        const flow = FlowRuntimeImpl.make<CounterShape, never>(
          undefined as any,
        )

        const effect = flow.runExhaust((n: number) =>
          Effect.gen(function* () {
            events.push(n)
            yield* Effect.sleep("20 millis")
          }),
        )(base)

        yield* effect
      },
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)

    expect(events).toEqual([1])
  })

  it("fromAction/fromState and debounce/throttle/filter should compose streams", async () => {
    type Action = Logix.Module.ActionOf<CounterShape>

    const program: Effect.Effect<void, never, any> = Effect.gen(
      function* () {
        // 构造一个只实现 actions$/changes 的占位 runtime，用于验证 FlowRuntime API 组合行为
        const runtime = {
          actions$: Stream.fromIterable<Action>([
            { _tag: "inc", payload: undefined } as any,
            { _tag: "dec", payload: undefined } as any,
            { _tag: "inc", payload: undefined } as any,
          ]),
          changes: (selector: (s: { count: number }) => number) =>
            Stream.fromIterable([{ count: 1 }, { count: 2 }]).pipe(
              Stream.map(selector),
            ),
        } as any

        const flow = FlowRuntimeImpl.make<CounterShape, never>(runtime)

        // fromAction：只选择 inc
        const incStream = flow.fromAction(
          (a: Action): a is Action =>
            (a as any)._tag === "inc",
        )
        const incChunk = yield* Stream.runCollect(incStream)
        expect(
          Chunk.toReadonlyArray(incChunk).map((a) => (a as any)._tag),
        ).toEqual(["inc", "inc"])

        // fromState：将 count 投影为数值流
        const countStream = flow.fromState((s) => s.count)
        const countChunk = yield* Stream.runCollect(countStream)
        expect(Chunk.toReadonlyArray(countChunk)).toEqual([1, 2])

        // debounce/throttle/filter：这里只验证组合不会抛错
        const base = Stream.fromIterable([1, 1, 2, 3])
        const debounced = flow.debounce(10)(base)
        const throttled = flow.throttle(5)(base)
        const filtered = flow.filter((n: number) => n > 1)(base)

        yield* Stream.runDrain(debounced)
        yield* Stream.runDrain(throttled)
        const filteredChunk = yield* Stream.runCollect(filtered)
        expect(Chunk.toReadonlyArray(filteredChunk)).toEqual([2, 3])
      },
    )

    await Effect.runPromise(program as Effect.Effect<void, never, never>)
  })
})
