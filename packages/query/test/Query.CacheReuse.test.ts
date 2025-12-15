import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Duration, Effect, Layer, Schema } from "effect"
import { QueryClient } from "@tanstack/query-core"
import * as Logix from "@logix/core"
import { Query } from "../src/index.js"

describe("Query.CacheReuse", () => {
  it.scoped("should reuse same keyHash and avoid redundant loading", () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      let loadCalls = 0

      const spec = Logix.Resource.make<Key, { readonly q: string }, never, never>({
        id: "demo/query-cache-reuse",
        keySchema: KeySchema,
        load: (key) =>
          Effect.sync(() => {
            loadCalls += 1
            return { q: key.q }
          }).pipe(
            // 模拟一次异步边界，让 loading 可观测。
            Effect.delay(Duration.millis(10)),
          ),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const blueprint = Query.make("QueryCacheReuseBlueprint", {
        params: ParamsSchema,
        initialParams: { q: "same" },
        queries: {
          search: {
            resource: { id: spec.id },
            deps: ["params.q"],
            triggers: ["onMount", "onValueChange"],
            concurrency: "switch",
            key: (params: { readonly q: string }) => ({ q: params.q }),
          },
        },
      })

      const runtime = Logix.Runtime.make(blueprint.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([spec]),
          Query.layer(new QueryClient()),
        ),
        middleware: [Query.TanStack.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* blueprint.module
        const controller = blueprint.controller.make(rt)

        // onMount 触发一次加载
        yield* Effect.sleep(Duration.millis(30))

        // 重复写入“值等价但引用不同”的 params：不应重复触发 refresh。
        yield* Effect.forEach(
          Array.from({ length: 10 }, () => ({ q: "same" })),
          (p) => controller.setParams(p as any),
        )

        yield* Effect.sleep(Duration.millis(30))

        const state = yield* controller.getState
        const snapshot = (state as any).search

        expect(snapshot.status).toBe("success")
        expect(snapshot.data).toEqual({ q: "same" })
        expect(loadCalls).toBe(1)
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }),
  )
})

