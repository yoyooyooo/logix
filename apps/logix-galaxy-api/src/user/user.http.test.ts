import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Effect, Layer, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { EffectApiAuth } from '../app/effect-api.js'
import { DbLive } from '../db/db.live.js'
import { HealthLive } from '../health/health.http.live.js'
import { makeAuthHarness } from '../test/auth-harness.js'
import { TodoLive } from '../todo/todo.http.live.js'
import { TodoRepo } from '../todo/todo.repo.js'
import { AuthLive } from '../auth/auth.http.live.js'
import { AuthRateLimitLive } from '../auth/auth.rate-limit.js'
import type { AuthLoginResponseDto } from '../auth/auth.service.js'
import { UserLive } from './user.http.live.js'

const TodoRepoTest = Layer.succeed(TodoRepo, {
  create: () => Effect.dieMessage('TodoRepo not used in user tests'),
  get: () => Effect.succeed(Option.none()),
  list: Effect.succeed([]),
  update: () => Effect.succeed(Option.none()),
  remove: () => Effect.succeed(false),
})

const login = async (
  handler: (req: Request) => Promise<Response>,
  email: string,
  password: string,
): Promise<AuthLoginResponseDto> => {
  const res = await handler(
    new Request('http://local.test/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  )
  expect(res.status).toBe(200)
  return (await res.json()) as AuthLoginResponseDto
}

describe('User', () => {
  it('admin can create user and user can login', async () => {
    const harness = makeAuthHarness()
    harness.seedUser({ email: 'admin@example.com', password: 'admin123456', displayName: 'Admin', roles: ['admin'] })

    const ApiTestLive = HttpApiBuilder.api(EffectApiAuth).pipe(
      Layer.provide(HealthLive),
      Layer.provide(TodoLive),
      Layer.provide(AuthLive),
      Layer.provide(UserLive),
      Layer.provide(TodoRepoTest),
      Layer.provide(harness.AuthTest),
      Layer.provide(harness.AuthEventRepoTest),
      Layer.provide(AuthRateLimitLive),
      Layer.provide(DbLive),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const adminLogin = await login(handler, 'admin@example.com', 'admin123456')

      const created = await handler(
        new Request('http://local.test/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${adminLogin.token}` },
          body: JSON.stringify({ email: 'Alice@Example.com', displayName: 'Alice', password: 'alice123456' }),
        }),
      )
      expect(created.status).toBe(201)
      const createdJson = (await created.json()) as any
      expect(createdJson.email).toBe('alice@example.com')
      expect(typeof createdJson.id).toBe('string')

      const userLogin = await login(handler, 'alice@example.com', 'alice123456')
      expect(userLogin.user.id).toBe(createdJson.id)

      const me = await handler(
        new Request('http://local.test/me', {
          headers: { authorization: `Bearer ${userLogin.token}` },
        }),
      )
      expect(me.status).toBe(200)
      await expect(me.json()).resolves.toEqual(userLogin.user)
    } finally {
      await dispose()
    }
  })

  it('disable makes existing session invalid and blocks login', async () => {
    const harness = makeAuthHarness()
    harness.seedUser({ email: 'admin@example.com', password: 'admin123456', displayName: 'Admin', roles: ['admin'] })

    const ApiTestLive = HttpApiBuilder.api(EffectApiAuth).pipe(
      Layer.provide(HealthLive),
      Layer.provide(TodoLive),
      Layer.provide(AuthLive),
      Layer.provide(UserLive),
      Layer.provide(TodoRepoTest),
      Layer.provide(harness.AuthTest),
      Layer.provide(harness.AuthEventRepoTest),
      Layer.provide(AuthRateLimitLive),
      Layer.provide(DbLive),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const adminLogin = await login(handler, 'admin@example.com', 'admin123456')

      const created = await handler(
        new Request('http://local.test/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${adminLogin.token}` },
          body: JSON.stringify({ email: 'alice@example.com', displayName: 'Alice', password: 'alice123456' }),
        }),
      )
      expect(created.status).toBe(201)
      const createdJson = (await created.json()) as any
      const userId = createdJson.id as string

      const userLogin = await login(handler, 'alice@example.com', 'alice123456')

      const meBefore = await handler(
        new Request('http://local.test/me', { headers: { authorization: `Bearer ${userLogin.token}` } }),
      )
      expect(meBefore.status).toBe(200)

      const disabled = await handler(
        new Request(`http://local.test/users/${userId}/disable`, {
          method: 'POST',
          headers: { authorization: `Bearer ${adminLogin.token}` },
        }),
      )
      expect(disabled.status).toBe(204)

      const meAfter = await handler(
        new Request('http://local.test/me', { headers: { authorization: `Bearer ${userLogin.token}` } }),
      )
      expect(meAfter.status).toBe(401)
      await expect(meAfter.json()).resolves.toEqual({ _tag: 'UnauthorizedError', message: 'Unauthorized' })

      const loginAfterDisable = await handler(
        new Request('http://local.test/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'alice@example.com', password: 'alice123456' }),
        }),
      )
      expect(loginAfterDisable.status).toBe(403)
      await expect(loginAfterDisable.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })
    } finally {
      await dispose()
    }
  })

  it('reset password makes old password invalid', async () => {
    const harness = makeAuthHarness()
    harness.seedUser({ email: 'admin@example.com', password: 'admin123456', displayName: 'Admin', roles: ['admin'] })

    const ApiTestLive = HttpApiBuilder.api(EffectApiAuth).pipe(
      Layer.provide(HealthLive),
      Layer.provide(TodoLive),
      Layer.provide(AuthLive),
      Layer.provide(UserLive),
      Layer.provide(TodoRepoTest),
      Layer.provide(harness.AuthTest),
      Layer.provide(harness.AuthEventRepoTest),
      Layer.provide(AuthRateLimitLive),
      Layer.provide(DbLive),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const adminLogin = await login(handler, 'admin@example.com', 'admin123456')

      const created = await handler(
        new Request('http://local.test/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${adminLogin.token}` },
          body: JSON.stringify({ email: 'alice@example.com', displayName: 'Alice', password: 'alice123456' }),
        }),
      )
      expect(created.status).toBe(201)
      const createdJson = (await created.json()) as any
      const userId = createdJson.id as string

      await login(handler, 'alice@example.com', 'alice123456')

      const reset = await handler(
        new Request(`http://local.test/users/${userId}/reset-password`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${adminLogin.token}` },
          body: JSON.stringify({ password: 'newpass123456' }),
        }),
      )
      expect(reset.status).toBe(204)

      const oldLogin = await handler(
        new Request('http://local.test/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'alice@example.com', password: 'alice123456' }),
        }),
      )
      expect(oldLogin.status).toBe(401)
      await expect(oldLogin.json()).resolves.toEqual({ _tag: 'UnauthorizedError', message: 'Unauthorized' })

      await login(handler, 'alice@example.com', 'newpass123456')
    } finally {
      await dispose()
    }
  })

  it('normal user cannot access user management endpoints', async () => {
    const harness = makeAuthHarness()
    harness.seedUser({ email: 'alice@example.com', password: 'alice123456', displayName: 'Alice', roles: ['user'] })

    const ApiTestLive = HttpApiBuilder.api(EffectApiAuth).pipe(
      Layer.provide(HealthLive),
      Layer.provide(TodoLive),
      Layer.provide(AuthLive),
      Layer.provide(UserLive),
      Layer.provide(TodoRepoTest),
      Layer.provide(harness.AuthTest),
      Layer.provide(harness.AuthEventRepoTest),
      Layer.provide(AuthRateLimitLive),
      Layer.provide(DbLive),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const userLogin = await login(handler, 'alice@example.com', 'alice123456')

      const createAttempt = await handler(
        new Request('http://local.test/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${userLogin.token}` },
          body: JSON.stringify({ email: 'bob@example.com', displayName: 'Bob', password: 'bob123456' }),
        }),
      )
      expect(createAttempt.status).toBe(403)
      await expect(createAttempt.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })
    } finally {
      await dispose()
    }
  })
})
