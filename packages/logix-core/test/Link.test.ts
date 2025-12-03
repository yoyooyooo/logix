import { describe, it, expect } from "vitest"
import { Effect, Layer, Schema, Context, Stream } from "effect"
import * as Logix from "../src/api/Logix.js"
import * as Logic from "../src/api/Logic.js"
import * as Root from "../src/index.js"

describe("Logic.Link", () => {
  it("should coordinate actions between modules", async () => {
    // 1. Define Source Module (Counter)
    const Source = Logix.Module("Source", {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { increment: Schema.Void },
    })

    const sourceLogic = Source.logic((api) =>
      api.onAction.increment.run(() =>
        Logic.secure(
          Effect.log("Source logic running increment").pipe(
            Effect.zipRight(api.state.update((s) => ({ ...s, count: s.count + 1 })))
          ),
          { name: "increment" }
        )
      )
    )

    // 2. Define Target Module (Logger)
    const Target = Logix.Module("Target", {
      state: Schema.Struct({ logs: Schema.Array(Schema.String) }),
      actions: { log: Schema.String },
    })

    const targetLogic = Target.logic((api) =>
      api.onAction.log.run((action) =>
        Logic.secure(
          api.state.update((s) => ({ ...s, logs: [...s.logs, action.payload] })),
          { name: "log" }
        )
      )
    )

    // 3. Define Link Logic
    const linkLogic = Root.Link.make(
      {
        modules: [Source, Target] as const,
      },
      ($) =>
        Effect.gen(function* (_) {
          const source = $[Source.id]
          const target = $[Target.id]

          yield* source.actions$.pipe(
            Stream.runForEach((action: any) => {
              if (action._tag === "increment") {
                return target.actions.log("Source incremented")
              }
              return Effect.void
            }),
          )
        }),
    )

    // 4. Compose App
    // 4. Compose Root ModuleImpl + Runtime（将 Link 作为 Root 进程）
    const RootModule = Logix.Module("LinkRoot", {
      state: Schema.Void,
      actions: {},
    })

    const RootImpl = RootModule.make({
      initial: undefined,
      imports: [
        Source.make({
          initial: { count: 0 },
          logics: [sourceLogic],
        }),
        Target.make({
          initial: { logs: [] },
          logics: [targetLogic],
        }),
      ],
      processes: [linkLogic],
    })

    const runtime = Root.LogixRuntime.make(RootImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    // 5. Run Test
    const program = Effect.gen(function* (_) {
       const source = yield* Source
       const target = yield* Target

       // Initial state
       expect(yield* source.getState).toEqual({ count: 0 })
       expect(yield* target.getState).toEqual({ logs: [] })

       // Wait for logic subscriptions to activate
       yield* Effect.sleep(100)

       // Dispatch to Source
       yield* source.dispatch({ _tag: "increment", payload: undefined })

       // Wait for async propagation
       yield* Effect.sleep(500)

       const s = yield* source.getState

       // Check Source
       expect(s).toEqual({ count: 1 })

       // Check Target (Link should have triggered log)
       const t = yield* target.getState
       console.log("Target state:", t)
       expect(t).toEqual({ logs: ["Source incremented"] })
    })

    await runtime.runPromise(
      program as Effect.Effect<void, never, any>
    )
  })

  it("should handle burst of actions through Link without losing events", async () => {
    const Source = Logix.Module("BurstSource", {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { increment: Schema.Void },
    })

    const sourceLogic = Source.logic((api) =>
      api.onAction.increment.run(() =>
        Logic.secure(
          api.state.update((s) => ({ ...s, count: s.count + 1 })),
          { name: "increment" },
        ),
      ),
    )

    const Target = Logix.Module("BurstTarget", {
      state: Schema.Struct({ logs: Schema.Array(Schema.String) }),
      actions: { log: Schema.String },
    })

    const targetLogic = Target.logic((api) =>
      api.onAction.log.run((action) =>
        Logic.secure(
          api.state.update((s) => ({
            ...s,
            logs: [...s.logs, action.payload],
          })),
          { name: "log" },
        ),
      ),
    )

    const linkLogic = Root.Link.make(
      {
        modules: [Source, Target] as const,
      },
      ($) =>
        Effect.gen(function* () {
          const source = $[Source.id]
          const target = $[Target.id]

          yield* source.actions$.pipe(
            Stream.runForEach((action: any) => {
              if (action._tag === "increment") {
                return target.actions.log("Source incremented")
              }
              return Effect.void
            }),
          )
        }),
    )

    const RootModule = Logix.Module("LinkRootBurst", {
      state: Schema.Void,
      actions: {},
    })

    const RootImpl = RootModule.make({
      initial: undefined,
      imports: [
        Source.make({
          initial: { count: 0 },
          logics: [sourceLogic],
        }),
        Target.make({
          initial: { logs: [] },
          logics: [targetLogic],
        }),
      ],
      processes: [linkLogic],
    })

    const runtime = Root.LogixRuntime.make(RootImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const program = Effect.gen(function* () {
      const source = yield* Source
      const target = yield* Target

      // Wait for logic subscriptions to activate
      yield* Effect.sleep(50)

      const N = 100

      for (let i = 0; i < N; i++) {
        yield* source.dispatch({ _tag: "increment", payload: undefined })
      }

      // Wait for async propagation
      yield* Effect.sleep(300)

      const s = yield* source.getState
      const t = yield* target.getState

      expect(s).toEqual({ count: N })
      expect(t.logs.length).toBe(N)
    })

    await runtime.runPromise(
      program as Effect.Effect<void, never, any>
    )
  })
})
