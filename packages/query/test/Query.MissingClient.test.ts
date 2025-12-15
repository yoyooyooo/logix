import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Duration, Effect, Layer, Schema } from "effect"
import * as Logix from "@logix/core"
import { Query } from "../src/index.js"

describe("Query.MissingClient", () => {
  it.scoped("should treat missing QueryClientTag as a configuration error", () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      const spec = Logix.Resource.make<Key, { readonly q: string }, never, never>({
        id: "demo/query-missing-client",
        keySchema: KeySchema,
        load: (key) => Effect.succeed({ q: key.q }),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const blueprint = Query.make("QueryMissingClientBlueprint", {
        params: ParamsSchema,
        initialParams: { q: "x" },
        queries: {
          search: {
            resource: { id: spec.id },
            deps: ["params.q"],
            triggers: ["onMount"],
            concurrency: "switch",
            key: (params: { readonly q: string }) => ({ q: params.q }),
          },
        },
      })

      const runtime = Logix.Runtime.make(blueprint.impl, {
        layer: Logix.Resource.layer([spec]) as Layer.Layer<any, never, never>,
        middleware: [Query.TanStack.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* blueprint.module
        const controller = blueprint.controller.make(rt)

        yield* Effect.sleep(Duration.millis(30))

        const state = yield* controller.getState
        const snapshot = (state as any).search

        expect(snapshot.status).toBe("error")
        expect(snapshot.error).toBeDefined()
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }),
  )
})

