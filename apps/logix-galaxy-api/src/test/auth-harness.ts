import { Effect, Layer } from 'effect'

import type { AuthEventDtoDto, AuthEventRepoService, AuthEventWriteInput } from '../auth/auth-event.repo.js'
import { AuthEventRepo } from '../auth/auth-event.repo.js'
import type { AuthHeaders, AuthLoginResponseDto, AuthService, UserDtoDto } from '../auth/auth.service.js'
import { Auth } from '../auth/auth.service.js'

export interface SeedUserInput {
  readonly email: string
  readonly password: string
  readonly displayName: string
  readonly roles?: ReadonlyArray<'admin' | 'user'> | undefined
  readonly status?: 'active' | 'disabled' | undefined
}

export interface AuthHarness {
  readonly AuthTest: Layer.Layer<Auth>
  readonly AuthEventRepoTest: Layer.Layer<AuthEventRepo>
  readonly seedUser: (input: SeedUserInput) => UserDtoDto
  readonly events: ReadonlyArray<AuthEventDtoDto>
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const nowIso = (): string => '1970-01-01T00:00:00.000Z'

const unauthorized = (): { readonly _tag: 'UnauthorizedError'; readonly message: string } => ({
  _tag: 'UnauthorizedError',
  message: 'Unauthorized',
})

const forbidden = (): { readonly _tag: 'ForbiddenError'; readonly message: string } => ({
  _tag: 'ForbiddenError',
  message: 'Forbidden',
})

const readBearerToken = (headers: AuthHeaders): string | undefined => {
  const auth = headers.authorization ?? ''
  const match = auth.match(/^Bearer (.+)$/i)
  return match?.[1]
}

export const makeAuthHarness = (): AuthHarness => {
  const usersByEmail = new Map<string, { user: UserDtoDto; password: string }>()
  const usersById = new Map<string, UserDtoDto>()
  const sessions = new Map<string, string>() // token -> userId

  let nextUserId = 1
  let nextTokenId = 1
  let nextEventId = 1

  const events: Array<AuthEventDtoDto> = []

  const me: AuthService['me'] = (headers) =>
    Effect.gen(function* () {
      const token = readBearerToken(headers)
      if (!token) return yield* Effect.fail(unauthorized())

      const userId = sessions.get(token)
      if (!userId) {
        return yield* Effect.fail(unauthorized())
      }
      const user = usersById.get(userId)
      if (!user || user.status === 'disabled') {
        return yield* Effect.fail(unauthorized())
      }
      return user
    })

  const requireAdmin: AuthService['requireAdmin'] = (headers) =>
    me(headers).pipe(
      Effect.flatMap((user) => (user.roles.includes('admin') ? Effect.succeed(user) : Effect.fail(forbidden()))),
    )

  const login: AuthService['login'] = ({ email, password }) =>
    Effect.gen(function* () {
      const record = usersByEmail.get(normalizeEmail(email))
      if (!record || record.password !== password) {
        return yield* Effect.fail(unauthorized())
      }
      if (record.user.status === 'disabled') {
        return yield* Effect.fail(forbidden())
      }

      const token = `t_${nextTokenId++}`
      sessions.set(token, record.user.id)

      const response: AuthLoginResponseDto = {
        token,
        expiresAt: nowIso(),
        user: record.user,
      }
      return response
    })

  const logout: AuthService['logout'] = (headers) =>
    Effect.gen(function* () {
      const token = readBearerToken(headers)
      if (!token) return yield* Effect.fail(unauthorized())

      const existed = sessions.delete(token)
      if (!existed) {
        return yield* Effect.fail(unauthorized())
      }
    })

  const createUser: AuthService['createUser'] = (headers, { email, displayName, password, roles }) =>
    Effect.gen(function* () {
      yield* requireAdmin(headers)

      const normalizedEmail = normalizeEmail(email)
      if (usersByEmail.has(normalizedEmail)) {
        return yield* Effect.fail({ _tag: 'ConflictError', message: 'Email already exists' } as const)
      }
      if (password.length < 8) {
        return yield* Effect.fail({ _tag: 'ValidationError', message: 'Password too short' } as const)
      }

      const user: UserDtoDto = {
        id: String(nextUserId++),
        email: normalizedEmail,
        displayName,
        status: 'active',
        roles: roles && roles.length > 0 ? [...roles] : ['user'],
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastLoginAt: null,
        disabledAt: null,
      }
      usersByEmail.set(normalizedEmail, { user, password })
      usersById.set(user.id, user)
      return user
    })

  const listUsers: AuthService['listUsers'] = (headers, query) =>
    Effect.gen(function* () {
      yield* requireAdmin(headers)
      const q = query.q?.trim().toLowerCase()
      return Array.from(usersById.values()).filter((u) => {
        if (query.status && u.status !== query.status) return false
        if (!q) return true
        return u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
      })
    })

  const getUser: AuthService['getUser'] = (headers, id) =>
    Effect.gen(function* () {
      yield* requireAdmin(headers)
      const user = usersById.get(id)
      if (!user) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const)
      return user
    })

