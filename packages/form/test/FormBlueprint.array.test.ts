import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "@logix/core"
import { Form } from "../src/index.js"

describe("FormBlueprint.array", () => {
  it.scoped("append/prepend/remove/swap/move keep errors/ui aligned", () =>
    Effect.gen(function* () {
      const ValuesSchema = Schema.Struct({
        items: Schema.Array(Schema.String),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const blueprint = Form.make("FormBlueprintArray", {
        values: ValuesSchema,
        initialValues: {
          items: ["a", "b", "c"],
        } satisfies Values,
      })

      const runtime = Logix.Runtime.make(blueprint.impl, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* blueprint.module
        const controller = blueprint.controller.make(rt)

        yield* controller.field("errors.items").set(["e0", undefined, "e2"])
        yield* controller.field("ui.items").set(["u0", "u1", "u2"])

        yield* controller.array("items").append("d")
        yield* controller.array("items").prepend("z")
        yield* controller.array("items").remove(2)
        yield* controller.array("items").swap(1, 2)
        yield* controller.array("items").move(1, 3)

        type Meta = { readonly items: ReadonlyArray<string | undefined> }
        type State = Values & { readonly errors: Meta; readonly ui: Meta }

        const state = (yield* controller.getState) as State
        expect(state.items).toEqual(["z", "a", "d", "c"])
        expect(state.errors.items).toEqual([undefined, "e0", undefined, "e2"])
        expect(state.ui.items).toEqual([undefined, "u0", undefined, "u2"])
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }),
  )
})
