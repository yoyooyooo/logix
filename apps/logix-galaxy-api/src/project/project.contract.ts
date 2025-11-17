import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform'
import { Schema } from 'effect'

import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../auth/auth.contract.js'
export { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../auth/auth.contract.js'

export const ProjectRoleKey = Schema.Literal('owner', 'admin', 'member', 'viewer')

export const ProjectPermissionKey = Schema.Literal(
  'project.read',
  'project.update',
  'member.read',
  'member.manage',
  'group.read',
  'group.manage',
  'audit.read',
  'owner.manage',
)

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

export const ProjectAuditEventType = Schema.Literal(
  'project_created',
  'member_added',
  'member_removed',
  'member_role_changed',
  'group_created',
  'group_deleted',
  'group_member_added',
  'group_member_removed',
  'group_role_changed',
)

export const ProjectAuditEventDto = Schema.Struct({
  eventId: Schema.Number,
  projectId: Schema.Number,
  eventType: ProjectAuditEventType,
  actorUserId: Schema.NullOr(Schema.String),
  subjectUserId: Schema.NullOr(Schema.String),
  subjectGroupId: Schema.NullOr(Schema.Number),
  createdAt: Schema.String,
  detail: Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
})

export const ProjectAuditEventListUrlParams = Schema.Struct({
  from: Schema.optional(Schema.String),
  to: Schema.optional(Schema.String),
  eventType: Schema.optional(ProjectAuditEventType),
  actorUserId: Schema.optional(Schema.String),
  subjectUserId: Schema.optional(Schema.String),
  subjectGroupId: Schema.optional(Schema.NumberFromString),
})

export const ProjectGroup = HttpApiGroup.make('Project')
  .addError(ValidationError, { status: 400 })
  .addError(UnauthorizedError, { status: 401 })
  .addError(ForbiddenError, { status: 403 })
  .addError(NotFoundError, { status: 404 })
  .addError(ConflictError, { status: 409 })
  .add(HttpApiEndpoint.get('projectList')`/projects`.addSuccess(Schema.Array(ProjectDto)))
  .add(HttpApiEndpoint.post('projectCreate')`/projects`.setPayload(ProjectCreateRequest).addSuccess(ProjectDto, { status: 201 }))
  .add(
    HttpApiEndpoint.get('projectGet')`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}`.addSuccess(
      ProjectDto,
    ),
  )
  .add(
    HttpApiEndpoint.patch('projectUpdate')`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}`
      .setPayload(ProjectUpdateRequest)
      .addSuccess(ProjectDto),
  )
  .add(
    HttpApiEndpoint.get(
      'projectAccessMe',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/access`.addSuccess(ProjectAccessDto),
  )
  .add(
    HttpApiEndpoint.get(
      'projectMemberList',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/members`.addSuccess(
      Schema.Array(ProjectMemberDto),
    ),
  )
  .add(
    HttpApiEndpoint.post(
      'projectMemberAdd',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/members`
      .setPayload(ProjectMemberAddRequest)
      .addSuccess(ProjectMemberDto, { status: 201 }),
  )
  .add(
    HttpApiEndpoint.patch(
      'projectMemberUpdateRole',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/members/${HttpApiSchema.param('userId', Schema.String)}`
      .setPayload(ProjectMemberUpdateRoleRequest)
      .addSuccess(ProjectMemberDto),
  )
  .add(
    HttpApiEndpoint.del(
      'projectMemberRemove',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/members/${HttpApiSchema.param('userId', Schema.String)}`.addSuccess(
      Schema.Void,
      { status: 204 },
    ),
  )
  .add(
    HttpApiEndpoint.get(
      'projectAccessGet',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/members/${HttpApiSchema.param('userId', Schema.String)}/access`.addSuccess(
      ProjectAccessDto,
    ),
  )
  .add(
    HttpApiEndpoint.get(
      'projectGroupList',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/groups`.addSuccess(
      Schema.Array(ProjectGroupDto),
    ),
  )
  .add(
    HttpApiEndpoint.post(
      'projectGroupCreate',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/groups`
      .setPayload(ProjectGroupCreateRequest)
      .addSuccess(ProjectGroupDto, { status: 201 }),
  )
  .add(
    HttpApiEndpoint.patch(
      'projectGroupUpdate',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/groups/${HttpApiSchema.param('groupId', Schema.NumberFromString)}`
      .setPayload(ProjectGroupUpdateRequest)
      .addSuccess(ProjectGroupDto),
  )
  .add(
    HttpApiEndpoint.del(
      'projectGroupDelete',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/groups/${HttpApiSchema.param('groupId', Schema.NumberFromString)}`.addSuccess(
      Schema.Void,
      { status: 204 },
    ),
  )
  .add(
    HttpApiEndpoint.get(
      'projectGroupMemberList',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/groups/${HttpApiSchema.param('groupId', Schema.NumberFromString)}/members`.addSuccess(
      Schema.Array(ProjectGroupMemberDto),
    ),
  )
  .add(
    HttpApiEndpoint.post(
      'projectGroupMemberAdd',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/groups/${HttpApiSchema.param('groupId', Schema.NumberFromString)}/members`
      .setPayload(ProjectGroupMemberAddRequest)
      .addSuccess(ProjectGroupMemberDto, { status: 201 }),
  )
  .add(
    HttpApiEndpoint.del(
      'projectGroupMemberRemove',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/groups/${HttpApiSchema.param('groupId', Schema.NumberFromString)}/members/${HttpApiSchema.param('userId', Schema.String)}`.addSuccess(
      Schema.Void,
      { status: 204 },
    ),
  )
  .add(
    HttpApiEndpoint.get(
      'projectAuditEventList',
    )`/projects/${HttpApiSchema.param('projectId', Schema.NumberFromString)}/audit-events`
      .setUrlParams(ProjectAuditEventListUrlParams)
      .addSuccess(Schema.Array(ProjectAuditEventDto)),
  )
