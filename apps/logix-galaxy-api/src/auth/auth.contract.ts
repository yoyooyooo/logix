import { HttpApiEndpoint, HttpApiGroup } from '@effect/platform'
import { Schema } from 'effect'

export const UserStatus = Schema.Literal('active', 'disabled')
export const RoleCode = Schema.Literal('admin', 'user')

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

export const AuthEventType = Schema.Literal(
  'login_succeeded',
  'login_failed',
  'logout',
  'user_created',
  'user_disabled',
  'user_enabled',
  'password_reset',
)

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

export const AuthGroup = HttpApiGroup.make('Auth')
  .addError(ServiceUnavailableError, { status: 503 })
  .add(
    HttpApiEndpoint.post('authLogin')`/auth/login`
      .setPayload(AuthLoginRequest)
      .addSuccess(AuthLoginResponse)
      .addError(ValidationError, { status: 400 })
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 })
      .addError(TooManyRequestsError, { status: 429 }),
  )
  .add(
    HttpApiEndpoint.post('authLogout')`/auth/logout`
      .addSuccess(Schema.Void, { status: 204 })
      .addError(UnauthorizedError, { status: 401 }),
  )
  .add(HttpApiEndpoint.get('authMe')`/me`.addSuccess(UserDto).addError(UnauthorizedError, { status: 401 }))
  .add(
    HttpApiEndpoint.get('authEventList')`/auth/events`
      .setUrlParams(AuthEventListUrlParams)
      .addSuccess(Schema.Array(AuthEventDto))
      .addError(ValidationError, { status: 400 })
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 }),
  )
