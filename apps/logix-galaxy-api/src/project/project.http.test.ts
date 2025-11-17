import { HttpApi, HttpApiBuilder, HttpServer } from '@effect/platform'
import { Layer } from 'effect'
import { describe, expect, it } from 'vitest'

import { makeProjectHarness } from '../test/project-harness.js'
import { ProjectGroup } from './project.contract.js'
import { ProjectLive } from './project.http.live.js'

describe('Project Governance (066)', () => {
  it('Project endpoints always require auth (401)', async () => {
    const harness = makeProjectHarness()

    const ProjectApi = HttpApi.make('EffectApi').add(ProjectGroup)
    const ApiTestLive = HttpApiBuilder.api(ProjectApi).pipe(
      Layer.provide(ProjectLive),
      Layer.provide(harness.AuthTest),
      Layer.provide(harness.ProjectRepoTest),
      Layer.provide(harness.ProjectAuditRepoTest),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    const expectUnauthorized = async (request: Request) => {
      const res = await handler(request)
      expect(res.status).toBe(401)
      await expect(res.json()).resolves.toEqual({ _tag: 'UnauthorizedError', message: 'Unauthorized' })
    }

    try {
      const base = 'http://local.test'
      const projectId = 1
      const groupId = 1
      const userId = 'u'

      await expectUnauthorized(new Request(`${base}/projects`))
      await expectUnauthorized(
        new Request(`${base}/projects`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Project' }),
        }),
      )
      await expectUnauthorized(new Request(`${base}/projects/${projectId}`))
      await expectUnauthorized(
        new Request(`${base}/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
      )
      await expectUnauthorized(new Request(`${base}/projects/${projectId}/access`))

      await expectUnauthorized(new Request(`${base}/projects/${projectId}/members`))
      await expectUnauthorized(
        new Request(`${base}/projects/${projectId}/members`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'alice@example.com', roleKey: 'viewer' }),
        }),
      )
      await expectUnauthorized(new Request(`${base}/projects/${projectId}/members/${encodeURIComponent(userId)}/access`))
      await expectUnauthorized(
        new Request(`${base}/projects/${projectId}/members/${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ roleKey: 'viewer' }),
        }),
      )
      await expectUnauthorized(
        new Request(`${base}/projects/${projectId}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
      )

      await expectUnauthorized(new Request(`${base}/projects/${projectId}/groups`))
      await expectUnauthorized(
        new Request(`${base}/projects/${projectId}/groups`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'Developers', roleKey: 'member' }),
        }),
      )
      await expectUnauthorized(
        new Request(`${base}/projects/${projectId}/groups/${groupId}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        }),
      )
      await expectUnauthorized(new Request(`${base}/projects/${projectId}/groups/${groupId}`, { method: 'DELETE' }))

      await expectUnauthorized(new Request(`${base}/projects/${projectId}/groups/${groupId}/members`))
      await expectUnauthorized(
        new Request(`${base}/projects/${projectId}/groups/${groupId}/members`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ userId }),
        }),
      )
      await expectUnauthorized(
        new Request(`${base}/projects/${projectId}/groups/${groupId}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
      )

      await expectUnauthorized(new Request(`${base}/projects/${projectId}/audit-events?from=1970-01-01T00:00:00.000Z`))
    } finally {
      await dispose()
    }
  })

  it('US1/US2: projects + members + groups + audit (handler-level)', async () => {
    const harness = makeProjectHarness()
    const admin = harness.seedUser({
      email: 'admin@example.com',
      password: 'admin123456',
      displayName: 'Admin',
      roles: ['user'],
    })
    const alice = harness.seedUser({
      email: 'alice@example.com',
      password: 'alice123456',
      displayName: 'Alice',
      roles: ['user'],
    })
    const bob = harness.seedUser({
      email: 'bob@example.com',
      password: 'bob123456',
      displayName: 'Bob',
      roles: ['user'],
    })
    const charlie = harness.seedUser({
      email: 'charlie@example.com',
      password: 'charlie123456',
      displayName: 'Charlie',
      roles: ['user'],
    })
    const dave = harness.seedUser({
      email: 'dave@example.com',
      password: 'dave123456',
      displayName: 'Dave',
      roles: ['user'],
    })

    const ProjectApi = HttpApi.make('EffectApi').add(ProjectGroup)
    const ApiTestLive = HttpApiBuilder.api(ProjectApi).pipe(
      Layer.provide(ProjectLive),
      Layer.provide(harness.AuthTest),
      Layer.provide(harness.ProjectRepoTest),
      Layer.provide(harness.ProjectAuditRepoTest),
    )

    const { handler, dispose } = HttpApiBuilder.toWebHandler(Layer.mergeAll(ApiTestLive, HttpServer.layerContext))

    try {
      const authJson = (userId: string) => ({ authorization: `Bearer ${userId}`, 'content-type': 'application/json' })
      const auth = (userId: string) => ({ authorization: `Bearer ${userId}` })

      const invalidCreate = await handler(
        new Request('http://local.test/projects', {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ name: '' }),
        }),
      )
      expect(invalidCreate.status).toBe(400)
      await expect(invalidCreate.json()).resolves.toEqual({ _tag: 'ValidationError', message: 'Invalid name' })

      const created = await handler(
        new Request('http://local.test/projects', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${admin.id}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ name: ' Galaxy Demo Project ' }),
        }),
      )
      expect(created.status).toBe(201)
      const createdJson = (await created.json()) as any
      expect(createdJson.name).toBe('Galaxy Demo Project')
      expect(typeof createdJson.projectId).toBe('number')

      const projectId = createdJson.projectId as number

      const lastOwnerCannotDowngrade = await handler(
        new Request(`http://local.test/projects/${projectId}/members/${admin.id}`, {
          method: 'PATCH',
          headers: authJson(admin.id),
          body: JSON.stringify({ roleKey: 'admin' }),
        }),
      )
      expect(lastOwnerCannotDowngrade.status).toBe(409)
      await expect(lastOwnerCannotDowngrade.json()).resolves.toEqual({
        _tag: 'ConflictError',
        message: 'Project must have at least one owner',
      })

      const lastOwnerCannotRemove = await handler(
        new Request(`http://local.test/projects/${projectId}/members/${admin.id}`, {
          method: 'DELETE',
          headers: auth(admin.id),
        }),
      )
      expect(lastOwnerCannotRemove.status).toBe(409)
      await expect(lastOwnerCannotRemove.json()).resolves.toEqual({
        _tag: 'ConflictError',
        message: 'Project must have at least one owner',
      })

      const dup = await handler(
        new Request('http://local.test/projects', {
          method: 'POST',
          headers: { authorization: `Bearer ${admin.id}`, 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'galaxy demo project' }),
        }),
      )
      expect(dup.status).toBe(409)
      await expect(dup.json()).resolves.toEqual({ _tag: 'ConflictError', message: 'Project name already exists' })

      const addAlice = await handler(
        new Request(`http://local.test/projects/${projectId}/members`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ email: ' Alice@Example.com ', roleKey: 'viewer' }),
        }),
      )
      expect(addAlice.status).toBe(201)
      const addAliceJson = (await addAlice.json()) as any
      expect(addAliceJson.user).toEqual({ id: alice.id, email: 'alice@example.com', displayName: 'Alice' })
      expect(addAliceJson.directRole).toBe('viewer')

      const dupAddAlice = await handler(
        new Request(`http://local.test/projects/${projectId}/members`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ email: 'alice@example.com', roleKey: 'viewer' }),
        }),
      )
      expect(dupAddAlice.status).toBe(409)
      await expect(dupAddAlice.json()).resolves.toEqual({ _tag: 'ConflictError', message: 'Member already exists' })

      const addMissingUser = await handler(
        new Request(`http://local.test/projects/${projectId}/members`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ email: 'missing@example.com', roleKey: 'viewer' }),
        }),
      )
      expect(addMissingUser.status).toBe(404)
      await expect(addMissingUser.json()).resolves.toEqual({ _tag: 'NotFoundError', message: 'User not found' })

      const membersBeforeGroups = await handler(new Request(`http://local.test/projects/${projectId}/members`, { headers: auth(admin.id) }))
      expect(membersBeforeGroups.status).toBe(200)
      const membersBeforeGroupsJson = (await membersBeforeGroups.json()) as Array<any>
      const aliceRowBefore = membersBeforeGroupsJson.find((m) => m.user?.id === alice.id)
      expect(aliceRowBefore).toMatchObject({
        user: { id: alice.id, email: 'alice@example.com', displayName: 'Alice' },
        directRole: 'viewer',
        groupRoleKeys: [],
        effectiveRoleKeys: ['viewer'],
        effectivePermissionKeys: ['member.read', 'project.read'],
      })
      const adminRowBefore = membersBeforeGroupsJson.find((m) => m.user?.id === admin.id)
      expect(adminRowBefore).toMatchObject({
        user: { id: admin.id, email: 'admin@example.com', displayName: 'Admin' },
        directRole: 'owner',
        groupRoleKeys: [],
        effectiveRoleKeys: ['owner'],
        effectivePermissionKeys: [
          'audit.read',
          'group.manage',
          'group.read',
          'member.manage',
          'member.read',
          'owner.manage',
          'project.read',
          'project.update',
        ],
      })

      const viewerCannotCreateGroup = await handler(
        new Request(`http://local.test/projects/${projectId}/groups`, {
          method: 'POST',
          headers: authJson(alice.id),
          body: JSON.stringify({ name: 'Should Fail', roleKey: 'member' }),
        }),
      )
      expect(viewerCannotCreateGroup.status).toBe(403)
      await expect(viewerCannotCreateGroup.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const viewerCannotUpdateProject = await handler(
        new Request(`http://local.test/projects/${projectId}`, {
          method: 'PATCH',
          headers: authJson(alice.id),
          body: JSON.stringify({ name: 'New Name' }),
        }),
      )
      expect(viewerCannotUpdateProject.status).toBe(403)
      await expect(viewerCannotUpdateProject.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const aliceProjects = await handler(new Request('http://local.test/projects', { headers: { authorization: `Bearer ${alice.id}` } }))
      expect(aliceProjects.status).toBe(200)
      await expect(aliceProjects.json()).resolves.toEqual([
        { projectId, name: 'Galaxy Demo Project', createdAt: '1970-01-01T00:00:00.000Z', updatedAt: '1970-01-01T00:00:00.000Z' },
      ])

      const viewerCannotChangeRole = await handler(
        new Request(`http://local.test/projects/${projectId}/members/${alice.id}`, {
          method: 'PATCH',
          headers: { authorization: `Bearer ${alice.id}`, 'content-type': 'application/json' },
          body: JSON.stringify({ roleKey: 'member' }),
        }),
      )
      expect(viewerCannotChangeRole.status).toBe(403)
      await expect(viewerCannotChangeRole.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const viewerCannotAddMember = await handler(
        new Request(`http://local.test/projects/${projectId}/members`, {
          method: 'POST',
          headers: authJson(alice.id),
          body: JSON.stringify({ email: 'bob@example.com', roleKey: 'viewer' }),
        }),
      )
      expect(viewerCannotAddMember.status).toBe(403)
      await expect(viewerCannotAddMember.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const addBob = await handler(
        new Request(`http://local.test/projects/${projectId}/members`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ email: 'bob@example.com', roleKey: 'viewer' }),
        }),
      )
      expect(addBob.status).toBe(201)

      const groupCreated = await handler(
        new Request(`http://local.test/projects/${projectId}/groups`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ name: 'Developers', roleKey: 'member' }),
        }),
      )
      expect(groupCreated.status).toBe(201)
      const groupCreatedJson = (await groupCreated.json()) as any
      expect(typeof groupCreatedJson.groupId).toBe('number')
      const groupId = groupCreatedJson.groupId as number

      const groupNameDup = await handler(
        new Request(`http://local.test/projects/${projectId}/groups`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ name: ' developers ', roleKey: 'member' }),
        }),
      )
      expect(groupNameDup.status).toBe(409)
      await expect(groupNameDup.json()).resolves.toEqual({ _tag: 'ConflictError', message: 'Group name already exists' })

      const nonMemberJoin = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}/members`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ userId: dave.id }),
        }),
      )
      expect(nonMemberJoin.status).toBe(409)
      await expect(nonMemberJoin.json()).resolves.toEqual({ _tag: 'ConflictError', message: 'User is not a project member' })

      const addBobToGroup = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}/members`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ userId: bob.id }),
        }),
      )
      expect(addBobToGroup.status).toBe(201)

      const dupAddBobToGroup = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}/members`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ userId: bob.id }),
        }),
      )
      expect(dupAddBobToGroup.status).toBe(409)
      await expect(dupAddBobToGroup.json()).resolves.toEqual({ _tag: 'ConflictError', message: 'Member already in group' })

      const bobAccess = await handler(new Request(`http://local.test/projects/${projectId}/access`, { headers: auth(bob.id) }))
      expect(bobAccess.status).toBe(200)
      await expect(bobAccess.json()).resolves.toEqual({
        projectId,
        userId: bob.id,
        directRole: 'viewer',
        groupRoleKeys: ['member'],
        effectiveRoleKeys: ['viewer', 'member'],
        effectivePermissionKeys: ['group.read', 'member.read', 'project.read'],
      })

      const viewerCannotUpdateGroup = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}`, {
          method: 'PATCH',
          headers: authJson(alice.id),
          body: JSON.stringify({ roleKey: 'admin' }),
        }),
      )
      expect(viewerCannotUpdateGroup.status).toBe(403)
      await expect(viewerCannotUpdateGroup.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const viewerCannotDeleteGroup = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}`, {
          method: 'DELETE',
          headers: auth(alice.id),
        }),
      )
      expect(viewerCannotDeleteGroup.status).toBe(403)
      await expect(viewerCannotDeleteGroup.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const viewerCannotAddGroupMember = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}/members`, {
          method: 'POST',
          headers: authJson(alice.id),
          body: JSON.stringify({ userId: bob.id }),
        }),
      )
      expect(viewerCannotAddGroupMember.status).toBe(403)
      await expect(viewerCannotAddGroupMember.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const viewerCannotRemoveGroupMember = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}/members/${bob.id}`, {
          method: 'DELETE',
          headers: auth(alice.id),
        }),
      )
      expect(viewerCannotRemoveGroupMember.status).toBe(403)
      await expect(viewerCannotRemoveGroupMember.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const viewerCannotRemoveMember = await handler(
        new Request(`http://local.test/projects/${projectId}/members/${bob.id}`, {
          method: 'DELETE',
          headers: auth(alice.id),
        }),
      )
      expect(viewerCannotRemoveMember.status).toBe(403)
      await expect(viewerCannotRemoveMember.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const addCharlie = await handler(
        new Request(`http://local.test/projects/${projectId}/members`, {
          method: 'POST',
          headers: authJson(admin.id),
          body: JSON.stringify({ email: 'charlie@example.com', roleKey: 'admin' }),
        }),
      )
      expect(addCharlie.status).toBe(201)

      const adminPromoteBobToOwnerForbidden = await handler(
        new Request(`http://local.test/projects/${projectId}/members/${bob.id}`, {
          method: 'PATCH',
          headers: authJson(charlie.id),
          body: JSON.stringify({ roleKey: 'owner' }),
        }),
      )
      expect(adminPromoteBobToOwnerForbidden.status).toBe(403)
      await expect(adminPromoteBobToOwnerForbidden.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const promoteCharlieToOwner = await handler(
        new Request(`http://local.test/projects/${projectId}/members/${charlie.id}`, {
          method: 'PATCH',
          headers: authJson(admin.id),
          body: JSON.stringify({ roleKey: 'owner' }),
        }),
      )
      expect(promoteCharlieToOwner.status).toBe(200)
      await expect(promoteCharlieToOwner.json()).resolves.toMatchObject({ directRole: 'owner' })

      const downgradeAdminToAdmin = await handler(
        new Request(`http://local.test/projects/${projectId}/members/${admin.id}`, {
          method: 'PATCH',
          headers: authJson(admin.id),
          body: JSON.stringify({ roleKey: 'admin' }),
        }),
      )
      expect(downgradeAdminToAdmin.status).toBe(200)

      const updateGroupRole = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}`, {
          method: 'PATCH',
          headers: authJson(admin.id),
          body: JSON.stringify({ roleKey: 'admin' }),
        }),
      )
      expect(updateGroupRole.status).toBe(200)
      await expect(updateGroupRole.json()).resolves.toMatchObject({ groupId, roleKey: 'admin' })

      const bobAccessAfterGroupRoleChanged = await handler(new Request(`http://local.test/projects/${projectId}/access`, { headers: auth(bob.id) }))
      expect(bobAccessAfterGroupRoleChanged.status).toBe(200)
      await expect(bobAccessAfterGroupRoleChanged.json()).resolves.toEqual({
        projectId,
        userId: bob.id,
        directRole: 'viewer',
        groupRoleKeys: ['admin'],
        effectiveRoleKeys: ['viewer', 'admin'],
        effectivePermissionKeys: ['audit.read', 'group.manage', 'group.read', 'member.manage', 'member.read', 'project.read'],
      })

      const membersDuringGroup = await handler(new Request(`http://local.test/projects/${projectId}/members`, { headers: auth(admin.id) }))
      expect(membersDuringGroup.status).toBe(200)
      const membersDuringGroupJson = (await membersDuringGroup.json()) as Array<any>
      const bobRowDuring = membersDuringGroupJson.find((m) => m.user?.id === bob.id)
      expect(bobRowDuring).toMatchObject({
        directRole: 'viewer',
        groupRoleKeys: ['admin'],
        effectiveRoleKeys: ['viewer', 'admin'],
        effectivePermissionKeys: ['audit.read', 'group.manage', 'group.read', 'member.manage', 'member.read', 'project.read'],
      })

      const viewerCannotListGroups = await handler(new Request(`http://local.test/projects/${projectId}/groups`, { headers: auth(alice.id) }))
      expect(viewerCannotListGroups.status).toBe(403)
      await expect(viewerCannotListGroups.json()).resolves.toEqual({ _tag: 'ForbiddenError', message: 'Forbidden' })

      const bobCanListGroups = await handler(new Request(`http://local.test/projects/${projectId}/groups`, { headers: auth(bob.id) }))
      expect(bobCanListGroups.status).toBe(200)
      const bobCanListGroupsJson = (await bobCanListGroups.json()) as Array<any>
      expect(bobCanListGroupsJson.map((g) => g.groupId)).toContain(groupId)

      const groupMembers = await handler(new Request(`http://local.test/projects/${projectId}/groups/${groupId}/members`, { headers: auth(bob.id) }))
      expect(groupMembers.status).toBe(200)
      const groupMembersJson = (await groupMembers.json()) as Array<any>
      expect(groupMembersJson.map((m) => m.user?.id)).toContain(bob.id)

      const removeBobFromGroup = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}/members/${bob.id}`, {
          method: 'DELETE',
          headers: auth(admin.id),
        }),
      )
      expect(removeBobFromGroup.status).toBe(204)

      const bobAccessAfterGroupRemoved = await handler(new Request(`http://local.test/projects/${projectId}/access`, { headers: auth(bob.id) }))
      expect(bobAccessAfterGroupRemoved.status).toBe(200)
      await expect(bobAccessAfterGroupRemoved.json()).resolves.toEqual({
        projectId,
        userId: bob.id,
        directRole: 'viewer',
        groupRoleKeys: [],
        effectiveRoleKeys: ['viewer'],
        effectivePermissionKeys: ['member.read', 'project.read'],
      })

      const membersAfterGroupRemoved = await handler(new Request(`http://local.test/projects/${projectId}/members`, { headers: auth(admin.id) }))
      expect(membersAfterGroupRemoved.status).toBe(200)
      const membersAfterGroupRemovedJson = (await membersAfterGroupRemoved.json()) as Array<any>
      const bobRowAfter = membersAfterGroupRemovedJson.find((m) => m.user?.id === bob.id)
      expect(bobRowAfter).toMatchObject({
        directRole: 'viewer',
        groupRoleKeys: [],
        effectiveRoleKeys: ['viewer'],
        effectivePermissionKeys: ['member.read', 'project.read'],
      })

      const deleteGroup = await handler(
        new Request(`http://local.test/projects/${projectId}/groups/${groupId}`, {
          method: 'DELETE',
          headers: auth(admin.id),
        }),
      )
      expect(deleteGroup.status).toBe(204)

      const removeBob = await handler(
        new Request(`http://local.test/projects/${projectId}/members/${bob.id}`, {
          method: 'DELETE',
          headers: auth(admin.id),
        }),
      )
      expect(removeBob.status).toBe(204)

      const invalidAuditRange = await handler(
        new Request(`http://local.test/projects/${projectId}/audit-events?from=invalid`, {
          headers: auth(admin.id),
        }),
      )
      expect(invalidAuditRange.status).toBe(400)
      await expect(invalidAuditRange.json()).resolves.toEqual({ _tag: 'ValidationError', message: 'Invalid from' })

      const audit = await handler(
        new Request(`http://local.test/projects/${projectId}/audit-events?from=1970-01-01T00:00:00.000Z`, {
          headers: auth(admin.id),
        }),
      )
      expect(audit.status).toBe(200)
      const events = (await audit.json()) as Array<any>
      const eventTypes = events.map((e) => e.eventType)
      expect(eventTypes).toContain('project_created')
      expect(eventTypes).toContain('member_added')
      expect(eventTypes).toContain('member_removed')
      expect(eventTypes).toContain('member_role_changed')
      expect(eventTypes).toContain('group_created')
      expect(eventTypes).toContain('group_deleted')
      expect(eventTypes).toContain('group_member_added')
      expect(eventTypes).toContain('group_member_removed')
      expect(eventTypes).toContain('group_role_changed')

      const findEvent = (eventType: string, predicate: (e: any) => boolean) =>
        events.find((e) => e.eventType === eventType && predicate(e))

      const projectCreated = findEvent('project_created', () => true)
      expect(projectCreated).toMatchObject({
        projectId,
        eventType: 'project_created',
        actorUserId: admin.id,
        subjectUserId: null,
        subjectGroupId: null,
        detail: { name: 'Galaxy Demo Project' },
      })
      expect(typeof projectCreated.eventId).toBe('number')
      expect(typeof projectCreated.createdAt).toBe('string')

      expect(findEvent('member_added', (e) => e.subjectUserId === bob.id)).toMatchObject({
        projectId,
        eventType: 'member_added',
        actorUserId: admin.id,
        subjectUserId: bob.id,
        subjectGroupId: null,
        detail: { roleKey: 'viewer' },
      })

      expect(findEvent('member_removed', (e) => e.subjectUserId === bob.id)).toMatchObject({
        projectId,
        eventType: 'member_removed',
        actorUserId: admin.id,
        subjectUserId: bob.id,
        subjectGroupId: null,
        detail: { prevRoleKey: 'viewer' },
      })

      expect(findEvent('member_role_changed', (e) => e.subjectUserId === charlie.id)).toMatchObject({
        projectId,
        eventType: 'member_role_changed',
        actorUserId: admin.id,
        subjectUserId: charlie.id,
        subjectGroupId: null,
        detail: { fromRoleKey: 'admin', toRoleKey: 'owner' },
      })

      expect(findEvent('group_created', (e) => e.subjectGroupId === groupId)).toMatchObject({
        projectId,
        eventType: 'group_created',
        actorUserId: admin.id,
        subjectUserId: null,
        subjectGroupId: groupId,
        detail: { name: 'Developers', roleKey: 'member' },
      })

      expect(findEvent('group_role_changed', (e) => e.subjectGroupId === groupId)).toMatchObject({
        projectId,
        eventType: 'group_role_changed',
        actorUserId: admin.id,
        subjectUserId: null,
        subjectGroupId: groupId,
        detail: { fromRoleKey: 'member', toRoleKey: 'admin' },
      })

      expect(findEvent('group_member_added', (e) => e.subjectGroupId === groupId && e.subjectUserId === bob.id)).toMatchObject({
        projectId,
        eventType: 'group_member_added',
        actorUserId: admin.id,
        subjectUserId: bob.id,
        subjectGroupId: groupId,
      })

      expect(findEvent('group_member_removed', (e) => e.subjectGroupId === groupId && e.subjectUserId === bob.id)).toMatchObject({
        projectId,
        eventType: 'group_member_removed',
        actorUserId: admin.id,
        subjectUserId: bob.id,
        subjectGroupId: groupId,
      })

      expect(findEvent('group_deleted', (e) => e.subjectGroupId === groupId)).toMatchObject({
        projectId,
        eventType: 'group_deleted',
        actorUserId: admin.id,
        subjectUserId: null,
        subjectGroupId: groupId,
      })
    } finally {
      await dispose()
    }
  })
})
