import { Effect, Layer } from 'effect'

import { Db } from '../db/db.js'
import { computeEffectivePermissionKeys, computeEffectiveRoleKeys, sortRoleKeys } from './project.rbac.js'
import { ProjectRepo, type ProjectRepoService } from './project.repo.js'
import { ProjectSchema } from './project.schema.live.js'

type UserSummary = {
  readonly id: string
  readonly email: string
  readonly displayName: string
}

interface ProjectRow {
  readonly projectId: number
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
  readonly createdByUserId: string
}

interface MemberRow {
  readonly userId: string
  readonly email: string
  readonly displayName: string
  readonly directRole: string
  readonly createdAt: string
}

interface GroupRoleRow {
  readonly userId: string
  readonly roleKey: string
}

interface GroupRow {
  readonly groupId: number
  readonly projectId: number
  readonly name: string
  readonly roleKey: string
  readonly createdAt: string
}

interface GroupMemberRow {
  readonly userId: string
  readonly email: string
  readonly displayName: string
  readonly createdAt: string
}

const normalizeName = (name: string): string => name.trim()

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const validateName = (name: string) =>
  Effect.gen(function* () {
    const trimmed = normalizeName(name)
    if (trimmed.length < 1 || trimmed.length > 120) {
      return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid name' } as const)
    }
    return trimmed
  })

const validateEmail = (email: string) =>
  Effect.gen(function* () {
    const normalized = normalizeEmail(email)
    if (normalized.length < 3 || normalized.length > 256) {
      return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid email' } as const)
    }
    return normalized
  })

const toUserSummary = (row: { readonly id: string; readonly email: string; readonly displayName: string }): UserSummary => ({
  id: row.id,
  email: row.email,
  displayName: row.displayName,
})

const computeMemberAccess = (args: { readonly projectId: number; readonly userId: string; readonly directRole: any; readonly groupRoleKeys: ReadonlyArray<any> }) => {
  const groupRoleKeys = sortRoleKeys(args.groupRoleKeys)
  const effectiveRoleKeys = computeEffectiveRoleKeys(args.directRole, groupRoleKeys)
  const effectivePermissionKeys = computeEffectivePermissionKeys(effectiveRoleKeys)
  return {
    projectId: args.projectId,
    userId: args.userId,
    directRole: args.directRole,
    groupRoleKeys,
    effectiveRoleKeys,
    effectivePermissionKeys,
  }
}

