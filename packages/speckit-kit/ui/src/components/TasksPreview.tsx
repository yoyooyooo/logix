import { useMemo } from 'react'

import type { TaskItem } from '../api/client'
import { extractRefsFromTaskRaw, getDisplayTitle } from '../lib/spec-relations'
import { Badge } from './ui/badge'

interface Props {
  tasks: ReadonlyArray<TaskItem>
  highlightLine: number | null
  onOpenTask: (task: TaskItem) => void
}

export function TasksPreview({ tasks, highlightLine, onOpenTask }: Props) {
  const ordered = useMemo(() => Array.from(tasks).sort((a, b) => a.line - b.line), [tasks])

  if (ordered.length === 0) {
    return <div className="text-sm text-muted-foreground">tasks.md 中没有任务</div>
  }

  return (
    <div className="flex flex-col gap-0 divide-y divide-dashed divide-border/40 pr-2">
      {ordered.map((t) => {
        const title = getDisplayTitle(t)
        const refs = extractRefsFromTaskRaw(t.raw)
        const isHighlighted = highlightLine === t.line
        const label = t.taskId ?? `L${t.line}`

        return (
          <button
            key={t.line}
            id={`task-line-${t.line}`}
            type="button"
            className={
              isHighlighted
                ? 'group relative flex w-full items-start gap-3 bg-accent/10 px-3 py-3 text-left transition-colors hover:bg-accent/15'
                : 'group relative flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40'
            }
            onClick={() => onOpenTask(t)}
          >
            {/* Checkbox */}
            <span
              className={
                t.checked
                  ? 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-success bg-success/10 text-[10px] font-bold text-success-foreground'
                  : 'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border bg-background transition-colors group-hover:border-foreground'
              }
            >
              {t.checked ? '✓' : ''}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="h-5 rounded-sm px-1 font-mono text-[10px] text-muted-foreground group-hover:border-foreground group-hover:text-foreground"
                >
                  {label}
                </Badge>
                {t.story ? (
                  <Badge
                    variant="outline"
                    className="h-5 rounded-sm border-border px-1 font-mono text-[10px] text-muted-foreground group-hover:border-foreground group-hover:text-foreground"
                  >
                    {t.story}
                  </Badge>
                ) : null}
                {t.parallel ? (
                  <Badge
                    variant="outline"
                    className="h-5 rounded-sm border-warning/50 px-1 font-mono text-[10px] text-warning group-hover:border-warning"
                  >
                    P
                  </Badge>
                ) : null}
                <span className="ml-auto font-mono text-[10px] text-muted-foreground opacity-50">L{t.line}</span>
              </div>

              <div
                className={
                  t.checked
                    ? 'mt-1.5 break-words text-sm font-serif text-muted-foreground line-through opacity-60'
                    : 'mt-1.5 break-words text-sm font-serif text-foreground font-medium'
                }
              >
                {title}
              </div>

              {refs.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {refs.map((code) => (
                    <span
                      key={code}
                      className="inline-block border-b border-dashed border-muted-foreground/30 font-mono text-[10px] text-muted-foreground"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}
