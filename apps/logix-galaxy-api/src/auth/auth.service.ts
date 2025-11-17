import { Context, Effect, Schema } from 'effect'

import {
  AuthLoginRequest,
  AuthLoginResponse,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  UserDto,
  ValidationError,
} from './auth.contract.js'
import { UserCreateRequest, UserUpdateRequest } from '../user/user.contract.js'

export type AuthLoginRequestDto = Schema.Schema.Type<typeof AuthLoginRequest>
export type AuthLoginResponseDto = Schema.Schema.Type<typeof AuthLoginResponse>
export type UserDtoDto = Schema.Schema.Type<typeof UserDto>

export type UnauthorizedErrorDto = Schema.Schema.Type<typeof UnauthorizedError>
export type ForbiddenErrorDto = Schema.Schema.Type<typeof ForbiddenError>
export type ConflictErrorDto = Schema.Schema.Type<typeof ConflictError>
export type ValidationErrorDto = Schema.Schema.Type<typeof ValidationError>
export type NotFoundErrorDto = Schema.Schema.Type<typeof NotFoundError>
export type TooManyRequestsErrorDto = Schema.Schema.Type<typeof TooManyRequestsError>
export type ServiceUnavailableErrorDto = Schema.Schema.Type<typeof ServiceUnavailableError>

export type UserCreateRequestDto = Schema.Schema.Type<typeof UserCreateRequest>
export type UserUpdateRequestDto = Schema.Schema.Type<typeof UserUpdateRequest>

export interface AuthHeaders {
  readonly authorization?: string | undefined
}

export interface AuthService {
  readonly login: (
    payload: AuthLoginRequestDto,
  ) => Effect.Effect<
    AuthLoginResponseDto,
    ValidationErrorDto | UnauthorizedErrorDto | ForbiddenErrorDto | TooManyRequestsErrorDto | ServiceUnavailableErrorDto
  >

  readonly me: (headers: AuthHeaders) => Effect.Effect<UserDtoDto, UnauthorizedErrorDto | ServiceUnavailableErrorDto>

  readonly logout: (headers: AuthHeaders) => Effect.Effect<void, UnauthorizedErrorDto | ServiceUnavailableErrorDto>

  readonly requireAdmin: (
    headers: AuthHeaders,
  ) => Effect.Effect<UserDtoDto, UnauthorizedErrorDto | ForbiddenErrorDto | ServiceUnavailableErrorDto>

  readonly createUser: (
    headers: AuthHeaders,
    payload: UserCreateRequestDto,
  ) => Effect.Effect<
    UserDtoDto,
    ValidationErrorDto | ConflictErrorDto | UnauthorizedErrorDto | ForbiddenErrorDto | ServiceUnavailableErrorDto
  >

  readonly listUsers: (
    headers: AuthHeaders,
    urlParams: { readonly q?: string | undefined; readonly status?: 'active' | 'disabled' | undefined },
  ) => Effect.Effect<ReadonlyArray<UserDtoDto>, UnauthorizedErrorDto | ForbiddenErrorDto | ServiceUnavailableErrorDto>

  readonly getUser: (
    headers: AuthHeaders,
    id: string,
  ) => Effect.Effect<
    UserDtoDto,
    UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto
  >

  readonly updateUser: (
    headers: AuthHeaders,
    id: string,
    payload: UserUpdateRequestDto,
  ) => Effect.Effect<
    UserDtoDto,
    ValidationErrorDto | UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto
  >

  readonly disableUser: (
    headers: AuthHeaders,
    id: string,
  ) => Effect.Effect<void, UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto>

  readonly enableUser: (
    headers: AuthHeaders,
    id: string,
  ) => Effect.Effect<void, UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto>

  readonly resetPassword: (
    headers: AuthHeaders,
    id: string,
    payload: { readonly password: string },
  ) => Effect.Effect<
    void,
    ValidationErrorDto | UnauthorizedErrorDto | ForbiddenErrorDto | NotFoundErrorDto | ServiceUnavailableErrorDto
  >
}

export class Auth extends Context.Tag('Auth')<Auth, AuthService>() {}
