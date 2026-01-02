import { Effect } from 'effect'

import { ApiResponseError, type ArtifactName, type SpecListItem, type TaskItem } from '../../api/client'
import { parseUserStories } from '../../lib/spec-relations'
import { KanbanAppDef, type KanbanState } from './kanbanApp.def'
import { SpecboardApi } from './service'

const isNotFound = (e: unknown): boolean => e instanceof ApiResponseError && e.status === 404 && e.tag === 'NotFoundError'

const formatError = (e: unknown): string => (e instanceof Error ? e.message : String(e))

const computeStats = (tasks: ReadonlyArray<TaskItem>) => {
  const total = tasks.length
  const done = tasks.filter((t) => t.checked).length
  return { total, done, todo: total - done }
}

const resolveSpecViewMode = (s: KanbanState, specId: string): 'task' | 'us' => s.viewModeBySpec[specId] ?? s.viewMode

const visibleSpecsOf = (s: KanbanState): ReadonlyArray<SpecListItem> => {
  if (!s.hideDoneTasks) return s.specs

  return s.specs.filter((spec) => {
    const stats = spec.taskStats
    if (!stats) return true
    if (stats.total === 0) return true
    return stats.todo > 0
  })
}

export const KanbanFilterLogic = KanbanAppDef.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const onHideDone = $.onAction('board/setHideDone').mutate((draft, a) => {
      draft.hideDoneTasks = a.payload
    })

    const onSetViewMode = $.onAction('board/setViewMode').mutate((draft, a) => {
      draft.viewMode = a.payload
      draft.viewModeBySpec = {}
    })

    const onSetSpecViewMode = $.onAction('board/setSpecViewMode').mutate((draft, a) => {
      draft.viewModeBySpec[a.payload.specId] = a.payload.mode
    })

    const onClearSpecViewMode = $.onAction('board/clearSpecViewMode').mutate((draft, a) => {
      delete draft.viewModeBySpec[a.payload]
    })

    yield* Effect.all([onHideDone, onSetViewMode, onSetSpecViewMode, onClearSpecViewMode], { concurrency: 'unbounded' })
  }),
}))

export const KanbanRefreshLogic = KanbanAppDef.logic<SpecboardApi>(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const api = yield* $.use(SpecboardApi)
    const initRes = yield* Effect.either(api.listSpecs())
    yield* $.state.mutate((draft) => {
      if (initRes._tag === 'Left') {
        draft.error = formatError(initRes.left)
        draft.specs = []
        draft.tasksBySpec = {}
        draft.loadingBySpec = {}
        draft.storiesBySpec = {}
        draft.loadingStoriesBySpec = {}
        return
      }

      draft.error = null
      draft.specs = Array.from(initRes.right.items)
      draft.tasksBySpec = {}
      draft.loadingBySpec = {}
      draft.storiesBySpec = {}
      draft.loadingStoriesBySpec = {}
    })

    const onRefresh = $.onAction('board/refresh').runLatestTask({
      pending: (_a) =>
        $.state.mutate((draft) => {
          draft.error = null
          draft.refreshSeq += 1
          draft.tasksBySpec = {}
          draft.loadingBySpec = {}
          draft.storiesBySpec = {}
          draft.loadingStoriesBySpec = {}
        }),
      effect: (_a) =>
        Effect.gen(function* () {
          const api = yield* $.use(SpecboardApi)
          return yield* api.listSpecs()
        }),
      success: (res, _a) =>
        $.state.mutate((draft) => {
          draft.specs = Array.from(res.items)
        }),
      failure: (cause, _a) =>
        $.state.mutate((draft) => {
          draft.error = formatError(cause)
        }),
    })

    yield* onRefresh
  }),
}))

