import * as Headers from 'effect/unstable/http/Headers'
import * as HttpServerRequest from 'effect/unstable/http/HttpServerRequest'
import { HttpApiBuilder } from 'effect/unstable/httpapi'
import { Effect, Option } from 'effect'

import { EffectApiAuth } from '../app/effect-api.js'
import { AuthEventRepo } from '../auth/auth-event.repo.js'
import { Auth, type AuthHeaders } from '../auth/auth.service.js'

const getRequestMeta = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const userAgent = Headers.get(req.headers, 'user-agent')
  const xff = Headers.get(req.headers, 'x-forwarded-for')
  const xri = Headers.get(req.headers, 'x-real-ip')
  const ipFromForwarded = xff?.split(',')[0]?.trim()
  const ip = (ipFromForwarded || xri?.trim() || req.remoteAddress || undefined) ?? undefined
  return { ip, userAgent }
})

const getAuthHeaders = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const authorization = Headers.get(req.headers, 'authorization')
  return { authorization } satisfies AuthHeaders
})

export const UserLive = HttpApiBuilder.group(EffectApiAuth, 'User', (handlers) =>
  handlers
    .handle('userCreate', ({ payload }) =>
      Effect.gen(function* () {
        const auth = yield* Effect.service(Auth)
        const events = yield* Effect.service(AuthEventRepo)
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
          .pipe(Effect.catch(() => Effect.void))

        return created
      }),
    )
    .handle('userList', ({ query }) =>
      Effect.gen(function* () {
        const auth = yield* Effect.service(Auth)
        const headers = yield* getAuthHeaders
        return yield* auth.listUsers(headers, query)
      }),
    )
    .handle('userGet', ({ params }) =>
      Effect.gen(function* () {
        const auth = yield* Effect.service(Auth)
        const headers = yield* getAuthHeaders
        return yield* auth.getUser(headers, params.id)
      }),
    )
    .handle('userUpdate', ({ params, payload }) =>
      Effect.gen(function* () {
        const auth = yield* Effect.service(Auth)
        const headers = yield* getAuthHeaders
        return yield* auth.updateUser(headers, params.id, payload)
      }),
    )
    .handle('userDisable', ({ params }) =>
      Effect.gen(function* () {
        const auth = yield* Effect.service(Auth)
        const events = yield* Effect.service(AuthEventRepo)
        const meta = yield* getRequestMeta
        const headers = yield* getAuthHeaders

        const actor = yield* auth.requireAdmin(headers)
        yield* auth.disableUser(headers, params.id)

        yield* events
          .write({
            eventType: 'user_disabled',
            actorUserId: actor.id,
            subjectUserId: params.id,
            ip: meta.ip,
            userAgent: meta.userAgent,
          })
          .pipe(Effect.catch(() => Effect.void))
      }),
    )
    .handle('userEnable', ({ params }) =>
      Effect.gen(function* () {
        const auth = yield* Effect.service(Auth)
        const events = yield* Effect.service(AuthEventRepo)
        const meta = yield* getRequestMeta
        const headers = yield* getAuthHeaders

        const actor = yield* auth.requireAdmin(headers)
        yield* auth.enableUser(headers, params.id)

        yield* events
          .write({
            eventType: 'user_enabled',
            actorUserId: actor.id,
            subjectUserId: params.id,
            ip: meta.ip,
            userAgent: meta.userAgent,
          })
          .pipe(Effect.catch(() => Effect.void))
      }),
    )
    .handle('userResetPassword', ({ params, payload }) =>
      Effect.gen(function* () {
        const auth = yield* Effect.service(Auth)
        const events = yield* Effect.service(AuthEventRepo)
        const meta = yield* getRequestMeta
        const headers = yield* getAuthHeaders

        const actor = yield* auth.requireAdmin(headers)
        yield* auth.resetPassword(headers, params.id, payload)

        yield* events
          .write({
            eventType: 'password_reset',
            actorUserId: actor.id,
            subjectUserId: params.id,
            ip: meta.ip,
            userAgent: meta.userAgent,
          })
          .pipe(Effect.catch(() => Effect.void))
      }),
    ),
)
