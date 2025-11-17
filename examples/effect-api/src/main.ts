import { HttpApiBuilder, HttpMiddleware, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Layer } from 'effect'
import { createServer } from 'node:http'

import { EffectApi } from './app/effect-api.js'
import { DbLive } from './db/db.live.js'
import { HealthLive } from './health/health.http.live.js'
import { TodoLive } from './todo/todo.http.live.js'
import { TodoRepoLive } from './todo/todo.repo.live.js'

const port = Number.parseInt(process.env.PORT ?? '', 10)

const ApiLive = HttpApiBuilder.api(EffectApi).pipe(
  Layer.provide(HealthLive),
  Layer.provide(TodoLive),
  Layer.provide(TodoRepoLive),
  Layer.provide(DbLive),
)

const NodeServerLive = NodeHttpServer.layer(createServer, {
  port: Number.isNaN(port) ? 3000 : port,
}).pipe(HttpServer.withLogAddress)

const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(ApiLive),
  Layer.provide(NodeServerLive),
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
