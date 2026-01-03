import { Effect, Schema, Stream } from 'effect'
import * as Logix from '@logix/core'
import { galaxyApi } from '../galaxy-api/client'
import { AuthDef, AuthImpl } from './auth.module'

const ProjectsStateSchema = Schema.Struct({
  projects: Schema.Array(Schema.Any),
  projectsLoading: Schema.Boolean,
  projectsError: Schema.NullOr(Schema.String),

  selectedProjectId: Schema.NullOr(Schema.Number),
  selectedProject: Schema.NullOr(Schema.Any),
  selectedProjectLoading: Schema.Boolean,
  selectedProjectError: Schema.NullOr(Schema.String),

  access: Schema.NullOr(Schema.Any),
  accessLoading: Schema.Boolean,
  accessError: Schema.NullOr(Schema.String),
})

export type ProjectsState = Schema.Schema.Type<typeof ProjectsStateSchema>

export const ProjectsDef = Logix.Module.make('GalaxyProjects', {
  state: ProjectsStateSchema,
  actions: {
    refreshProjects: Schema.Void,
    createProject: Schema.String,
    selectProject: Schema.Number,
    refreshAccess: Schema.Void,

    // Internal Actions
    setProjects: Schema.Array(Schema.Any),
    setProjectsLoading: Schema.Boolean,
    setProjectsError: Schema.NullOr(Schema.String),

    setSelectedProjectId: Schema.NullOr(Schema.Number),
    setSelectedProject: Schema.NullOr(Schema.Any),
    setSelectedProjectLoading: Schema.Boolean,
    setSelectedProjectError: Schema.NullOr(Schema.String),

    setAccess: Schema.NullOr(Schema.Any),
    setAccessLoading: Schema.Boolean,
    setAccessError: Schema.NullOr(Schema.String),
  },
  reducers: {
    setProjects: (state, action) => ({ ...state, projects: action.payload }),
    setProjectsLoading: (state, action) => ({ ...state, projectsLoading: action.payload }),
    setProjectsError: (state, action) => ({ ...state, projectsError: action.payload }),

    setSelectedProjectId: (state, action) => ({ ...state, selectedProjectId: action.payload }),
    setSelectedProject: (state, action) => ({ ...state, selectedProject: action.payload }),
    setSelectedProjectLoading: (state, action) => ({ ...state, selectedProjectLoading: action.payload }),
    setSelectedProjectError: (state, action) => ({ ...state, selectedProjectError: action.payload }),

    setAccess: (state, action) => ({ ...state, access: action.payload }),
    setAccessLoading: (state, action) => ({ ...state, accessLoading: action.payload }),
    setAccessError: (state, action) => ({ ...state, accessError: action.payload }),
  },
})

