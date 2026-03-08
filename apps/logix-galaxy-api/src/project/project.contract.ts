import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/unstable/httpapi'
import { Schema } from 'effect'

import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../auth/auth.contract.js'
export { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../auth/auth.contract.js'

export const ProjectRoleKey = Schema.Union([
  Schema.Literal('owner'),
  Schema.Literal('admin'),
  Schema.Literal('member'),
  Schema.Literal('viewer'),
])

export const ProjectPermissionKey = Schema.Union([
  Schema.Literal('project.read'),
  Schema.Literal('project.update'),
  Schema.Literal('member.read'),
  Schema.Literal('member.manage'),
  Schema.Literal('group.read'),
  Schema.Literal('group.manage'),
  Schema.Literal('audit.read'),
  Schema.Literal('owner.manage'),
])

export const UserSummaryDto = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  displayName: Schema.String,
})

export const ProjectDto = Schema.Struct({
  projectId: Schema.Number,
  name: Schema.String,
  createdAt: Schema.String,
  updatedAt: Schema.String,
})

export const ProjectCreateRequest = Schema.Struct({
  name: Schema.String,
})

export const ProjectUpdateRequest = Schema.Struct({
  name: Schema.optional(Schema.String),
})

export const ProjectAccessDto = Schema.Struct({
  projectId: Schema.Number,
  userId: Schema.String,
  directRole: ProjectRoleKey,
  groupRoleKeys: Schema.Array(ProjectRoleKey),
  effectiveRoleKeys: Schema.Array(ProjectRoleKey),
  effectivePermissionKeys: Schema.Array(ProjectPermissionKey),
})

export const ProjectMemberDto = Schema.Struct({
  user: UserSummaryDto,
  directRole: ProjectRoleKey,
  groupRoleKeys: Schema.Array(ProjectRoleKey),
  effectiveRoleKeys: Schema.Array(ProjectRoleKey),
  effectivePermissionKeys: Schema.Array(ProjectPermissionKey),
  createdAt: Schema.String,
})

export const ProjectMemberAddRequest = Schema.Struct({
  email: Schema.String,
  roleKey: ProjectRoleKey,
})

export const ProjectMemberUpdateRoleRequest = Schema.Struct({
  roleKey: ProjectRoleKey,
})

export const ProjectGroupDto = Schema.Struct({
  groupId: Schema.Number,
  projectId: Schema.Number,
  name: Schema.String,
  roleKey: ProjectRoleKey,
  createdAt: Schema.String,
})

export const ProjectGroupCreateRequest = Schema.Struct({
  name: Schema.String,
  roleKey: ProjectRoleKey,
})

export const ProjectGroupUpdateRequest = Schema.Struct({
  name: Schema.optional(Schema.String),
  roleKey: Schema.optional(ProjectRoleKey),
})

export const ProjectGroupMemberDto = Schema.Struct({
  user: UserSummaryDto,
  createdAt: Schema.String,
})

export const ProjectGroupMemberAddRequest = Schema.Struct({
  userId: Schema.String,
})

export const ProjectAuditEventType = Schema.Union([
  Schema.Literal('project_created'),
  Schema.Literal('member_added'),
  Schema.Literal('member_removed'),
  Schema.Literal('member_role_changed'),
  Schema.Literal('group_created'),
  Schema.Literal('group_deleted'),
  Schema.Literal('group_member_added'),
  Schema.Literal('group_member_removed'),
  Schema.Literal('group_role_changed'),
])

export const ProjectAuditEventDto = Schema.Struct({
  eventId: Schema.Number,
  projectId: Schema.Number,
  eventType: ProjectAuditEventType,
  actorUserId: Schema.NullOr(Schema.String),
  subjectUserId: Schema.NullOr(Schema.String),
  subjectGroupId: Schema.NullOr(Schema.Number),
  createdAt: Schema.String,
  detail: Schema.NullOr(Schema.Record(Schema.String, Schema.Unknown)),
})

const ProjectCommonErrors = [
  ValidationError.pipe(HttpApiSchema.status(400)),
  UnauthorizedError.pipe(HttpApiSchema.status(401)),
  ForbiddenError.pipe(HttpApiSchema.status(403)),
  NotFoundError.pipe(HttpApiSchema.status(404)),
  ConflictError.pipe(HttpApiSchema.status(409)),
] as const

