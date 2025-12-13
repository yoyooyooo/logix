import { describe, it, expect } from "@effect/vitest"
import { Cause, Chunk, Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"
import * as EffectOp from "../src/effectop.js"
import * as EffectOpCore from "../src/internal/runtime/EffectOpCore.js"

describe("Runtime + EffectOp bus semantics", () => {
  const State = Schema.Struct({ value: Schema.Number })
  const Actions = { bump: Schema.Void }

  const M = Logix.Module.make("OpSemantics", {
    state: State,
    actions: Actions,
  })

  it.scoped("should attach linkId and keep it consistent across a dispatch chain", () =>
    Effect.gen(function* () {
      const events: Array<EffectOp.EffectOp<any, any, any>> = []

      const capture: EffectOp.Middleware = (op) =>
        Effect.sync(() => {
          events.push(op)
        }).pipe(Effect.zipRight(op.effect))

      const impl = M.implement({
        initial: { value: 0 },
        logics: [],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        middleware: [capture],
      })

      const program = Effect.gen(function* () {
        const rt = yield* M

        yield* rt.dispatch({ _tag: "bump", payload: undefined } as any)

        const actionOps = events.filter((e) => e.kind === "action")
        const stateOps = events.filter((e) => e.kind === "state")

        expect(actionOps.length).toBeGreaterThan(0)
        expect(stateOps.length).toBeGreaterThan(0)

        const action = actionOps.find((e) => e.name === "action:dispatch")!
        const stateUpdate = stateOps.find((e) => e.name === "state:update")!

        expect(action.meta?.linkId).toBeDefined()
        expect(stateUpdate.meta?.linkId).toBeDefined()
        expect(stateUpdate.meta?.linkId).toBe(action.meta?.linkId)
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }),
  )

  it.scoped("guard rejection should be an explicit failure and have no side effects", () =>
    Effect.gen(function* () {
      const guard: EffectOp.Middleware = (op) => {
        if (op.name === "action:dispatch") {
          return Effect.fail(
            EffectOpCore.makeOperationRejected({
              message: "blocked by test guard",
              kind: op.kind,
              name: op.name,
              linkId: op.meta?.linkId,
            }),
          )
        }
        return op.effect
      }

      const impl = M.implement({
        initial: { value: 0 },
        logics: [],
      })

      const runtime = Logix.Runtime.make(impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
        middleware: [guard],
      })

      const program = Effect.gen(function* () {
        const rt = yield* M

        const exit = yield* Effect.exit(
          rt.dispatch({ _tag: "bump", payload: undefined } as any),
        )

        expect(exit._tag).toBe("Failure")

        if (exit._tag !== "Failure") {
          throw new Error("expected Failure")
        }

        const failures = Cause.failures(exit.cause as Cause.Cause<unknown>)
        expect(
          Chunk.some(failures, (d) => (d as any)?._tag === "OperationRejected"),
        ).toBe(true)

        // no side effects
        const state = yield* rt.getState
        expect(state.value).toBe(0)
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }),
  )
})