export const KanbanEnsureTasksLoadedLogic = KanbanAppDef.logic<SpecboardApi>(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const visibleKey$ = $.flow.fromState((s) => {
      const state = s as KanbanState
      const visible = visibleSpecsOf(state)
      const specIds = visible.map((spec) => spec.id).join('|')
      const viewKey = visible.map((spec) => `${spec.id}:${resolveSpecViewMode(state, spec.id)}`).join('|')
      return `${specIds}::${viewKey}::${state.refreshSeq}`
    })

    const ensure = visibleKey$.pipe(
      $.flow.runLatest(
        Effect.gen(function* () {
          const api = yield* $.use(SpecboardApi)
          const state = (yield* $.state.read) as KanbanState
          const visibleSpecs = visibleSpecsOf(state)

          yield* Effect.forEach(
            visibleSpecs,
            (spec) =>
              Effect.gen(function* () {
                const current = (yield* $.state.read) as KanbanState
                const specId = spec.id
                const alreadyLoaded = current.tasksBySpec[specId] !== undefined
                const loading = current.loadingBySpec[specId] ?? false
                const desiredView = resolveSpecViewMode(current, specId)
                const storiesLoaded = current.storiesBySpec[specId] !== undefined
                const storiesLoading = current.loadingStoriesBySpec[specId] ?? false

                const shouldLoadTasks = !alreadyLoaded && !loading
                const shouldLoadStories = desiredView === 'us' && !storiesLoaded && !storiesLoading

                if (shouldLoadTasks) {
                  yield* Effect.gen(function* () {
                    yield* $.state.mutate((draft) => {
                      draft.loadingBySpec[specId] = true
                    })

                    const res = yield* Effect.either(api.listTasks(specId))

                    yield* $.state.mutate((draft) => {
                      if (res._tag === 'Right') {
                        draft.tasksBySpec[specId] = Array.from(res.right.tasks)
                        return
                      }

                      if (isNotFound(res.left)) {
                        draft.tasksBySpec[specId] = []
                        return
                      }

                      draft.error = formatError(res.left)
                      draft.tasksBySpec[specId] = []
                    })
                  }).pipe(
                    Effect.ensuring(
                      $.state.mutate((draft) => {
                        draft.loadingBySpec[specId] = false
                      }),
                    ),
                  )
                }

                if (shouldLoadStories) {
                  yield* Effect.gen(function* () {
                    yield* $.state.mutate((draft) => {
                      draft.loadingStoriesBySpec[specId] = true
                    })

                    const res = yield* Effect.either(api.readFile(specId, 'spec.md'))

                    yield* $.state.mutate((draft) => {
                      if (res._tag === 'Right') {
                        draft.storiesBySpec[specId] = Array.from(parseUserStories(res.right.content))
                        return
                      }

                      if (isNotFound(res.left)) {
                        draft.storiesBySpec[specId] = []
                        return
                      }

                      draft.error = formatError(res.left)
                      draft.storiesBySpec[specId] = []
                    })
                  }).pipe(
                    Effect.ensuring(
                      $.state.mutate((draft) => {
                        draft.loadingStoriesBySpec[specId] = false
                      }),
                    ),
                  )
                }
              }),
            { concurrency: 4 },
          )
        }),
      ),
    )

    yield* ensure
  }),
}))

export const KanbanToggleTaskLogic = KanbanAppDef.logic<SpecboardApi>(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const toggleTask = (specId: string, line: number, checked: boolean) =>
      Effect.gen(function* () {
        const api = yield* $.use(SpecboardApi)
        const res = yield* Effect.either(api.toggleTask(specId, line, checked))

        yield* $.state.mutate((draft) => {
          if (res._tag === 'Left') {
            draft.error = formatError(res.left)
            return
          }

          const tasks = Array.from(res.right.tasks)
          draft.tasksBySpec[specId] = tasks
          const stats = computeStats(tasks)
          draft.specs = draft.specs.map((s) => (s.id === specId ? { ...s, taskStats: stats } : s))
        })
      })

    const onToggle = $.onAction('board/toggleTask').runParallelFork((a) =>
      toggleTask(a.payload.specId, a.payload.line, a.payload.checked),
    )

    const onToggleFocused = $.onAction('board/toggleFocusedTask').runParallelFork(() =>
      Effect.gen(function* () {
        const state = (yield* $.state.read) as KanbanState
        const f = state.focusedTask
        if (!f) return

        const tasks = state.tasksBySpec[f.specId]
        const task = tasks?.find((t) => t.line === f.line)
        if (!task) return

        yield* toggleTask(f.specId, f.line, !task.checked)
      }),
    )

    yield* Effect.all([onToggle, onToggleFocused], { concurrency: 'unbounded' })
  }),
}))

