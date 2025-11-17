import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Layer } from 'effect'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { EffectApiBase } from '../app/effect-api.js'
import { DbLive } from '../db/db.live.js'
import { HealthLive } from '../health/health.http.live.js'
import { TodoLive } from './todo.http.live.js'
import { TodoRepoLive } from './todo.repo.live.js'
import { TodoTableLive } from './todo.table.live.js'

const databaseUrl = process.env.DATABASE_URL
const describePg = databaseUrl ? describe : describe.skip
const keepSchema = process.env.LOGIX_PG_TEST_KEEP_SCHEMA === '1' || process.env.LOGIX_PG_TEST_KEEP_SCHEMA === 'true'

const quoteIdent = (ident: string): string => `"${ident.replaceAll('"', '""')}"`

const withSearchPath = (url: string, schema: string): string => {
  const u = new URL(url)
  u.searchParams.set('options', `-csearch_path=${schema}`)
  return u.toString()
}

describePg('Todo CRUD（PostgreSQL 集成）', () => {
  if (!databaseUrl) return

  const schema = `vitest_todos_${process.pid}_${Date.now()}`
  let adminPool: Pool
  const prevDatabaseUrl = process.env.DATABASE_URL

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: databaseUrl, max: 1 })
    await adminPool.query(`create schema ${quoteIdent(schema)}`)
    process.env.DATABASE_URL = withSearchPath(databaseUrl, schema)

    if (keepSchema) {
      // eslint-disable-next-line no-console
      console.log(`[todo.pg.integration] keeping schema: ${schema}`)
    }
  })

  afterAll(async () => {
    if (adminPool) {
      if (!keepSchema) {
        await adminPool.query(`drop schema if exists ${quoteIdent(schema)} cascade`)
      }
      await adminPool.end()
    }

    if (prevDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = prevDatabaseUrl
    }
  })

  it('create/list/get/update/delete', async () => {
    const ApiLive = HttpApiBuilder.api(EffectApiBase).pipe(
      Layer.provide(HealthLive),
      Layer.provide(TodoLive),
      Layer.provide(TodoRepoLive.pipe(Layer.provide(TodoTableLive))),
      Layer.provide(DbLive),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiLive, HttpServer.layerContext))

    try {
      const created = await handler(
        new Request('http://local.test/todos', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: 'hello' }),
        }),
      )
      expect(created.status).toBe(201)
      const createdJson = (await created.json()) as any
      expect(typeof createdJson.id).toBe('number')
      expect(createdJson.title).toBe('hello')
      expect(createdJson.completed).toBe(false)
      expect(typeof createdJson.createdAt).toBe('string')
      expect(Number.isNaN(Date.parse(createdJson.createdAt))).toBe(false)

      const id = createdJson.id as number
      const createdAt = createdJson.createdAt as string

      const list = await handler(new Request('http://local.test/todos'))
      expect(list.status).toBe(200)
      const listJson = (await list.json()) as any[]
      expect(listJson).toHaveLength(1)
      expect(listJson[0]).toEqual({
        id,
        title: 'hello',
        completed: false,
        createdAt,
      })

      const got = await handler(new Request(`http://local.test/todos/${id}`))
      expect(got.status).toBe(200)
      await expect(got.json()).resolves.toEqual({
        id,
        title: 'hello',
        completed: false,
        createdAt,
      })

      const updated = await handler(
        new Request(`http://local.test/todos/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ completed: true }),
        }),
      )
      expect(updated.status).toBe(200)
      await expect(updated.json()).resolves.toEqual({
        id,
        title: 'hello',
        completed: true,
        createdAt,
      })

      if (keepSchema) {
        // eslint-disable-next-line no-console
        console.log(`[todo.pg.integration] kept todo: ${schema}.todos id=${id}`)
        return
      }

      const deleted = await handler(new Request(`http://local.test/todos/${id}`, { method: 'DELETE' }))
      expect(deleted.status).toBe(204)
      await expect(deleted.text()).resolves.toBe('')

      const missing = await handler(new Request(`http://local.test/todos/${id}`))
      expect(missing.status).toBe(404)
      await expect(missing.json()).resolves.toEqual({
        _tag: 'NotFoundError',
        message: 'Todo not found',
      })
    } finally {
      await dispose()
    }
  })
})
