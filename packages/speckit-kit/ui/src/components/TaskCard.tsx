import { motion } from 'framer-motion'
import type { TaskItem } from '../api/client'
import { getDisplayTitle } from '../lib/spec-relations'
import { Badge } from './ui/badge'
import { Card } from './ui/card'

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
      className="group relative min-w-0 bg-background transition-all duration-200 hover:bg-muted/30"
    >
      <div className="flex min-w-0 items-start gap-3 p-3 border-l-4 border-transparent transition-all duration-200 group-hover:border-accent">
        <input
          className="mt-1 h-4 w-4 cursor-pointer accent-primary"
          type="checkbox"
          checked={task.checked}
          onChange={(e) => onToggle(e.target.checked)}
        />

        <button
          type="button"
          className="min-w-0 flex-1 overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onOpenDetail}
          title={title}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline">{label}</Badge>
            {task.story ? <Badge variant="info">{task.story}</Badge> : null}
            {task.parallel ? <Badge variant="warning">P</Badge> : null}
            <span className="ml-auto font-mono opacity-70">L{task.line}</span>
          </div>

          <div className="mt-1.5 min-w-0 break-words text-[13.5px] leading-relaxed text-foreground">
            <span className={task.checked ? 'text-muted-foreground line-through opacity-70' : undefined}>{title}</span>
          </div>
        </button>
      </div>
    </motion.div>
  )
}
