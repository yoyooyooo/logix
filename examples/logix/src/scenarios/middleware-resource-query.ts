/**
 * @scenario EffectOp Middleware · Resource + Query 集成
 *
 * 演示 `Query.Engine.middleware` 如何在 EffectOp(kind="trait-source") 上“接管执行”：
 * - 未启用 middleware：EffectOp 直接执行 `op.effect`（例如 ResourceSpec.load）；
 * - 启用 middleware + 提供 `Query.Engine`：外部引擎（默认推荐 TanStack）可接管缓存/去重等语义；
 * - 启用 middleware 但缺少 `Query.Engine` 注入：显式失败（配置错误，便于诊断）。
 *
 * 本示例刻意保持在「EffectOp + Middleware + Layer」层面，
 * 不依赖 ModuleRuntime 或 StateTrait，方便理解数据流。
 */

import { Effect, Layer, Schema } from 'effect'
import { QueryClient } from '@tanstack/query-core'
import { fileURLToPath } from 'node:url'
import * as Logix from '@logix/core'
import * as EffectOp from '@logix/core/EffectOp'
import * as Query from '@logix/query'

const KeySchema = Schema.Struct({
  id: Schema.String,
})

type Key = Schema.Schema.Type<typeof KeySchema>

export const main = Effect.gen(function* () {
  // -------------------------------------------------------------------------
  // 1. 定义 ResourceSpec：demo/query-resource（本例直接把 spec.load(key) 作为 op.effect）
  // -------------------------------------------------------------------------

  const resourceCalls: Array<Key> = []

  const spec = Logix.Resource.make<Key, string, never, never>({
    id: 'demo/query-resource',
    keySchema: KeySchema,
    load: (key) =>
      Effect.succeed(`resource:${key.id}`).pipe(Effect.tap(() => Effect.sync(() => resourceCalls.push(key)))),
  })

  // -------------------------------------------------------------------------
  // 2. 构造 trait-source EffectOp（middleware 只对 resourceId+keyHash 生效）
  // -------------------------------------------------------------------------

  const key: Key = { id: 'u1' }
  const keyHash = Logix.Resource.keyHash(key)

  const op = EffectOp.make<string, never, never>({
    kind: 'trait-source',
    name: 'demo/query-resource',
    effect: spec.load(key),
    meta: {
      resourceId: spec.id,
      keyHash,
      key,
    },
  })

  // -------------------------------------------------------------------------
  // 3. Case A：未启用 middleware（直接执行 op.effect）
  // -------------------------------------------------------------------------

  const programA = EffectOp.run(op, [])

  const resultA = yield* Effect.scoped(programA)

  // eslint-disable-next-line no-console
  console.log('Case A · result =', resultA)
  // eslint-disable-next-line no-console
  console.log('Case A · resourceCalls =', resourceCalls)

  // -------------------------------------------------------------------------
  // 4. Case B：启用 middleware + TanStack engine（缓存/去重由引擎接管）
  // -------------------------------------------------------------------------

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 3600_000 } },
  })
  const engine = Query.TanStack.engine(queryClient)

  const stackB: EffectOp.MiddlewareStack = [Query.Engine.middleware()]
  const programB = EffectOp.run(op, stackB).pipe(
    Effect.provide(Query.Engine.layer(engine) as Layer.Layer<any, never, never>),
  )

  const resultB1 = yield* Effect.scoped(programB)
  const resultB2 = yield* Effect.scoped(programB)

  // eslint-disable-next-line no-console
  console.log('Case B · result 1 =', resultB1)
  // eslint-disable-next-line no-console
  console.log('Case B · result 2 =', resultB2)
  // eslint-disable-next-line no-console
  console.log('Case B · resourceCalls (应为 1 次) =', resourceCalls)
})

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void Effect.runPromise(main)
}
