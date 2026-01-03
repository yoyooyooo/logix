import { Effect, Schema, Stream } from 'effect'
import * as Logix from '@logix/core'
import { galaxyApi } from '../galaxy-api/client'
import { AuthDef, AuthImpl } from './auth.module'
import { ProjectRoleKeySchema } from './permissions'
import { ProjectsDef, ProjectsImpl } from './projects.module'

const GroupsStateSchema = Schema.Struct({
  groups: Schema.Array(Schema.Any),
  groupsLoading: Schema.Boolean,
  groupsError: Schema.NullOr(Schema.String),

  selectedGroupId: Schema.NullOr(Schema.Number),
  selectedGroupMembers: Schema.Array(Schema.Any),
  membersLoading: Schema.Boolean,
  membersError: Schema.NullOr(Schema.String),
})

export type ProjectGroupsState = Schema.Schema.Type<typeof GroupsStateSchema>

export const ProjectGroupsDef = Logix.Module.make('GalaxyProjectGroups', {
  state: GroupsStateSchema,
  actions: {
    refreshGroups: Schema.Void,
    createGroup: Schema.Struct({
      name: Schema.String,
      roleKey: ProjectRoleKeySchema,
    }),
    updateGroup: Schema.Struct({
      groupId: Schema.Number,
      name: Schema.optional(Schema.String),
      roleKey: Schema.optional(ProjectRoleKeySchema),
    }),
    deleteGroup: Schema.Number,

    selectGroup: Schema.NullOr(Schema.Number),
    refreshMembers: Schema.Void,
    addMember: Schema.Struct({
      groupId: Schema.Number,
      userId: Schema.String,
    }),
    removeMember: Schema.Struct({
      groupId: Schema.Number,
      userId: Schema.String,
    }),

    // Internal Actions
    setGroups: Schema.Array(Schema.Any),
    setGroupsLoading: Schema.Boolean,
    setGroupsError: Schema.NullOr(Schema.String),
    setSelectedGroupId: Schema.NullOr(Schema.Number),
    setSelectedGroupMembers: Schema.Array(Schema.Any),
    setMembersLoading: Schema.Boolean,
    setMembersError: Schema.NullOr(Schema.String),
  },
  reducers: {
    setGroups: (state, action) => ({ ...state, groups: action.payload }),
    setGroupsLoading: (state, action) => ({ ...state, groupsLoading: action.payload }),
    setGroupsError: (state, action) => ({ ...state, groupsError: action.payload }),
    setSelectedGroupId: (state, action) => ({ ...state, selectedGroupId: action.payload }),
    setSelectedGroupMembers: (state, action) => ({ ...state, selectedGroupMembers: action.payload }),
    setMembersLoading: (state, action) => ({ ...state, membersLoading: action.payload }),
    setMembersError: (state, action) => ({ ...state, membersError: action.payload }),
  },
})