  const updateUser: AuthService['updateUser'] = (headers, id, payload) =>
    Effect.gen(function* () {
      yield* requireAdmin(headers)
      const prev = usersById.get(id)
      if (!prev) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const)
      const next: UserDtoDto = {
        ...prev,
        displayName: payload.displayName ?? prev.displayName,
        updatedAt: nowIso(),
      }
      usersById.set(id, next)
      usersByEmail.set(normalizeEmail(next.email), {
        user: next,
        password: usersByEmail.get(normalizeEmail(next.email))!.password,
      })
      return next
    })

  const disableUser: AuthService['disableUser'] = (headers, id) =>
    Effect.gen(function* () {
      yield* requireAdmin(headers)
      const prev = usersById.get(id)
      if (!prev) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const)
      const next: UserDtoDto = { ...prev, status: 'disabled', disabledAt: nowIso(), updatedAt: nowIso() }
      usersById.set(id, next)
      usersByEmail.set(normalizeEmail(next.email), {
        user: next,
        password: usersByEmail.get(normalizeEmail(next.email))!.password,
      })
    })

  const enableUser: AuthService['enableUser'] = (headers, id) =>
    Effect.gen(function* () {
      yield* requireAdmin(headers)
      const prev = usersById.get(id)
      if (!prev) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const)
      const next: UserDtoDto = { ...prev, status: 'active', disabledAt: null, updatedAt: nowIso() }
      usersById.set(id, next)
      usersByEmail.set(normalizeEmail(next.email), {
        user: next,
        password: usersByEmail.get(normalizeEmail(next.email))!.password,
      })
    })

  const resetPassword: AuthService['resetPassword'] = (headers, id, payload) =>
    Effect.gen(function* () {
      yield* requireAdmin(headers)
      if (payload.password.length < 8) {
        return yield* Effect.fail({ _tag: 'ValidationError', message: 'Password too short' } as const)
      }
      const user = usersById.get(id)
      if (!user) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const)
      usersByEmail.set(normalizeEmail(user.email), { user, password: payload.password })
    })

  const authService: AuthService = {
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
  }

  const AuthTest = Layer.succeed(Auth, authService satisfies AuthService)

  const AuthEventRepoTest = Layer.succeed(AuthEventRepo, {
    write: (input: AuthEventWriteInput) =>
      Effect.sync(() => {
        events.push({
          eventId: nextEventId++,
          eventType: input.eventType,
          actorUserId: input.actorUserId ?? null,
          subjectUserId: input.subjectUserId ?? null,
          identifier: input.identifier ?? null,
          createdAt: nowIso(),
        })
      }),
    list: (query) =>
      Effect.sync(() => {
        const identifier = query.identifier?.trim().toLowerCase()
        return events.filter((e) => {
          if (query.actorUserId && e.actorUserId !== query.actorUserId) return false
          if (query.subjectUserId && e.subjectUserId !== query.subjectUserId) return false
          if (identifier && (e.identifier ?? '').toLowerCase() !== identifier) return false
          return true
        })
      }),
  } satisfies AuthEventRepoService)

  const seedUser = (input: SeedUserInput): UserDtoDto => {
    const status = input.status ?? 'active'
    const user: UserDtoDto = {
      id: String(nextUserId++),
      email: normalizeEmail(input.email),
      displayName: input.displayName,
      status,
      roles: input.roles ?? ['user'],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastLoginAt: null,
      disabledAt: status === 'disabled' ? nowIso() : null,
    }
    usersByEmail.set(user.email, { user, password: input.password })
    usersById.set(user.id, user)
    return user
  }

  return { AuthTest, AuthEventRepoTest, seedUser, events }
}
