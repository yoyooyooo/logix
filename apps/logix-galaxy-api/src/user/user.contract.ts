import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RoleCode,
  ServiceUnavailableError,
  UnauthorizedError,
  UserDto,
  UserStatus,
  ValidationError,
} from '../auth/auth.contract.js'

export const UserListUrlParams = Schema.Struct({
  q: Schema.optional(Schema.String),
  status: Schema.optional(UserStatus),
})

export const UserCreateRequest = Schema.Struct({
  email: Schema.String,
  displayName: Schema.String,
  password: Schema.String,
  roles: Schema.optional(Schema.Array(RoleCode)),
})

export const UserUpdateRequest = Schema.Struct({
  displayName: Schema.optional(Schema.String),
})

export const UserResetPasswordRequest = Schema.Struct({
  password: Schema.String,
})

export const UserGroup = HttpApiGroup.make('User')
  .addError(ServiceUnavailableError, { status: 503 })
  .add(
    HttpApiEndpoint.post('userCreate')`/users`
      .setPayload(UserCreateRequest)
      .addSuccess(UserDto, { status: 201 })
      .addError(ValidationError, { status: 400 })
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 })
      .addError(ConflictError, { status: 409 }),
  )
  .add(
    HttpApiEndpoint.get('userList')`/users`
      .setUrlParams(UserListUrlParams)
      .addSuccess(Schema.Array(UserDto))
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 }),
  )
  .add(
    HttpApiEndpoint.get('userGet')`/users/${HttpApiSchema.param('id', Schema.String)}`
      .addSuccess(UserDto)
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 })
      .addError(NotFoundError, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.patch('userUpdate')`/users/${HttpApiSchema.param('id', Schema.String)}`
      .setPayload(UserUpdateRequest)
      .addSuccess(UserDto)
      .addError(ValidationError, { status: 400 })
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 })
      .addError(NotFoundError, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.post('userDisable')`/users/${HttpApiSchema.param('id', Schema.String)}/disable`
      .addSuccess(Schema.Void, { status: 204 })
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 })
      .addError(NotFoundError, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.post('userEnable')`/users/${HttpApiSchema.param('id', Schema.String)}/enable`
      .addSuccess(Schema.Void, { status: 204 })
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 })
      .addError(NotFoundError, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.post('userResetPassword')`/users/${HttpApiSchema.param('id', Schema.String)}/reset-password`
      .setPayload(UserResetPasswordRequest)
      .addSuccess(Schema.Void, { status: 204 })
      .addError(ValidationError, { status: 400 })
      .addError(UnauthorizedError, { status: 401 })
      .addError(ForbiddenError, { status: 403 })
      .addError(NotFoundError, { status: 404 }),
  )
