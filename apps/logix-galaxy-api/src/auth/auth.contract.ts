import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi'
import { Schema } from 'effect'

export const UserStatus = Schema.Union([Schema.Literal('active'), Schema.Literal('disabled')])
export const RoleCode = Schema.Union([Schema.Literal('admin'), Schema.Literal('user')])

export const UserDto = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  displayName: Schema.String,
  status: UserStatus,
  roles: Schema.Array(RoleCode),
  createdAt: Schema.String,
  updatedAt: Schema.String,
  lastLoginAt: Schema.NullOr(Schema.String),
  disabledAt: Schema.NullOr(Schema.String),
})

export const AuthLoginRequest = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
})

export const AuthLoginResponse = Schema.Struct({
  token: Schema.String,
  expiresAt: Schema.String,
  user: UserDto,
})

export const AuthEventType = Schema.Union([
  Schema.Literal('login_succeeded'),
  Schema.Literal('login_failed'),
  Schema.Literal('logout'),
  Schema.Literal('user_created'),
  Schema.Literal('user_disabled'),
  Schema.Literal('user_enabled'),
  Schema.Literal('password_reset'),
])

export const AuthEventDto = Schema.Struct({
  eventId: Schema.Number,
  eventType: AuthEventType,
  actorUserId: Schema.NullOr(Schema.String),
  subjectUserId: Schema.NullOr(Schema.String),
  identifier: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
})

export const AuthEventListUrlParams = Schema.Struct({
  from: Schema.optional(Schema.String),
  to: Schema.optional(Schema.String),
  subjectUserId: Schema.optional(Schema.String),
  actorUserId: Schema.optional(Schema.String),
  identifier: Schema.optional(Schema.String),
})

export const UnauthorizedError = Schema.Struct({
  _tag: Schema.Literal('UnauthorizedError'),
  message: Schema.String,
})

export const ForbiddenError = Schema.Struct({
  _tag: Schema.Literal('ForbiddenError'),
  message: Schema.String,
})

export const ConflictError = Schema.Struct({
  _tag: Schema.Literal('ConflictError'),
  message: Schema.String,
})

export const ValidationError = Schema.Struct({
  _tag: Schema.Literal('ValidationError'),
  message: Schema.String,
})

export const NotFoundError = Schema.Struct({
  _tag: Schema.Literal('NotFoundError'),
  message: Schema.String,
})

export const TooManyRequestsError = Schema.Struct({
  _tag: Schema.Literal('TooManyRequestsError'),
  message: Schema.String,
})

export const ServiceUnavailableError = Schema.Struct({
  _tag: Schema.Literal('ServiceUnavailableError'),
  message: Schema.String,
})

const AuthCommonErrors = [
  ValidationError.pipe(HttpApiSchema.status(400)),
  UnauthorizedError.pipe(HttpApiSchema.status(401)),
  ForbiddenError.pipe(HttpApiSchema.status(403)),
  TooManyRequestsError.pipe(HttpApiSchema.status(429)),
  ServiceUnavailableError.pipe(HttpApiSchema.status(503)),
] as const

export const AuthGroup = HttpApiGroup.make('Auth')
  .add(
    HttpApiEndpoint.post('authLogin', '/auth/login', {
      payload: AuthLoginRequest,
      success: AuthLoginResponse,
      error: AuthCommonErrors,
    }),
    HttpApiEndpoint.post('authLogout', '/auth/logout', {
      success: HttpApiSchema.NoContent,
      error: [UnauthorizedError.pipe(HttpApiSchema.status(401)), ServiceUnavailableError.pipe(HttpApiSchema.status(503))],
    }),
    HttpApiEndpoint.get('authMe', '/me', {
      success: UserDto,
      error: [UnauthorizedError.pipe(HttpApiSchema.status(401)), ServiceUnavailableError.pipe(HttpApiSchema.status(503))],
    }),
    HttpApiEndpoint.get('authEventList', '/auth/events', {
      query: {
        from: Schema.optional(Schema.String),
        to: Schema.optional(Schema.String),
        subjectUserId: Schema.optional(Schema.String),
        actorUserId: Schema.optional(Schema.String),
        identifier: Schema.optional(Schema.String),
      },
      success: Schema.Array(AuthEventDto),
      error: [
        ValidationError.pipe(HttpApiSchema.status(400)),
        UnauthorizedError.pipe(HttpApiSchema.status(401)),
        ForbiddenError.pipe(HttpApiSchema.status(403)),
        ServiceUnavailableError.pipe(HttpApiSchema.status(503)),
      ],
    }),
  )
