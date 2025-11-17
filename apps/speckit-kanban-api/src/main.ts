import { HttpApiBuilder, HttpMiddleware, HttpServer } from '@effect/platform'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Layer } from 'effect'
import { createServer } from 'node:http'

import { EffectApi } from './app/effect-api.js'
import { HealthLive } from './health/health.http.live.js'
import { SpecboardLive } from './specboard/specboard.http.live.js'
import { SpecboardServiceLive } from './specboard/specboard.service.live.js'

const port = Number.parseInt(process.env.PORT ?? '', 10)
const host = process.env.HOST ?? '127.0.0.1'

const ApiLive = HttpApiBuilder.api(EffectApi).pipe(
  Layer.provide(HealthLive),
  Layer.provide(SpecboardLive),
  Layer.provide(SpecboardServiceLive),
)

const NodeServerLive = NodeHttpServer.layer(createServer, {
  port: Number.isNaN(port) ? 5510 : port,
  host,
}).pipe(HttpServer.withLogAddress)

const ServerLive = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(ApiLive),
  Layer.provide(NodeServerLive),
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
