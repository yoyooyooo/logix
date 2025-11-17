import { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useDispatch, useModule, useSelector } from '@logix/react'

import { SpecColumn } from '../components/SpecColumn'
import { SpecDetailDialog } from '../components/SpecDetailDialog'
import { TaskDetailDialog } from '../components/TaskDetailDialog'
import { ViewModeTabs } from '../components/ViewModeTabs'
import { KanbanAppDef } from '../features/kanban'

import { useKanbanShortcuts } from '../hooks/useKanbanShortcuts'

export default function App() {
  const kanban = useModule(KanbanAppDef)
  const dispatch = useDispatch(kanban)

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

  useKanbanShortcuts({ specDetailOpen: specDetail.open, taskDetailOpen: taskDetail.open, dispatch })

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

  const hasDrawerOpen = specDetail.open || taskDetail.open

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <div
        className={`flex h-full flex-col bg-white transition-all duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${
          hasDrawerOpen ? 'scale-[0.94] opacity-70 border-radius-[20px] overflow-hidden rounded-2xl' : ''
        }`}
        style={{ transformOrigin: 'center' }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-4">
            <div className="text-base font-semibold text-zinc-900">Specs Timeline Board</div>
            <div className="text-xs text-zinc-500">最新在左 · 横向滚动 · 列内纵向滚动</div>
          </div>

          <div className="justify-self-center">
            <ViewModeTabs
              value={boardViewMode}
              onChange={(next) => dispatch({ _tag: 'board/setViewMode', payload: next })}
            />
          </div>

          <div className="flex items-center justify-self-end gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                className="h-4 w-4 cursor-pointer accent-zinc-900"
                type="checkbox"
                checked={hideDoneTasks}
                onChange={(e) => dispatch({ _tag: 'board/setHideDone', payload: e.target.checked })}
              />
              隐藏已完成
            </label>

            <button
              type="button"
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              onClick={() => dispatch({ _tag: 'board/refresh' })}
            >
              刷新
            </button>
          </div>
        </div>

        {error ? <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">{error}</div> : null}

        <div className="scrollbar-none flex-1 overflow-x-auto overflow-y-hidden bg-zinc-50 p-4">
          <div className="flex h-full min-w-max gap-4">
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

      <AnimatePresence>
        {specDetail.open && specDetailSpec && (
          <SpecDetailDialog
            key="spec-detail"
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
            highlightTaskLine={specDetail.highlightTaskLine}
            onClose={() => dispatch({ _tag: 'specDetail/close' })}
            onSelectFile={(name) => dispatch({ _tag: 'specDetail/selectFile', payload: name })}
            onSetViewMode={(mode) => dispatch({ _tag: 'specDetail/setViewMode', payload: mode })}
            onChangeContent={(next) => dispatch({ _tag: 'specDetail/setContent', payload: next })}
            onSave={() => dispatch({ _tag: 'specDetail/save' })}
            onToggleStory={(code) => dispatch({ _tag: 'specDetail/toggleStory', payload: code })}
            onJumpToTaskLine={(line) => dispatch({ _tag: 'specDetail/jumpToTask', payload: line })}
            onDidScrollToTaskLine={(line) => dispatch({ _tag: 'specDetail/didScrollToTask', payload: line })}
            onClearHighlight={() => dispatch({ _tag: 'specDetail/clearHighlight' })}
            onOpenTask={(task) => {
              if (!specDetail.specId) return
              dispatch({ _tag: 'taskDetail/open', payload: { specId: specDetail.specId, line: task.line } })
            }}
          />
        )}

        {taskDetail.open && (
          <TaskDetailDialog
            key="task-detail"
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
        )}
      </AnimatePresence>
    </div>
  )
}