export const KanbanSpecDetailLogic = KanbanAppDef.logic<SpecboardApi>(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const close = $.onAction('specDetail/close').mutate((draft) => {
      draft.specDetail.open = false
      draft.specDetail.specId = null
      draft.specDetail.viewMode = 'preview'
    })

    const toggleStory = $.onAction('specDetail/toggleStory').mutate((draft, a) => {
      draft.specDetail.expandedStoryCode = draft.specDetail.expandedStoryCode === a.payload ? null : a.payload
    })

    const selectFile = $.onAction('specDetail/selectFile').runLatestTask({
      pending: (a) =>
        $.state.mutate((draft) => {
          draft.specDetail.fileName = a.payload
          draft.specDetail.viewMode = 'preview'
          draft.specDetail.loadingFile = true
          draft.specDetail.fileError = null
        }),
      effect: (a) =>
        Effect.gen(function* () {
          const state = (yield* $.state.read) as KanbanState
          const specId = state.specDetail.specId
          if (!specId) return { name: a.payload, content: '' as string, isNotFound: false }

          const api = yield* $.use(SpecboardApi)
          const res = yield* Effect.either(api.readFile(specId, a.payload))

          if (res._tag === 'Right') {
            return { name: a.payload, content: res.right.content, isNotFound: false }
          }

          return { name: a.payload, content: '', isNotFound: isNotFound(res.left), error: formatError(res.left) }
        }),
      success: (r) =>
        $.state.mutate((draft) => {
          draft.specDetail.loadingFile = false

          if (r.isNotFound) {
            draft.specDetail.fileError = r.error ?? '文件不存在'
            draft.specDetail.artifactExists[r.name] = false
            return
          }

          if ('error' in r && r.error) {
            draft.specDetail.fileError = r.error
            return
          }

          draft.specDetail.content = r.content
          draft.specDetail.artifactExists[r.name] = true
          if (r.name === 'spec.md') {
            draft.specDetail.specMarkdown = r.content
            draft.specDetail.specError = null
          }
        }),
      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.specDetail.loadingFile = false
          draft.specDetail.fileError = formatError(cause)
        }),
    })

    const setViewMode = $.onAction('specDetail/setViewMode').mutate((draft, a) => {
      draft.specDetail.viewMode = a.payload
    })

    const setContent = $.onAction('specDetail/setContent').mutate((draft, a) => {
      draft.specDetail.content = a.payload
      if (draft.specDetail.fileName === 'spec.md') {
        draft.specDetail.specMarkdown = a.payload
      }
    })

    const open = $.onAction('specDetail/open').runLatestTask({
      pending: (a) =>
        $.state.mutate((draft) => {
          draft.specDetail.open = true
          draft.specDetail.specId = a.payload
          draft.specDetail.fileName = 'spec.md'
          draft.specDetail.viewMode = 'preview'
          draft.specDetail.loadingFile = true
          draft.specDetail.fileError = null
          draft.specDetail.content = ''
          draft.specDetail.expandedStoryCode = null
          draft.specDetail.pendingScrollToTaskLine = null
          draft.specDetail.highlightTaskLine = null
          draft.specDetail.loadingSpec = true
          draft.specDetail.specError = null
          draft.specDetail.specMarkdown = ''
          draft.specDetail.artifactExists = {}
        }),
      effect: (a) =>
        Effect.gen(function* () {
          const api = yield* $.use(SpecboardApi)
          const specId = a.payload

          const specMd = yield* Effect.either(api.readFile(specId, 'spec.md'))

          type ArtifactCheck = { readonly name: ArtifactName; readonly exists: boolean | null }
          const optional: ReadonlyArray<ArtifactName> = ['quickstart.md', 'data-model.md', 'research.md', 'plan.md', 'tasks.md']

          const checks = yield* Effect.forEach(
            optional,
            (name): Effect.Effect<ArtifactCheck, never, never> =>
              api.readFile(specId, name).pipe(
                Effect.as({ name, exists: true }),
                Effect.catchAll(() => Effect.succeed({ name, exists: false })),
              ),
            { concurrency: 'unbounded' },
          )

          return { specId, specMd, checks }
        }),
      success: (r) =>
        $.state.mutate((draft) => {
          draft.specDetail.loadingFile = false
          draft.specDetail.loadingSpec = false

          for (const c of r.checks) {
            if (c.exists === true) draft.specDetail.artifactExists[c.name] = true
            if (c.exists === false) draft.specDetail.artifactExists[c.name] = false
          }

          if (r.specMd._tag === 'Right') {
            draft.specDetail.content = r.specMd.right.content
            draft.specDetail.specMarkdown = r.specMd.right.content
            draft.specDetail.artifactExists['spec.md'] = true
            draft.specDetail.specError = null
            return
          }

          draft.specDetail.specError = formatError(r.specMd.left)
          if (isNotFound(r.specMd.left)) {
            draft.specDetail.artifactExists['spec.md'] = false
          }
        }),
      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.specDetail.loadingFile = false
          draft.specDetail.loadingSpec = false
          draft.specDetail.fileError = formatError(cause)
          draft.specDetail.specError = formatError(cause)
        }),
    })

    const jumpToTask = $.onAction('specDetail/jumpToTask').mutate((draft, a) => {
      draft.specDetail.fileName = 'tasks.md'
      draft.specDetail.viewMode = 'preview'
      draft.specDetail.pendingScrollToTaskLine = a.payload
    })

    const didScrollToTask = $.onAction('specDetail/didScrollToTask').mutate((draft, a) => {
      draft.specDetail.pendingScrollToTaskLine = null
      draft.specDetail.highlightTaskLine = a.payload
    })

    const clearHighlight = $.onAction('specDetail/clearHighlight').mutate((draft) => {
      draft.specDetail.highlightTaskLine = null
    })

    const save = $.onAction('specDetail/save').runExhaustTask({
      pending: () =>
        $.state.mutate((draft) => {
          draft.specDetail.loadingFile = true
          draft.specDetail.fileError = null
        }),
      effect: () =>
        Effect.gen(function* () {
          const api = yield* $.use(SpecboardApi)
          const state = (yield* $.state.read) as KanbanState
          const specId = state.specDetail.specId
          if (!specId) return { kind: 'noop' as const }

          const name = state.specDetail.fileName
          const content = state.specDetail.content
          yield* api.writeFile(specId, name, content)

          if (name === 'tasks.md') {
            const tasks = yield* api.listTasks(specId)
            return { kind: 'tasks' as const, specId, tasks: tasks.tasks }
          }
          if (name === 'spec.md') {
            const specs = yield* api.listSpecs()
            return { kind: 'specs' as const, specs: specs.items }
          }
          return { kind: 'ok' as const, specId, name }
        }),
      success: (r) =>
        $.state.mutate((draft) => {
          draft.specDetail.loadingFile = false

          if (r.kind === 'noop') return

          if (r.kind === 'tasks') {
            draft.tasksBySpec[r.specId] = Array.from(r.tasks)
            draft.specs = draft.specs.map((s) => (s.id === r.specId ? { ...s, taskStats: computeStats(r.tasks) } : s))
            draft.specDetail.artifactExists['tasks.md'] = true
            return
          }

          if (r.kind === 'specs') {
            draft.specs = Array.from(r.specs)
            draft.specDetail.artifactExists['spec.md'] = true
            return
          }

          draft.specDetail.artifactExists[draft.specDetail.fileName] = true
        }),
      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.specDetail.loadingFile = false
          draft.specDetail.fileError = formatError(cause)
        }),
    })

    yield* Effect.all(
      [
        open,
        close,
        selectFile,
        setViewMode,
        setContent,
        save,
        toggleStory,
        jumpToTask,
        didScrollToTask,
        clearHighlight,
      ],
      { concurrency: 'unbounded' },
    )
  }),
}))

