import './env/load-env.js'

import { HttpRouter, HttpServer } from 'effect/unstable/http'
import { HttpApiBuilder } from 'effect/unstable/httpapi'
import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { createServer } from 'node:http'

import { EffectApi } from './app/effect-api.js'
import { AuthEventRepoLive } from './auth/auth-event.repo.live.js'
import { AuthLive } from './auth/auth.http.live.js'
import { AuthRateLimitLive } from './auth/auth.rate-limit.js'
import { AuthServiceLive } from './auth/auth.service.live.js'
import { AuthEventTableLive } from './auth/auth-event.table.live.js'
import { seedAdminIfEnabled } from './auth/seed-admin.js'
import { DbLive } from './db/db.live.js'
import { HealthLive } from './health/health.http.live.js'
import { ProjectAuditRepoLive } from './project/project-audit.repo.live.js'
import { ProjectLive } from './project/project.http.live.js'
import { ProjectRepoLive } from './project/project.repo.live.js'
import { ProjectSchemaLive } from './project/project.schema.live.js'
import { TodoLive } from './todo/todo.http.live.js'
import { TodoRepoLive } from './todo/todo.repo.live.js'
import { TodoTableLive } from './todo/todo.table.live.js'
import { UserLive } from './user/user.http.live.js'

const port = Number.parseInt(process.env.PORT ?? '', 10)

const ApiLive = HttpApiBuilder.layer(EffectApi).pipe(
  Layer.provide(HealthLive),
  Layer.provide(TodoLive),
  Layer.provide(TodoRepoLive.pipe(Layer.provide(TodoTableLive))),
  Layer.provide(UserLive),
  Layer.provide(AuthLive),
  Layer.provide(AuthEventRepoLive.pipe(Layer.provide(AuthEventTableLive))),
  Layer.provide(AuthRateLimitLive),
  Layer.provide(ProjectLive),
  Layer.provide(ProjectRepoLive),
  Layer.provide(ProjectAuditRepoLive),
  Layer.provide(ProjectSchemaLive),
  Layer.provide(AuthServiceLive),
  Layer.provide(DbLive),
)

const NodeServerLive = NodeHttpServer.layer(createServer, {
  port: Number.isNaN(port) ? 5500 : port,
}).pipe(HttpServer.withLogAddress)

const ServerLive = HttpRouter.serve(ApiLive, { disableListenLog: true }).pipe(Layer.provideMerge(NodeServerLive))

seedAdminIfEnabled.pipe(Effect.orDie, Effect.andThen(Layer.launch(ServerLive))).pipe(NodeRuntime.runMain)
