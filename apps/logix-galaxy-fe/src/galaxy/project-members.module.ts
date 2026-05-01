import { Effect, Exit, Schema, Stream } from 'effect'
import * as Logix from '@logixjs/core'
import { galaxyApi } from '../galaxy-api/client'
import { AuthDef, AuthProgram } from './auth.module'
import { ProjectRoleKeySchema } from './permissions'
import { ProjectsDef, ProjectsProgram } from './projects.module'

const MembersStateSchema = Schema.Struct({
  members: Schema.Array(Schema.Any),
  loading: Schema.Boolean,
  error: Schema.NullOr(Schema.String),
})

export type ProjectMembersState = Schema.Schema.Type<typeof MembersStateSchema>

export const ProjectMembersDef = Logix.Module.make('GalaxyProjectMembers', {
  state: MembersStateSchema,
  actions: {
    refresh: Schema.Void,
    addByEmail: Schema.Struct({
      email: Schema.String,
      roleKey: ProjectRoleKeySchema,
    }),
    setRole: Schema.Struct({
      userId: Schema.String,
      roleKey: ProjectRoleKeySchema,
    }),
    remove: Schema.String,

    // Internal Actions
    setMembers: Schema.Array(Schema.Any),
    setLoading: Schema.Boolean,
    setError: Schema.NullOr(Schema.String),
  },
  reducers: {
    setMembers: (state, action) => ({ ...state, members: action.payload }),
    setLoading: (state, action) => ({ ...state, loading: action.payload }),
    setError: (state, action) => ({ ...state, error: action.payload }),
  },
})

export const ProjectMembersLogic = ProjectMembersDef.logic('project-members', ($) => {
  const clear = Effect.gen(function* () {
    yield* $.dispatchers.setMembers([])
    yield* $.dispatchers.setError(null)
    yield* $.dispatchers.setLoading(false)
  })

  const load = (token: string, projectId: number) =>
    Effect.gen(function* () {
      yield* $.dispatchers.setLoading(true)
      yield* $.dispatchers.setError(null)

      const listEither = yield* Effect.exit(Effect.tryPromise({
        try: () => galaxyApi.projectMemberList(token, projectId),
        catch: (e) => e,
      }))

      if (Exit.isFailure(listEither)) {
        yield* $.dispatchers.setMembers([])
        yield* $.dispatchers.setError(galaxyApi.toMessage(listEither.cause))
        yield* $.dispatchers.setLoading(false)
        return
      }

      yield* $.dispatchers.setMembers(listEither.value as any)
      yield* $.dispatchers.setLoading(false)
    })

  return {
    setup: Effect.void,
    run: Effect.gen(function* () {
      const auth = yield* $.use(AuthDef)
      const projects = yield* $.use(ProjectsDef)

      yield* Effect.all([
        Stream.runForEach(projects.changes((s) => s.selectedProjectId), (projectId) =>
          projectId == null
            ? clear
            : Effect.gen(function* () {
                const token = yield* auth.read((s) => s.token)
                if (!token) return yield* clear
                yield* load(token, projectId)
              }),
        ),

        $.onAction('refresh').runLatest(() =>
          Effect.gen(function* () {
            const token = yield* auth.read((s) => s.token)
            const projectId = yield* projects.read((s) => s.selectedProjectId)
            if (!token || projectId == null) return yield* clear
            yield* load(token, projectId)
          }),
        ),

        $.onAction('addByEmail').runLatest((action) =>
          Effect.gen(function* () {
            const token = yield* auth.read((s) => s.token)
            const projectId = yield* projects.read((s) => s.selectedProjectId)
            if (!token || projectId == null) return

            yield* $.dispatchers.setLoading(true)
            yield* $.dispatchers.setError(null)

            const addEither = yield* Effect.exit(Effect.tryPromise({
              try: () => galaxyApi.projectMemberAdd(token, projectId, action.payload),
              catch: (e) => e,
            }))

            if (Exit.isFailure(addEither)) {
              yield* $.dispatchers.setError(galaxyApi.toMessage(addEither.cause))
              yield* $.dispatchers.setLoading(false)
              return
            }

            yield* $.dispatchers.setLoading(false)
            yield* load(token, projectId)
            yield* projects.actions.refreshAccess()
          }),
        ),

        $.onAction('setRole').runLatest((action) =>
          Effect.gen(function* () {
            const token = yield* auth.read((s) => s.token)
            const projectId = yield* projects.read((s) => s.selectedProjectId)
            if (!token || projectId == null) return

            yield* $.dispatchers.setLoading(true)
            yield* $.dispatchers.setError(null)

            const updateEither = yield* Effect.exit(Effect.tryPromise({
              try: () =>
                galaxyApi.projectMemberUpdateRole(token, projectId, action.payload.userId, {
                  roleKey: action.payload.roleKey,
                }),
              catch: (e) => e,
            }))

            if (Exit.isFailure(updateEither)) {
              yield* $.dispatchers.setError(galaxyApi.toMessage(updateEither.cause))
              yield* $.dispatchers.setLoading(false)
              return
            }

            yield* $.dispatchers.setLoading(false)
            yield* load(token, projectId)
            yield* projects.actions.refreshAccess()
          }),
        ),

        $.onAction('remove').runLatest((action) =>
          Effect.gen(function* () {
            const token = yield* auth.read((s) => s.token)
            const projectId = yield* projects.read((s) => s.selectedProjectId)
            if (!token || projectId == null) return

            yield* $.dispatchers.setLoading(true)
            yield* $.dispatchers.setError(null)

            const removeEither = yield* Effect.exit(Effect.tryPromise({
              try: () => galaxyApi.projectMemberRemove(token, projectId, action.payload),
              catch: (e) => e,
            }))

            if (Exit.isFailure(removeEither)) {
              yield* $.dispatchers.setError(galaxyApi.toMessage(removeEither.cause))
              yield* $.dispatchers.setLoading(false)
              return
            }

            yield* $.dispatchers.setLoading(false)
            yield* load(token, projectId)
            yield* projects.actions.refreshAccess()
          }),
        ),
      ], { concurrency: 'unbounded' })
    }),
  }
})

export const ProjectMembersProgram = Logix.Program.make(ProjectMembersDef, {
  initial: { members: [], loading: false, error: null } satisfies ProjectMembersState,
  capabilities: {
    imports: [AuthProgram, ProjectsProgram],
  },
  logics: [ProjectMembersLogic],
})
