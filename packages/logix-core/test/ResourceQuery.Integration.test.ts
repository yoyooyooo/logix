import { describe, it, expect } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import * as Logix from "../src/index.js"
import { Query, type QueryClientEnv } from "../src/middleware/query.js"
import type { ResourceRegistry } from "../src/Resource.js"
import * as EffectOp from "../src/effectop.js"

describe("Resource + Query integration (EffectOp middleware)", () => {
  const KeySchema = Schema.Struct({
    id: Schema.String,
  })

  type Key = Schema.Schema.Type<typeof KeySchema>

  it("should call ResourceSpec.load directly when QueryClient is not provided", async () => {
    const calls: Array<Key> = []

    const spec = Logix.Resource.make<Key, string, never, never>({
      id: "demo/resource",
      keySchema: KeySchema,
      load: (key) =>
        Effect.succeed(`resource:${key.id}`).pipe(
          Effect.tap(() => Effect.sync(() => calls.push(key))),
        ),
    })

    const serviceOp = EffectOp.make<string, never, never>({
      kind: "service",
      name: "demo/resource",
      effect: Effect.succeed("original"),
      meta: {
        resourceId: "demo/resource",
        key: { id: "u1" } satisfies Key,
      },
    })

    const stack: EffectOp.MiddlewareStack = [Query.middleware()]

    const program = EffectOp.run(serviceOp, stack).pipe(
      Effect.provide(
        Logix.Resource.layer([spec]) as Layer.Layer<
          never,
          never,
          ResourceRegistry
        >,
      ),
    ) as Effect.Effect<string, never, never>

    const result = await Effect.runPromise(Effect.scoped(program))

    expect(result).toBe("resource:u1")
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ id: "u1" })
  })

  it("should use QueryClient when configured for the given resourceId", async () => {
    const resourceCalls: Array<Key> = []
    const clientCalls: Array<{ resourceId: string; key: Key }> = []

    const spec = Logix.Resource.make<Key, string, never, never>({
      id: "demo/query-resource",
      keySchema: KeySchema,
      load: (key) =>
        Effect.succeed(`resource:${key.id}`).pipe(
          Effect.tap(() => Effect.sync(() => resourceCalls.push(key))),
        ),
    })

    // QueryClient 约定：client(resourceId, key, load)
    const queryClient = (
      resourceId: string,
      key: Key,
      _load: (key: Key) => Effect.Effect<string, never, never>,
    ): Effect.Effect<string, never, never> =>
      Effect.succeed(`client:${resourceId}:${key.id}`).pipe(
        Effect.tap(() =>
          Effect.sync(() => {
            clientCalls.push({ resourceId, key })
          }),
        ),
      )

    const serviceOp = EffectOp.make<string, never, never>({
      kind: "service",
      name: "demo/query-resource",
      effect: Effect.succeed("original"),
      meta: {
        resourceId: "demo/query-resource",
        key: { id: "u2" } satisfies Key,
      },
    })

    const stack: EffectOp.MiddlewareStack = [
      Query.middleware({
        useQueryClientFor: (id) => id === "demo/query-resource",
      }),
    ]

    const program = EffectOp.run(serviceOp, stack).pipe(
      Effect.provide(
        Layer.mergeAll(
          Logix.Resource.layer([spec]) as Layer.Layer<
            never,
            never,
            ResourceRegistry
          >,
          Query.layer(queryClient) as Layer.Layer<
            never,
            never,
            QueryClientEnv<typeof queryClient>
          >,
        ),
      ),
    ) as Effect.Effect<string, never, never>

    const result = await Effect.runPromise(Effect.scoped(program))

    expect(result).toBe("client:demo/query-resource:u2")
    expect(clientCalls).toHaveLength(1)
    expect(clientCalls[0]).toEqual({
      resourceId: "demo/query-resource",
      key: { id: "u2" },
    })
    // 当使用 QueryClient 时，ResourceSpec.load 不应被调用。
    expect(resourceCalls).toHaveLength(0)
  })
})
