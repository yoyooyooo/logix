import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Effect, Layer, Option } from 'effect'
import { afterEach, describe, expect, it } from 'vitest'

import { EffectApi } from '../app/effect-api.js'
import { DbLive } from '../db/db.live.js'
import { TodoRepo } from '../todo/todo.repo.js'
import { TodoLive } from '../todo/todo.http.live.js'
import { HealthLive } from './health.http.live.js'

const TodoRepoTest = Layer.succeed(TodoRepo, {
  create: () => Effect.dieMessage('TodoRepo not used in health tests'),
  get: () => Effect.succeed(Option.none()),
  list: Effect.succeed([]),
  update: () => Effect.succeed(Option.none()),
  remove: () => Effect.succeed(false),
})

const ApiTestLive = HttpApiBuilder.api(EffectApi).pipe(
  Layer.provide(HealthLive),
  Layer.provide(TodoLive),
  Layer.provide(TodoRepoTest),
  Layer.provide(DbLive),
)

describe('GET /health', () => {
  const prevDatabaseUrl = process.env.DATABASE_URL

  afterEach(() => {
    if (prevDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = prevDatabaseUrl
    }
  })

  it('DATABASE_URL 未设置时返回 disabled', async () => {
    delete process.env.DATABASE_URL

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const response = await handler(new Request('http://local.test/health'))
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ ok: true, db: 'disabled' })
    } finally {
      await dispose()
    }
  })

  it('动态 path 参数会按 Schema 解码并推导类型', async () => {
    delete process.env.DATABASE_URL

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const response = await handler(new Request('http://local.test/health/42'))
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ ok: true, db: 'disabled', probe: 42 })
    } finally {
      await dispose()
    }
  })
})