export const ProjectsLogic = ProjectsDef.logic(($) => {
  const resetAll = Effect.gen(function* () {
    yield* $.dispatchers.setProjects([])
    yield* $.dispatchers.setProjectsError(null)
    yield* $.dispatchers.setProjectsLoading(false)
    yield* $.dispatchers.setSelectedProjectId(null)
    yield* $.dispatchers.setSelectedProject(null)
    yield* $.dispatchers.setSelectedProjectError(null)
    yield* $.dispatchers.setSelectedProjectLoading(false)
    yield* $.dispatchers.setAccess(null)
    yield* $.dispatchers.setAccessError(null)
    yield* $.dispatchers.setAccessLoading(false)
  })

  const loadProjects = (token: string) =>
    Effect.gen(function* () {
      yield* $.dispatchers.setProjectsLoading(true)
      yield* $.dispatchers.setProjectsError(null)

      const listEither = yield* Effect.tryPromise({
        try: () => galaxyApi.projectList(token),
        catch: (e) => e,
      }).pipe(Effect.either)

      if (listEither._tag === 'Left') {
        yield* $.dispatchers.setProjects([])
        yield* $.dispatchers.setProjectsError(galaxyApi.toMessage(listEither.left))
        yield* $.dispatchers.setProjectsLoading(false)
        return
      }

      yield* $.dispatchers.setProjects(listEither.right as any)
      yield* $.dispatchers.setProjectsLoading(false)
    })

  const loadSelectedProject = (token: string, projectId: number) =>
    Effect.gen(function* () {
      yield* $.dispatchers.setSelectedProjectLoading(true)
      yield* $.dispatchers.setSelectedProjectError(null)
      yield* $.dispatchers.setSelectedProject(null)

      const getEither = yield* Effect.tryPromise({
        try: () => galaxyApi.projectGet(token, projectId),
        catch: (e) => e,
      }).pipe(Effect.either)

      if (getEither._tag === 'Left') {
        yield* $.dispatchers.setSelectedProjectError(galaxyApi.toMessage(getEither.left))
        yield* $.dispatchers.setSelectedProjectLoading(false)
        return
      }

      yield* $.dispatchers.setSelectedProject(getEither.right as any)
      yield* $.dispatchers.setSelectedProjectLoading(false)
    })

  const loadAccess = (token: string, projectId: number) =>
    Effect.gen(function* () {
      yield* $.dispatchers.setAccessLoading(true)
      yield* $.dispatchers.setAccessError(null)
      yield* $.dispatchers.setAccess(null)

      const accessEither = yield* Effect.tryPromise({
        try: () => galaxyApi.projectAccessMe(token, projectId),
        catch: (e) => e,
      }).pipe(Effect.either)

      if (accessEither._tag === 'Left') {
        yield* $.dispatchers.setAccessError(galaxyApi.toMessage(accessEither.left))
        yield* $.dispatchers.setAccessLoading(false)
        return
      }

      yield* $.dispatchers.setAccess(accessEither.right as any)
      yield* $.dispatchers.setAccessLoading(false)
    })

  return {
    setup: Effect.void,
    run: Effect.gen(function* () {
      const auth = yield* $.use(AuthDef)

      const token = yield* auth.read((s) => s.token)
      if (token) {
        yield* loadProjects(token)
      } else {
        yield* resetAll
      }

      yield* Effect.all(
        [
          Stream.runForEach(
            auth.changes((s) => s.token),
            (nextToken) =>
              nextToken
                ? Effect.gen(function* () {
                    yield* resetAll
                    yield* loadProjects(nextToken)
                  })
                : resetAll,
          ),

          $.onAction('refreshProjects').runLatest(() =>
            Effect.gen(function* () {
              const t = yield* auth.read((s) => s.token)
              if (!t) return yield* resetAll
              yield* loadProjects(t)
            }),
          ),

          $.onAction('createProject').runLatest((action) =>
            Effect.gen(function* () {
              const t = yield* auth.read((s) => s.token)
              if (!t) return yield* resetAll

              yield* $.dispatchers.setProjectsError(null)
              yield* $.dispatchers.setProjectsLoading(true)

              const createEither = yield* Effect.tryPromise({
                try: () => galaxyApi.projectCreate(t, { name: action.payload }),
                catch: (e) => e,
              }).pipe(Effect.either)

              if (createEither._tag === 'Left') {
                yield* $.dispatchers.setProjectsError(galaxyApi.toMessage(createEither.left))
                yield* $.dispatchers.setProjectsLoading(false)
                return
              }

              yield* $.dispatchers.setProjectsLoading(false)
              yield* loadProjects(t)
            }),
          ),

          $.onAction('selectProject').runLatest((action) =>
            Effect.gen(function* () {
              const projectId = action.payload
              yield* $.dispatchers.setSelectedProjectId(projectId)

              const t = yield* auth.read((s) => s.token)
              if (!t) return yield* resetAll

              yield* Effect.all([loadSelectedProject(t, projectId), loadAccess(t, projectId)])
            }),
          ),

          $.onAction('refreshAccess').runLatest(() =>
            Effect.gen(function* () {
              const t = yield* auth.read((s) => s.token)
              const projectId = (yield* $.state.read).selectedProjectId
              if (!t || projectId == null) return
              yield* loadAccess(t, projectId)
            }),
          ),
        ],
        { concurrency: 'unbounded' },
      )
    }),
  }
})

export const ProjectsModule = ProjectsDef.implement({
  initial: {
    projects: [],
    projectsLoading: false,
    projectsError: null,

    selectedProjectId: null,
    selectedProject: null,
    selectedProjectLoading: false,
    selectedProjectError: null,

    access: null,
    accessLoading: false,
    accessError: null,
  } satisfies ProjectsState,
  // imports: [AuthImpl],
  logics: [ProjectsLogic],
})

export const ProjectsImpl = ProjectsModule.impl
