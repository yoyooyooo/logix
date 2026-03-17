import * as Headers from 'effect/unstable/http/Headers'
import * as HttpServerRequest from 'effect/unstable/http/HttpServerRequest'
import { HttpApiBuilder } from 'effect/unstable/httpapi'
import { Effect, Option } from 'effect'

import { Auth, type AuthHeaders } from '../auth/auth.service.js'
import { ProjectAuditRepo } from './project-audit.repo.js'
import { ProjectApi } from './project.contract.js'
import { hasPermission } from './project.rbac.js'
import { ProjectRepo } from './project.repo.js'

const unauthorized = (): { readonly _tag: 'UnauthorizedError'; readonly message: string } => ({
  _tag: 'UnauthorizedError',
  message: 'Unauthorized',
})

const forbidden = (): { readonly _tag: 'ForbiddenError'; readonly message: string } => ({
  _tag: 'ForbiddenError',
  message: 'Forbidden',
})

const getAuthHeaders = Effect.gen(function* () {
  const req = yield* HttpServerRequest.HttpServerRequest
  const authorization = Headers.get(req.headers, 'authorization')
  return { authorization } satisfies AuthHeaders
})

const requireMe = Effect.gen(function* () {
  const auth = yield* Effect.service(Auth)
  const headers = yield* getAuthHeaders
  return yield* auth.me(headers).pipe(
    Effect.mapError((e) => (e._tag === 'ServiceUnavailableError' ? unauthorized() : e)),
  )
})

const validateIsoRange = (from: string | undefined, to: string | undefined) =>
  Effect.gen(function* () {
    if (from !== undefined && Number.isNaN(Date.parse(from))) {
      return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid from' } as const)
    }
    if (to !== undefined && Number.isNaN(Date.parse(to))) {
      return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid to' } as const)
    }
    if (from !== undefined && to !== undefined && Date.parse(from) > Date.parse(to)) {
      return yield* Effect.fail({ _tag: 'ValidationError', message: 'from must be <= to' } as const)
    }
  })

const authorize = (projectId: number, requiredPermissionKey?: any) =>
  Effect.gen(function* () {
    const repo = yield* Effect.service(ProjectRepo)
    const me = yield* requireMe

    const access = yield* repo.accessMe({ projectId, userId: me.id })

    if (requiredPermissionKey && !hasPermission(access as any, requiredPermissionKey)) {
      return yield* Effect.fail(forbidden())
    }

    return { me, access }
  })