export const ProjectGroupsLogic = ProjectGroupsDef.logic(($) => {
  const clearAll = Effect.gen(function* () {
    yield* $.dispatchers.setGroups([])
    yield* $.dispatchers.setGroupsError(null)
    yield* $.dispatchers.setGroupsLoading(false)
    yield* $.dispatchers.setSelectedGroupId(null)
    yield* $.dispatchers.setSelectedGroupMembers([])
    yield* $.dispatchers.setMembersError(null)
    yield* $.dispatchers.setMembersLoading(false)
  })

  const loadGroups = (token: string, projectId: number) =>
    Effect.gen(function* () {
      yield* $.dispatchers.setGroupsLoading(true)
      yield* $.dispatchers.setGroupsError(null)

      const listEither = yield* Effect.tryPromise({
        try: () => galaxyApi.projectGroupList(token, projectId),
        catch: (e) => e,
      }).pipe(Effect.either)

      if (listEither._tag === 'Left') {
        yield* $.dispatchers.setGroups([])
        yield* $.dispatchers.setGroupsError(galaxyApi.toMessage(listEither.left))
        yield* $.dispatchers.setGroupsLoading(false)
        return
      }

      yield* $.dispatchers.setGroups(listEither.right as any)
      yield* $.dispatchers.setGroupsLoading(false)
    })

  const loadGroupMembers = (token: string, projectId: number, groupId: number) =>
    Effect.gen(function* () {
      yield* $.dispatchers.setMembersLoading(true)
      yield* $.dispatchers.setMembersError(null)
      yield* $.dispatchers.setSelectedGroupMembers([])

      const listEither = yield* Effect.tryPromise({
        try: () => galaxyApi.projectGroupMemberList(token, projectId, groupId),
        catch: (e) => e,
      }).pipe(Effect.either)

      if (listEither._tag === 'Left') {
        yield* $.dispatchers.setMembersError(galaxyApi.toMessage(listEither.left))
        yield* $.dispatchers.setMembersLoading(false)
        return
      }

      yield* $.dispatchers.setSelectedGroupMembers(listEither.right as any)
      yield* $.dispatchers.setMembersLoading(false)
    })

  return {
    setup: Effect.void,
    run: Effect.gen(function* () {
      const auth = yield* $.use(AuthDef)
      const projects = yield* $.use(ProjectsDef)

      yield* Effect.all(
        [
          Stream.runForEach(
            projects.changes((s) => s.selectedProjectId),
            (projectId) =>
              projectId == null
                ? clearAll
                : Effect.gen(function* () {
                    const token = yield* auth.read((s) => s.token)
                    if (!token) return yield* clearAll
                    yield* $.dispatchers.setSelectedGroupId(null)
                    yield* $.dispatchers.setSelectedGroupMembers([])
                    yield* loadGroups(token, projectId)
                  }),
          ),

          $.onAction('refreshGroups').runLatest(() =>
            Effect.gen(function* () {
              const token = yield* auth.read((s) => s.token)
              const projectId = yield* projects.read((s) => s.selectedProjectId)
              if (!token || projectId == null) return yield* clearAll
              yield* loadGroups(token, projectId)
            }),
          ),

          $.onAction('createGroup').runLatest((action) =>
            Effect.gen(function* () {
              const token = yield* auth.read((s) => s.token)
              const projectId = yield* projects.read((s) => s.selectedProjectId)
              if (!token || projectId == null) return

              yield* $.dispatchers.setGroupsLoading(true)
              yield* $.dispatchers.setGroupsError(null)

              const createEither = yield* Effect.tryPromise({
                try: () => galaxyApi.projectGroupCreate(token, projectId, action.payload),
                catch: (e) => e,
              }).pipe(Effect.either)

              if (createEither._tag === 'Left') {
                yield* $.dispatchers.setGroupsError(galaxyApi.toMessage(createEither.left))
                yield* $.dispatchers.setGroupsLoading(false)
                return
              }

              yield* $.dispatchers.setGroupsLoading(false)
              yield* loadGroups(token, projectId)
              yield* projects.actions.refreshAccess()
            }),
        ),

          $.onAction('updateGroup').runLatest((action) =>
            Effect.gen(function* () {
              const token = yield* auth.read((s) => s.token)
              const projectId = yield* projects.read((s) => s.selectedProjectId)
              if (!token || projectId == null) return

              yield* $.dispatchers.setGroupsLoading(true)
              yield* $.dispatchers.setGroupsError(null)

              const updateEither = yield* Effect.tryPromise({
                try: () =>
                  galaxyApi.projectGroupUpdate(token, projectId, action.payload.groupId, {
                    name: action.payload.name,
                    roleKey: action.payload.roleKey,
                  }),
                catch: (e) => e,
              }).pipe(Effect.either)

              if (updateEither._tag === 'Left') {
                yield* $.dispatchers.setGroupsError(galaxyApi.toMessage(updateEither.left))
                yield* $.dispatchers.setGroupsLoading(false)
                return
              }

              yield* $.dispatchers.setGroupsLoading(false)
              yield* loadGroups(token, projectId)
              yield* projects.actions.refreshAccess()
            }),
        ),

          $.onAction('deleteGroup').runLatest((action) =>
            Effect.gen(function* () {
              const token = yield* auth.read((s) => s.token)
              const projectId = yield* projects.read((s) => s.selectedProjectId)
              if (!token || projectId == null) return

              yield* $.dispatchers.setGroupsLoading(true)
              yield* $.dispatchers.setGroupsError(null)

              const deleteEither = yield* Effect.tryPromise({
                try: () => galaxyApi.projectGroupDelete(token, projectId, action.payload),
                catch: (e) => e,
              }).pipe(Effect.either)

              if (deleteEither._tag === 'Left') {
                yield* $.dispatchers.setGroupsError(galaxyApi.toMessage(deleteEither.left))
                yield* $.dispatchers.setGroupsLoading(false)
                return
              }

              yield* $.dispatchers.setGroupsLoading(false)
              yield* loadGroups(token, projectId)
              yield* projects.actions.refreshAccess()
            }),
        ),

          $.onAction('selectGroup').runLatest((action) =>
            Effect.gen(function* () {
              const nextId = action.payload
              yield* $.dispatchers.setSelectedGroupId(nextId)
              yield* $.dispatchers.setSelectedGroupMembers([])
              yield* $.dispatchers.setMembersError(null)

              const token = yield* auth.read((s) => s.token)
              const projectId = yield* projects.read((s) => s.selectedProjectId)
              if (!token || projectId == null || nextId == null) return
              yield* loadGroupMembers(token, projectId, nextId)
            }),
          ),

          $.onAction('refreshMembers').runLatest(() =>
            Effect.gen(function* () {
              const token = yield* auth.read((s) => s.token)
              const projectId = yield* projects.read((s) => s.selectedProjectId)
              const groupId = (yield* $.state.read).selectedGroupId
              if (!token || projectId == null || groupId == null) return
              yield* loadGroupMembers(token, projectId, groupId)
            }),
          ),

          $.onAction('addMember').runLatest((action) =>
            Effect.gen(function* () {
              const token = yield* auth.read((s) => s.token)
              const projectId = yield* projects.read((s) => s.selectedProjectId)
              if (!token || projectId == null) return

              yield* $.dispatchers.setMembersLoading(true)
              yield* $.dispatchers.setMembersError(null)

              const addEither = yield* Effect.tryPromise({
                try: () =>
                  galaxyApi.projectGroupMemberAdd(token, projectId, action.payload.groupId, {
                    userId: action.payload.userId,
                  }),
                catch: (e) => e,
              }).pipe(Effect.either)

              if (addEither._tag === 'Left') {
                yield* $.dispatchers.setMembersError(galaxyApi.toMessage(addEither.left))
                yield* $.dispatchers.setMembersLoading(false)
                return
              }

              yield* $.dispatchers.setMembersLoading(false)
              yield* loadGroupMembers(token, projectId, action.payload.groupId)
              yield* projects.actions.refreshAccess()
            }),
        ),

          $.onAction('removeMember').runLatest((action) =>
            Effect.gen(function* () {
              const token = yield* auth.read((s) => s.token)
              const projectId = yield* projects.read((s) => s.selectedProjectId)
              if (!token || projectId == null) return

              yield* $.dispatchers.setMembersLoading(true)
              yield* $.dispatchers.setMembersError(null)

              const removeEither = yield* Effect.tryPromise({
                try: () =>
                  galaxyApi.projectGroupMemberRemove(token, projectId, action.payload.groupId, action.payload.userId),
                catch: (e) => e,
              }).pipe(Effect.either)

              if (removeEither._tag === 'Left') {
                yield* $.dispatchers.setMembersError(galaxyApi.toMessage(removeEither.left))
                yield* $.dispatchers.setMembersLoading(false)
                return
              }

              yield* $.dispatchers.setMembersLoading(false)
              yield* loadGroupMembers(token, projectId, action.payload.groupId)
              yield* projects.actions.refreshAccess()
            }),
        ),
        ],
        { concurrency: 'unbounded' },
      )
    }),
  }
})

export const ProjectGroupsModule = ProjectGroupsDef.implement({
  initial: {
    groups: [],
    groupsLoading: false,
    groupsError: null,
    selectedGroupId: null,
    selectedGroupMembers: [],
    membersLoading: false,
    membersError: null,
  } satisfies ProjectGroupsState,
  imports: [AuthImpl, ProjectsImpl],
  logics: [ProjectGroupsLogic],
})

export const ProjectGroupsImpl = ProjectGroupsModule.impl
