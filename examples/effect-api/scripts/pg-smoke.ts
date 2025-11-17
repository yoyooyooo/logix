import assert from 'node:assert/strict'

import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Layer } from 'effect'

import { EffectApi } from '../src/app/effect-api.js'
import { DbLive } from '../src/db/db.live.js'
import { HealthLive } from '../src/health/health.http.live.js'
import { TodoLive } from '../src/todo/todo.http.live.js'
import { TodoRepoLive } from '../src/todo/todo.repo.live.js'

const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing env: ${name}`)
  }
  return value
}

requireEnv('DATABASE_URL')

const ApiLive = HttpApiBuilder.api(EffectApi).pipe(
  Layer.provide(HealthLive),
  Layer.provide(TodoLive),
  Layer.provide(TodoRepoLive),
  Layer.provide(DbLive),
)

const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiLive, HttpServer.layerContext))

try {
  const health = await handler(new Request('http://local.test/health'))
  assert.equal(health.status, 200)
  const healthJson = await health.json()
  assert.equal(healthJson.ok, true)

  const created = await handler(
    new Request('http://local.test/todos', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'hello' }),
    }),
  )
  assert.equal(created.status, 201)
  const createdJson = await created.json()
  assert.equal(createdJson.title, 'hello')
  assert.equal(createdJson.completed, false)
  assert.equal(typeof createdJson.id, 'number')

  const id = createdJson.id as number

  const got = await handler(new Request(`http://local.test/todos/${id}`))
  assert.equal(got.status, 200)

  const updated = await handler(
    new Request(`http://local.test/todos/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ completed: true }),
    }),
  )
  assert.equal(updated.status, 200)
  const updatedJson = await updated.json()
  assert.equal(updatedJson.completed, true)

  const deleted = await handler(new Request(`http://local.test/todos/${id}`, { method: 'DELETE' }))
  assert.equal(deleted.status, 204)

  const missing = await handler(new Request(`http://local.test/todos/${id}`))
  assert.equal(missing.status, 404)

  // eslint-disable-next-line no-console
  console.log('pg smoke ok')
} finally {
  await dispose()
}
