import { HttpApiBuilder, HttpServer } from '@effect/platform'
import { Effect, Layer, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import { EffectApiAuth } from '../app/effect-api.js'
import { DbLive } from '../db/db.live.js'
import { HealthLive } from '../health/health.http.live.js'
import { makeAuthHarness } from '../test/auth-harness.js'
import { TodoLive } from '../todo/todo.http.live.js'
import { TodoRepo } from '../todo/todo.repo.js'
import { UserLive } from '../user/user.http.live.js'
import { AuthLive } from './auth.http.live.js'
import { AuthRateLimitLive } from './auth.rate-limit.js'
import type { AuthLoginResponseDto } from './auth.service.js'

const TodoRepoTest = Layer.succeed(TodoRepo, {
  create: () => Effect.dieMessage('TodoRepo not used in auth tests'),
  get: () => Effect.succeed(Option.none()),
  list: Effect.succeed([]),
  update: () => Effect.succeed(Option.none()),
  remove: () => Effect.succeed(false),
})

describe('Auth', () => {
  it('login → me → logout', async () => {
    const harness = makeAuthHarness()
    const alice = harness.seedUser({ email: 'alice@example.com', password: 'alice123456', displayName: 'Alice' })

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
      const login = await handler(
        new Request('http://local.test/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'alice@example.com', password: 'alice123456' }),
        }),
      )
      expect(login.status).toBe(200)
      const loginJson = (await login.json()) as AuthLoginResponseDto
      expect(loginJson.user).toEqual(alice)
      expect(typeof loginJson.token).toBe('string')

      const me = await handler(
        new Request('http://local.test/me', { headers: { authorization: `Bearer ${loginJson.token}` } }),
      )
      expect(me.status).toBe(200)
      await expect(me.json()).resolves.toEqual(alice)

      const logout = await handler(
        new Request('http://local.test/auth/logout', {
          method: 'POST',
          headers: { authorization: `Bearer ${loginJson.token}` },
        }),
      )
      expect(logout.status).toBe(204)

      const meAfter = await handler(
        new Request('http://local.test/me', { headers: { authorization: `Bearer ${loginJson.token}` } }),
      )
      expect(meAfter.status).toBe(401)
      await expect(meAfter.json()).resolves.toEqual({ _tag: 'UnauthorizedError', message: 'Unauthorized' })

      expect(harness.events.some((e) => e.eventType === 'login_succeeded')).toBe(true)
      expect(harness.events.some((e) => e.eventType === 'logout')).toBe(true)
    } finally {
      await dispose()
    }
  })

  it('wrong password returns 401 (does not leak whether user exists)', async () => {
    const harness = makeAuthHarness()
    harness.seedUser({ email: 'alice@example.com', password: 'alice123456', displayName: 'Alice' })

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
      const login = await handler(
        new Request('http://local.test/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'alice@example.com', password: 'wrong' }),
        }),
      )
      expect(login.status).toBe(401)
      await expect(login.json()).resolves.toEqual({ _tag: 'UnauthorizedError', message: 'Unauthorized' })
    } finally {
      await dispose()
    }
  })

  it('disabled user login returns 403', async () => {
    const harness = makeAuthHarness()
    harness.seedUser({ email: 'alice@example.com', password: 'alice123456', displayName: 'Alice', status: 'disabled' })

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
      const login = await handler(
        new Request('http://local.test/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'alice@example.com', password: 'alice123456' }),
        }),
      )
      expect(login.status).toBe(403)
      await expect(login.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })
    } finally {
      await dispose()
    }
  })

  it('admin can query audit events; normal user forbidden', async () => {
    const harness = makeAuthHarness()
    harness.seedUser({ email: 'admin@example.com', password: 'admin123456', displayName: 'Admin', roles: ['admin'] })
    harness.seedUser({ email: 'alice@example.com', password: 'alice123456', displayName: 'Alice' })

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
      const aliceLogin = await handler(
        new Request('http://local.test/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'alice@example.com', password: 'alice123456' }),
        }),
      )
      expect(aliceLogin.status).toBe(200)
      const aliceJson = (await aliceLogin.json()) as AuthLoginResponseDto

      const adminLogin = await handler(
        new Request('http://local.test/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'admin@example.com', password: 'admin123456' }),
        }),
      )
      expect(adminLogin.status).toBe(200)
      const adminJson = (await adminLogin.json()) as AuthLoginResponseDto

      const forbidden = await handler(
        new Request('http://local.test/auth/events', { headers: { authorization: `Bearer ${aliceJson.token}` } }),
      )
      expect(forbidden.status).toBe(403)
      await expect(forbidden.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const ok = await handler(
        new Request('http://local.test/auth/events', { headers: { authorization: `Bearer ${adminJson.token}` } }),
      )
      expect(ok.status).toBe(200)
      const events = (await ok.json()) as Array<any>
      expect(events.some((e) => e.eventType === 'login_succeeded')).toBe(true)
    } finally {
      await dispose()
    }
  })
})
