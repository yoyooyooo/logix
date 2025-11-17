import { Context, Effect, Schema } from 'effect'

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ProjectAccessDto,
  ProjectAuditEventType,
  ProjectDto,
  ProjectGroupDto,
  ProjectGroupMemberDto,
  ProjectMemberDto,
  ProjectRoleKey,
  ValidationError,
} from './project.contract.js'

export type ProjectRoleKeyDto = Schema.Schema.Type<typeof ProjectRoleKey>
export type ProjectDtoDto = Schema.Schema.Type<typeof ProjectDto>
export type ProjectMemberDtoDto = Schema.Schema.Type<typeof ProjectMemberDto>
export type ProjectAccessDtoDto = Schema.Schema.Type<typeof ProjectAccessDto>
export type ProjectGroupDtoDto = Schema.Schema.Type<typeof ProjectGroupDto>
export type ProjectGroupMemberDtoDto = Schema.Schema.Type<typeof ProjectGroupMemberDto>
export type ProjectAuditEventTypeDto = Schema.Schema.Type<typeof ProjectAuditEventType>

export type ConflictErrorDto = Schema.Schema.Type<typeof ConflictError>
export type ForbiddenErrorDto = Schema.Schema.Type<typeof ForbiddenError>
export type NotFoundErrorDto = Schema.Schema.Type<typeof NotFoundError>
export type ValidationErrorDto = Schema.Schema.Type<typeof ValidationError>

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

export interface ProjectRepoService {
  readonly projectList: (userId: string) => Effect.Effect<ReadonlyArray<ProjectDtoDto>>
  readonly projectCreate: (input: {
    readonly createdByUserId: string
    readonly name: string
  }) => Effect.Effect<ProjectDtoDto, ValidationErrorDto | ConflictErrorDto>

  readonly projectGetForMember: (input: {
    readonly projectId: number
    readonly userId: string
  }) => Effect.Effect<ProjectDtoDto, ForbiddenErrorDto | NotFoundErrorDto>

  readonly projectUpdateForMember: (input: {
    readonly projectId: number
    readonly userId: string
    readonly patch: { readonly name?: string | undefined }
  }) => Effect.Effect<ProjectDtoDto, ForbiddenErrorDto | NotFoundErrorDto | ValidationErrorDto | ConflictErrorDto>

  readonly accessMe: (input: {
    readonly projectId: number
    readonly userId: string
  }) => Effect.Effect<ProjectAccessDtoDto, ForbiddenErrorDto | NotFoundErrorDto>

  readonly accessGet: (input: {
    readonly projectId: number
    readonly userId: string
  }) => Effect.Effect<ProjectAccessDtoDto, NotFoundErrorDto>

  readonly memberList: (input: {
    readonly projectId: number
  }) => Effect.Effect<ReadonlyArray<ProjectMemberDtoDto>, NotFoundErrorDto>

  readonly memberGetDirectRole: (input: {
    readonly projectId: number
    readonly userId: string
  }) => Effect.Effect<ProjectRoleKeyDto, NotFoundErrorDto>

  readonly memberAddByEmail: (input: {
    readonly projectId: number
    readonly createdByUserId: string
    readonly email: string
    readonly roleKey: ProjectRoleKeyDto
  }) => Effect.Effect<ProjectMemberDtoDto, ValidationErrorDto | NotFoundErrorDto | ConflictErrorDto>

  readonly memberUpdateRole: (input: {
    readonly projectId: number
    readonly userId: string
    readonly nextRoleKey: ProjectRoleKeyDto
  }) => Effect.Effect<ProjectMemberDtoDto, NotFoundErrorDto | ConflictErrorDto>

  readonly memberRemove: (input: {
    readonly projectId: number
    readonly userId: string
  }) => Effect.Effect<void, NotFoundErrorDto | ConflictErrorDto>

  readonly groupList: (input: { readonly projectId: number }) => Effect.Effect<ReadonlyArray<ProjectGroupDtoDto>, NotFoundErrorDto>

  readonly groupGetRoleKey: (input: {
    readonly projectId: number
    readonly groupId: number
  }) => Effect.Effect<ProjectRoleKeyDto, NotFoundErrorDto>

  readonly groupCreate: (input: {
    readonly projectId: number
    readonly createdByUserId: string
    readonly name: string
    readonly roleKey: ProjectRoleKeyDto
  }) => Effect.Effect<ProjectGroupDtoDto, ValidationErrorDto | NotFoundErrorDto | ConflictErrorDto>

  readonly groupUpdate: (input: {
    readonly projectId: number
    readonly groupId: number
    readonly patch: { readonly name?: string | undefined; readonly roleKey?: ProjectRoleKeyDto | undefined }
  }) => Effect.Effect<ProjectGroupDtoDto, NotFoundErrorDto | ValidationErrorDto | ConflictErrorDto>

  readonly groupDelete: (input: { readonly projectId: number; readonly groupId: number }) => Effect.Effect<void, NotFoundErrorDto>

  readonly groupMemberList: (input: {
    readonly projectId: number
    readonly groupId: number
  }) => Effect.Effect<ReadonlyArray<ProjectGroupMemberDtoDto>, NotFoundErrorDto>

  readonly groupMemberAdd: (input: {
    readonly projectId: number
    readonly groupId: number
    readonly createdByUserId: string
    readonly userId: string
  }) => Effect.Effect<ProjectGroupMemberDtoDto, ValidationErrorDto | NotFoundErrorDto | ConflictErrorDto>

  readonly groupMemberRemove: (input: {
    readonly projectId: number
    readonly groupId: number
    readonly userId: string
  }) => Effect.Effect<void, NotFoundErrorDto>
}

export class ProjectRepo extends Context.Tag('ProjectRepo')<ProjectRepo, ProjectRepoService>() {}

