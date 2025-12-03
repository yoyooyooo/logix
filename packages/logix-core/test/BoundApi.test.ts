import { describe, it, expect, vi } from "vitest"
import { Effect, Context, Stream, Schedule, TestClock, Fiber, Layer, Ref } from "effect"
import * as Logix from "../src/index.js"
import { Schema } from "effect"



// Define a simple test module
const State = Schema.Struct({
  count: Schema.Number,
  value: Schema.String
})

const Actions = {
  inc: Schema.Void,
  setValue: Schema.String
}

const TestModule = Logix.Logix.Module("TestModule", {
  state: State,
  actions: Actions
})

describe("BoundApi", () => {
  it("should handle IntentBuilder operators (filter, map)", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

	      const fiber = yield* Effect.fork(
        api.onAction("setValue")
          .filter((a) => a.payload !== "skip")
          .map((a) => a.payload.toUpperCase())
          .run((val) =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push(val)
              }),
              { name: "test:onAction.setValue" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10) // Wait for subscription
      yield* runtime.dispatch({ _tag: "setValue", payload: "hello" })
      yield* runtime.dispatch({ _tag: "setValue", payload: "skip" })
      yield* runtime.dispatch({ _tag: "setValue", payload: "world" })

      // Allow stream to process
      yield* Effect.sleep(10)

      expect(results).toEqual(["HELLO", "WORLD"])
      yield* Fiber.interrupt(fiber)
        })
      )
    )
  })

  it("should handle IntentBuilder update/mutate", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

      const fiber = yield* Effect.fork(
        api.onAction("inc")
          .update((state) => ({ ...state, count: state.count + 1 }))
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10) // Wait for subscription
      yield* runtime.dispatch({ _tag: "inc", payload: undefined })
      yield* runtime.dispatch({ _tag: "inc", payload: undefined })

      yield* Effect.sleep(10)
      const state = yield* runtime.getState
      expect(state.count).toBe(2)
      yield* Fiber.interrupt(fiber)
        })
      )
    )
  })

  it("should handle action-driven state update via Fluent DSL", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

      const fiber = yield* Effect.fork(
        api.onAction(
          (a): a is Logix.Logix.ActionOf<typeof TestModule.shape> =>
            a._tag === "inc",
        ).update((state) => ({ ...state, count: state.count + 5 }))
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10) // Wait for subscription
      yield* runtime.dispatch({ _tag: "inc", payload: undefined })

      yield* Effect.sleep(10)
      const state = yield* runtime.getState
      expect(state.count).toBe(5)
      yield* Fiber.interrupt(fiber)
        })
      )
    )
  })

  it("should handle match/matchTag", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

	      const result1 = yield* api.match(10)
        .when(10, () => Effect.succeed("ten"))
        .otherwise(() => Effect.succeed("other"))
      expect(result1).toBe("ten")

      const tagged = { _tag: "A" as const, val: 1 }
      const result2 = yield* api.matchTag(tagged)
        .tag("A", (v) => Effect.succeed(v.val))
        .exhaustive()
      expect(result2).toBe(1)
        })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle onAction proxy property access", async () => {
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

      const fiber = yield* Effect.fork(
        api.onAction.setValue
          .run((val) =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push(val.payload)
              }),
              { name: "test:onAction.setValue.proxy" }
            )
          )
	          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "proxy" })
      yield* Effect.sleep(10)

      expect(results).toEqual(["proxy"])
      yield* Fiber.interrupt(fiber)
        })
      )
    )
  })

  it("should handle onAction object pattern", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

      type TestAction = Logix.Logix.ActionOf<typeof TestModule.shape>
      const fiber = yield* Effect.fork(
        api.onAction({ _tag: "setValue" } as unknown as TestAction)
          .run((val) =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push(val.payload as string)
              }),
              { name: "test:onAction.object" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "object" })
      yield* Effect.sleep(10)

      expect(results).toEqual(["object"])
      yield* Fiber.interrupt(fiber)
    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle onState", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: number[] = []

      const fiber = yield* Effect.fork(
        api.onState((s) => s.count)
          .run((val) =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push(val)
              }),
              { name: "test:onState" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.setState({ count: 1, value: "initial" })
      yield* Effect.sleep(10)
      yield* runtime.setState({ count: 2, value: "initial" })
      yield* Effect.sleep(10)

      expect(results).toEqual([0, 1, 2])
      yield* Fiber.interrupt(fiber)
    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle on (generic stream)", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: number[] = []

      const stream = Stream.make(1, 2, 3)

      const fiber = yield* Effect.fork(
        api.on(stream)
          .run((val) =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push(val)
              }),
              { name: "test:on.stream" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      expect(results).toEqual([1, 2, 3])
      yield* Fiber.interrupt(fiber)
    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle onAction with predicate", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

      const fiber = yield* Effect.fork(
        api.onAction(
          (a): a is { _tag: "setValue"; payload: string } => a._tag === "setValue"
        )
          .run((val) =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push(val.payload)
              }),
              { name: "test:onAction.predicate" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "predicate" })
      yield* runtime.dispatch({ _tag: "inc", payload: undefined })
      yield* Effect.sleep(10)

      expect(results).toEqual(["predicate"])
      yield* Fiber.interrupt(fiber)
    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle onAction with schema (object)", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

      // Mocking schema object behavior as the implementation just checks for object
      const schemaObj = { some: "schema" }

      const fiber = yield* Effect.fork(
        api.onAction(schemaObj)
          .run(() =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push("schema_match")
              }),
              { name: "test:onAction.schema" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "schema" })
      yield* Effect.sleep(10)

	      expect(results).toEqual(["schema_match"])
	      yield* Fiber.interrupt(fiber)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle lifecycle hooks", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const mockPlatform = { lifecycle: { onSuspend: (e: any) => e, onResume: (e: any) => e } }
      let finalized = false

      yield* Effect.gen(function* () {
          yield* api.lifecycle.onInit(Effect.void)
          yield* api.lifecycle.onDestroy(Effect.sync(() => { finalized = true }))
      }).pipe(
          Effect.provideService(TestModule, runtime),
          Effect.provideService(Logix.Logic.Platform, mockPlatform),
          Effect.scoped
      )

      expect(finalized).toBe(true)
    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle use and services", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const mockPlatform = { lifecycle: { onSuspend: (e: any) => e, onResume: (e: any) => e } }

      const ServiceTag = Context.GenericTag<string>("Service")
      const serviceValue = "service_value"

      const layer = Layer.mergeAll(
          Layer.succeed(ServiceTag, serviceValue),
          Layer.succeed(TestModule, runtime),
          Layer.succeed(Logix.Logic.Platform, mockPlatform)
      )

      const result = yield* api.use(ServiceTag).pipe(
          Effect.provide(layer)
      )
      expect(result).toBe(serviceValue)

      const result2 = yield* api.services(ServiceTag).pipe(
          Effect.provide(layer)
      )
      expect(result2).toBe(serviceValue)

	      const moduleHandle = yield* api.use(TestModule).pipe(
	          Effect.provide(layer)
	      )
	      const snapshot = yield* moduleHandle.read((s) => s.count).pipe(Effect.provide(layer))
	      expect(snapshot).toBe(0)
	
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle onAction fallback", async () => {
      const program = Effect.scoped(
        Effect.gen(function* (_) {
        const runtime = yield* Logix.ModuleRuntime.make<
          Logix.Logix.StateOf<typeof TestModule.shape>,
          Logix.Logix.ActionOf<typeof TestModule.shape>
        >({ count: 0, value: "initial" })
        const api = Logix.BoundApi.make(TestModule.shape, runtime)

        const builder = api.onAction(123 as unknown as never)
        expect(builder).toBeDefined()

        const proxyBuilder = (api.onAction as unknown as { [k: string]: unknown }).someUnknownProp
        expect(proxyBuilder).toBeDefined()

        const undefinedProp = (api.onAction as unknown as { [k: symbol]: unknown })[Symbol("sym")]
        expect(undefinedProp).toBeUndefined()

      })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
    })

  it("should handle runLatest", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

      const fiber = yield* Effect.fork(
        api.onAction("setValue")
	          .runLatest((a) =>
	            Logix.Logic.secure(
	              Effect.gen(function* () {
	                yield* Effect.sleep(20)
	                results.push(a.payload)
	              }),
	              { name: "test:runLatest" }
	            )
	          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "first" })
      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "second" })
      yield* Effect.sleep(50)

	      expect(results).toEqual(["second"])
	      yield* Fiber.interrupt(fiber)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle error hooks and other lifecycle", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const mockPlatform = { lifecycle: { onSuspend: (e: any) => e, onResume: (e: any) => e } }

	      yield* Effect.gen(function* () {
	          yield* api.lifecycle.onError(() => Effect.void)
	          yield* api.lifecycle.onSuspend(Effect.void)
	          yield* api.lifecycle.onResume(Effect.void)
	          yield* api.lifecycle.onReset(Effect.void)
	      }).pipe(
	          Effect.provideService(TestModule, runtime),
	          Effect.provideService(Logix.Logic.Platform, mockPlatform),
	          Effect.scoped
	      )
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle use invalid argument", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const mockPlatform = { lifecycle: { onSuspend: (e: any) => e, onResume: (e: any) => e } }

	      const result = yield* api.use("invalid" as unknown as Context.Tag<any, any>).pipe(
	          Effect.provideService(TestModule, runtime),
	          Effect.provideService(Logix.Logic.Platform, mockPlatform),
	          Effect.exit
	      )
	      expect(result._tag).toBe("Failure")
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle match/matchTag exhaustive failure", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

      const result1 = yield* api.match(10)
        .when(20, () => Effect.void)
        .exhaustive().pipe(Effect.exit)
      expect(result1._tag).toBe("Failure")

      const result2 = yield* api.matchTag({ _tag: "A" as const })
        .tag("B" as unknown as never, () => Effect.void)
        .exhaustive().pipe(Effect.exit)
      expect(result2._tag).toBe("Failure")
    })
    ) as Effect.Effect<void, never, never>

    await Effect.runPromise(program)
  })

  it("should handle runExhaust", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

	      const fiber1 = yield* Effect.fork(
        api.onAction("setValue")
	          .runExhaust((a) =>
            Logix.Logic.secure(
              Effect.gen(function* () {
                yield* Effect.sleep(20)
                results.push("exhaust_" + a.payload)
              }),
              { name: "test:runExhaust" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "1" })
      yield* runtime.dispatch({ _tag: "setValue", payload: "2" })

      yield* Effect.sleep(50)
      yield* Fiber.interrupt(fiber1)

      expect(results).toContain("exhaust_1")
      expect(results).not.toContain("exhaust_2")
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle state-driven update via Fluent DSL", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

      const fiber = yield* Effect.fork(
        api.onState((s) => s.value)
          .update((prev) => ({ ...prev, count: prev.count + 1 }))
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.setState({ count: 0, value: "changed" })
      yield* Effect.sleep(10)

	      const state = yield* runtime.getState
	      expect(state.count).toBe(1)
	      yield* Fiber.interrupt(fiber)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should report errors from action-driven update via Fluent DSL", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

      const fiber = yield* Effect.fork(
        api.onAction(
          (a): a is Logix.Logix.ActionOf<typeof TestModule.shape> => true,
        )
          .run(() => Effect.die("boom"))
          .pipe(Effect.provideService(TestModule, runtime))
      )

	      yield* Effect.sleep(10)
	      yield* runtime.dispatch({ _tag: "setValue", payload: "error" })
	      yield* Effect.sleep(10)

	      yield* Fiber.interrupt(fiber)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle match otherwise", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

      const result = yield* api
        .match(10)
        .when(20, () => Effect.succeed("matched"))
        .otherwise(() => Effect.succeed("fallback"))
        .pipe(Effect.provide(Layer.empty))

      expect(result).toBe("fallback")
    })
    ) as Effect.Effect<void, any, never>

    await Effect.runPromise(program)
  })

  it("should handle throttle", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

      const fiber = yield* Effect.fork(
        api.onAction("setValue")
          .throttle(50)
          .run((a) =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push(a.payload)
              }),
              { name: "test:throttle" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "1" })
      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "2" })
      yield* Effect.sleep(60)
      yield* runtime.dispatch({ _tag: "setValue", payload: "3" })
      yield* Effect.sleep(10)

      yield* Fiber.interrupt(fiber)
	      expect(results.length).toBeGreaterThan(0)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle run with static effect", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      let count = 0

      const fiber = yield* Effect.fork(
        api.onAction("setValue")
          .run(
            Logix.Logic.secure(
              Effect.sync(() => {
                count++
              }),
              { name: "test:run.static" }
            )
          )
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "1" })
      yield* Effect.sleep(10)

	      expect(count).toBe(1)
	      yield* Fiber.interrupt(fiber)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle flow.throttle", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

      const stream = api.flow
        .fromAction(
          (a): a is { _tag: "setValue"; payload: string } =>
            a._tag === "setValue"
        )
        .pipe(
        api.flow.throttle(50)
      )

      const fiber = yield* Effect.fork(
        api.flow
          .run(
            (a: { _tag: "setValue"; payload: string }) =>
              Logix.Logic.secure(
                Effect.sync(() => {
                  results.push(a.payload)
                }),
                { name: "test:flow.run.throttle" }
              )
          )(stream)
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "1" })
      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "2" })
      yield* Effect.sleep(60)
      yield* runtime.dispatch({ _tag: "setValue", payload: "3" })
      yield* Effect.sleep(10)

      yield* Fiber.interrupt(fiber)
	      expect(results.length).toBeGreaterThan(0)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle flow.run with static effect", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      let count = 0

      const stream = api.flow.fromAction((a): a is any => a._tag === "setValue")

      const fiber = yield* Effect.fork(
        api.flow
          .run(
            Logix.Logic.secure(
              Effect.sync(() => {
                count++
              }),
              { name: "test:flow.run.static" }
            )
          )(stream)
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.dispatch({ _tag: "setValue", payload: "1" })
      yield* Effect.sleep(10)

      expect(count).toBe(1)
	      yield* Fiber.interrupt(fiber)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should differentiate flow.run (sequential) and flow.runParallel (concurrent)", async () => {
    const program = Effect.scoped(
      Effect.gen(function* () {
        const runtime = yield* Logix.ModuleRuntime.make<
          Logix.Logix.StateOf<typeof TestModule.shape>,
          Logix.Logix.ActionOf<typeof TestModule.shape>
        >({ count: 0, value: "initial" })
        const api = Logix.BoundApi.make(TestModule.shape, runtime)

        const currentRun = yield* Ref.make(0)
        const maxRun = yield* Ref.make(0)
        const currentParallel = yield* Ref.make(0)
        const maxParallel = yield* Ref.make(0)

        const mkEffect = (
          currentRef: Ref.Ref<number>,
          maxRef: Ref.Ref<number>,
        ) =>
          Effect.gen(function* () {
            yield* Ref.update(currentRef, (n) => n + 1)
            const now = yield* Ref.get(currentRef)
            yield* Ref.update(maxRef, (m) => (now > m ? now : m))
            // 模拟较长的处理时间，制造重叠窗口
            yield* Effect.sleep(20)
            yield* Ref.update(currentRef, (n) => n - 1)
          })

        const stream = api.flow.fromAction(
          (a): a is { _tag: "setValue"; payload: string } =>
            a._tag === "setValue",
        )

        const fiberRun = yield* Effect.fork(
          api.flow
            .run((a) => mkEffect(currentRun, maxRun))(stream)
            .pipe(Effect.provideService(TestModule, runtime)),
        )

        const fiberParallel = yield* Effect.fork(
          api.flow
            .runParallel((a) => mkEffect(currentParallel, maxParallel))(stream)
            .pipe(Effect.provideService(TestModule, runtime)),
        )

        // 快速触发多次 setValue，让两个 watcher 同时收到事件
        yield* Effect.sleep(10)
        yield* runtime.dispatch({ _tag: "setValue", payload: "1" })
        yield* runtime.dispatch({ _tag: "setValue", payload: "2" })
        yield* runtime.dispatch({ _tag: "setValue", payload: "3" })
        yield* Effect.sleep(100)

        yield* Fiber.interrupt(fiberRun)
        yield* Fiber.interrupt(fiberParallel)

        const maxRunValue = yield* Ref.get(maxRun)
        const maxParallelValue = yield* Ref.get(maxParallel)

        // 串行 run：同一 watcher 内任意时刻最多只有一个执行中
        expect(maxRunValue).toBe(1)
        // 并行 runParallel：在测试窗口内应该观测到超过 1 的并发度
        expect(maxParallelValue).toBeGreaterThan(1)
      }),
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle flow.fromState and debounce", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)
      const results: string[] = []

      const stream = api.flow
        .fromState((s) => s.value)
        .pipe(api.flow.debounce(50))

      const fiber = yield* Effect.fork(
        api.flow
          .run((val: string) =>
            Logix.Logic.secure(
              Effect.sync(() => {
                results.push(val)
              }),
              { name: "test:flow.fromState.debounce" }
            )
          )(stream)
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* runtime.setState({ count: 1, value: "change1" })
      yield* Effect.sleep(10)
      yield* runtime.setState({ count: 2, value: "change2" })
      yield* Effect.sleep(60)
      yield* runtime.setState({ count: 3, value: "change3" })
      yield* Effect.sleep(60)

	      yield* Fiber.interrupt(fiber)
	      expect(results.length).toBeGreaterThan(0)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle andThen for state update and effects", async () => {
    const program = Effect.scoped(
      Effect.gen(function* () {
        const runtime = yield* Logix.ModuleRuntime.make<
          Logix.Logix.StateOf<typeof TestModule.shape>,
          Logix.Logix.ActionOf<typeof TestModule.shape>
        >({ count: 0, value: "initial" })
        const api = Logix.BoundApi.make(TestModule.shape, runtime)

        // 1. andThen 用于 State 更新 (sync)
        const fiberUpdate = yield* Effect.fork(
          api
            .onAction("setValue")
            .andThen(
              (
                prev: Logix.Logix.StateOf<typeof TestModule.shape>,
                action: Logix.Logix.ActionOf<typeof TestModule.shape> & {
                  readonly _tag: "setValue"
                },
              ) => ({
                ...prev,
                value: action.payload,
              }),
            )
            .pipe(Effect.provideService(TestModule, runtime)),
        )

        yield* Effect.sleep(10)
        yield* runtime.dispatch({ _tag: "setValue", payload: "updated" })
        yield* Effect.sleep(10)

        const stateAfterUpdate = yield* runtime.getState
        expect(stateAfterUpdate.value).toBe("updated")
        yield* Fiber.interrupt(fiberUpdate)

        // 2. andThen + update：异步部分留给 update 内部的 Effect，andThen 本身仍保持“纯状态更新”形态
        const fiberAsyncUpdate = yield* Effect.fork(
          api
            .onAction("setValue")
            .andThen(
              (
                prev: Logix.Logix.StateOf<typeof TestModule.shape>,
                action: Logix.Logix.ActionOf<typeof TestModule.shape> & {
                  readonly _tag: "setValue"
                },
              ) => ({
                ...prev,
                value: action.payload + "_async",
              }),
            )
            .pipe(Effect.provideService(TestModule, runtime)),
        )

        yield* Effect.sleep(10)
        yield* runtime.dispatch({ _tag: "setValue", payload: "updated2" })
        yield* Effect.sleep(20)

        const stateAfterAsyncUpdate = yield* runtime.getState
        expect(stateAfterAsyncUpdate.value).toBe("updated2_async")
        yield* Fiber.interrupt(fiberAsyncUpdate)

        // 3. andThen 用于副作用（Effect sink，无参）
        const logs: string[] = []
        const fiberEffect = yield* Effect.fork(
          api
            .onAction("inc")
            .andThen((_payload: Logix.Logix.ActionOf<typeof TestModule.shape>) =>
              Logix.Logic.of(
                Effect.sync(() => {
                  logs.push("inc_called")
                }),
              ),
            )
            .pipe(Effect.provideService(TestModule, runtime)),
        )

        yield* Effect.sleep(10)
        yield* runtime.dispatch({ _tag: "inc", payload: undefined })
        yield* Effect.sleep(10)

        expect(logs).toContain("inc_called")
        yield* Fiber.interrupt(fiberEffect)

        // 4. andThen 用于副作用（Effect sink，带 payload）
        const payloadLogs: string[] = []
        const fiberPayloadEffect = yield* Effect.fork(
          api
            .onAction("setValue")
            .andThen(
              (
                action: Logix.Logix.ActionOf<typeof TestModule.shape> & {
                  readonly _tag: "setValue"
                },
              ) =>
                Logix.Logic.of(
                  Effect.sync(() => {
                    payloadLogs.push(action.payload)
                  }),
                ),
            )
            .pipe(Effect.provideService(TestModule, runtime)),
        )

        yield* Effect.sleep(10)
        yield* runtime.dispatch({ _tag: "setValue", payload: "p1" })
        yield* Effect.sleep(10)

        expect(payloadLogs).toContain("p1")
        yield* Fiber.interrupt(fiberPayloadEffect)

        // 5. andThen 直接传入静态 Effect
        const staticLogs: string[] = []
        const staticEffect = Logix.Logic.of(
          Effect.sync(() => {
            staticLogs.push("static")
          }),
        )

        const fiberStaticEffect = yield* Effect.fork(
          api
            .onAction("inc")
            .andThen(staticEffect)
            .pipe(Effect.provideService(TestModule, runtime)),
        )

        yield* Effect.sleep(10)
        yield* runtime.dispatch({ _tag: "inc", payload: undefined })
        yield* Effect.sleep(10)

        expect(staticLogs).toContain("static")
        yield* Fiber.interrupt(fiberStaticEffect)
      }),
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
  })

  it("should handle api.actions proxy", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

      yield* Effect.fork(
        api
          .onAction("setValue")
          .run((a) => api.state.update((s) => ({ ...s, value: a.payload })))
          .pipe(Effect.provideService(TestModule, runtime))
      )

      yield* Effect.sleep(10)
      yield* api.actions.setValue("proxy_dispatch").pipe(
          Effect.provideService(TestModule, runtime)
      )
      yield* Effect.sleep(10)

	      const state = yield* runtime.getState
	      expect(state.value).toBe("proxy_dispatch")
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle api.state.mutate", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof TestModule.shape>,
        Logix.Logix.ActionOf<typeof TestModule.shape>
      >({ count: 0, value: "initial" })
      const api = Logix.BoundApi.make(TestModule.shape, runtime)

      yield* api.state
        .mutate((s) => {
          s.count = 100
          s.value = "mutated"
        })
        .pipe(Effect.provideService(TestModule, runtime))

	      const state = yield* runtime.getState
	      expect(state.count).toBe(100)
	      expect(state.value).toBe("mutated")
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle api.state.mutate with Array state", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const ArrayModule = Logix.Logix.Module("ArrayModule", {
          state: Schema.Array(Schema.Number),
          actions: {}
      })
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof ArrayModule.shape>,
        Logix.Logix.ActionOf<typeof ArrayModule.shape>
      >([1, 2, 3])
      const api = Logix.BoundApi.make(ArrayModule.shape, runtime)

      yield* api.state
        .mutate((s) => {
          s.push(4)
        })
        .pipe(Effect.provideService(ArrayModule, runtime))

	      const state = yield* runtime.getState
	      expect(state).toEqual([1, 2, 3, 4])
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })

  it("should handle api.state.mutate with Primitive state", async () => {
    const program = Effect.scoped(
      Effect.gen(function* (_) {
      const PrimitiveModule = Logix.Logix.Module("PrimitiveModule", {
          state: Schema.Number,
          actions: {}
      })
      const runtime = yield* Logix.ModuleRuntime.make<
        Logix.Logix.StateOf<typeof PrimitiveModule.shape>,
        Logix.Logix.ActionOf<typeof PrimitiveModule.shape>
      >(0)
      const api = Logix.BoundApi.make(PrimitiveModule.shape, runtime)

      yield* api.state.mutate((s) => {
          s = 1
      }).pipe(Effect.provideService(PrimitiveModule, runtime))

	      const state = yield* runtime.getState
	      expect(state).toBe(0)
	    })
    ) as Effect.Effect<void, unknown, never>

    await Effect.runPromise(program)
	  })
})
