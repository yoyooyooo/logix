import { APIError } from 'better-auth/api'
import { Config, Effect, Layer, Option } from 'effect'
import { Pool } from 'pg'

import { makeBetterAuth } from './better-auth.js'
import type {
  AuthHeaders,
  AuthLoginResponseDto,
  AuthService,
  ConflictErrorDto,
  ForbiddenErrorDto,
  NotFoundErrorDto,
  ServiceUnavailableErrorDto,
  TooManyRequestsErrorDto,
  UnauthorizedErrorDto,
  UserDtoDto,
  ValidationErrorDto,
} from './auth.service.js'
import { Auth } from './auth.service.js'

type BetterAuthUser = {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly role?: string | undefined
  readonly banned?: boolean | null | undefined
  readonly banExpires?: Date | null | undefined
}

type BetterAuthSession = {
  readonly expiresAt: Date
}

const nowIso = (): string => new Date().toISOString()

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const toWebHeaders = (headers: AuthHeaders): Headers => {
  const h = new Headers()
  if (headers.authorization) {
    h.set('authorization', headers.authorization)
  }
  return h
}

const toUnauthorized = (): UnauthorizedErrorDto => ({ _tag: 'UnauthorizedError', message: 'Unauthorized' })
const toForbidden = (): ForbiddenErrorDto => ({ _tag: 'ForbiddenError', message: 'Forbidden' })
const toValidation = (message = 'Bad request'): ValidationErrorDto => ({ _tag: 'ValidationError', message })
const toConflict = (message = 'Conflict'): ConflictErrorDto => ({ _tag: 'ConflictError', message })
const toNotFound = (message = 'Not found'): NotFoundErrorDto => ({ _tag: 'NotFoundError', message })
const toTooManyRequests = (): TooManyRequestsErrorDto => ({
  _tag: 'TooManyRequestsError',
  message: 'Too many requests, please try again later',
})
const toServiceUnavailable = (message = 'Auth service unavailable'): ServiceUnavailableErrorDto => ({
  _tag: 'ServiceUnavailableError',
  message,
})

const rolesFromRoleString = (role: string | undefined): Array<'admin' | 'user'> => {
  if (!role) return ['user']
  const parts = role
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
  const hasAdmin = parts.includes('admin')
  const hasUser = parts.includes('user')
  if (hasAdmin && hasUser) return ['admin', 'user']
  if (hasAdmin) return ['admin']
  if (hasUser) return ['user']
  return ['user']
}

const toUserDto = (user: BetterAuthUser): UserDtoDto => {
  const roles = rolesFromRoleString(user.role)
  const status = user.banned ? 'disabled' : 'active'
  const createdAt = user.createdAt.toISOString()
  const updatedAt = user.updatedAt.toISOString()
  return {
    id: user.id,
    email: user.email,
    displayName: user.name,
    status,
    roles,
    createdAt,
    updatedAt,
    lastLoginAt: null,
    disabledAt: status === 'disabled' ? updatedAt : null,
  }
}

const isApiError = (u: unknown): u is InstanceType<typeof APIError> => u instanceof APIError

const mapLoginApiError = (
  cause: unknown,
):
  | ValidationErrorDto
  | UnauthorizedErrorDto
  | ForbiddenErrorDto
  | TooManyRequestsErrorDto
  | ServiceUnavailableErrorDto => {
  if (!isApiError(cause)) return toServiceUnavailable()
  if (cause.statusCode === 400)
    return toValidation(typeof cause.body?.message === 'string' ? cause.body.message : 'Bad request')
  if (cause.statusCode === 401) return toUnauthorized()
  if (cause.statusCode === 403) return toForbidden()
  if (cause.statusCode === 429) return toTooManyRequests()
  return toServiceUnavailable()
}

const mapSessionApiError = (cause: unknown): UnauthorizedErrorDto | ServiceUnavailableErrorDto => {
  if (!isApiError(cause)) return toServiceUnavailable()
  if (cause.statusCode === 401) return toUnauthorized()
  return toServiceUnavailable()
}

