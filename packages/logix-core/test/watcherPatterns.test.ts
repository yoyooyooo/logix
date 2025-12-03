import { describe, it, expect } from "vitest"
import { Effect, Schema, Context, Layer } from "effect"
import { Logix } from "../src/index.js"

const Counter = Logix.Module("Counter", {
    state: Schema.Struct({ value: Schema.Number }),
    actions: {
        inc: Schema.Void,
        dec: Schema.Void,
    },
})

const CounterErrorLogic = Counter.logic(($) =>
    $.lifecycle.onError((cause, context) =>
        Effect.logError("Counter logic error", cause, context),
    ),
)

const CounterRunForkLogic = Counter.logic(($) =>
    Effect.gen(function* () {
        yield* $.onAction("inc").runFork(
            $.state.update((s) => ({ ...s, value: s.value + 1 })),
        )

        yield* $.onAction("dec").runFork(
            $.state.update((s) => ({ ...s, value: s.value - 1 })),
        )
    }),
)

const CounterAllLogic = Counter.logic(($) =>
    Effect.all(
        [
            $.onAction("inc").run(
                $.state.update((s) => ({ ...s, value: s.value + 1 })),
            ),
            $.onAction("dec").run(
                $.state.update((s) => ({ ...s, value: s.value - 1 })),
            ),
        ],
        { concurrency: "unbounded" },
    ),
)

const CounterManualForkLogic = Counter.logic(($) =>
    Effect.gen(function* () {
        yield* Effect.forkScoped(
            $.onAction("inc").run(
                $.state.update((s) => ({ ...s, value: s.value + 1 })),
            ),
        )

        yield* Effect.forkScoped(
            $.onAction("dec").run(
                $.state.update((s) => ({ ...s, value: s.value - 1 })),
            ),
        )
    }),
)

describe("Watcher patterns integration (Core)", () => {
    it("runFork-based watcher should update state", async () => {
        const layer = Counter.live(
            { value: 0 },
            CounterRunForkLogic,
            CounterErrorLogic,
        )

        const program = Effect.gen(function* () {
            const context = yield* Layer.build(layer)
            const runtime = Context.get(context, Counter)

            // Wait for logic to subscribe
            yield* Effect.sleep(100)

            // Initial state
            expect(yield* runtime.getState).toEqual({ value: 0 })

            // Inc
            yield* runtime.dispatch({ _tag: "inc", payload: undefined })
            yield* Effect.sleep(100) // Wait for async update
            expect(yield* runtime.getState).toEqual({ value: 1 })

            // Dec
            yield* runtime.dispatch({ _tag: "dec", payload: undefined })
            yield* Effect.sleep(100) // Wait for async update
            expect(yield* runtime.getState).toEqual({ value: 0 })
        })

        await Effect.runPromise(
            Effect.scoped(program) as Effect.Effect<void, never, never>
        )
    })

    it("runFork-based watcher should handle a burst of actions", async () => {
        const layer = Counter.live(
            { value: 0 },
            CounterRunForkLogic,
            CounterErrorLogic,
        )

        const program = Effect.gen(function* () {
            const context = yield* Layer.build(layer)
            const runtime = Context.get(context, Counter)

            // Wait for logic to subscribe
            yield* Effect.sleep(50)

            const N = 1000

            for (let i = 0; i < N; i++) {
                yield* runtime.dispatch({ _tag: "inc", payload: undefined })
            }

            // 等待所有 watcher 消化完事件
            yield* Effect.sleep(200)

            const state = yield* runtime.getState
            expect(state).toEqual({ value: N })
        })

        await Effect.runPromise(
            Effect.scoped(program) as Effect.Effect<void, never, never>
        )
    })

    it("Effect.all + run style watcher should update state", async () => {
        const layer = Counter.live(
            { value: 0 },
            CounterAllLogic,
            CounterErrorLogic,
        )

        const program = Effect.gen(function* () {
            const context = yield* Layer.build(layer)
            const runtime = Context.get(context, Counter)

            // Wait for logic to subscribe
            yield* Effect.sleep(100)

            // Initial state
            expect(yield* runtime.getState).toEqual({ value: 0 })

            // Inc
            yield* runtime.dispatch({ _tag: "inc", payload: undefined })
            yield* Effect.sleep(100) // Wait for async update
            expect(yield* runtime.getState).toEqual({ value: 1 })

            // Dec
            yield* runtime.dispatch({ _tag: "dec", payload: undefined })
            yield* Effect.sleep(100) // Wait for async update
            expect(yield* runtime.getState).toEqual({ value: 0 })
        })

        await Effect.runPromise(
            Effect.scoped(program) as Effect.Effect<void, never, never>
        )
    })

    it("manual Effect.fork($.onAction().run(...)) watcher should behave like runFork", async () => {
        const layer = Counter.live(
            { value: 0 },
            CounterManualForkLogic,
            CounterErrorLogic,
        )

        const program = Effect.gen(function* () {
            const context = yield* Layer.build(layer)
            const runtime = Context.get(context, Counter)

            // Wait for logic to subscribe
            yield* Effect.sleep(100)

            // Initial state
            expect(yield* runtime.getState).toEqual({ value: 0 })

            // Inc
            yield* runtime.dispatch({ _tag: "inc", payload: undefined })
            yield* Effect.sleep(100) // Wait for async update
            expect(yield* runtime.getState).toEqual({ value: 1 })

            // Dec
            yield* runtime.dispatch({ _tag: "dec", payload: undefined })
            yield* Effect.sleep(100) // Wait for async update
            expect(yield* runtime.getState).toEqual({ value: 0 })
        })

        await Effect.runPromise(
            Effect.scoped(program) as Effect.Effect<void, never, never>
        )
    })
})
