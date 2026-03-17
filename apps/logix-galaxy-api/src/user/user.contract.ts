import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi'
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

const UserCommonErrors = [
  ValidationError.pipe(HttpApiSchema.status(400)),
  UnauthorizedError.pipe(HttpApiSchema.status(401)),
  ForbiddenError.pipe(HttpApiSchema.status(403)),
  NotFoundError.pipe(HttpApiSchema.status(404)),
  ConflictError.pipe(HttpApiSchema.status(409)),
  ServiceUnavailableError.pipe(HttpApiSchema.status(503)),
] as const

export const UserGroup = HttpApiGroup.make('User')
  .add(
    HttpApiEndpoint.post('userCreate', '/users', {
      payload: UserCreateRequest,
      success: UserDto.pipe(HttpApiSchema.status(201)),
      error: UserCommonErrors,
    }),
    HttpApiEndpoint.get('userList', '/users', {
      query: {
        q: Schema.optional(Schema.String),
        status: Schema.optional(UserStatus),
      },
      success: Schema.Array(UserDto),
      error: [
        UnauthorizedError.pipe(HttpApiSchema.status(401)),
        ForbiddenError.pipe(HttpApiSchema.status(403)),
        ServiceUnavailableError.pipe(HttpApiSchema.status(503)),
      ],
    }),
    HttpApiEndpoint.get('userGet', '/users/:id', {
      params: { id: Schema.String },
      success: UserDto,
      error: [
        UnauthorizedError.pipe(HttpApiSchema.status(401)),
        ForbiddenError.pipe(HttpApiSchema.status(403)),
        NotFoundError.pipe(HttpApiSchema.status(404)),
        ServiceUnavailableError.pipe(HttpApiSchema.status(503)),
      ],
    }),
    HttpApiEndpoint.patch('userUpdate', '/users/:id', {
      params: { id: Schema.String },
      payload: UserUpdateRequest,
      success: UserDto,
      error: UserCommonErrors,
    }),
    HttpApiEndpoint.post('userDisable', '/users/:id/disable', {
      params: { id: Schema.String },
      success: HttpApiSchema.NoContent,
      error: [
        UnauthorizedError.pipe(HttpApiSchema.status(401)),
        ForbiddenError.pipe(HttpApiSchema.status(403)),
        NotFoundError.pipe(HttpApiSchema.status(404)),
        ServiceUnavailableError.pipe(HttpApiSchema.status(503)),
      ],
    }),
    HttpApiEndpoint.post('userEnable', '/users/:id/enable', {
      params: { id: Schema.String },
      success: HttpApiSchema.NoContent,
      error: [
        UnauthorizedError.pipe(HttpApiSchema.status(401)),
        ForbiddenError.pipe(HttpApiSchema.status(403)),
        NotFoundError.pipe(HttpApiSchema.status(404)),
        ServiceUnavailableError.pipe(HttpApiSchema.status(503)),
      ],
    }),
    HttpApiEndpoint.post('userResetPassword', '/users/:id/reset-password', {
      params: { id: Schema.String },
      payload: UserResetPasswordRequest,
      success: HttpApiSchema.NoContent,
      error: UserCommonErrors,
    }),
  )