const mapAdminApiError = (
  cause: unknown,
):
  | ValidationErrorDto
  | ConflictErrorDto
  | UnauthorizedErrorDto
  | ForbiddenErrorDto
  | NotFoundErrorDto
  | ServiceUnavailableErrorDto => {
  if (!isApiError(cause)) return toServiceUnavailable()

  const message = typeof cause.body?.message === 'string' ? cause.body.message : undefined

  if (cause.statusCode === 401) return toUnauthorized()
  if (cause.statusCode === 403) return toForbidden()
  if (cause.statusCode === 404) return toNotFound()
  if (cause.statusCode === 400 && message && message.toLowerCase().includes('already exists')) {
    return toConflict(message)
  }
  if (cause.statusCode === 400) return toValidation(message ?? 'Bad request')
  return toServiceUnavailable()
}

const mapCreateUserApiError = (
  cause: unknown,
): ValidationErrorDto | ConflictErrorDto | UnauthorizedErrorDto | ForbiddenErrorDto | ServiceUnavailableErrorDto => {
  const mapped = mapAdminApiError(cause)
  if (mapped._tag === 'NotFoundError') return toServiceUnavailable()
  return mapped
}

const mapListUsersApiError = (
  cause: unknown,
): UnauthorizedErrorDto | ForbiddenErrorDto | ServiceUnavailableErrorDto => {
  const mapped = mapAdminApiError(cause)
  if (mapped._tag === 'UnauthorizedError') return mapped
  if (mapped._tag === 'ForbiddenError') return mapped
  return toServiceUnavailable()
}

const mapGetUserApiError = (
  cause: unknown,
): UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto => {
  const mapped = mapAdminApiError(cause)
  if (mapped._tag === 'UnauthorizedError') return mapped
  if (mapped._tag === 'ForbiddenError') return mapped
  if (mapped._tag === 'NotFoundError') return mapped
  return toServiceUnavailable()
}

const mapUpdateUserApiError = (
  cause: unknown,
): ValidationErrorDto | UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto => {
  const mapped = mapAdminApiError(cause)
  if (mapped._tag === 'UnauthorizedError') return mapped
  if (mapped._tag === 'ForbiddenError') return mapped
  if (mapped._tag === 'NotFoundError') return mapped
  if (mapped._tag === 'ValidationError') return mapped
  return toServiceUnavailable()
}

const mapAdminVoidApiError = (
  cause: unknown,
): UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto => {
  const mapped = mapAdminApiError(cause)
  if (mapped._tag === 'UnauthorizedError') return mapped
  if (mapped._tag === 'ForbiddenError') return mapped
  if (mapped._tag === 'NotFoundError') return mapped
  return toServiceUnavailable()
}

const mapResetPasswordApiError = (
  cause: unknown,
): ValidationErrorDto | UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto => {
  const mapped = mapAdminApiError(cause)
  if (mapped._tag === 'UnauthorizedError') return mapped
  if (mapped._tag === 'ForbiddenError') return mapped
  if (mapped._tag === 'NotFoundError') return mapped
  if (mapped._tag === 'ValidationError') return mapped
  return toServiceUnavailable()
}

const makeDisabledAuthService = (reason: string): AuthService => {
  const unavailable = toServiceUnavailable(reason)
  const fail = <A>(_: any): Effect.Effect<A, ServiceUnavailableErrorDto> => Effect.fail(unavailable)
  return {
    login: () => fail(undefined),
    me: () => fail(undefined),
    logout: () => fail(undefined),
    requireAdmin: () => fail(undefined),
    createUser: () => fail(undefined),
    listUsers: () => fail(undefined),
    getUser: () => fail(undefined),
    updateUser: () => fail(undefined),
    disableUser: () => fail(undefined),
    enableUser: () => fail(undefined),
    resetPassword: () => fail(undefined),
  }
}

