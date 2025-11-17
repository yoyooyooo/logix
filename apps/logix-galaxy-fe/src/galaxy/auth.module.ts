import { Effect, Schema } from 'effect'
import * as Logix from '@logix/core'
import { galaxyApi } from '../galaxy-api/client'
import { tokenStorage } from '../galaxy-api/token'

const AuthPhaseSchema = Schema.Union(
  Schema.Literal('booting'),
  Schema.Literal('anonymous'),
  Schema.Literal('authenticated'),
)

export type AuthPhase = Schema.Schema.Type<typeof AuthPhaseSchema>

const AuthStateSchema = Schema.Struct({
  phase: AuthPhaseSchema,
  token: Schema.NullOr(Schema.String),
  user: Schema.NullOr(Schema.Any),
  pending: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
})

export type AuthState = Schema.Schema.Type<typeof AuthStateSchema>

const AuthLoginRequestSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
})

export const AuthDef = Logix.Module.make('GalaxyAuth', {
  state: AuthStateSchema,
  actions: {
    login: AuthLoginRequestSchema,
    logout: Schema.Void,

    // Internal Actions
    setPhase: AuthPhaseSchema,
    setPending: Schema.Boolean,
    setToken: Schema.NullOr(Schema.String),
    setUser: Schema.NullOr(Schema.Any),
    setError: Schema.NullOr(Schema.String),
  },
  reducers: {
    setPhase: (state, action) => ({ ...state, phase: action.payload }),
    setPending: (state, action) => ({ ...state, pending: action.payload }),
    setToken: (state, action) => ({ ...state, token: action.payload }),
    setUser: (state, action) => ({ ...state, user: action.payload }),
    setError: (state, action) => ({ ...state, error: action.payload }),
  },
})

export const AuthLogic = AuthDef.logic(($) => {
  const clearSession = (message?: string) =>
    Effect.gen(function* () {
      tokenStorage.clear()
      yield* $.actions.setToken(null)
      yield* $.actions.setUser(null)
      yield* $.actions.setPhase('anonymous')
      yield* $.actions.setPending(false)
      yield* $.actions.setError(message ?? null)
    })

  const bootstrapFromStorage = Effect.gen(function* () {
    const stored = tokenStorage.get()
    if (!stored) {
      yield* $.actions.setPhase('anonymous')
      yield* $.actions.setPending(false)
      return
    }

    yield* $.actions.setToken(stored)
    yield* $.actions.setPending(true)
    yield* $.actions.setError(null)

    const meEither = yield* Effect.tryPromise({
      try: () => galaxyApi.me(stored),
      catch: (e) => e,
    }).pipe(Effect.either)

    if (meEither._tag === 'Left') {
      return yield* clearSession(galaxyApi.toMessage(meEither.left))
    }

    yield* $.actions.setUser(meEither.right as any)
    yield* $.actions.setPhase('authenticated')
    yield* $.actions.setPending(false)
  })

  return {
    setup: Effect.void,
    run: Effect.gen(function* () {
      yield* bootstrapFromStorage

      yield* Effect.all([
        $.onAction('login').runLatest((action) =>
          Effect.gen(function* () {
            yield* $.actions.setPending(true)
            yield* $.actions.setError(null)

            const resEither = yield* Effect.tryPromise({
              try: () => galaxyApi.login(action.payload),
              catch: (e) => e,
            }).pipe(Effect.either)

            if (resEither._tag === 'Left') {
              yield* $.actions.setPending(false)
              yield* $.actions.setPhase('anonymous')
              yield* $.actions.setError(galaxyApi.toMessage(resEither.left))
              return
            }

            tokenStorage.set(resEither.right.token)
            yield* $.actions.setToken(resEither.right.token)
            yield* $.actions.setUser(resEither.right.user as any)
            yield* $.actions.setPhase('authenticated')
            yield* $.actions.setPending(false)
          }),
        ),

        $.onAction('logout').runLatest(() =>
          Effect.gen(function* () {
            const token = (yield* $.state.read).token
            yield* clearSession()
            if (!token) return
            yield* Effect.tryPromise({ try: () => galaxyApi.logout(token), catch: () => undefined }).pipe(Effect.asVoid)
          }),
        ),
      ], { concurrency: 'unbounded' })
    }),
  }
})

export const AuthModule = AuthDef.implement({
  initial: {
    phase: 'booting',
    token: null,
    user: null,
    pending: true,
    error: null,
  } satisfies AuthState,
  logics: [AuthLogic],
})

export const AuthImpl = AuthModule.impl
