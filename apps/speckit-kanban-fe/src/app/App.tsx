import { useEffect, useMemo, useRef, useState } from 'react'

import { api, type SpecListItem, type TaskItem } from '../api/client'
import { SpecColumn } from '../components/SpecColumn'
import { TaskDetailDialog } from '../components/TaskDetailDialog'

function computeStats(tasks: ReadonlyArray<TaskItem>) {
  const total = tasks.length
  const done = tasks.filter((t) => t.checked).length
  return { total, done, todo: total - done }
}

export default function App() {
  const [specs, setSpecs] = useState<ReadonlyArray<SpecListItem>>([])
  const [tasksBySpec, setTasksBySpec] = useState<Record<string, ReadonlyArray<TaskItem> | undefined>>({})
  const [loadingBySpec, setLoadingBySpec] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const loadedSpecsRef = useRef<Set<string>>(new Set())

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSpecId, setDetailSpecId] = useState<string | null>(null)
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null)

  const refresh = async () => {
    setError(null)
    try {
      const res = await api.listSpecs()
      loadedSpecsRef.current = new Set()
      setSpecs(res.items)
      setTasksBySpec({})
      setLoadingBySpec({})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      for (const spec of specs) {
        if (cancelled) return
        if (loadedSpecsRef.current.has(spec.id)) continue
        loadedSpecsRef.current.add(spec.id)

        setLoadingBySpec((prev) => ({ ...prev, [spec.id]: true }))
        try {
          const res = await api.listTasks(spec.id)
          if (cancelled) return
          setTasksBySpec((prev) => ({ ...prev, [spec.id]: res.tasks }))
        } catch {
          if (cancelled) return
          setTasksBySpec((prev) => ({ ...prev, [spec.id]: [] }))
        } finally {
          if (!cancelled) {
            setLoadingBySpec((prev) => ({ ...prev, [spec.id]: false }))
          }
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [specs])

  const columns = useMemo(() => {
    return specs.map((spec) => ({
      spec,
      tasks: tasksBySpec[spec.id],
      loading: loadingBySpec[spec.id] ?? false,
    }))
  }, [specs, tasksBySpec, loadingBySpec])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex items-center gap-4 border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur">
        <div className="text-base font-semibold text-zinc-900">Specs Timeline Board</div>
        <div className="text-xs text-zinc-500">最新在左 · 横向滚动 · 列内纵向滚动</div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            onClick={() => void refresh()}
          >
            刷新
          </button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="scrollbar-none flex-1 overflow-x-auto overflow-y-hidden bg-zinc-50 p-4">
        <div className="flex h-full min-w-max gap-4">
          {columns.map(({ spec, tasks, loading }) => (
            <SpecColumn
              key={spec.id}
              spec={spec}
              tasks={tasks}
              loading={loading}
              onToggleTask={async (task, checked) => {
                try {
                  const res = await api.toggleTask(spec.id, task.line, checked)
                  setTasksBySpec((prev) => ({ ...prev, [spec.id]: res.tasks }))
                  setSpecs((prev) =>
                    prev.map((s) => (s.id === spec.id ? { ...s, taskStats: computeStats(res.tasks) } : s)),
                  )
                } catch (e) {
                  setError(e instanceof Error ? e.message : String(e))
                }
              }}
              onOpenTask={(task) => {
                setDetailSpecId(spec.id)
                setDetailTask(task)
                setDetailOpen(true)
              }}
            />
          ))}
        </div>
      </div>

      <TaskDetailDialog
        open={detailOpen}
        specId={detailSpecId}
        task={detailTask}
        onClose={() => setDetailOpen(false)}
        onSaved={async () => {
          if (!detailSpecId) return
          try {
            const res = await api.listTasks(detailSpecId)
            setTasksBySpec((prev) => ({ ...prev, [detailSpecId]: res.tasks }))
            setSpecs((prev) =>
              prev.map((s) => (s.id === detailSpecId ? { ...s, taskStats: computeStats(res.tasks) } : s)),
            )
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
          }
        }}
      />
    </div>
  )
}