export const KanbanTaskDetailLogic = KanbanAppDef.logic<SpecboardApi>(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const close = $.onAction('taskDetail/close').mutate((draft) => {
      draft.taskDetail.open = false
      draft.taskDetail.specId = null
      draft.taskDetail.taskLine = null
    })

    const selectFile = $.onAction('taskDetail/selectFile').runLatestTask({
      pending: (a) =>
        $.state.mutate((draft) => {
          draft.taskDetail.fileName = a.payload
          draft.taskDetail.viewMode = 'preview'
          draft.taskDetail.loading = true
          draft.taskDetail.error = null
        }),
      effect: (a) =>
        Effect.gen(function* () {
          const state = (yield* $.state.read) as KanbanState
          const specId = state.taskDetail.specId
          if (!specId) return { content: '' }
          const api = yield* $.use(SpecboardApi)
          const res = yield* api.readFile(specId, a.payload)
          return { content: res.content }
        }),
      success: (r) =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = false
          draft.taskDetail.content = r.content
        }),
      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = false
          draft.taskDetail.error = formatError(cause)
        }),
    })

    const setContent = $.onAction('taskDetail/setContent').mutate((draft, a) => {
      draft.taskDetail.content = a.payload
    })

    const setViewMode = $.onAction('taskDetail/setViewMode').mutate((draft, a) => {
      draft.taskDetail.viewMode = a.payload
    })

    const open = $.onAction('taskDetail/open').runLatestTask({
      pending: (a) =>
        $.state.mutate((draft) => {
          draft.taskDetail.open = true
          draft.taskDetail.specId = a.payload.specId
          draft.taskDetail.taskLine = a.payload.line
          draft.taskDetail.fileName = 'tasks.md'
          draft.taskDetail.viewMode = 'preview'
          draft.taskDetail.loading = true
          draft.taskDetail.error = null
          draft.taskDetail.content = ''
        }),
      effect: (a) =>
        Effect.gen(function* () {
          const api = yield* $.use(SpecboardApi)
          const res = yield* api.readFile(a.payload.specId, 'tasks.md')
          return { content: res.content }
        }),
      success: (r) =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = false
          draft.taskDetail.content = r.content
        }),
      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = false
          draft.taskDetail.error = formatError(cause)
        }),
    })

    const openFocused = $.onAction('board/openFocusedTask').runLatestTask({
      pending: () =>
        $.state.mutate((draft) => {
          const f = draft.focusedTask
          if (!f) return
          draft.taskDetail.open = true
          draft.taskDetail.specId = f.specId
          draft.taskDetail.taskLine = f.line
          draft.taskDetail.fileName = 'tasks.md'
          draft.taskDetail.viewMode = 'preview'
          draft.taskDetail.loading = true
          draft.taskDetail.error = null
          draft.taskDetail.content = ''
        }),
      effect: () =>
        Effect.gen(function* () {
          const state = (yield* $.state.read) as KanbanState
          const specId = state.taskDetail.specId
          if (!specId) return { content: '' }

          const api = yield* $.use(SpecboardApi)
          const res = yield* api.readFile(specId, 'tasks.md')
          return { content: res.content }
        }),
      success: (r) =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = false
          draft.taskDetail.content = r.content
        }),
      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = false
          draft.taskDetail.error = formatError(cause)
        }),
    })

    const save = $.onAction('taskDetail/save').runExhaustTask({
      pending: () =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = true
          draft.taskDetail.error = null
        }),
      effect: () =>
        Effect.gen(function* () {
          const api = yield* $.use(SpecboardApi)
          const state = (yield* $.state.read) as KanbanState
          const specId = state.taskDetail.specId
          if (!specId) return { kind: 'noop' as const }
          const name = state.taskDetail.fileName
          const content = state.taskDetail.content
          yield* api.writeFile(specId, name, content)

          if (name === 'tasks.md') {
            const tasks = yield* api.listTasks(specId)
            return { kind: 'tasks' as const, specId, tasks: tasks.tasks }
          }
          if (name === 'spec.md') {
            const specs = yield* api.listSpecs()
            return { kind: 'specs' as const, specs: specs.items }
          }
          return { kind: 'ok' as const }
        }),
      success: (r) =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = false
          if (r.kind === 'tasks') {
            draft.tasksBySpec[r.specId] = Array.from(r.tasks)
            draft.specs = draft.specs.map((s) => (s.id === r.specId ? { ...s, taskStats: computeStats(r.tasks) } : s))
          } else if (r.kind === 'specs') {
            draft.specs = Array.from(r.specs)
          }
        }),
      failure: (cause) =>
        $.state.mutate((draft) => {
          draft.taskDetail.loading = false
          draft.taskDetail.error = formatError(cause)
        }),
    })

    yield* Effect.all([open, openFocused, close, selectFile, setContent, save, setViewMode], {
      concurrency: 'unbounded',
    })
  }),
}))

