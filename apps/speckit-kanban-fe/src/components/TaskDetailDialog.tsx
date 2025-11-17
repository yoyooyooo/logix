import { useEffect, useMemo, useState } from 'react'

import { api, type ArtifactName, type TaskItem } from '../api/client'

interface Props {
  open: boolean
  specId: string | null
  task: TaskItem | null
  onClose: () => void
  onSaved: () => void
}

export function TaskDetailDialog({ open, specId, task, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<ArtifactName>('tasks.md')
  const [content, setContent] = useState('')

  const title = useMemo(() => {
    if (!task) return '详情'
    return task.taskId ? `${task.taskId} · ${task.title}` : task.title
  }, [task])

  useEffect(() => {
    if (!open || !specId) return
    let cancelled = false

    setLoading(true)
    setError(null)

    api
      .readFile(specId, fileName)
      .then((r) => {
        if (cancelled) return
        setContent(r.content)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, specId, fileName])

  if (!open || !specId || !task) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 w-[min(720px,100vw)] bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-zinc-900">{title}</div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  {specId} · line {task.line}
                </div>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={onClose}
              >
                关闭
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-zinc-500">文件</label>
              <select
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm"
                value={fileName}
                onChange={(e) => setFileName(e.target.value as ArtifactName)}
              >
                <option value="tasks.md">tasks.md</option>
                <option value="plan.md">plan.md</option>
                <option value="spec.md">spec.md</option>
              </select>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true)
                    setError(null)
                    try {
                      await api.writeFile(specId, fileName, content)
                      onSaved()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : String(e))
                    } finally {
                      setLoading(false)
                    }
                  }}
                >
                  保存
                </button>
              </div>
            </div>

            {error ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
          </div>

          <div className="flex-1 overflow-hidden">
            <textarea
              className="h-full w-full resize-none border-0 bg-white p-4 font-mono text-xs leading-5 text-zinc-900 outline-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={loading ? '加载中…' : '文件内容'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

