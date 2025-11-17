import { HttpApiBuilder } from '@effect/platform'
import * as Headers from '@effect/platform/Headers'
import * as HttpServerRequest from '@effect/platform/HttpServerRequest'
import { Effect, Option } from 'effect'

import { EffectApi } from '../app/effect-api.js'
import { DbError } from '../db/db.js'
import { AuthEventRepo } from './auth-event.repo.js'
import { AuthRateLimit } from './auth.rate-limit.js'
import { Auth, type AuthHeaders, type UserDtoDto } from './auth.service.js'

const toServiceUnavailable = (e: DbError): { readonly _tag: 'ServiceUnavailableError'; readonly message: string } => ({
  _tag: 'ServiceUnavailableError',
  message: e.reason === 'disabled' ? 'DATABASE_URL is not set' : 'Database error',
})

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

const isAdmin = (user: UserDtoDto): boolean => user.roles.includes('admin')

const validateIsoRange = (from: string | undefined, to: string | undefined) =>
  Effect.gen(function* () {
    if (from !== undefined && Number.isNaN(Date.parse(from))) {
      return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid from' } as const)
    }
    if (to !== undefined && Number.isNaN(Date.parse(to))) {
      return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid to' } as const)
    }
    if (from !== undefined && to !== undefined && Date.parse(from) > Date.parse(to)) {
      return yield* Effect.fail({ _tag: 'ValidationError', message: 'from must be <= to' } as const)
    }
  })

export const AuthLive = HttpApiBuilder.group(EffectApi, 'Auth', (handlers) =>
  handlers
    .handle('authLogin', ({ payload }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const events = yield* AuthEventRepo
        const rateLimit = yield* AuthRateLimit
        const meta = yield* getRequestMeta

        const identifier = payload.email.trim().toLowerCase()
        const key = { identifier, ip: meta.ip }

        const attempt = rateLimit.check(key).pipe(
          Effect.zipRight(auth.login({ ...payload, email: identifier })),
          Effect.tap(() => rateLimit.recordSuccess(key)),
          Effect.tapError(() => rateLimit.recordFailure(key)),
        )

        const result = yield* attempt.pipe(
          Effect.tap((r) =>
            events
              .write({
                eventType: 'login_succeeded',
                actorUserId: r.user.id,
                subjectUserId: r.user.id,
                identifier: r.user.email,
                ip: meta.ip,
                userAgent: meta.userAgent,
              })
              .pipe(Effect.catchAll(() => Effect.void)),
          ),
          Effect.tapError((e) =>
            events
              .write({
                eventType: 'login_failed',
                identifier,
                ip: meta.ip,
                userAgent: meta.userAgent,
                detail: { _tag: (e as any)?._tag },
              })
              .pipe(Effect.catchAll(() => Effect.void)),
          ),
        )

        return result
      }),
    )
    .handle('authMe', () =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const headers = yield* getAuthHeaders
        return yield* auth.me(headers)
      }),
    )
    .handle('authLogout', () =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const events = yield* AuthEventRepo
        const meta = yield* getRequestMeta
        const headers = yield* getAuthHeaders

        const me = yield* auth.me(headers).pipe(Effect.catchAll(() => Effect.succeed(undefined)))

        yield* auth.logout(headers).pipe(
          Effect.tap(() =>
            me
              ? events
                  .write({
                    eventType: 'logout',
                    actorUserId: me.id,
                    subjectUserId: me.id,
                    identifier: me.email,
                    ip: meta.ip,
                    userAgent: meta.userAgent,
                  })
                  .pipe(Effect.catchAll(() => Effect.void))
              : Effect.void,
          ),
        )
      }),
    )
    .handle('authEventList', ({ urlParams }) =>
      Effect.gen(function* () {
        const auth = yield* Auth
        const events = yield* AuthEventRepo
        const headers = yield* getAuthHeaders

        const me = yield* auth.requireAdmin(headers)
        if (!isAdmin(me)) {
          return yield* Effect.fail({ _tag: 'ForbiddenError', message: 'Forbidden' } as const)
        }

        yield* validateIsoRange(urlParams.from, urlParams.to)

        return yield* events.list(urlParams).pipe(Effect.mapError(toServiceUnavailable))
      }),
    ),
)
