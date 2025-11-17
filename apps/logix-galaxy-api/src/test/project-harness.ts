import { Effect, Layer, Option } from 'effect'

import type { AuthHeaders, AuthLoginResponseDto, AuthService, UserDtoDto } from '../auth/auth.service.js'
import { Auth } from '../auth/auth.service.js'
import type { ProjectAuditEventDtoDto, ProjectAuditRepoService } from '../project/project-audit.repo.js'
import { ProjectAuditRepo } from '../project/project-audit.repo.js'
import type { ProjectRepoService, ProjectRoleKeyDto } from '../project/project.repo.js'
import { ProjectRepo } from '../project/project.repo.js'
import { computeEffectivePermissionKeys, computeEffectiveRoleKeys, sortRoleKeys } from '../project/project.rbac.js'

export interface SeedUserInput {
  readonly email: string
  readonly password: string
  readonly displayName: string
  readonly roles?: ReadonlyArray<'admin' | 'user'> | undefined
  readonly status?: 'active' | 'disabled' | undefined
}

export interface ProjectHarness {
  readonly AuthTest: Layer.Layer<Auth>
  readonly ProjectRepoTest: Layer.Layer<ProjectRepo>
  readonly ProjectAuditRepoTest: Layer.Layer<ProjectAuditRepo>
  readonly seedUser: (input: SeedUserInput) => UserDtoDto
  readonly auditEvents: ReadonlyArray<ProjectAuditEventDtoDto>
}

const nowIso = (): string => '1970-01-01T00:00:00.000Z'

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

const normalizeNameKey = (name: string): string => name.trim().toLowerCase()

const unauthorized = (): { readonly _tag: 'UnauthorizedError'; readonly message: string } => ({
  _tag: 'UnauthorizedError',
  message: 'Unauthorized',
})

const forbidden = (): { readonly _tag: 'ForbiddenError'; readonly message: string } => ({
  _tag: 'ForbiddenError',
  message: 'Forbidden',
})

const readBearerToken = (headers: AuthHeaders): string | undefined => {
  const auth = headers.authorization ?? ''
  const match = auth.match(/^Bearer (.+)$/i)
  return match?.[1]
}

type UserRecord = { readonly user: UserDtoDto; password: string }

type ProjectRecord = {
  readonly projectId: number
  name: string
  readonly createdByUserId: string
  readonly createdAt: string
  updatedAt: string
}

type MemberRecord = {
  readonly projectId: number
  readonly userId: string
  directRole: ProjectRoleKeyDto
  readonly createdByUserId: string
  readonly createdAt: string
}

type GroupRecord = {
  readonly projectId: number
  readonly groupId: number
  name: string
  roleKey: ProjectRoleKeyDto
  readonly createdByUserId: string
  readonly createdAt: string
}

type GroupMemberRecord = {
  readonly projectId: number
  readonly groupId: number
  readonly userId: string
  readonly createdByUserId: string
  readonly createdAt: string
}

const computeAccess = (projectId: number, userId: string, directRole: ProjectRoleKeyDto, groupRoleKeys: ReadonlyArray<ProjectRoleKeyDto>) => {
  const groupRoleKeysSorted = sortRoleKeys(groupRoleKeys)
  const effectiveRoleKeys = computeEffectiveRoleKeys(directRole as any, groupRoleKeysSorted as any) as any
  const effectivePermissionKeys = computeEffectivePermissionKeys(effectiveRoleKeys as any) as any
  return {
    projectId,
    userId,
    directRole,
    groupRoleKeys: groupRoleKeysSorted,
    effectiveRoleKeys,
    effectivePermissionKeys,
  }
}

