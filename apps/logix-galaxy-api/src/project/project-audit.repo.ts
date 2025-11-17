import { Context, Effect, Schema } from 'effect'

import { DbError } from '../db/db.js'
import { ProjectAuditEventDto, ProjectAuditEventType } from './project.contract.js'

export type ProjectAuditEventTypeDto = Schema.Schema.Type<typeof ProjectAuditEventType>
export type ProjectAuditEventDtoDto = Schema.Schema.Type<typeof ProjectAuditEventDto>

export interface ProjectAuditWriteInput {
  readonly projectId: number
  readonly eventType: ProjectAuditEventTypeDto
  readonly actorUserId?: string | undefined
  readonly subjectUserId?: string | undefined
  readonly subjectGroupId?: number | undefined
  readonly detail?: Readonly<Record<string, unknown>> | undefined
}

export interface ProjectAuditListQuery {
  readonly projectId: number
  readonly from?: string | undefined
  readonly to?: string | undefined
  readonly eventType?: ProjectAuditEventTypeDto | undefined
  readonly actorUserId?: string | undefined
  readonly subjectUserId?: string | undefined
  readonly subjectGroupId?: number | undefined
}

export interface ProjectAuditRepoService {
  readonly write: (input: ProjectAuditWriteInput) => Effect.Effect<void, DbError>
  readonly list: (query: ProjectAuditListQuery) => Effect.Effect<ReadonlyArray<ProjectAuditEventDtoDto>, DbError>
}

export class ProjectAuditRepo extends Context.Tag('ProjectAuditRepo')<ProjectAuditRepo, ProjectAuditRepoService>() {}

