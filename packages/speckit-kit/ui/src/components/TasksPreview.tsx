import { useMemo } from 'react'

import type { TaskItem } from '../api/client'
import { extractRefsFromTaskRaw, getDisplayTitle } from '../lib/spec-relations'

interface Props {
  tasks: ReadonlyArray<TaskItem>
  highlightLine: number | null
  onOpenTask: (task: TaskItem) => void
}

export function TasksPreview({ tasks, highlightLine, onOpenTask }: Props) {
  const ordered = useMemo(() => Array.from(tasks).sort((a, b) => a.line - b.line), [tasks])

  if (ordered.length === 0) {
    return <div className="text-sm text-zinc-500">tasks.md 中没有任务</div>
  }

  return (
    <div className="flex flex-col gap-2">
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
                ? 'rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-left shadow-sm ring-2 ring-sky-200'
                : 'rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left hover:bg-zinc-50'
            }
            onClick={() => onOpenTask(t)}
          >
            <div className="flex items-start gap-2">
              <span
                className={
                  t.checked
                    ? 'mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-emerald-300 bg-emerald-50 text-[10px] text-emerald-700'
                    : 'mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-300 bg-white text-[10px] text-zinc-400'
                }
              >
                {t.checked ? '✓' : ''}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">{label}</span>
                  {t.story ? <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700">{t.story}</span> : null}
                  {t.parallel ? <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-700">P</span> : null}
                  <span className="ml-auto font-mono text-[11px] text-zinc-400">L{t.line}</span>
                </div>

                <div className={t.checked ? 'mt-1 break-words text-sm text-zinc-500 line-through' : 'mt-1 break-words text-sm text-zinc-900'}>
                  {title}
                </div>

                {refs.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {refs.map((code) => (
                      <span key={code} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                        {code}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