export const ProjectGroup = HttpApiGroup.make('Project').add(
  HttpApiEndpoint.get('projectList', '/projects', {
    success: Schema.Array(ProjectDto),
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.post('projectCreate', '/projects', {
    payload: ProjectCreateRequest,
    success: ProjectDto.pipe(HttpApiSchema.status(201)),
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.get('projectGet', '/projects/:projectId', {
    params: { projectId: Schema.NumberFromString },
    success: ProjectDto,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.patch('projectUpdate', '/projects/:projectId', {
    params: { projectId: Schema.NumberFromString },
    payload: ProjectUpdateRequest,
    success: ProjectDto,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.get('projectAccessMe', '/projects/:projectId/access', {
    params: { projectId: Schema.NumberFromString },
    success: ProjectAccessDto,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.get('projectMemberList', '/projects/:projectId/members', {
    params: { projectId: Schema.NumberFromString },
    success: Schema.Array(ProjectMemberDto),
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.post('projectMemberAdd', '/projects/:projectId/members', {
    params: { projectId: Schema.NumberFromString },
    payload: ProjectMemberAddRequest,
    success: ProjectMemberDto.pipe(HttpApiSchema.status(201)),
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.patch('projectMemberUpdateRole', '/projects/:projectId/members/:userId', {
    params: {
      projectId: Schema.NumberFromString,
      userId: Schema.String,
    },
    payload: ProjectMemberUpdateRoleRequest,
    success: ProjectMemberDto,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.delete('projectMemberRemove', '/projects/:projectId/members/:userId', {
    params: {
      projectId: Schema.NumberFromString,
      userId: Schema.String,
    },
    success: HttpApiSchema.NoContent,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.get('projectAccessGet', '/projects/:projectId/members/:userId/access', {
    params: {
      projectId: Schema.NumberFromString,
      userId: Schema.String,
    },
    success: ProjectAccessDto,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.get('projectGroupList', '/projects/:projectId/groups', {
    params: { projectId: Schema.NumberFromString },
    success: Schema.Array(ProjectGroupDto),
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.post('projectGroupCreate', '/projects/:projectId/groups', {
    params: { projectId: Schema.NumberFromString },
    payload: ProjectGroupCreateRequest,
    success: ProjectGroupDto.pipe(HttpApiSchema.status(201)),
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.patch('projectGroupUpdate', '/projects/:projectId/groups/:groupId', {
    params: {
      projectId: Schema.NumberFromString,
      groupId: Schema.NumberFromString,
    },
    payload: ProjectGroupUpdateRequest,
    success: ProjectGroupDto,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.delete('projectGroupDelete', '/projects/:projectId/groups/:groupId', {
    params: {
      projectId: Schema.NumberFromString,
      groupId: Schema.NumberFromString,
    },
    success: HttpApiSchema.NoContent,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.get('projectGroupMemberList', '/projects/:projectId/groups/:groupId/members', {
    params: {
      projectId: Schema.NumberFromString,
      groupId: Schema.NumberFromString,
    },
    success: Schema.Array(ProjectGroupMemberDto),
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.post('projectGroupMemberAdd', '/projects/:projectId/groups/:groupId/members', {
    params: {
      projectId: Schema.NumberFromString,
      groupId: Schema.NumberFromString,
    },
    payload: ProjectGroupMemberAddRequest,
    success: ProjectGroupMemberDto.pipe(HttpApiSchema.status(201)),
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.delete('projectGroupMemberRemove', '/projects/:projectId/groups/:groupId/members/:userId', {
    params: {
      projectId: Schema.NumberFromString,
      groupId: Schema.NumberFromString,
      userId: Schema.String,
    },
    success: HttpApiSchema.NoContent,
    error: ProjectCommonErrors,
  }),
  HttpApiEndpoint.get('projectAuditEventList', '/projects/:projectId/audit-events', {
    params: {
      projectId: Schema.NumberFromString,
    },
    query: {
      from: Schema.optional(Schema.String),
      to: Schema.optional(Schema.String),
      eventType: Schema.optional(ProjectAuditEventType),
      actorUserId: Schema.optional(Schema.String),
      subjectUserId: Schema.optional(Schema.String),
      subjectGroupId: Schema.optional(Schema.NumberFromString),
    },
    success: Schema.Array(ProjectAuditEventDto),
    error: ProjectCommonErrors,
  }),
)

export const ProjectApi = HttpApi.make('EffectApi').add(ProjectGroup)
