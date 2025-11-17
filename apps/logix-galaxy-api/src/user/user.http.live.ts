import { HttpApiBuilder } from '@effect/platform'
import * as Headers from '@effect/platform/Headers'
import * as HttpServerRequest from '@effect/platform/HttpServerRequest'
import { Effect, Option } from 'effect'

import { EffectApi } from '../app/effect-api.js'
import { AuthEventRepo } from '../auth/auth-event.repo.js'
import { Auth, type AuthHeaders } from '../auth/auth.service.js'

const getRequestMeta = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const userAgent = Option.getOrUndefined(Headers.get(req.headers, 'user-agent')) ?? undefined
  const xff = Option.getOrUndefined(Headers.get(req.headers, 'x-forwarded-for'))
  const xri = Option.getOrUndefined(Headers.get(req.headers, 'x-real-ip'))
  const ipFromForwarded = xff?.split(',')[0]?.trim()
  const ip = (ipFromForwarded || xri?.trim() || Option.getOrUndefined(req.remoteAddress) || undefined) ?? undefined
  return { ip, userAgent }
})

const getAuthHeaders = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const authorization = Option.getOrUndefined(Headers.get(req.headers, 'authorization')) ?? undefined
  return { authorization } satisfies AuthHeaders
})

export const UserLive = HttpApiBuilder.group(EffectApi, 'User', (handlers) =>
  handlers
    .handle('userCreate', ({ payload }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const events = yield* AuthEventRepo
        const meta = yield* getRequestMeta
        const headers = yield* getAuthHeaders

        const actor = yield* auth.requireAdmin(headers)
        const created = yield* auth.createUser(headers, payload)

        yield* events
          .write({
            eventType: 'user_created',
            actorUserId: actor.id,
            subjectUserId: created.id,
            identifier: created.email,
            ip: meta.ip,
            userAgent: meta.userAgent,
          })
          .pipe(Effect.catchAll(() => Effect.void))

        return created
      }),
    )
    .handle('userList', ({ urlParams }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const headers = yield* getAuthHeaders
        return yield* auth.listUsers(headers, urlParams)
      }),
    )
    .handle('userGet', ({ path }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const headers = yield* getAuthHeaders
        return yield* auth.getUser(headers, path.id)
      }),
    )
    .handle('userUpdate', ({ path, payload }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const headers = yield* getAuthHeaders
        return yield* auth.updateUser(headers, path.id, payload)
      }),
    )
    .handle('userDisable', ({ path }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const events = yield* AuthEventRepo
        const meta = yield* getRequestMeta
        const headers = yield* getAuthHeaders

        const actor = yield* auth.requireAdmin(headers)
        yield* auth.disableUser(headers, path.id)

        yield* events
          .write({
            eventType: 'user_disabled',
            actorUserId: actor.id,
            subjectUserId: path.id,
            ip: meta.ip,
            userAgent: meta.userAgent,
          })
          .pipe(Effect.catchAll(() => Effect.void))
      }),
    )
    .handle('userEnable', ({ path }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const events = yield* AuthEventRepo
        const meta = yield* getRequestMeta
        const headers = yield* getAuthHeaders

        const actor = yield* auth.requireAdmin(headers)
        yield* auth.enableUser(headers, path.id)

        yield* events
          .write({
            eventType: 'user_enabled',
            actorUserId: actor.id,
            subjectUserId: path.id,
            ip: meta.ip,
            userAgent: meta.userAgent,
          })
          .pipe(Effect.catchAll(() => Effect.void))
      }),
    )
    .handle('userResetPassword', ({ path, payload }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const events = yield* AuthEventRepo
        const meta = yield* getRequestMeta
        const headers = yield* getAuthHeaders

        const actor = yield* auth.requireAdmin(headers)
        yield* auth.resetPassword(headers, path.id, payload)

        yield* events
          .write({
            eventType: 'password_reset',
            actorUserId: actor.id,
            subjectUserId: path.id,
            ip: meta.ip,
            userAgent: meta.userAgent,
          })
          .pipe(Effect.catchAll(() => Effect.void))
      }),
    ),
)