export const ProjectLive = HttpApiBuilder.group(ProjectApi, 'Project', (handlers) =>
    handlers
      .handle('projectList', () =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const me = yield* requireMe
          return yield* repo.projectList(me.id)
        }),
      )
      .handle('projectCreate', ({ payload }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const me = yield* requireMe

          const project = yield* repo.projectCreate({ createdByUserId: me.id, name: payload.name })

          yield* audit
            .write({
              projectId: project.projectId,
              eventType: 'project_created',
              actorUserId: me.id,
              detail: { name: project.name },
            })
            .pipe(Effect.orDie)

          return project
        }),
      )
      .handle('projectGet', ({ params }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const me = yield* requireMe
          return yield* repo.projectGetForMember({ projectId: params.projectId, userId: me.id })
        }),
      )
      .handle('projectUpdate', ({ params, payload }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const { me } = yield* authorize(params.projectId, 'project.update')
          return yield* repo.projectUpdateForMember({ projectId: params.projectId, userId: me.id, patch: payload })
        }),
      )
      .handle('projectAccessMe', ({ params }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const me = yield* requireMe
          return yield* repo.accessMe({ projectId: params.projectId, userId: me.id })
        }),
      )
      .handle('projectMemberList', ({ params }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          yield* authorize(params.projectId, 'member.read')
          return yield* repo.memberList({ projectId: params.projectId })
        }),
      )
      .handle('projectMemberAdd', ({ params, payload }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const { me, access } = yield* authorize(params.projectId, 'member.manage')

          if (payload.roleKey === 'owner' && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          const member = yield* repo.memberAddByEmail({
            projectId: params.projectId,
            createdByUserId: me.id,
            email: payload.email,
            roleKey: payload.roleKey,
          })

          yield* audit
            .write({
              projectId: params.projectId,
              eventType: 'member_added',
              actorUserId: me.id,
              subjectUserId: member.user.id,
              detail: { roleKey: member.directRole },
            })
            .pipe(Effect.orDie)

          return member
        }),
      )
      .handle('projectMemberUpdateRole', ({ params, payload }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const { me, access } = yield* authorize(params.projectId, 'member.manage')

          const prev = yield* repo.memberGetDirectRole({ projectId: params.projectId, userId: params.userId })

          const touchesOwner = prev === 'owner' || payload.roleKey === 'owner'
          if (touchesOwner && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          const member = yield* repo.memberUpdateRole({
            projectId: params.projectId,
            userId: params.userId,
            nextRoleKey: payload.roleKey,
          })

          if (prev !== payload.roleKey) {
            yield* audit
              .write({
                projectId: params.projectId,
                eventType: 'member_role_changed',
                actorUserId: me.id,
                subjectUserId: params.userId,
                detail: { fromRoleKey: prev, toRoleKey: payload.roleKey },
              })
              .pipe(Effect.orDie)
          }

          return member
        }),
      )
      .handle('projectMemberRemove', ({ params }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const { me, access } = yield* authorize(params.projectId, 'member.manage')

          const prev = yield* repo.memberGetDirectRole({ projectId: params.projectId, userId: params.userId })
          if (prev === 'owner' && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          yield* repo.memberRemove({ projectId: params.projectId, userId: params.userId })

          yield* audit
            .write({
              projectId: params.projectId,
              eventType: 'member_removed',
              actorUserId: me.id,
              subjectUserId: params.userId,
              detail: { prevRoleKey: prev },
            })
            .pipe(Effect.orDie)
        }),
      )
      .handle('projectAccessGet', ({ params }) =>
        Effect.gen(function* () {
          yield* authorize(params.projectId, 'member.manage')
          const repo = yield* Effect.service(ProjectRepo)
          return yield* repo.accessGet({ projectId: params.projectId, userId: params.userId })
        }),
      )
      .handle('projectGroupList', ({ params }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          yield* authorize(params.projectId, 'group.read')
          return yield* repo.groupList({ projectId: params.projectId })
        }),
      )
      .handle('projectGroupCreate', ({ params, payload }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const { me, access } = yield* authorize(params.projectId, 'group.manage')

          if (payload.roleKey === 'owner' && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          const group = yield* repo.groupCreate({
            projectId: params.projectId,
            createdByUserId: me.id,
            name: payload.name,
            roleKey: payload.roleKey,
          })

          yield* audit
            .write({
              projectId: params.projectId,
              eventType: 'group_created',
              actorUserId: me.id,
              subjectGroupId: group.groupId,
              detail: { name: group.name, roleKey: group.roleKey },
            })
            .pipe(Effect.orDie)

          return group
        }),
      )
      .handle('projectGroupUpdate', ({ params, payload }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const { me, access } = yield* authorize(params.projectId, 'group.manage')

          const prevRoleKey = yield* repo.groupGetRoleKey({ projectId: params.projectId, groupId: params.groupId })
          const nextRoleKey = payload.roleKey ?? prevRoleKey

          const touchesOwner = prevRoleKey === 'owner' || nextRoleKey === 'owner'
          if (touchesOwner && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          const updated = yield* repo.groupUpdate({
            projectId: params.projectId,
            groupId: params.groupId,
            patch: payload,
          })

          if (prevRoleKey !== updated.roleKey) {
            yield* audit
              .write({
                projectId: params.projectId,
                eventType: 'group_role_changed',
                actorUserId: me.id,
                subjectGroupId: updated.groupId,
                detail: { fromRoleKey: prevRoleKey, toRoleKey: updated.roleKey },
              })
              .pipe(Effect.orDie)
          }

          return updated
        }),
      )
      .handle('projectGroupDelete', ({ params }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const { me } = yield* authorize(params.projectId, 'group.manage')

          yield* repo.groupDelete({ projectId: params.projectId, groupId: params.groupId })

          yield* audit
            .write({
              projectId: params.projectId,
              eventType: 'group_deleted',
              actorUserId: me.id,
              subjectGroupId: params.groupId,
            })
            .pipe(Effect.orDie)
        }),
      )
      .handle('projectGroupMemberList', ({ params }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          yield* authorize(params.projectId, 'group.read')
          return yield* repo.groupMemberList({ projectId: params.projectId, groupId: params.groupId })
        }),
      )
      .handle('projectGroupMemberAdd', ({ params, payload }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const { me } = yield* authorize(params.projectId, 'group.manage')

          const membership = yield* repo.groupMemberAdd({
            projectId: params.projectId,
            groupId: params.groupId,
            createdByUserId: me.id,
            userId: payload.userId,
          })

          yield* audit
            .write({
              projectId: params.projectId,
              eventType: 'group_member_added',
              actorUserId: me.id,
              subjectGroupId: params.groupId,
              subjectUserId: payload.userId,
            })
            .pipe(Effect.orDie)

          return membership
        }),
      )
      .handle('projectGroupMemberRemove', ({ params }) =>
        Effect.gen(function* () {
          const repo = yield* Effect.service(ProjectRepo)
          const audit = yield* Effect.service(ProjectAuditRepo)
          const { me } = yield* authorize(params.projectId, 'group.manage')

          yield* repo.groupMemberRemove({ projectId: params.projectId, groupId: params.groupId, userId: params.userId })

          yield* audit
            .write({
              projectId: params.projectId,
              eventType: 'group_member_removed',
              actorUserId: me.id,
              subjectGroupId: params.groupId,
              subjectUserId: params.userId,
            })
            .pipe(Effect.orDie)
        }),
      )
      .handle('projectAuditEventList', ({ params, query }) =>
        Effect.gen(function* () {
          const audit = yield* Effect.service(ProjectAuditRepo)
          yield* authorize(params.projectId, 'audit.read')

          yield* validateIsoRange(query.from, query.to)

          return yield* audit
            .list({
              projectId: params.projectId,
              from: query.from,
              to: query.to,
              eventType: query.eventType,
              actorUserId: query.actorUserId,
              subjectUserId: query.subjectUserId,
              subjectGroupId: query.subjectGroupId,
            })
            .pipe(Effect.orDie)
        }),
      ),
  )
