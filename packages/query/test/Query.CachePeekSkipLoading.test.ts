import { describe } from "vitest"
import { it, expect } from "@effect/vitest"
import { Duration, Effect, Layer, Schema } from "effect"
import { QueryClient } from "@tanstack/query-core"
import * as Logix from "@logix/core"
import { Query } from "../src/index.js"

describe("Query.CachePeekSkipLoading", () => {
  it.scoped("should hydrate from fresh cache and skip loading on key change", () =>
    Effect.gen(function* () {
      const KeySchema = Schema.Struct({ q: Schema.String })

      let loadCalls = 0
      const spec = Logix.Resource.make({
        id: "demo/query-cache-peek-skip-loading",
        keySchema: KeySchema,
        load: (key: { readonly q: string }) =>
          Effect.sync(() => {
            loadCalls += 1
            return { q: key.q }
          }).pipe(Effect.delay(Duration.millis(10))),
      })

      const ParamsSchema = Schema.Struct({ q: Schema.String })

      const blueprint = Query.make("QueryCachePeekSkipLoadingBlueprint", {
        params: ParamsSchema,
        initialParams: { q: "a" },
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

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 3600_000,
          },
        },
      })

      const debugEvents: Logix.Debug.Event[] = []
      const debugLayer = Logix.Debug.replace([
        {
          record: (event: Logix.Debug.Event) =>
            Effect.sync(() => {
              debugEvents.push(event)
            }),
        },
      ]) as Layer.Layer<any, never, never>

      const runtime = Logix.Runtime.make(blueprint.impl, {
        layer: Layer.mergeAll(
          Logix.Resource.layer([spec]),
          Query.layer(queryClient),
          debugLayer,
        ),
        middleware: [Query.TanStack.middleware()],
      })

      const program = Effect.gen(function* () {
        const rt = yield* blueprint.module
        const controller = blueprint.controller.make(rt)

        // onMount: q=a
        yield* Effect.sleep(Duration.millis(30))
        expect((yield* controller.getState as any).search.status).toBe("success")

        // change to q=b (will load once)
        yield* controller.setParams({ q: "b" } as any)
        yield* Effect.sleep(Duration.millis(30))
        expect((yield* controller.getState as any).search.data).toEqual({ q: "b" })

        // clear event window, then go back to q=a (should hydrate from cache without loading)
        const eventStartIndex = debugEvents.length
        yield* controller.setParams({ q: "a" } as any)
        yield* Effect.sleep(Duration.millis(5))

        const stateA = (yield* controller.getState as any).search
        expect(stateA.status).toBe("success")
        expect(stateA.data).toEqual({ q: "a" })

        // no loading snapshot commit in this window
        const refs = debugEvents
          .slice(eventStartIndex)
          .map((event) => Logix.Debug.internal.toRuntimeDebugEventRef(event))
          .filter((ref): ref is Logix.Debug.RuntimeDebugEventRef => ref != null && ref.kind === "state")

        expect(
          refs.some((ref) => {
            const meta: any = ref.meta
            const search = meta?.state?.search
            return search?.status === "loading"
          }),
        ).toBe(false)

        // only a & b were loaded once each
        expect(loadCalls).toBe(2)
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
