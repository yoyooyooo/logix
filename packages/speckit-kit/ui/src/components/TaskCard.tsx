import { motion } from 'framer-motion'
import type { TaskItem } from '../api/client'
import { getDisplayTitle } from '../lib/spec-relations'

interface Props {
  task: TaskItem
  focused?: boolean
  onToggle: (checked: boolean) => void
  onOpenDetail: () => void
}

export function TaskCard({ task, focused, onToggle, onOpenDetail }: Props) {
  const title = getDisplayTitle(task)
  const label = task.taskId ?? `L${task.line}`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`au-card group min-w-0 px-3 py-2 transition-shadow duration-200 ${
        focused ? 'ring-2 ring-[var(--intent-primary-fg)] ring-offset-2' : ''
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <input
          className="mt-1 h-4 w-4 cursor-pointer accent-black/80"
          type="checkbox"
          checked={task.checked}
          onChange={(e) => onToggle(e.target.checked)}
        />

        <button
          type="button"
          className="au-clickable min-w-0 flex-1 overflow-hidden text-left"
          onClick={onOpenDetail}
          title={title}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <span className="rounded bg-[var(--intent-primary-bg)] px-1.5 py-0.5 font-mono text-[var(--intent-primary-fg)] font-medium opacity-80">
              {label}
            </span>
            {task.story ? (
              <span className="rounded bg-[var(--intent-info-bg)] px-1.5 py-0.5 text-[var(--intent-info-fg)]">
                {task.story}
              </span>
            ) : null}
            {task.parallel ? (
              <span className="rounded bg-[var(--intent-warning-bg)] px-1.5 py-0.5 text-[var(--intent-warning-fg)]">
                P
              </span>
            ) : null}
            <span className="ml-auto font-mono text-[var(--text-tertiary)] opacity-60">L{task.line}</span>
          </div>

          <div className="mt-1.5 min-w-0 break-words text-[13.5px] leading-relaxed text-[var(--text-primary)] group-hover:text-black">
            <span
              className={`block min-w-0 transition-all duration-300 ${
                task.checked ? 'text-[var(--text-tertiary)] opacity-40 grayscale' : ''
              }`}
            >
              {title}
            </span>
          </div>
        </button>
      </div>
    </motion.div>
  )
}
