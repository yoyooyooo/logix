import { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useModule, useSelector } from '@logixjs/react'
import { Link, useMatch, useNavigate } from 'react-router-dom'

import { SpecColumn } from '../components/SpecColumn'
import { SpecDetailDialog } from '../components/SpecDetailDialog'
import { TaskDetailDialog } from '../components/TaskDetailDialog'
import { ViewModeTabs } from '../components/ViewModeTabs'
import { Button } from '../components/ui/button'
import { KanbanAppDef } from '../features/kanban'

import { useKanbanShortcuts } from '../hooks/useKanbanShortcuts'
import { DesignSystemPage } from './DesignSystemPage'

function specPath(specId: string): string {
  return `/specs/${encodeURIComponent(specId)}`
}

export default function App() {
  const kanban = useModule(KanbanAppDef)
  const dispatch = useDispatch(kanban)
  const navigate = useNavigate()

  const match = useMatch('/specs/:specId')
  const routeSpecId = match?.params?.specId ?? null
  const isSpecFullscreenRoute = routeSpecId !== null
  const isDesignSystemRoute = useMatch('/design-system') !== null

  const hideDoneTasks = useSelector(kanban, (s) => s.hideDoneTasks)
  const boardViewMode = useSelector(kanban, (s) => s.viewMode)
  const viewModeBySpec = useSelector(kanban, (s) => s.viewModeBySpec)
  const storiesBySpec = useSelector(kanban, (s) => s.storiesBySpec)
  const loadingStoriesBySpec = useSelector(kanban, (s) => s.loadingStoriesBySpec)
  const error = useSelector(kanban, (s) => s.error)
  const specs = useSelector(kanban, (s) => s.specs)
  const tasksBySpec = useSelector(kanban, (s) => s.tasksBySpec)
  const loadingBySpec = useSelector(kanban, (s) => s.loadingBySpec)
  const specDetail = useSelector(kanban, (s) => s.specDetail)
  const taskDetail = useSelector(kanban, (s) => s.taskDetail)
  const focusedTask = useSelector(kanban, (s) => s.focusedTask)

  useEffect(() => {
    if (!routeSpecId) return
    if (specDetail.open && specDetail.specId === routeSpecId) return
    dispatch({ _tag: 'specDetail/open', payload: routeSpecId })
  }, [routeSpecId, specDetail.open, specDetail.specId, dispatch])

  const onCloseSpecDetail = useCallback(() => {
    if (isSpecFullscreenRoute) {
      navigate('/')
    }
    dispatch({ _tag: 'specDetail/close' })
  }, [isSpecFullscreenRoute, navigate, dispatch])

  const onToggleSpecFullscreen = useCallback(() => {
    const specId = specDetail.specId
    if (!specId) return

    if (isSpecFullscreenRoute) {
      navigate('/')
      return
    }

    navigate(specPath(specId))
  }, [specDetail.specId, isSpecFullscreenRoute, navigate])

  const onCloseAllDrawers = useCallback(() => {
    dispatch({ _tag: 'taskDetail/close' })
    if (isSpecFullscreenRoute) {
      navigate('/')
    }
    dispatch({ _tag: 'specDetail/close' })
  }, [dispatch, isSpecFullscreenRoute, navigate])

  useKanbanShortcuts({
    specDetailOpen: specDetail.open || isSpecFullscreenRoute,
    taskDetailOpen: taskDetail.open,
    onCloseDrawers: onCloseAllDrawers,
    dispatch,
  })

  const visibleSpecs = useMemo(() => {
    if (!hideDoneTasks) return specs

    return specs.filter((spec) => {
      const stats = spec.taskStats
      if (!stats) return true
      if (stats.total === 0) return true
      return stats.todo > 0
    })
  }, [specs, hideDoneTasks])

  const columns = useMemo(() => {
    return visibleSpecs
      .map((spec) => {
        const tasks = tasksBySpec[spec.id]

        // Logic:
        // 1. If hideDoneTasks is ON:
        //    - Filter visible tasks to only unchecked.
        //    - Hide the column IF:
        //      - Tasks are loaded (not undefined)
        //      - AND it has tasks (total > 0)
        //      - AND all tasks are checked (visible == 0)
        //    - We explicitly SHOW columns with 0 tasks (Exception: non-existent/empty task.md)

        const visibleTasks = hideDoneTasks && tasks ? tasks.filter((t) => !t.checked) : tasks
        const hasTasks = tasks !== undefined && tasks.length > 0
        const allTasksDone = hasTasks && visibleTasks?.length === 0

        const hideWholeColumn = hideDoneTasks && allTasksDone

        const columnViewMode = viewModeBySpec[spec.id] ?? boardViewMode
        const columnViewModeOverride = viewModeBySpec[spec.id] ?? null

        return {
          spec,
          allTasks: tasks,
          tasks: visibleTasks,
          loading: loadingBySpec[spec.id] ?? false,
          stories: storiesBySpec[spec.id],
          loadingStories: loadingStoriesBySpec[spec.id] ?? false,
          viewMode: columnViewMode,
          viewModeOverride: columnViewModeOverride,
          hide: hideWholeColumn,
        }
      })
      .filter((c) => !c.hide)
  }, [
    visibleSpecs,
    tasksBySpec,
    loadingBySpec,
    storiesBySpec,
    loadingStoriesBySpec,
    hideDoneTasks,
    boardViewMode,
    viewModeBySpec,
  ])

  const specDetailSpec = useMemo(() => {
    if (!specDetail.open || !specDetail.specId) return null
    return specs.find((s) => s.id === specDetail.specId) ?? null
  }, [specDetail.open, specDetail.specId, specs])

  const taskDetailTask = useMemo(() => {
    if (!taskDetail.open || !taskDetail.specId || taskDetail.taskLine === null) return null
    const tasks = tasksBySpec[taskDetail.specId] ?? []
    return tasks.find((t) => t.line === taskDetail.taskLine) ?? null
  }, [taskDetail.open, taskDetail.specId, taskDetail.taskLine, tasksBySpec])

  const hasDrawerOpen = taskDetail.open || (specDetail.open && !isSpecFullscreenRoute)

  if (isDesignSystemRoute) {
    return <DesignSystemPage />
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      {!isSpecFullscreenRoute && (
        <div
          className={`flex h-full flex-col bg-background transition-all duration-300 ease-out ${
            hasDrawerOpen ? 'opacity-30 pointer-events-none grayscale' : ''
          }`}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b-4 border-double border-border/40 bg-background px-6 py-4">
            <div className="flex min-w-0 items-center gap-4">
              <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">Speckit Board</h1>
              <div className="hidden border-l-2 border-border pl-4 md:block">
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                  Specifications · Stories · Tasks
                </div>
              </div>
            </div>

            <div className="justify-self-center">
              <ViewModeTabs
                value={boardViewMode}
                onChange={(next) => dispatch({ _tag: 'board/setViewMode', payload: next })}
              />
            </div>

            <div className="flex items-center justify-self-end gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group">
                <div className="relative flex items-center justify-center">
                  <input
                    className="peer h-4 w-4 appearance-none border border-border bg-background transition-colors checked:bg-foreground checked:border-foreground hover:border-foreground/50 rounded-none cursor-pointer"
                    type="checkbox"
                    checked={hideDoneTasks}
                    onChange={(e) => dispatch({ _tag: 'board/setHideDone', payload: e.target.checked })}
                  />
                  <svg
                    className="pointer-events-none absolute h-3 w-3 text-background opacity-0 peer-checked:opacity-100"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider group-hover:text-foreground">
                  Hide Done
                </span>
              </label>

              <div className="h-6 w-px bg-border/40" />

              <Link
                to="/design-system"
                className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:underline underline-offset-4 decoration-border"
              >
                Design System
              </Link>

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-none border-border hover:bg-foreground hover:text-background transition-colors"
                onClick={() => window.location.reload()}
                title="Refresh"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </Button>
            </div>
          </div>

          {error ? (
            <div className="border-b border-destructive/20 bg-destructive/10 px-6 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="scrollbar-none flex-1 overflow-x-auto overflow-y-hidden bg-background p-0">
            <div className="flex h-full min-w-max divide-x divide-border/30 border-l border-border/30">
              {columns.map(
                ({
                  spec,
                  allTasks,
                  tasks,
                  loading,
                  stories,
                  loadingStories,
                  viewMode: columnViewMode,
                  viewModeOverride,
                }) => (
                  <SpecColumn
                    key={spec.id}
                    spec={spec}
                    allTasks={allTasks}
                    tasks={tasks}
                    loading={loading}
                    stories={stories}
                    loadingStories={loadingStories}
                    viewMode={columnViewMode}
                    globalViewMode={boardViewMode}
                    hasViewModeOverride={viewModeOverride !== null}
                    focusedTaskLine={focusedTask?.specId === spec.id ? focusedTask.line : null}
                    onOpenSpecDetail={() => dispatch({ _tag: 'specDetail/open', payload: spec.id })}
                    onToggleTask={(task, checked) =>
                      dispatch({
                        _tag: 'board/toggleTask',
                        payload: { specId: spec.id, line: task.line, checked },
                      })
                    }
                    onOpenTask={(task) =>
                      dispatch({ _tag: 'taskDetail/open', payload: { specId: spec.id, line: task.line } })
                    }
                    onOpenStory={(storyCode) => {
                      dispatch.batch([
                        { _tag: 'specDetail/open', payload: spec.id },
                        { _tag: 'specDetail/toggleStory', payload: storyCode },
                      ])
                    }}
                    onChangeViewMode={(next) => {
                      if (next === boardViewMode) {
                        if (viewModeOverride === null) return
                        dispatch({ _tag: 'board/clearSpecViewMode', payload: spec.id })
                        return
                      }

                      if (viewModeOverride === next) return
                      dispatch({ _tag: 'board/setSpecViewMode', payload: { specId: spec.id, mode: next } })
                    }}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      )}

      <SpecDetailDialog
        open={specDetail.open || isSpecFullscreenRoute}
        specId={specDetail.specId ?? routeSpecId}
        spec={specDetailSpec}
        tasks={specDetail.specId ? tasksBySpec[specDetail.specId] : undefined}
        fileName={specDetail.fileName}
        viewMode={specDetail.viewMode}
        loadingFile={specDetail.loadingFile}
        fileError={specDetail.fileError}
        content={specDetail.content}
        loadingSpec={specDetail.loadingSpec}
        specError={specDetail.specError}
        specMarkdown={specDetail.specMarkdown}
        artifactExists={specDetail.artifactExists}
        expandedStoryCode={specDetail.expandedStoryCode}
        pendingScrollToTaskLine={specDetail.pendingScrollToTaskLine}
        pendingScrollToStoryLine={specDetail.pendingScrollToStoryLine}
        highlightTaskLine={specDetail.highlightTaskLine}
        isFullscreen={isSpecFullscreenRoute}
        onToggleFullscreen={onToggleSpecFullscreen}
        onClose={onCloseSpecDetail}
        onSelectFile={(name) => dispatch({ _tag: 'specDetail/selectFile', payload: name })}
        onSetViewMode={(mode) => dispatch({ _tag: 'specDetail/setViewMode', payload: mode })}
        onChangeContent={(next) => dispatch({ _tag: 'specDetail/setContent', payload: next })}
        onSave={() => dispatch({ _tag: 'specDetail/save' })}
        onToggleStory={(code) => dispatch({ _tag: 'specDetail/toggleStory', payload: code })}
        onJumpToTaskLine={(line) => dispatch({ _tag: 'specDetail/jumpToTask', payload: line })}
        onDidScrollToTaskLine={(line) => dispatch({ _tag: 'specDetail/didScrollToTask', payload: line })}
        onJumpToStoryLine={(line) => dispatch({ _tag: 'specDetail/jumpToStory', payload: line })}
        onDidScrollToStoryLine={(line) => dispatch({ _tag: 'specDetail/didScrollToStory', payload: line })}
        onClearHighlight={() => dispatch({ _tag: 'specDetail/clearHighlight' })}
        onOpenTask={(task) => {
          if (!specDetail.specId) return
          dispatch({ _tag: 'taskDetail/open', payload: { specId: specDetail.specId, line: task.line } })
        }}
      />

      <TaskDetailDialog
        open={taskDetail.open}
        specId={taskDetail.specId}
        task={taskDetailTask}
        fileName={taskDetail.fileName}
        viewMode={taskDetail.viewMode}
        content={taskDetail.content}
        loading={taskDetail.loading}
        error={taskDetail.error}
        onClose={() => dispatch({ _tag: 'taskDetail/close' })}
        onSelectFile={(name) => dispatch({ _tag: 'taskDetail/selectFile', payload: name })}
        onSetViewMode={(mode) => dispatch({ _tag: 'taskDetail/setViewMode', payload: mode })}
        onChangeContent={(next) => dispatch({ _tag: 'taskDetail/setContent', payload: next })}
        onSave={() => dispatch({ _tag: 'taskDetail/save' })}
      />
    </div>
  )
}
