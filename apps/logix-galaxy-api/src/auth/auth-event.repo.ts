import { Context, Effect, Schema } from 'effect'

import { DbError } from '../db/db.js'
import { AuthEventDto, AuthEventType } from './auth.contract.js'

export type AuthEventDtoDto = Schema.Schema.Type<typeof AuthEventDto>
export type AuthEventTypeDto = Schema.Schema.Type<typeof AuthEventType>

export interface AuthEventWriteInput {
  readonly eventType: AuthEventTypeDto
  readonly actorUserId?: string | undefined
  readonly subjectUserId?: string | undefined
  readonly identifier?: string | undefined
  readonly ip?: string | undefined
  readonly userAgent?: string | undefined
  readonly detail?: Readonly<Record<string, unknown>> | undefined
}

export interface AuthEventListQuery {
  readonly from?: string | undefined
  readonly to?: string | undefined
  readonly subjectUserId?: string | undefined
  readonly actorUserId?: string | undefined
  readonly identifier?: string | undefined
}

export interface AuthEventRepoService {
  readonly write: (input: AuthEventWriteInput) => Effect.Effect<void, DbError>
  readonly list: (query: AuthEventListQuery) => Effect.Effect<ReadonlyArray<AuthEventDtoDto>, DbError>
}

export class AuthEventRepo extends Context.Tag('AuthEventRepo')<AuthEventRepo, AuthEventRepoService>() {}
