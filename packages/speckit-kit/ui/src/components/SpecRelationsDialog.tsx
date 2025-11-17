import { useEffect, useMemo, useState } from 'react'

import { api, type TaskItem } from '../api/client'
import { computeTaskStats, extractRefsFromTaskRaw, getDisplayTitle, parseUserStories } from '../lib/spec-relations'

interface Props {
  open: boolean
  specId: string | null
  tasks: ReadonlyArray<TaskItem> | undefined
  onClose: () => void
  onOpenTask: (task: TaskItem) => void
}

export function SpecRelationsDialog({ open, specId, tasks, onClose, onOpenTask }: Props) {
  const [loadingSpec, setLoadingSpec] = useState(false)
  const [specError, setSpecError] = useState<string | null>(null)
  const [specMarkdown, setSpecMarkdown] = useState<string>('')

  useEffect(() => {
    if (!open || !specId) return
    let cancelled = false

    setLoadingSpec(true)
    setSpecError(null)

    api
      .readFile(specId, 'spec.md')
      .then((r) => {
        if (cancelled) return
        setSpecMarkdown(r.content)
      })
      .catch((e) => {
        if (cancelled) return
        setSpecError(e instanceof Error ? e.message : String(e))
        setSpecMarkdown('')
      })
      .finally(() => {
        if (cancelled) return
        setLoadingSpec(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, specId])

  const stories = useMemo(() => parseUserStories(specMarkdown), [specMarkdown])
  const storyByCode = useMemo(() => new Map(stories.map((s) => [s.code, s])), [stories])

  const grouped = useMemo(() => {
    const allTasks = tasks ?? []
    const byStory = new Map<string, TaskItem[]>()
    const unassigned: TaskItem[] = []

    for (const t of allTasks) {
      const story = t.story
      if (!story) {
        unassigned.push(t)
        continue
      }
      const bucket = byStory.get(story) ?? []
      bucket.push(t)
      byStory.set(story, bucket)
    }

    for (const bucket of byStory.values()) {
      bucket.sort((a, b) => a.line - b.line)
    }
    unassigned.sort((a, b) => a.line - b.line)

    const storyCodes = Array.from(byStory.keys()).sort((a, b) => {
      const ai = Number.parseInt(a.replace(/^US/, ''), 10)
      const bi = Number.parseInt(b.replace(/^US/, ''), 10)
      if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi
      return a.localeCompare(b)
    })

    return { byStory, storyCodes, unassigned }
  }, [tasks])

  const storySections = useMemo(() => {
    const sections: Array<{
      readonly kind: 'story'
      readonly storyCode: string
      readonly storyTitle: string
      readonly storyLine: number | null
      readonly tasks: ReadonlyArray<TaskItem>
      readonly refs: ReadonlyArray<string>
      readonly stats: { readonly total: number; readonly done: number; readonly todo: number }
      readonly missingInSpec: boolean
    }> = []

    for (const storyCode of grouped.storyCodes) {
      const storyDef = storyByCode.get(storyCode) ?? null
      const storyTasks = grouped.byStory.get(storyCode) ?? []
      const refs = Array.from(new Set(storyTasks.flatMap((t) => extractRefsFromTaskRaw(t.raw)))).sort()

      sections.push({
        kind: 'story',
        storyCode,
        storyTitle: storyDef?.title ?? storyCode,
        storyLine: storyDef?.line ?? null,
        tasks: storyTasks,
        refs,
        stats: computeTaskStats(storyTasks),
        missingInSpec: storyDef === null,
      })
    }

    return sections
  }, [grouped.byStory, grouped.storyCodes, storyByCode])

  const unassignedSection = useMemo(() => {
    if (grouped.unassigned.length === 0) return null
    const refs = Array.from(new Set(grouped.unassigned.flatMap((t) => extractRefsFromTaskRaw(t.raw)))).sort()
    return {
      tasks: grouped.unassigned,
      refs,
      stats: computeTaskStats(grouped.unassigned),
    }
  }, [grouped.unassigned])

  if (!open || !specId) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 w-[min(900px,100vw)] bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-zinc-900">关联（US → Tasks → Refs）</div>
                <div className="mt-1 text-[11px] text-zinc-500">{specId}</div>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
                onClick={onClose}
              >
                关闭
              </button>
            </div>

            {specError ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{specError}</div>
            ) : null}
            {loadingSpec ? <div className="mt-3 text-xs text-zinc-500">加载 spec.md…</div> : null}
            {tasks === undefined ? <div className="mt-2 text-xs text-zinc-500">加载 tasks…</div> : null}
          </div>

          <div className="scrollbar-none flex-1 overflow-y-auto p-5">
            {storySections.length === 0 && !unassignedSection ? (
              <div className="text-sm text-zinc-500">当前 spec 未发现可关联的任务（或 tasks 尚未加载）。</div>
            ) : null}

            <div className="flex flex-col gap-4">
              {storySections.map((sec) => (
                <div key={sec.storyCode} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] text-sky-700">
                          {sec.storyCode}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-zinc-900">{sec.storyTitle}</div>
                          <div className="mt-1 text-[11px] text-zinc-500">
                            {sec.missingInSpec ? '未在 spec.md 中找到对应 User Story 标题' : `spec.md#L${sec.storyLine ?? 1}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700">
                      {sec.stats.todo}/{sec.stats.total}
                    </div>
                  </div>

                  {sec.refs.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {sec.refs.map((code) => (
                        <span key={code} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-col gap-2">
                    {sec.tasks.map((t) => {
                      const title = getDisplayTitle(t)
                      const refs = extractRefsFromTaskRaw(t.raw)
                      return (
                        <button
                          key={`${sec.storyCode}:${t.line}`}
                          type="button"
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left hover:bg-zinc-100"
                          onClick={() => onOpenTask(t)}
                        >
                          <div className="flex items-start gap-2">
                            {t.taskId ? (
                              <span className="shrink-0 rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                                {t.taskId}
                              </span>
                            ) : null}
                            {t.parallel ? (
                              <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[11px] text-zinc-700">P</span>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="break-words text-sm text-zinc-900">{title}</div>
                              <div className="mt-1 text-[11px] text-zinc-500">
                                {t.checked ? '已完成' : '未完成'} · line {t.line}
                              </div>
                            </div>
                          </div>

                          {refs.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {refs.map((code) => (
                                <span key={code} className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {unassignedSection ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                          (no US)
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-zinc-900">未标注 User Story</div>
                          <div className="mt-1 text-[11px] text-zinc-500">tasks.md 中没有 `[USn]` 标记</div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700">
                      {unassignedSection.stats.todo}/{unassignedSection.stats.total}
                    </div>
                  </div>

                  {unassignedSection.refs.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {unassignedSection.refs.map((code) => (
                        <span key={code} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-col gap-2">
                    {unassignedSection.tasks.map((t) => {
                      const title = getDisplayTitle(t)
                      const refs = extractRefsFromTaskRaw(t.raw)
                      return (
                        <button
                          key={`unassigned:${t.line}`}
                          type="button"
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left hover:bg-zinc-100"
                          onClick={() => onOpenTask(t)}
                        >
                          <div className="flex items-start gap-2">
                            {t.taskId ? (
                              <span className="shrink-0 rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                                {t.taskId}
                              </span>
                            ) : null}
                            {t.parallel ? (
                              <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[11px] text-zinc-700">P</span>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="break-words text-sm text-zinc-900">{title}</div>
                              <div className="mt-1 text-[11px] text-zinc-500">
                                {t.checked ? '已完成' : '未完成'} · line {t.line}
                              </div>
                            </div>
                          </div>

                          {refs.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {refs.map((code) => (
                                <span key={code} className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">
                                  {code}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
