import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Duration, Effect, Layer, Schema } from "effect"
import { QueryClient } from "@tanstack/query-core"
import * as Logix from "@logix/core"
import { Query } from "../src/index.js"
import * as ReplayLog from "../../logix-core/src/internal/runtime/core/ReplayLog.js"

describe("Query.Invalidate", () => {
  it.scoped("should record invalidate event and refetch afterwards", () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })
      type Key = Schema.Schema.Type<typeof KeySchema>

      let version = 0

      const spec = Logix.Resource.make<Key, { readonly q: string; readonly v: number }, never, never>({
        id: "demo/query-invalidate",
        keySchema: KeySchema,
        load: (key) =>
          Effect.sync(() => {
            version += 1
            return { q: key.q, v: version }
          }).pipe(Effect.delay(Duration.millis(10))),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const blueprint = Query.make("QueryInvalidateBlueprint", {
        params: ParamsSchema,
        initialParams: { q: "x" },
        queries: {
          search: {
            resource: spec,
            deps: ["params.q"],
            triggers: ["onMount"],
            concurrency: "switch",
            key: (params: { readonly q: string }) => ({ q: params.q }),
          },
        },
      })

      const runtime = Logix.Runtime.make(blueprint.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([spec]),
          Query.layer(new QueryClient()),
          ReplayLog.layer(),
        ),
        middleware: [Query.TanStack.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* blueprint.module
        const controller = blueprint.controller.make(rt)

        // onMount 首次加载
        yield* Effect.sleep(Duration.millis(30))
        const s1 = yield* controller.getState
        expect(s1.search.status).toBe("success")
        const v1 = s1.search.data?.v as number
        expect(v1).toBe(1)

        // 失效：应进入 ReplayLog，并触发后续刷新拿到新版本
        yield* controller.invalidate({
          kind: "byResource",
          resourceId: spec.id,
        })

        // 失效后应先清空模块内的服务端快照（进入 loading 且 data/error 为 undefined）
        yield* Effect.sleep(Duration.millis(2))
        const sLoading = yield* controller.getState
        expect(sLoading.search.status).toBe("loading")
        expect(sLoading.search.data).toBeUndefined()
        expect(sLoading.search.error).toBeUndefined()

        yield* Effect.sleep(Duration.millis(60))
        const s2 = yield* controller.getState
        expect(s2.search.status).toBe("success")
        const v2 = s2.search.data?.v as number
        expect(v2).toBe(2)

        const events = yield* ReplayLog.snapshot
        const invalidateEvents = events.filter((e) => e._tag === "InvalidateRequest")
        expect(invalidateEvents.length).toBeGreaterThan(0)
        expect((invalidateEvents[0] as any).meta).toEqual({
          kind: "byResource",
          resourceId: spec.id,
        })
      })

      yield* Effect.promise(() =>
        runtime.runPromise(program as Effect.Effect<void, never, any>),
      )
    }),
  )
})