export const KanbanFocusLogic = KanbanAppDef.logic(($) => ({
  setup: Effect.void,
  run: Effect.gen(function* () {
    const getVisibleTasks = (s: KanbanState) => {
      const allSpecs = visibleSpecsOf(s)
      const tasks: Array<{ specId: string; task: TaskItem }> = []

      for (const spec of allSpecs) {
        const specTasks = s.tasksBySpec[spec.id]
        if (!specTasks) continue

        const visibleSpecTasks = s.hideDoneTasks ? specTasks.filter((t) => !t.checked) : specTasks
        if (s.hideDoneTasks && visibleSpecTasks.length === 0) continue

        for (const t of visibleSpecTasks) {
          tasks.push({ specId: spec.id, task: t })
        }
      }
      return tasks
    }

    const next = $.onAction('board/focusNext').mutate((draft) => {
      const tasks = getVisibleTasks(draft as KanbanState)
      if (tasks.length === 0) return

      const current = draft.focusedTask
      if (!current) {
        draft.focusedTask = { specId: tasks[0].specId, line: tasks[0].task.line }
        return
      }

      const idx = tasks.findIndex((t) => t.specId === current.specId && t.task.line === current.line)
      if (idx === -1) {
        draft.focusedTask = { specId: tasks[0].specId, line: tasks[0].task.line }
        return
      }

      if (idx < tasks.length - 1) {
        const nextT = tasks[idx + 1]
        draft.focusedTask = { specId: nextT.specId, line: nextT.task.line }
      }
    })

    const prev = $.onAction('board/focusPrev').mutate((draft) => {
      const tasks = getVisibleTasks(draft as KanbanState)
      if (tasks.length === 0) return

      const current = draft.focusedTask
      if (!current) {
        const last = tasks[tasks.length - 1]
        draft.focusedTask = { specId: last.specId, line: last.task.line }
        return
      }

      const idx = tasks.findIndex((t) => t.specId === current.specId && t.task.line === current.line)
      if (idx === -1) {
        const last = tasks[tasks.length - 1]
        draft.focusedTask = { specId: last.specId, line: last.task.line }
        return
      }

      if (idx > 0) {
        const prevT = tasks[idx - 1]
        draft.focusedTask = { specId: prevT.specId, line: prevT.task.line }
      }
    })

    const setFocus = $.onAction('board/setFocusedTask').mutate((draft, a) => {
      draft.focusedTask = a.payload
    })

    yield* Effect.all([next, prev, setFocus], { concurrency: 'unbounded' })
  }),
}))
