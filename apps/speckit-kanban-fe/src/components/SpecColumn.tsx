import { useMemo } from 'react'

import type { SpecListItem, TaskItem } from '../api/client'
import { TaskCard } from './TaskCard'

interface Props {
  spec: SpecListItem
  tasks: ReadonlyArray<TaskItem> | undefined
  loading: boolean
  onToggleTask: (task: TaskItem, checked: boolean) => void
  onOpenTask: (task: TaskItem) => void
}

export function SpecColumn({ spec, tasks, loading, onToggleTask, onOpenTask }: Props) {
  const headerTitle = useMemo(() => {
    const prefix = `${String(spec.num).padStart(3, '0')}`
    return `${prefix} · ${spec.title}`
  }, [spec.num, spec.title])

  return (
    <div className="flex h-full w-[340px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white/70 shadow-sm">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-900">{headerTitle}</div>
            <div className="mt-1 text-[11px] text-zinc-500">{spec.id}</div>
          </div>

          {spec.taskStats ? (
            <div className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700">
              {spec.taskStats.done}/{spec.taskStats.total}
            </div>
          ) : (
            <div className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-500">
              —
            </div>
          )}
        </div>
      </div>

      <div className="scrollbar-none flex-1 overflow-y-auto px-3 py-3">
        {loading ? <div className="px-1 text-xs text-zinc-500">加载中…</div> : null}
        {!loading && !tasks ? <div className="px-1 text-xs text-zinc-500">未加载</div> : null}

        <div className="mt-2 flex flex-col gap-2">
          {(tasks ?? []).map((t) => (
            <TaskCard key={`${spec.id}:${t.line}`} task={t} onToggle={(c) => onToggleTask(t, c)} onOpenDetail={() => onOpenTask(t)} />
          ))}
        </div>
      </div>
    </div>
  )
}

