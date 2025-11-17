import type { TaskItem } from '../api/client'

interface Props {
  task: TaskItem
  onToggle: (checked: boolean) => void
  onOpenDetail: () => void
}

export function TaskCard({ task, onToggle, onOpenDetail }: Props) {
  return (
    <div className="group rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm hover:border-zinc-300">
      <div className="flex items-start gap-2">
        <input
          className="mt-1 h-4 w-4 cursor-pointer accent-zinc-900"
          type="checkbox"
          checked={task.checked}
          onChange={(e) => onToggle(e.target.checked)}
        />

        <button
          type="button"
          className="flex-1 text-left text-sm leading-5 text-zinc-900 hover:underline"
          onClick={onOpenDetail}
        >
          <span className={task.checked ? 'line-through text-zinc-500' : undefined}>{task.title}</span>
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-500">
        {task.taskId ? <span className="font-mono">{task.taskId}</span> : null}
        {task.story ? <span className="rounded bg-zinc-100 px-1.5 py-0.5">{task.story}</span> : null}
        {task.parallel ? <span className="rounded bg-zinc-100 px-1.5 py-0.5">P</span> : null}
        <span className="ml-auto font-mono opacity-60">L{task.line}</span>
      </div>
    </div>
  )
}