export const AuthServiceLive: Layer.Layer<Auth> = Layer.scoped(
  Auth,
  Effect.gen(function* () {
    const databaseUrlOpt = yield* Config.option(Config.string('DATABASE_URL')).pipe(
      Effect.catchAll(() => Effect.succeed(Option.none())),
    )
    const secretOpt = yield* Config.option(Config.string('BETTER_AUTH_SECRET')).pipe(
      Effect.catchAll(() => Effect.succeed(Option.none())),
    )
    const baseUrlOpt = yield* Config.option(Config.string('BETTER_AUTH_URL')).pipe(
      Effect.catchAll(() => Effect.succeed(Option.none())),
    )
    const autoMigrateRawOpt = yield* Config.option(Config.string('BETTER_AUTH_AUTO_MIGRATE')).pipe(
      Effect.catchAll(() => Effect.succeed(Option.none())),
    )
    const autoMigrate = Option.getOrElse(autoMigrateRawOpt, () => '1') !== '0'

    if (Option.isNone(databaseUrlOpt)) {
      return makeDisabledAuthService('DATABASE_URL is not set')
    }
    if (Option.isNone(secretOpt)) {
      return makeDisabledAuthService('BETTER_AUTH_SECRET is not set')
    }
    if (Option.isNone(baseUrlOpt)) {
      return makeDisabledAuthService('BETTER_AUTH_URL is not set')
    }

    const pool = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Pool({
            connectionString: databaseUrlOpt.value,
            options: '-csearch_path=auth',
          }),
      ),
      (p) => Effect.promise(() => p.end()).pipe(Effect.orDie),
    )

    yield* Effect.tryPromise({
      try: () => pool.query('create schema if not exists auth'),
      catch: (cause) => cause,
    }).pipe(Effect.catchAll(() => Effect.void))

    const auth = makeBetterAuth({ pool, secret: secretOpt.value, baseURL: baseUrlOpt.value })

    if (autoMigrate) {
      const migrated = yield* Effect.tryPromise({
        try: async () => {
          const ctx = await auth.$context
          await ctx.runMigrations()
        },
        catch: () => toServiceUnavailable('BetterAuth migrations failed'),
      }).pipe(
        Effect.as(true as const),
        Effect.catchAll(() => Effect.succeed(false as const)),
      )

      if (!migrated) {
        return makeDisabledAuthService('BetterAuth migrations failed')
      }
    }

    const getSessionOrUnauthorized = (headers: AuthHeaders) =>
      Effect.tryPromise({
        try: () => auth.api.getSession({ headers: toWebHeaders(headers) }),
        catch: (cause) => mapSessionApiError(cause),
      }).pipe(Effect.flatMap((session) => (session ? Effect.succeed(session) : Effect.fail(toUnauthorized()))))

    const login: AuthService['login'] = ({ email, password }) =>
      Effect.gen(function* () {
        const normalizedEmail = normalizeEmail(email)

        const { headers } = yield* Effect.tryPromise({
          try: () =>
            auth.api.signInEmail({
              returnHeaders: true,
              body: { email: normalizedEmail, password },
            }),
          catch: (cause) => mapLoginApiError(cause),
        })

        const bearerToken = headers.get('set-auth-token')
        if (!bearerToken) {
          return yield* Effect.fail(toServiceUnavailable('Missing bearer token'))
        }

        const session = yield* getSessionOrUnauthorized({ authorization: `Bearer ${bearerToken}` })
        const user = toUserDto(session.user as any as BetterAuthUser)
        if (user.status === 'disabled') {
          return yield* Effect.fail(toForbidden())
        }

        const expiresAt = ((session.session as any as BetterAuthSession).expiresAt ?? null) as Date | null
        const response: AuthLoginResponseDto = {
          token: bearerToken,
          expiresAt: expiresAt ? expiresAt.toISOString() : nowIso(),
          user,
        }
        return response
      })

    const me: AuthService['me'] = (headers) =>
      getSessionOrUnauthorized(headers).pipe(
        Effect.flatMap((session) => {
          const user = toUserDto(session.user as any as BetterAuthUser)
          if (user.status === 'disabled') {
            return Effect.fail(toUnauthorized())
          }
          return Effect.succeed(user)
        }),
      )

    const logout: AuthService['logout'] = (headers) =>
      Effect.tryPromise({
        try: () => auth.api.signOut({ headers: toWebHeaders(headers) }),
        catch: (cause) => mapSessionApiError(cause),
      }).pipe(Effect.asVoid)

    const requireAdmin: AuthService['requireAdmin'] = (headers) =>
      me(headers).pipe(
        Effect.flatMap((user) => (user.roles.includes('admin') ? Effect.succeed(user) : Effect.fail(toForbidden()))),
      )

    const createUser: AuthService['createUser'] = (headers, payload) =>
      Effect.gen(function* () {
        yield* requireAdmin(headers)
        if (payload.password.length < 8) {
          return yield* Effect.fail(toValidation('Password too short'))
        }

        const result = yield* Effect.tryPromise({
          try: () =>
            auth.api.createUser({
              returnHeaders: false,
              headers: toWebHeaders(headers),
              body: {
                email: normalizeEmail(payload.email),
                password: payload.password,
                name: payload.displayName,
                role: payload.roles && payload.roles.length > 0 ? Array.from(payload.roles) : 'user',
              },
            }),
          catch: (cause) => mapCreateUserApiError(cause),
        })

        const user = (result as any).user ?? result
        return toUserDto(user as BetterAuthUser)
      })

    const listUsers: AuthService['listUsers'] = (headers, urlParams) =>
      Effect.gen(function* () {
        yield* requireAdmin(headers)

        const response = yield* Effect.tryPromise({
          try: () =>
            auth.api.listUsers({
              headers: toWebHeaders(headers),
              query: {
                searchValue: urlParams.q?.trim() || undefined,
                searchField: 'email',
                searchOperator: 'contains',
                limit: 200,
              },
            }),
          catch: (cause) => mapListUsersApiError(cause),
        })

        const users = ((response as any).users ?? []) as ReadonlyArray<BetterAuthUser>
        return users.map(toUserDto).filter((u) => (urlParams.status ? u.status === urlParams.status : true))
      })

    const getUser: AuthService['getUser'] = (headers, id) =>
      Effect.gen(function* () {
        yield* requireAdmin(headers)
        const response = yield* Effect.tryPromise({
          try: () => auth.api.getUser({ headers: toWebHeaders(headers), query: { id } }),
          catch: (cause) => mapGetUserApiError(cause),
        })
        const user = (response as any).user ?? response
        return toUserDto(user as BetterAuthUser)
      })

    const updateUser: AuthService['updateUser'] = (headers, id, payload) =>
      Effect.gen(function* () {
        yield* requireAdmin(headers)
        const name = payload.displayName?.trim()
        if (!name) {
          return yield* getUser(headers, id)
        }

        const response = yield* Effect.tryPromise({
          try: () =>
            auth.api.adminUpdateUser({
              headers: toWebHeaders(headers),
              body: { userId: id, data: { name } },
            }),
          catch: (cause) => mapUpdateUserApiError(cause),
        })

        const user = (response as any).user ?? response
        return toUserDto(user as BetterAuthUser)
      })

    const disableUser: AuthService['disableUser'] = (headers, id) =>
      Effect.gen(function* () {
        yield* requireAdmin(headers)
        yield* Effect.tryPromise({
          try: () =>
            auth.api.banUser({
              headers: toWebHeaders(headers),
              body: { userId: id },
            }),
          catch: (cause) => mapAdminVoidApiError(cause),
        })
      }).pipe(Effect.asVoid)

    const enableUser: AuthService['enableUser'] = (headers, id) =>
      Effect.gen(function* () {
        yield* requireAdmin(headers)
        yield* Effect.tryPromise({
          try: () =>
            auth.api.unbanUser({
              headers: toWebHeaders(headers),
              body: { userId: id },
            }),
          catch: (cause) => mapAdminVoidApiError(cause),
        })
      }).pipe(Effect.asVoid)

    const resetPassword: AuthService['resetPassword'] = (headers, id, payload) =>
      Effect.gen(function* () {
        yield* requireAdmin(headers)
        if (payload.password.length < 8) {
          return yield* Effect.fail(toValidation('Password too short'))
        }
        yield* Effect.tryPromise({
          try: () =>
            auth.api.setUserPassword({
              headers: toWebHeaders(headers),
              body: { userId: id, newPassword: payload.password },
            }),
          catch: (cause) => mapResetPasswordApiError(cause),
        })
      }).pipe(Effect.asVoid)

    return {
      login,
      me,
      logout,
      requireAdmin,
      createUser,
      listUsers,
      getUser,
      updateUser,
      disableUser,
      enableUser,
      resetPassword,
    } satisfies AuthService
  }),
)
