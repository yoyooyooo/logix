import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Effect, Layer, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { EffectApiBase } from '../app/effect-api.js'
import { DbError } from '../db/db.js'
import { DbLive } from '../db/db.live.js'
import { HealthLive } from '../health/health.http.live.js'
import { TodoLive } from './todo.http.live.js'
import type { Todo } from './todo.model.js'
import { TodoRepo } from './todo.repo.js'

const makeTodoRepoTest = (): Layer.Layer<TodoRepo> => {
  let nextId = 1
  const store = new Map<number, Todo>()

  return Layer.succeed(TodoRepo, {
    create: (input) =>
      Effect.sync(() => {
        const todo: Todo = {
          id: nextId++,
          title: input.title,
          completed: input.completed ?? false,
          createdAt: '1970-01-01T00:00:00.000Z',
        }
        store.set(todo.id, todo)
        return todo
      }),
    get: (id) => Effect.sync(() => Option.fromNullable(store.get(id))),
    list: Effect.sync(() => Array.from(store.values())),
    update: (id, patch) =>
      Effect.sync(() => {
        const prev = store.get(id)
        if (!prev) {
          return Option.none()
        }
        const next: Todo = {
          ...prev,
          title: patch.title ?? prev.title,
          completed: patch.completed ?? prev.completed,
        }
        store.set(id, next)
        return Option.some(next)
      }),
    remove: (id) => Effect.sync(() => store.delete(id)),
  })
}

describe('Todo CRUD', () => {
  it('create/list/get/update/delete', async () => {
    const ApiTestLive = HttpApiBuilder.api(EffectApiBase).pipe(
      Layer.provide(HealthLive),
      Layer.provide(TodoLive),
      Layer.provide(makeTodoRepoTest()),
      Layer.provide(DbLive),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const created = await handler(
        new Request('http://local.test/todos', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: 'a' }),
        }),
      )
      expect(created.status).toBe(201)
      await expect(created.json()).resolves.toEqual({
        id: 1,
        title: 'a',
        completed: false,
        createdAt: '1970-01-01T00:00:00.000Z',
      })

      const list = await handler(new Request('http://local.test/todos'))
      expect(list.status).toBe(200)
      await expect(list.json()).resolves.toEqual([
        { id: 1, title: 'a', completed: false, createdAt: '1970-01-01T00:00:00.000Z' },
      ])

      const get = await handler(new Request('http://local.test/todos/1'))
      expect(get.status).toBe(200)
      await expect(get.json()).resolves.toEqual({
        id: 1,
        title: 'a',
        completed: false,
        createdAt: '1970-01-01T00:00:00.000Z',
      })

      const updated = await handler(
        new Request('http://local.test/todos/1', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        }),
      )
      expect(updated.status).toBe(200)
      await expect(updated.json()).resolves.toEqual({
        id: 1,
        title: 'a',
        completed: true,
        createdAt: '1970-01-01T00:00:00.000Z',
      })

      const deleted = await handler(new Request('http://local.test/todos/1', { method: 'DELETE' }))
      expect(deleted.status).toBe(204)
      await expect(deleted.text()).resolves.toBe('')

      const missing = await handler(new Request('http://local.test/todos/1'))
      expect(missing.status).toBe(404)
      await expect(missing.json()).resolves.toEqual({ _tag: 'NotFoundError', message: 'Todo not found' })
    } finally {
      await dispose()
    }
  })

  it('数据库 disabled 时返回 503 ServiceUnavailableError', async () => {
    const DbDisabled = new DbError({
      reason: 'disabled',
      message: 'DATABASE_URL is not set',
    })

    const TodoRepoDbDisabledTest = Layer.succeed(TodoRepo, {
      create: () => Effect.fail(DbDisabled),
      get: () => Effect.fail(DbDisabled),
      list: Effect.fail(DbDisabled),
      update: () => Effect.fail(DbDisabled),
      remove: () => Effect.fail(DbDisabled),
    })

    const ApiTestLive = HttpApiBuilder.api(EffectApiBase).pipe(
      Layer.provide(HealthLive),
      Layer.provide(TodoLive),
      Layer.provide(TodoRepoDbDisabledTest),
      Layer.provide(DbLive),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const response = await handler(new Request('http://local.test/todos'))
      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({
        _tag: 'ServiceUnavailableError',
        message: 'DATABASE_URL is not set',
      })
    } finally {
      await dispose()
    }
  })

  it('数据库 query 错误时返回 503 ServiceUnavailableError', async () => {
    const DbQuery = new DbError({
      reason: 'query',
      message: 'Postgres query failed',
    })

    const TodoRepoDbQueryTest = Layer.succeed(TodoRepo, {
      create: () => Effect.fail(DbQuery),
      get: () => Effect.fail(DbQuery),
      list: Effect.fail(DbQuery),
      update: () => Effect.fail(DbQuery),
      remove: () => Effect.fail(DbQuery),
    })

    const ApiTestLive = HttpApiBuilder.api(EffectApiBase).pipe(
      Layer.provide(HealthLive),
      Layer.provide(TodoLive),
      Layer.provide(TodoRepoDbQueryTest),
      Layer.provide(DbLive),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const response = await handler(new Request('http://local.test/todos'))
      expect(response.status).toBe(503)
      await expect(response.json()).resolves.toEqual({ _tag: 'ServiceUnavailableError', message: 'Database error' })
    } finally {
      await dispose()
    }
  })
})