export const ProjectRepoLive: Layer.Layer<ProjectRepo, never, Db | ProjectSchema> = Layer.effect(
  ProjectRepo,
  Effect.gen(function* () {
    const db = yield* Db
    const schema = yield* ProjectSchema
    const ensureReady = schema.ready.pipe(Effect.orDie)

    const queryOrDie = <Row extends object = Record<string, unknown>>(
      strings: TemplateStringsArray,
      ...args: Array<any>
    ) =>
      db.sql.pipe(
        Effect.flatMap((sql) => db.run(sql<Row>(strings, ...args))),
        Effect.orDie,
      )

    const projectExists = (projectId: number) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly ok: number }>`select 1 as ok from projects where project_id = ${projectId}`.pipe(
            Effect.map((rows) => rows.length > 0),
          ),
        ),
      )

    const requireProject = (projectId: number) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<ProjectRow>`
            select
              project_id::int as "projectId",
              name,
              created_by_user_id as "createdByUserId",
              created_at::text as "createdAt",
              updated_at::text as "updatedAt"
            from projects
            where project_id = ${projectId}
          `.pipe(
            Effect.flatMap((rows) =>
              rows[0]
                ? Effect.succeed(rows[0])
                : Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const),
            ),
          ),
        ),
      )

    const requireProjectMemberDirectRole = (projectId: number, userId: string) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly directRole: string }>`
            select direct_role as "directRole"
            from project_members
            where project_id = ${projectId} and user_id = ${userId}
          `.pipe(
            Effect.flatMap((rows) =>
              rows[0] ? Effect.succeed(rows[0].directRole as any) : Effect.fail({ _tag: 'ForbiddenError', message: 'Forbidden' } as const),
            ),
          ),
        ),
      )

    const requireProjectMemberDirectRoleOrNotFound = (projectId: number, userId: string) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly directRole: string }>`
            select direct_role as "directRole"
            from project_members
            where project_id = ${projectId} and user_id = ${userId}
          `.pipe(
            Effect.flatMap((rows) =>
              rows[0]
                ? Effect.succeed(rows[0].directRole as any)
                : Effect.fail({ _tag: 'NotFoundError', message: 'Member not found' } as const),
            ),
          ),
        ),
      )

    const groupRoleKeysByUserId = (projectId: number) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<GroupRoleRow>`
            select
              pgm.user_id as "userId",
              pg.role_key as "roleKey"
            from project_group_members pgm
            join project_groups pg
              on pg.project_id = pgm.project_id
              and pg.group_id = pgm.group_id
            where pgm.project_id = ${projectId}
          `,
        ),
        Effect.map((rows) => {
          const map = new Map<string, Array<any>>()
          for (const row of rows) {
            const list = map.get(row.userId) ?? []
            list.push(row.roleKey as any)
            map.set(row.userId, list)
          }
          const out = new Map<string, ReadonlyArray<any>>()
          for (const [userId, roles] of map.entries()) {
            out.set(userId, sortRoleKeys(roles))
          }
          return out
        }),
      )

    const getGroupRoleKeysForUser = (projectId: number, userId: string) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly roleKey: string }>`
            select distinct
              pg.role_key as "roleKey"
            from project_group_members pgm
            join project_groups pg
              on pg.project_id = pgm.project_id
              and pg.group_id = pgm.group_id
            where pgm.project_id = ${projectId} and pgm.user_id = ${userId}
          `,
        ),
        Effect.map((rows) => sortRoleKeys(rows.map((r) => r.roleKey as any))),
      )

    const requireUserByEmail = (email: string) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly id: string; readonly email: string; readonly displayName: string }>`
            select
              id,
              email,
              coalesce(name, email) as "displayName"
            from auth."user"
            where lower(btrim(email)) = lower(btrim(${email}))
            limit 1
          `.pipe(
            Effect.flatMap((rows) =>
              rows[0] ? Effect.succeed(toUserSummary(rows[0])) : Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const),
            ),
          ),
        ),
      )

    const requireUserById = (id: string) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly id: string; readonly email: string; readonly displayName: string }>`
            select
              id,
              email,
              coalesce(name, email) as "displayName"
            from auth."user"
            where id = ${id}
            limit 1
          `.pipe(
            Effect.flatMap((rows) =>
              rows[0] ? Effect.succeed(toUserSummary(rows[0])) : Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const),
            ),
          ),
        ),
      )

    const projectList: ProjectRepoService['projectList'] = (userId) =>
      Effect.orDie(
        ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<ProjectRow>`
              select
                p.project_id::int as "projectId",
                p.name,
                p.created_by_user_id as "createdByUserId",
                p.created_at::text as "createdAt",
                p.updated_at::text as "updatedAt"
              from projects p
              join project_members m on m.project_id = p.project_id
              where m.user_id = ${userId}
              order by p.project_id asc
            `,
          ),
          Effect.map((rows) =>
            rows.map((r) => ({
              projectId: r.projectId,
              name: r.name,
              createdAt: r.createdAt,
              updatedAt: r.updatedAt,
            })),
          ),
        ),
      )

    const projectCreate: ProjectRepoService['projectCreate'] = (input) =>
      Effect.gen(function* () {
        const name = yield* validateName(input.name)

        const existing = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from projects
              where created_by_user_id = ${input.createdByUserId} and lower(btrim(name)) = lower(btrim(${name}))
              limit 1
            `,
          ),
        )
        if (existing.length > 0) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Project name already exists' } as const)
        }

        const created = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<ProjectRow>`
              insert into projects (name, created_by_user_id)
              values (${name}, ${input.createdByUserId})
              returning
                project_id::int as "projectId",
                name,
                created_by_user_id as "createdByUserId",
                created_at::text as "createdAt",
                updated_at::text as "updatedAt"
            `,
          ),
          Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0]) : Effect.dieMessage('insert should return one row'))),
        )

        yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie`
              insert into project_members (project_id, user_id, direct_role, created_by_user_id)
              values (${created.projectId}, ${input.createdByUserId}, 'owner', ${input.createdByUserId})
            `.pipe(Effect.asVoid),
          ),
        )

        return {
          projectId: created.projectId,
          name: created.name,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        }
      })

    const projectGetForMember: ProjectRepoService['projectGetForMember'] = (input) =>
      Effect.gen(function* () {
        const exists = yield* projectExists(input.projectId)
        if (!exists) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)
        }
        const rows = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<ProjectRow>`
              select
                p.project_id::int as "projectId",
                p.name,
                p.created_by_user_id as "createdByUserId",
                p.created_at::text as "createdAt",
                p.updated_at::text as "updatedAt"
              from projects p
              join project_members m on m.project_id = p.project_id
              where p.project_id = ${input.projectId} and m.user_id = ${input.userId}
            `,
          ),
        )
        if (!rows[0]) {
          return yield* Effect.fail({ _tag: 'ForbiddenError', message: 'Forbidden' } as const)
        }
        const r = rows[0]
        return {
          projectId: r.projectId,
          name: r.name,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }
      })

    const projectUpdateForMember: ProjectRepoService['projectUpdateForMember'] = (input) =>
      Effect.gen(function* () {
        if (input.patch.name === undefined) {
          return yield* projectGetForMember({ projectId: input.projectId, userId: input.userId })
        }

        const nextName = yield* validateName(input.patch.name)
        const project = yield* requireProject(input.projectId)

        const isMember = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from project_members
              where project_id = ${input.projectId} and user_id = ${input.userId}
              limit 1
            `,
          ),
          Effect.map((rows) => rows.length > 0),
        )
        if (!isMember) {
          return yield* Effect.fail({ _tag: 'ForbiddenError', message: 'Forbidden' } as const)
        }

        const dup = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from projects
              where created_by_user_id = ${project.createdByUserId}
                and project_id <> ${input.projectId}
                and lower(btrim(name)) = lower(btrim(${nextName}))
              limit 1
            `,
          ),
        )
        if (dup.length > 0) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Project name already exists' } as const)
        }

        const updated = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<ProjectRow>`
              update projects
              set name = ${nextName}, updated_at = now()
              where project_id = ${input.projectId}
              returning
                project_id::int as "projectId",
                name,
                created_by_user_id as "createdByUserId",
                created_at::text as "createdAt",
                updated_at::text as "updatedAt"
            `,
          ),
          Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0]) : Effect.dieMessage('update should return one row'))),
        )

        return {
          projectId: updated.projectId,
          name: updated.name,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        }
      })

    const accessMe: ProjectRepoService['accessMe'] = (input) =>
      Effect.gen(function* () {
        const projectOk = yield* projectExists(input.projectId)
        if (!projectOk) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)
        }

        const directRole = yield* requireProjectMemberDirectRole(input.projectId, input.userId)
        const groupRoleKeys = yield* getGroupRoleKeysForUser(input.projectId, input.userId)
        return computeMemberAccess({ projectId: input.projectId, userId: input.userId, directRole, groupRoleKeys })
      })

    const accessGet: ProjectRepoService['accessGet'] = (input) =>
      Effect.gen(function* () {
        const directRole = yield* requireProjectMemberDirectRoleOrNotFound(input.projectId, input.userId)
        const groupRoleKeys = yield* getGroupRoleKeysForUser(input.projectId, input.userId).pipe(Effect.catchAll(() => Effect.succeed([])))
        return computeMemberAccess({ projectId: input.projectId, userId: input.userId, directRole, groupRoleKeys })
      })

    const memberList: ProjectRepoService['memberList'] = (input) =>
      Effect.gen(function* () {
        const projectOk = yield* projectExists(input.projectId)
        if (!projectOk) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)
        }

        const groupRoles = yield* groupRoleKeysByUserId(input.projectId)

        const rows = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<MemberRow>`
              select
                u.id as "userId",
                u.email as "email",
                coalesce(u.name, u.email) as "displayName",
                m.direct_role as "directRole",
                m.created_at::text as "createdAt"
              from project_members m
              join auth."user" u on u.id = m.user_id
              where m.project_id = ${input.projectId}
              order by lower(u.email) asc
            `,
          ),
        )

        return rows.map((r) => {
          const user: UserSummary = { id: r.userId, email: r.email, displayName: r.displayName }
          const groupRoleKeys = groupRoles.get(r.userId) ?? []
          const access = computeMemberAccess({
            projectId: input.projectId,
            userId: r.userId,
            directRole: r.directRole as any,
            groupRoleKeys,
          })
          return {
            user,
            directRole: access.directRole,
            groupRoleKeys: access.groupRoleKeys,
            effectiveRoleKeys: access.effectiveRoleKeys,
            effectivePermissionKeys: access.effectivePermissionKeys,
            createdAt: r.createdAt,
          }
        })
      })

    const memberGetDirectRole: ProjectRepoService['memberGetDirectRole'] = (input) =>
      requireProjectMemberDirectRoleOrNotFound(input.projectId, input.userId)

    const memberAddByEmail: ProjectRepoService['memberAddByEmail'] = (input) =>
      Effect.gen(function* () {
        const email = yield* validateEmail(input.email)
        const projectOk = yield* projectExists(input.projectId)
        if (!projectOk) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)
        }

        const user = yield* requireUserByEmail(email)

        const existed = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from project_members
              where project_id = ${input.projectId} and user_id = ${user.id}
              limit 1
            `,
          ),
        )
        if (existed.length > 0) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Member already exists' } as const)
        }

        const createdAt = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly createdAt: string }>`
              insert into project_members (project_id, user_id, direct_role, created_by_user_id)
              values (${input.projectId}, ${user.id}, ${input.roleKey}, ${input.createdByUserId})
              returning created_at::text as "createdAt"
            `,
          ),
          Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0].createdAt) : Effect.dieMessage('insert should return one row'))),
        )

        const access = computeMemberAccess({
          projectId: input.projectId,
          userId: user.id,
          directRole: input.roleKey as any,
          groupRoleKeys: [],
        })

        return {
          user,
          directRole: access.directRole,
          groupRoleKeys: access.groupRoleKeys,
          effectiveRoleKeys: access.effectiveRoleKeys,
          effectivePermissionKeys: access.effectivePermissionKeys,
          createdAt,
        }
      })

    const memberUpdateRole: ProjectRepoService['memberUpdateRole'] = (input) =>
      Effect.gen(function* () {
        const projectOk = yield* projectExists(input.projectId)
        if (!projectOk) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)
        }

        const prevRole = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly directRole: string }>`
              select direct_role as "directRole"
              from project_members
              where project_id = ${input.projectId} and user_id = ${input.userId}
            `,
          ),
          Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0].directRole as any) : Effect.fail({ _tag: 'NotFoundError', message: 'Member not found' } as const))),
        )

        if (prevRole === 'owner' && input.nextRoleKey !== 'owner') {
          const owners = yield* ensureReady.pipe(
            Effect.zipRight(
              queryOrDie<{ readonly count: number }>`
                select count(*)::int as count
                from project_members
                where project_id = ${input.projectId} and direct_role = 'owner'
              `,
            ),
            Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0].count) : Effect.dieMessage('count should return one row'))),
          )
          if (owners <= 1) {
            return yield* Effect.fail({ _tag: 'ConflictError', message: 'Project must have at least one owner' } as const)
          }
        }

        const createdAt = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly createdAt: string }>`
              update project_members
              set direct_role = ${input.nextRoleKey}
              where project_id = ${input.projectId} and user_id = ${input.userId}
              returning created_at::text as "createdAt"
            `,
          ),
          Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0].createdAt) : Effect.dieMessage('update should return one row'))),
        )

        const user = yield* requireUserById(input.userId)
        const groupRoleKeys = yield* getGroupRoleKeysForUser(input.projectId, input.userId)
        const access = computeMemberAccess({
          projectId: input.projectId,
          userId: user.id,
          directRole: input.nextRoleKey as any,
          groupRoleKeys,
        })
        return {
          user,
          directRole: access.directRole,
          groupRoleKeys: access.groupRoleKeys,
          effectiveRoleKeys: access.effectiveRoleKeys,
          effectivePermissionKeys: access.effectivePermissionKeys,
          createdAt,
        }
      })

    const memberRemove: ProjectRepoService['memberRemove'] = (input) =>
      Effect.gen(function* () {
        const projectOk = yield* projectExists(input.projectId)
        if (!projectOk) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)
        }

        const prevRole = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly directRole: string }>`
              select direct_role as "directRole"
              from project_members
              where project_id = ${input.projectId} and user_id = ${input.userId}
            `,
          ),
          Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0].directRole as any) : Effect.fail({ _tag: 'NotFoundError', message: 'Member not found' } as const))),
        )

        if (prevRole === 'owner') {
          const owners = yield* ensureReady.pipe(
            Effect.zipRight(
              queryOrDie<{ readonly count: number }>`
                select count(*)::int as count
                from project_members
                where project_id = ${input.projectId} and direct_role = 'owner'
              `,
            ),
            Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0].count) : Effect.dieMessage('count should return one row'))),
          )
          if (owners <= 1) {
            return yield* Effect.fail({ _tag: 'ConflictError', message: 'Project must have at least one owner' } as const)
          }
        }

        yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly userId: string }>`
              delete from project_members
              where project_id = ${input.projectId} and user_id = ${input.userId}
              returning user_id as "userId"
            `.pipe(
              Effect.flatMap((rows) =>
                rows.length > 0 ? Effect.void : Effect.fail({ _tag: 'NotFoundError', message: 'Member not found' } as const),
              ),
            ),
          ),
        )
      })

    const groupList: ProjectRepoService['groupList'] = (input) =>
      Effect.gen(function* () {
        const ok = yield* projectExists(input.projectId)
        if (!ok) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)

        const rows = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<GroupRow>`
              select
                group_id::int as "groupId",
                project_id::int as "projectId",
                name,
                role_key as "roleKey",
                created_at::text as "createdAt"
              from project_groups
              where project_id = ${input.projectId}
              order by group_id asc
            `,
          ),
        )

        return rows.map((r) => ({
          groupId: r.groupId,
          projectId: r.projectId,
          name: r.name,
          roleKey: r.roleKey as any,
          createdAt: r.createdAt,
        }))
      })

    const groupGetRoleKey: ProjectRepoService['groupGetRoleKey'] = (input) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly roleKey: string }>`
            select role_key as "roleKey"
            from project_groups
            where project_id = ${input.projectId} and group_id = ${input.groupId}
          `.pipe(
            Effect.flatMap((rows) =>
              rows[0]
                ? Effect.succeed(rows[0].roleKey as any)
                : Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const),
            ),
          ),
        ),
      )

    const groupCreate: ProjectRepoService['groupCreate'] = (input) =>
      Effect.gen(function* () {
        const name = yield* validateName(input.name)
        const ok = yield* projectExists(input.projectId)
        if (!ok) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)

        const dup = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from project_groups
              where project_id = ${input.projectId} and lower(btrim(name)) = lower(btrim(${name}))
              limit 1
            `,
          ),
        )
        if (dup.length > 0) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Group name already exists' } as const)
        }

        const created = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<GroupRow>`
              insert into project_groups (project_id, name, role_key, created_by_user_id)
              values (${input.projectId}, ${name}, ${input.roleKey}, ${input.createdByUserId})
              returning
                group_id::int as "groupId",
                project_id::int as "projectId",
                name,
                role_key as "roleKey",
                created_at::text as "createdAt"
            `,
          ),
          Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0]) : Effect.dieMessage('insert should return one row'))),
        )

        return {
          groupId: created.groupId,
          projectId: created.projectId,
          name: created.name,
          roleKey: created.roleKey as any,
          createdAt: created.createdAt,
        }
      })

    const groupUpdate: ProjectRepoService['groupUpdate'] = (input) =>
      Effect.gen(function* () {
        const ok = yield* projectExists(input.projectId)
        if (!ok) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)

        const patchName = input.patch.name === undefined ? undefined : yield* validateName(input.patch.name)

        if (patchName !== undefined) {
          const dup = yield* ensureReady.pipe(
            Effect.zipRight(
              queryOrDie<{ readonly ok: number }>`
                select 1 as ok
                from project_groups
                where project_id = ${input.projectId}
                  and group_id <> ${input.groupId}
                  and lower(btrim(name)) = lower(btrim(${patchName}))
                limit 1
              `,
            ),
          )
          if (dup.length > 0) {
            return yield* Effect.fail({ _tag: 'ConflictError', message: 'Group name already exists' } as const)
          }
        }

        const updated = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<GroupRow>`
              update project_groups
              set
                name = coalesce(${patchName ?? null}, name),
                role_key = coalesce(${input.patch.roleKey ?? null}, role_key)
              where project_id = ${input.projectId} and group_id = ${input.groupId}
              returning
                group_id::int as "groupId",
                project_id::int as "projectId",
                name,
                role_key as "roleKey",
                created_at::text as "createdAt"
            `,
          ),
          Effect.flatMap((rows) =>
            rows[0] ? Effect.succeed(rows[0]) : Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const),
          ),
        )

        return {
          groupId: updated.groupId,
          projectId: updated.projectId,
          name: updated.name,
          roleKey: updated.roleKey as any,
          createdAt: updated.createdAt,
        }
      })

    const groupDelete: ProjectRepoService['groupDelete'] = (input) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly groupId: number }>`
            delete from project_groups
            where project_id = ${input.projectId} and group_id = ${input.groupId}
            returning group_id::int as "groupId"
          `.pipe(
            Effect.flatMap((rows) =>
              rows.length > 0 ? Effect.void : Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const),
            ),
          ),
        ),
      )

    const groupMemberList: ProjectRepoService['groupMemberList'] = (input) =>
      Effect.gen(function* () {
        const ok = yield* projectExists(input.projectId)
        if (!ok) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)

        const groupOk = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from project_groups
              where project_id = ${input.projectId} and group_id = ${input.groupId}
              limit 1
            `,
          ),
          Effect.map((rows) => rows.length > 0),
        )
        if (!groupOk) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const)

        const rows = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<GroupMemberRow>`
              select
                u.id as "userId",
                u.email as "email",
                coalesce(u.name, u.email) as "displayName",
                pgm.created_at::text as "createdAt"
              from project_group_members pgm
              join auth."user" u on u.id = pgm.user_id
              where pgm.project_id = ${input.projectId} and pgm.group_id = ${input.groupId}
              order by lower(u.email) asc
            `,
          ),
        )

        return rows.map((r) => ({
          user: { id: r.userId, email: r.email, displayName: r.displayName },
          createdAt: r.createdAt,
        }))
      })

    const groupMemberAdd: ProjectRepoService['groupMemberAdd'] = (input) =>
      Effect.gen(function* () {
        const ok = yield* projectExists(input.projectId)
        if (!ok) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)

        const groupOk = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from project_groups
              where project_id = ${input.projectId} and group_id = ${input.groupId}
              limit 1
            `,
          ),
          Effect.map((rows) => rows.length > 0),
        )
        if (!groupOk) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const)

        const isProjectMember = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from project_members
              where project_id = ${input.projectId} and user_id = ${input.userId}
              limit 1
            `,
          ),
          Effect.map((rows) => rows.length > 0),
        )
        if (!isProjectMember) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'User is not a project member' } as const)
        }

        const existed = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly ok: number }>`
              select 1 as ok
              from project_group_members
              where project_id = ${input.projectId} and group_id = ${input.groupId} and user_id = ${input.userId}
              limit 1
            `,
          ),
        )
        if (existed.length > 0) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Member already in group' } as const)
        }

        const createdAt = yield* ensureReady.pipe(
          Effect.zipRight(
            queryOrDie<{ readonly createdAt: string }>`
              insert into project_group_members (project_id, group_id, user_id, created_by_user_id)
              values (${input.projectId}, ${input.groupId}, ${input.userId}, ${input.createdByUserId})
              returning created_at::text as "createdAt"
            `,
          ),
          Effect.flatMap((rows) => (rows[0] ? Effect.succeed(rows[0].createdAt) : Effect.dieMessage('insert should return one row'))),
        )

        const user = yield* requireUserById(input.userId)
        return { user, createdAt }
      })

    const groupMemberRemove: ProjectRepoService['groupMemberRemove'] = (input) =>
      ensureReady.pipe(
        Effect.zipRight(
          queryOrDie<{ readonly userId: string }>`
            delete from project_group_members
            where project_id = ${input.projectId} and group_id = ${input.groupId} and user_id = ${input.userId}
            returning user_id as "userId"
          `.pipe(
            Effect.flatMap((rows) =>
              rows.length > 0 ? Effect.void : Effect.fail({ _tag: 'NotFoundError', message: 'Group member not found' } as const),
            ),
          ),
        ),
      )

    return {
      projectList,
      projectCreate,
      projectGetForMember,
      projectUpdateForMember,
      accessMe,
      accessGet,
      memberList,
      memberGetDirectRole,
      memberAddByEmail,
      memberUpdateRole,
      memberRemove,
      groupList,
      groupGetRoleKey,
      groupCreate,
      groupUpdate,
      groupDelete,
      groupMemberList,
      groupMemberAdd,
      groupMemberRemove,
    } satisfies ProjectRepoService
  }),
)
