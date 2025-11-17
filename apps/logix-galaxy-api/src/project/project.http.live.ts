import { HttpApiBuilder } from '@effect/platform'
import * as Headers from '@effect/platform/Headers'
import * as HttpServerRequest from '@effect/platform/HttpServerRequest'
import { Effect, Option } from 'effect'

import { EffectApi } from '../app/effect-api.js'
import { Auth, type AuthHeaders } from '../auth/auth.service.js'
import { ProjectAuditRepo } from './project-audit.repo.js'
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
  const authorization = Option.getOrUndefined(Headers.get(req.headers, 'authorization')) ?? undefined
  return { authorization } satisfies AuthHeaders
})

const requireMe = Effect.gen(function* () {
  const auth = yield* Auth
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
    const repo = yield* ProjectRepo
    const me = yield* requireMe

    const access = yield* repo.accessMe({ projectId, userId: me.id })

    if (requiredPermissionKey && !hasPermission(access as any, requiredPermissionKey)) {
      return yield* Effect.fail(forbidden())
    }

    return { me, access }
  })

export const ProjectLive = HttpApiBuilder.group(EffectApi, 'Project', (handlers) =>
    handlers
      .handle('projectList', () =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const me = yield* requireMe
          return yield* repo.projectList(me.id)
        }),
      )
      .handle('projectCreate', ({ payload }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
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
      .handle('projectGet', ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const me = yield* requireMe
          return yield* repo.projectGetForMember({ projectId: path.projectId, userId: me.id })
        }),
      )
      .handle('projectUpdate', ({ path, payload }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const { me } = yield* authorize(path.projectId, 'project.update')
          return yield* repo.projectUpdateForMember({ projectId: path.projectId, userId: me.id, patch: payload })
        }),
      )
      .handle('projectAccessMe', ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const me = yield* requireMe
          return yield* repo.accessMe({ projectId: path.projectId, userId: me.id })
        }),
      )
      .handle('projectMemberList', ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          yield* authorize(path.projectId, 'member.read')
          return yield* repo.memberList({ projectId: path.projectId })
        }),
      )
      .handle('projectMemberAdd', ({ path, payload }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
          const { me, access } = yield* authorize(path.projectId, 'member.manage')

          if (payload.roleKey === 'owner' && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          const member = yield* repo.memberAddByEmail({
            projectId: path.projectId,
            createdByUserId: me.id,
            email: payload.email,
            roleKey: payload.roleKey,
          })

          yield* audit
            .write({
              projectId: path.projectId,
              eventType: 'member_added',
              actorUserId: me.id,
              subjectUserId: member.user.id,
              detail: { roleKey: member.directRole },
            })
            .pipe(Effect.orDie)

          return member
        }),
      )
      .handle('projectMemberUpdateRole', ({ path, payload }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
          const { me, access } = yield* authorize(path.projectId, 'member.manage')

          const prev = yield* repo.memberGetDirectRole({ projectId: path.projectId, userId: path.userId })

          const touchesOwner = prev === 'owner' || payload.roleKey === 'owner'
          if (touchesOwner && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          const member = yield* repo.memberUpdateRole({
            projectId: path.projectId,
            userId: path.userId,
            nextRoleKey: payload.roleKey,
          })

          if (prev !== payload.roleKey) {
            yield* audit
              .write({
                projectId: path.projectId,
                eventType: 'member_role_changed',
                actorUserId: me.id,
                subjectUserId: path.userId,
                detail: { fromRoleKey: prev, toRoleKey: payload.roleKey },
              })
              .pipe(Effect.orDie)
          }

          return member
        }),
      )
      .handle('projectMemberRemove', ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
          const { me, access } = yield* authorize(path.projectId, 'member.manage')

          const prev = yield* repo.memberGetDirectRole({ projectId: path.projectId, userId: path.userId })
          if (prev === 'owner' && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          yield* repo.memberRemove({ projectId: path.projectId, userId: path.userId })

          yield* audit
            .write({
              projectId: path.projectId,
              eventType: 'member_removed',
              actorUserId: me.id,
              subjectUserId: path.userId,
              detail: { prevRoleKey: prev },
            })
            .pipe(Effect.orDie)
        }),
      )
      .handle('projectAccessGet', ({ path }) =>
        Effect.gen(function* () {
          yield* authorize(path.projectId, 'member.manage')
          const repo = yield* ProjectRepo
          return yield* repo.accessGet({ projectId: path.projectId, userId: path.userId })
        }),
      )
      .handle('projectGroupList', ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          yield* authorize(path.projectId, 'group.read')
          return yield* repo.groupList({ projectId: path.projectId })
        }),
      )
      .handle('projectGroupCreate', ({ path, payload }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
          const { me, access } = yield* authorize(path.projectId, 'group.manage')

          if (payload.roleKey === 'owner' && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          const group = yield* repo.groupCreate({
            projectId: path.projectId,
            createdByUserId: me.id,
            name: payload.name,
            roleKey: payload.roleKey,
          })

          yield* audit
            .write({
              projectId: path.projectId,
              eventType: 'group_created',
              actorUserId: me.id,
              subjectGroupId: group.groupId,
              detail: { name: group.name, roleKey: group.roleKey },
            })
            .pipe(Effect.orDie)

          return group
        }),
      )
      .handle('projectGroupUpdate', ({ path, payload }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
          const { me, access } = yield* authorize(path.projectId, 'group.manage')

          const prevRoleKey = yield* repo.groupGetRoleKey({ projectId: path.projectId, groupId: path.groupId })
          const nextRoleKey = payload.roleKey ?? prevRoleKey

          const touchesOwner = prevRoleKey === 'owner' || nextRoleKey === 'owner'
          if (touchesOwner && !hasPermission(access as any, 'owner.manage')) {
            return yield* Effect.fail(forbidden())
          }

          const updated = yield* repo.groupUpdate({
            projectId: path.projectId,
            groupId: path.groupId,
            patch: payload,
          })

          if (prevRoleKey !== updated.roleKey) {
            yield* audit
              .write({
                projectId: path.projectId,
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
      .handle('projectGroupDelete', ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
          const { me } = yield* authorize(path.projectId, 'group.manage')

          yield* repo.groupDelete({ projectId: path.projectId, groupId: path.groupId })

          yield* audit
            .write({
              projectId: path.projectId,
              eventType: 'group_deleted',
              actorUserId: me.id,
              subjectGroupId: path.groupId,
            })
            .pipe(Effect.orDie)
        }),
      )
      .handle('projectGroupMemberList', ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          yield* authorize(path.projectId, 'group.read')
          return yield* repo.groupMemberList({ projectId: path.projectId, groupId: path.groupId })
        }),
      )
      .handle('projectGroupMemberAdd', ({ path, payload }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
          const { me } = yield* authorize(path.projectId, 'group.manage')

          const membership = yield* repo.groupMemberAdd({
            projectId: path.projectId,
            groupId: path.groupId,
            createdByUserId: me.id,
            userId: payload.userId,
          })

          yield* audit
            .write({
              projectId: path.projectId,
              eventType: 'group_member_added',
              actorUserId: me.id,
              subjectGroupId: path.groupId,
              subjectUserId: payload.userId,
            })
            .pipe(Effect.orDie)

          return membership
        }),
      )
      .handle('projectGroupMemberRemove', ({ path }) =>
        Effect.gen(function* () {
          const repo = yield* ProjectRepo
          const audit = yield* ProjectAuditRepo
          const { me } = yield* authorize(path.projectId, 'group.manage')

          yield* repo.groupMemberRemove({ projectId: path.projectId, groupId: path.groupId, userId: path.userId })

          yield* audit
            .write({
              projectId: path.projectId,
              eventType: 'group_member_removed',
              actorUserId: me.id,
              subjectGroupId: path.groupId,
              subjectUserId: path.userId,
            })
            .pipe(Effect.orDie)
        }),
      )
      .handle('projectAuditEventList', ({ path, urlParams }) =>
        Effect.gen(function* () {
          const audit = yield* ProjectAuditRepo
          yield* authorize(path.projectId, 'audit.read')

          yield* validateIsoRange(urlParams.from, urlParams.to)

          return yield* audit
            .list({
              projectId: path.projectId,
              from: urlParams.from,
              to: urlParams.to,
              eventType: urlParams.eventType,
              actorUserId: urlParams.actorUserId,
              subjectUserId: urlParams.subjectUserId,
              subjectGroupId: urlParams.subjectGroupId,
            })
            .pipe(Effect.orDie)
        }),
      ),
  )