export const makeProjectHarness = (): ProjectHarness => {
  const usersByEmail = new Map<string, UserRecord>()
  const usersById = new Map<string, UserRecord>()

  const projects = new Map<number, ProjectRecord>()
  const projectMembers = new Map<string, MemberRecord>() // `${projectId}:${userId}`
  const projectGroups = new Map<number, GroupRecord>()
  const groupMembers = new Map<string, GroupMemberRecord>() // `${groupId}:${userId}`

  let nextUserId = 1
  let nextProjectId = 1
  let nextGroupId = 1
  let nextEventId = 1

  const auditEvents: Array<ProjectAuditEventDtoDto> = []

  const getUserSummary = (userId: string) => {
    const record = usersById.get(userId)?.user
    if (!record) return undefined
    return { id: record.id, email: record.email, displayName: record.displayName }
  }

  const requireUserSummaryByEmail = (email: string) =>
    Effect.gen(function* () {
      const record = usersByEmail.get(normalizeEmail(email))?.user
      if (!record) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const)
      return { id: record.id, email: record.email, displayName: record.displayName }
    })

  const requireProject = (projectId: number) =>
    Effect.gen(function* () {
      const project = projects.get(projectId)
      if (!project) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Project not found' } as const)
      return project
    })

  const memberKey = (projectId: number, userId: string) => `${projectId}:${userId}`
  const groupMemberKey = (groupId: number, userId: string) => `${groupId}:${userId}`

  const requireMember = (projectId: number, userId: string) =>
    Effect.gen(function* () {
      const member = projectMembers.get(memberKey(projectId, userId))
      if (!member) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Member not found' } as const)
      return member
    })

  const groupRoleKeysForUser = (projectId: number, userId: string): ReadonlyArray<ProjectRoleKeyDto> => {
    const roles: Array<ProjectRoleKeyDto> = []
    for (const m of groupMembers.values()) {
      if (m.projectId !== projectId || m.userId !== userId) continue
      const g = projectGroups.get(m.groupId)
      if (!g) continue
      roles.push(g.roleKey)
    }
    return sortRoleKeys(roles)
  }

  const countOwners = (projectId: number): number => {
    let count = 0
    for (const m of projectMembers.values()) {
      if (m.projectId === projectId && m.directRole === 'owner') count += 1
    }
    return count
  }

  const login: AuthService['login'] = ({ email, password }) =>
    Effect.gen(function* () {
      const record = usersByEmail.get(normalizeEmail(email))
      if (!record || record.password !== password) return yield* Effect.fail(unauthorized())
      if (record.user.status === 'disabled') return yield* Effect.fail(forbidden())
      const response: AuthLoginResponseDto = { token: record.user.id, expiresAt: nowIso(), user: record.user }
      return response
    })

  const me: AuthService['me'] = (headers) =>
    Effect.gen(function* () {
      const token = readBearerToken(headers)
      if (!token) return yield* Effect.fail(unauthorized())
      const user = usersById.get(token)?.user
      if (!user || user.status === 'disabled') return yield* Effect.fail(unauthorized())
      return user
    })

  const die = <A>(message: string): Effect.Effect<A> => Effect.dieMessage(message)

  const authService: AuthService = {
    login,
    me,
    logout: () => Effect.void,
    requireAdmin: () => die('requireAdmin not used in project tests'),
    createUser: () => die('createUser not used in project tests'),
    listUsers: () => die('listUsers not used in project tests'),
    getUser: () => die('getUser not used in project tests'),
    updateUser: () => die('updateUser not used in project tests'),
    disableUser: () => die('disableUser not used in project tests'),
    enableUser: () => die('enableUser not used in project tests'),
    resetPassword: () => die('resetPassword not used in project tests'),
  }

  const AuthTest = Layer.succeed(Auth, authService satisfies AuthService)

  const ProjectRepoTest = Layer.succeed(ProjectRepo, {
    projectList: (userId) =>
      Effect.sync(() => {
        const list: Array<any> = []
        for (const m of projectMembers.values()) {
          if (m.userId !== userId) continue
          const p = projects.get(m.projectId)
          if (!p) continue
          list.push({ projectId: p.projectId, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt })
        }
        list.sort((a, b) => a.projectId - b.projectId)
        return list
      }),

    projectCreate: ({ createdByUserId, name }) =>
      Effect.gen(function* () {
        const trimmed = name.trim()
        if (trimmed.length < 1 || trimmed.length > 120) return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid name' } as const)
        const key = normalizeNameKey(trimmed)
        for (const p of projects.values()) {
          if (p.createdByUserId === createdByUserId && normalizeNameKey(p.name) === key) {
            return yield* Effect.fail({ _tag: 'ConflictError', message: 'Project name already exists' } as const)
          }
        }

        const project: ProjectRecord = {
          projectId: nextProjectId++,
          name: trimmed,
          createdByUserId,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        projects.set(project.projectId, project)

        const member: MemberRecord = {
          projectId: project.projectId,
          userId: createdByUserId,
          directRole: 'owner',
          createdByUserId,
          createdAt: nowIso(),
        }
        projectMembers.set(memberKey(project.projectId, createdByUserId), member)

        return { projectId: project.projectId, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt }
      }),

    projectGetForMember: ({ projectId, userId }) =>
      Effect.gen(function* () {
        const project = yield* requireProject(projectId)
        const member = projectMembers.get(memberKey(projectId, userId))
        if (!member) return yield* Effect.fail({ _tag: 'ForbiddenError', message: 'Forbidden' } as const)
        return { projectId: project.projectId, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt }
      }),

    projectUpdateForMember: ({ projectId, userId, patch }) =>
      Effect.gen(function* () {
        const project = yield* requireProject(projectId)
        const member = projectMembers.get(memberKey(projectId, userId))
        if (!member) return yield* Effect.fail({ _tag: 'ForbiddenError', message: 'Forbidden' } as const)

        if (patch.name !== undefined) {
          const trimmed = patch.name.trim()
          if (trimmed.length < 1 || trimmed.length > 120) return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid name' } as const)

          const key = normalizeNameKey(trimmed)
          for (const p of projects.values()) {
            if (p.projectId === projectId) continue
            if (p.createdByUserId === project.createdByUserId && normalizeNameKey(p.name) === key) {
              return yield* Effect.fail({ _tag: 'ConflictError', message: 'Project name already exists' } as const)
            }
          }

          project.name = trimmed
          project.updatedAt = nowIso()
        }

        return { projectId: project.projectId, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt }
      }),

    accessMe: ({ projectId, userId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const member = projectMembers.get(memberKey(projectId, userId))
        if (!member) return yield* Effect.fail({ _tag: 'ForbiddenError', message: 'Forbidden' } as const)
        const groupRoleKeys = groupRoleKeysForUser(projectId, userId)
        return computeAccess(projectId, userId, member.directRole, groupRoleKeys)
      }),

    accessGet: ({ projectId, userId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const member = projectMembers.get(memberKey(projectId, userId))
        if (!member) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Member not found' } as const)
        const groupRoleKeys = groupRoleKeysForUser(projectId, userId)
        return computeAccess(projectId, userId, member.directRole, groupRoleKeys)
      }),

    memberList: ({ projectId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const list: Array<any> = []
        for (const m of projectMembers.values()) {
          if (m.projectId !== projectId) continue
          const user = getUserSummary(m.userId)
          if (!user) continue
          const groupRoleKeys = groupRoleKeysForUser(projectId, m.userId)
          const access = computeAccess(projectId, m.userId, m.directRole, groupRoleKeys)
          list.push({
            user,
            directRole: access.directRole,
            groupRoleKeys: access.groupRoleKeys,
            effectiveRoleKeys: access.effectiveRoleKeys,
            effectivePermissionKeys: access.effectivePermissionKeys,
            createdAt: m.createdAt,
          })
        }
        list.sort((a, b) => a.user.email.localeCompare(b.user.email))
        return list
      }),

    memberGetDirectRole: ({ projectId, userId }) =>
      requireMember(projectId, userId).pipe(Effect.map((m) => m.directRole)),

    memberAddByEmail: ({ projectId, createdByUserId, email, roleKey }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const normalized = normalizeEmail(email)
        if (normalized.length < 3) return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid email' } as const)

        const user = yield* requireUserSummaryByEmail(normalized)
        if (projectMembers.has(memberKey(projectId, user.id))) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Member already exists' } as const)
        }

        const member: MemberRecord = {
          projectId,
          userId: user.id,
          directRole: roleKey,
          createdByUserId,
          createdAt: nowIso(),
        }
        projectMembers.set(memberKey(projectId, user.id), member)

        const access = computeAccess(projectId, user.id, roleKey, [])
        return {
          user,
          directRole: access.directRole,
          groupRoleKeys: access.groupRoleKeys,
          effectiveRoleKeys: access.effectiveRoleKeys,
          effectivePermissionKeys: access.effectivePermissionKeys,
          createdAt: member.createdAt,
        }
      }),

    memberUpdateRole: ({ projectId, userId, nextRoleKey }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const member = yield* requireMember(projectId, userId)

        if (member.directRole === 'owner' && nextRoleKey !== 'owner' && countOwners(projectId) <= 1) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Project must have at least one owner' } as const)
        }

        member.directRole = nextRoleKey

        const user = getUserSummary(userId)
        if (!user) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const)

        const groupRoleKeys = groupRoleKeysForUser(projectId, userId)
        const access = computeAccess(projectId, userId, nextRoleKey, groupRoleKeys)
        return {
          user,
          directRole: access.directRole,
          groupRoleKeys: access.groupRoleKeys,
          effectiveRoleKeys: access.effectiveRoleKeys,
          effectivePermissionKeys: access.effectivePermissionKeys,
          createdAt: member.createdAt,
        }
      }),

    memberRemove: ({ projectId, userId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const member = yield* requireMember(projectId, userId)

        if (member.directRole === 'owner' && countOwners(projectId) <= 1) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Project must have at least one owner' } as const)
        }

        projectMembers.delete(memberKey(projectId, userId))

        for (const key of Array.from(groupMembers.keys())) {
          const m = groupMembers.get(key)
          if (m?.projectId === projectId && m.userId === userId) {
            groupMembers.delete(key)
          }
        }
      }),

    groupList: ({ projectId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        return Array.from(projectGroups.values())
          .filter((g) => g.projectId === projectId)
          .sort((a, b) => a.groupId - b.groupId)
          .map((g) => ({ groupId: g.groupId, projectId: g.projectId, name: g.name, roleKey: g.roleKey, createdAt: g.createdAt }))
      }),

    groupGetRoleKey: ({ projectId, groupId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const group = projectGroups.get(groupId)
        if (!group || group.projectId !== projectId) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const)
        return group.roleKey
      }),

    groupCreate: ({ projectId, createdByUserId, name, roleKey }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const trimmed = name.trim()
        if (trimmed.length < 1 || trimmed.length > 120) return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid name' } as const)
        const key = normalizeNameKey(trimmed)
        for (const g of projectGroups.values()) {
          if (g.projectId === projectId && normalizeNameKey(g.name) === key) {
            return yield* Effect.fail({ _tag: 'ConflictError', message: 'Group name already exists' } as const)
          }
        }

        const group: GroupRecord = {
          projectId,
          groupId: nextGroupId++,
          name: trimmed,
          roleKey,
          createdByUserId,
          createdAt: nowIso(),
        }
        projectGroups.set(group.groupId, group)
        return { groupId: group.groupId, projectId: group.projectId, name: group.name, roleKey: group.roleKey, createdAt: group.createdAt }
      }),

    groupUpdate: ({ projectId, groupId, patch }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const group = projectGroups.get(groupId)
        if (!group || group.projectId !== projectId) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const)

        if (patch.name !== undefined) {
          const trimmed = patch.name.trim()
          if (trimmed.length < 1 || trimmed.length > 120) return yield* Effect.fail({ _tag: 'ValidationError', message: 'Invalid name' } as const)
          const key = normalizeNameKey(trimmed)
          for (const g of projectGroups.values()) {
            if (g.groupId === groupId) continue
            if (g.projectId === projectId && normalizeNameKey(g.name) === key) {
              return yield* Effect.fail({ _tag: 'ConflictError', message: 'Group name already exists' } as const)
            }
          }
          group.name = trimmed
        }
        if (patch.roleKey !== undefined) {
          group.roleKey = patch.roleKey
        }

        return { groupId: group.groupId, projectId: group.projectId, name: group.name, roleKey: group.roleKey, createdAt: group.createdAt }
      }),

    groupDelete: ({ projectId, groupId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const group = projectGroups.get(groupId)
        if (!group || group.projectId !== projectId) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const)
        projectGroups.delete(groupId)
        for (const key of Array.from(groupMembers.keys())) {
          const m = groupMembers.get(key)
          if (m?.projectId === projectId && m.groupId === groupId) groupMembers.delete(key)
        }
      }),

    groupMemberList: ({ projectId, groupId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const group = projectGroups.get(groupId)
        if (!group || group.projectId !== projectId) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const)
        const list: Array<any> = []
        for (const gm of groupMembers.values()) {
          if (gm.projectId !== projectId || gm.groupId !== groupId) continue
          const user = getUserSummary(gm.userId)
          if (!user) continue
          list.push({ user, createdAt: gm.createdAt })
        }
        list.sort((a, b) => a.user.email.localeCompare(b.user.email))
        return list
      }),

    groupMemberAdd: ({ projectId, groupId, createdByUserId, userId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const group = projectGroups.get(groupId)
        if (!group || group.projectId !== projectId) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Group not found' } as const)
        if (!projectMembers.has(memberKey(projectId, userId))) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'User is not a project member' } as const)
        }
        if (groupMembers.has(groupMemberKey(groupId, userId))) {
          return yield* Effect.fail({ _tag: 'ConflictError', message: 'Member already in group' } as const)
        }
        const user = getUserSummary(userId)
        if (!user) return yield* Effect.fail({ _tag: 'NotFoundError', message: 'User not found' } as const)
        const record: GroupMemberRecord = { projectId, groupId, userId, createdByUserId, createdAt: nowIso() }
        groupMembers.set(groupMemberKey(groupId, userId), record)
        return { user, createdAt: record.createdAt }
      }),

    groupMemberRemove: ({ projectId, groupId, userId }) =>
      Effect.gen(function* () {
        yield* requireProject(projectId)
        const existed = groupMembers.get(groupMemberKey(groupId, userId))
        if (!existed || existed.projectId !== projectId) {
          return yield* Effect.fail({ _tag: 'NotFoundError', message: 'Group member not found' } as const)
        }
        groupMembers.delete(groupMemberKey(groupId, userId))
      }),
  })

  const ProjectAuditRepoTest = Layer.succeed(ProjectAuditRepo, {
    write: (input) =>
      Effect.sync(() => {
        auditEvents.push({
          eventId: nextEventId++,
          projectId: input.projectId,
          eventType: input.eventType as any,
          actorUserId: Option.getOrNull(Option.fromNullable(input.actorUserId)),
          subjectUserId: Option.getOrNull(Option.fromNullable(input.subjectUserId)),
          subjectGroupId: Option.getOrNull(Option.fromNullable(input.subjectGroupId)),
          createdAt: nowIso(),
          detail: input.detail ?? {},
        })
      }),

    list: (query) =>
      Effect.sync(() => {
        const fromMs = query.from ? Date.parse(query.from) : undefined
        const toMs = query.to ? Date.parse(query.to) : undefined

        return auditEvents
          .filter((e) => {
            if (e.projectId !== query.projectId) return false
            if (query.eventType && e.eventType !== query.eventType) return false
            if (query.actorUserId && e.actorUserId !== query.actorUserId) return false
            if (query.subjectUserId && e.subjectUserId !== query.subjectUserId) return false
            if (query.subjectGroupId !== undefined && e.subjectGroupId !== query.subjectGroupId) return false

            if (fromMs !== undefined && Date.parse(e.createdAt) < fromMs) return false
            if (toMs !== undefined && Date.parse(e.createdAt) >= toMs) return false
            return true
          })
          .slice()
          .sort((a, b) => b.eventId - a.eventId)
          .slice(0, 200)
      }),
  } satisfies ProjectAuditRepoService)

  const seedUser = (input: SeedUserInput): UserDtoDto => {
    const status = input.status ?? 'active'
    const user: UserDtoDto = {
      id: String(nextUserId++),
      email: normalizeEmail(input.email),
      displayName: input.displayName,
      status,
      roles: input.roles ?? ['user'],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastLoginAt: null,
      disabledAt: status === 'disabled' ? nowIso() : null,
    }
    const record: UserRecord = { user, password: input.password }
    usersByEmail.set(user.email, record)
    usersById.set(user.id, record)
    return user
  }

  return { AuthTest, ProjectRepoTest, ProjectAuditRepoTest, seedUser, auditEvents }
}
