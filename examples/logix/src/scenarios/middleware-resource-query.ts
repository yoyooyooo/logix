/**
 * @scenario EffectOp Middleware · Resource + Query 集成
 *
 * 演示 Resource 和 Query 中间件如何在 EffectOp(kind="service") 上协作：
 * 1. 未配置 QueryClient 时，Query.middleware 直接调用 ResourceSpec.load；
 * 2. 配置 QueryClient + useQueryClientFor 时，由 QueryClient 接管调用。
 *
 * 本示例刻意保持在「EffectOp + Middleware + Layer」层面，
 * 不依赖 ModuleRuntime 或 StateTrait，方便理解数据流。
 */

import { Effect, Layer, Schema } from "effect"
import { fileURLToPath } from "node:url"
import * as Logix from "@logix/core"
import * as EffectOp from "@logix/core/effectop"
import { Query, type QueryClientEnv } from "@logix/core/middleware/query"
import type { ResourceRegistry } from "@logix/core/Resource"

const KeySchema = Schema.Struct({
  id: Schema.String,
})

type Key = Schema.Schema.Type<typeof KeySchema>

export const main = Effect.gen(function* () {
  // -------------------------------------------------------------------------
  // 1. 定义 ResourceSpec：demo/query-resource
  // -------------------------------------------------------------------------

  const resourceCalls: Array<Key> = []

  const spec = Logix.Resource.make<Key, string, never, never>({
    id: "demo/query-resource",
    keySchema: KeySchema,
    load: (key) =>
      Effect.succeed(`resource:${key.id}`).pipe(
        Effect.tap(() => Effect.sync(() => resourceCalls.push(key))),
      ),
  })

  // -------------------------------------------------------------------------
  // 2. Case A：未配置 QueryClient，仅使用 ResourceSpec.load
  // -------------------------------------------------------------------------

  const serviceOp = EffectOp.make<string, never, never>({
    kind: "service",
    name: "demo/query-resource",
    effect: Effect.succeed("original"),
    meta: {
      resourceId: "demo/query-resource",
      key: { id: "u1" } satisfies Key,
    },
  })

  const stackA: EffectOp.MiddlewareStack = [Query.middleware()]

  const programA = EffectOp.run(serviceOp, stackA).pipe(
    Effect.provide(
      Logix.Resource.layer([spec]) as Layer.Layer<
        never,
        never,
        ResourceRegistry
      >,
    ),
  ) as Effect.Effect<string, never, never>

  const resultA = yield* Effect.scoped(programA)

  // eslint-disable-next-line no-console
  console.log("Case A · result =", resultA)
  // eslint-disable-next-line no-console
  console.log("Case A · resourceCalls =", resourceCalls)

  // -------------------------------------------------------------------------
  // 3. Case B：配置 QueryClient，部分 resourceId 走 QueryClient
  // -------------------------------------------------------------------------

  const clientCalls: Array<{ resourceId: string; key: Key }> = []

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

  const stackB: EffectOp.MiddlewareStack = [
    Query.middleware({
      useQueryClientFor: (id) => id === "demo/query-resource",
    }),
  ]

  const programB = EffectOp.run(serviceOp, stackB).pipe(
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

  const resultB = yield* Effect.scoped(programB)

  // eslint-disable-next-line no-console
  console.log("Case B · result =", resultB)
  // eslint-disable-next-line no-console
  console.log("Case B · clientCalls =", clientCalls)
  // eslint-disable-next-line no-console
  console.log("Case B · resourceCalls (应该保持不变) =", resourceCalls)
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void Effect.runPromise(main)
}

