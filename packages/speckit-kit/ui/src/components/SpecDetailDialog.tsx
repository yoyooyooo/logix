import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

import type { ArtifactName, SpecListItem, TaskItem } from '../api/client'
import {
  computeRefStats,
  computeTaskStats,
  extractRefsFromTaskRaw,
  getDisplayTitle,
  parseUserStories,
} from '../lib/spec-relations'
import { MarkdownPreview } from './MarkdownPreview'
import { TasksPreview } from './TasksPreview'

const ALL_ARTIFACTS = [
  'spec.md',
  'quickstart.md',
  'data-model.md',
  'research.md',
  'plan.md',
  'tasks.md',
] as const satisfies ReadonlyArray<ArtifactName>

function getArtifactSubtitle(name: ArtifactName): string {
  switch (name) {
    case 'spec.md':
      return 'Requirements'
    case 'quickstart.md':
      return 'Quickstart'
    case 'data-model.md':
      return 'Data Model'
    case 'research.md':
      return 'Research'
    case 'plan.md':
      return 'Implementation'
    case 'tasks.md':
      return 'Tasks Checklist'
  }
}

interface Props {
  spec: SpecListItem | null
  tasks: ReadonlyArray<TaskItem> | undefined
  fileName: ArtifactName
  viewMode: 'preview' | 'edit'
  loadingFile: boolean
  fileError: string | null
  content: string
  loadingSpec: boolean
  specError: string | null
  specMarkdown: string
  artifactExists: Record<string, boolean>
  expandedStoryCode: string | null
  pendingScrollToTaskLine: number | null
  highlightTaskLine: number | null
  onClose: () => void
  onSelectFile: (name: ArtifactName) => void
  onSetViewMode: (mode: 'preview' | 'edit') => void
  onChangeContent: (next: string) => void
  onSave: () => void
  onToggleStory: (storyCode: string) => void
  onJumpToTaskLine: (line: number) => void
  onDidScrollToTaskLine: (line: number) => void
  onClearHighlight: () => void
  onOpenTask: (task: TaskItem) => void
}

export function SpecDetailDialog({
  spec,
  tasks,
  fileName,
  viewMode,
  loadingFile,
  fileError,
  content,
  loadingSpec,
  specError,
  specMarkdown,
  artifactExists,
  expandedStoryCode,
  pendingScrollToTaskLine,
  highlightTaskLine,
  onClose,
  onSelectFile,
  onSetViewMode,
  onChangeContent,
  onSave,
  onToggleStory,
  onJumpToTaskLine,
  onDidScrollToTaskLine,
  onClearHighlight,
  onOpenTask,
}: Props) {
  const artifactList = useMemo(() => {
    return ALL_ARTIFACTS.filter((name) => artifactExists[name] === true)
  }, [artifactExists])

  useEffect(() => {
    // if (!open) return // Managed by parent now
    if (artifactList.length === 0) return
    if (artifactList.includes(fileName)) return
    onSelectFile(artifactList[0] ?? 'spec.md')
  }, [artifactList, fileName, onSelectFile])

  useEffect(() => {
    // if (!open) return
    if (viewMode !== 'preview') return
    if (fileName !== 'tasks.md') return
    if (pendingScrollToTaskLine === null) return

    const id = `task-line-${pendingScrollToTaskLine}`
    const el = document.getElementById(id)
    if (!el) return

    const line = pendingScrollToTaskLine
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    onDidScrollToTaskLine(line)

    const timeout = window.setTimeout(() => {
      onClearHighlight()
    }, 1500)

    return () => window.clearTimeout(timeout)
  }, [viewMode, fileName, pendingScrollToTaskLine, tasks, onDidScrollToTaskLine, onClearHighlight])

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
      readonly storyCode: string
      readonly storyTitle: string
      readonly storyLine: number | null
      readonly tasks: ReadonlyArray<TaskItem>
      readonly refStats: ReadonlyArray<{ readonly code: string; readonly total: number; readonly done: number }>
      readonly stats: { readonly total: number; readonly done: number; readonly todo: number }
      readonly missingInSpec: boolean
    }> = []

    for (const storyCode of grouped.storyCodes) {
      const storyDef = storyByCode.get(storyCode) ?? null
      const storyTasks = grouped.byStory.get(storyCode) ?? []
      const refStats = computeRefStats(storyTasks)

      sections.push({
        storyCode,
        storyTitle: storyDef?.title ?? storyCode,
        storyLine: storyDef?.line ?? null,
        tasks: storyTasks,
        refStats,
        stats: computeTaskStats(storyTasks),
        missingInSpec: storyDef === null,
      })
    }

    return sections
  }, [grouped.byStory, grouped.storyCodes, storyByCode])

  const unassignedSection = useMemo(() => {
    if (grouped.unassigned.length === 0) return null
    const refStats = computeRefStats(grouped.unassigned)
    return {
      tasks: grouped.unassigned,
      refStats,
      stats: computeTaskStats(grouped.unassigned),
    }
  }, [grouped.unassigned])

  if (!spec) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
          className="w-[90vw] max-w-[1400px]"
        >
          <div className="flex h-full flex-col bg-[var(--surface-base)] shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)]">
            {/* Header */}
            <div className="flex-none border-b border-[var(--border-subtle)] bg-[var(--surface-float)] px-6 py-4 backdrop-blur-md">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 min-w-6 items-center justify-center rounded bg-[var(--intent-primary-bg)] px-1.5 font-mono text-xs font-bold text-[var(--text-secondary)]">
                      {String(spec.num).padStart(3, '0')}
                    </span>
                    <div className="truncate text-lg font-semibold text-[var(--text-primary)]">{spec.title}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-2 pl-9">
                    <span className="font-mono text-xs text-[var(--text-tertiary)] opacity-60">{spec.id}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full p-2 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="flex w-[200px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-base)]">
                <div className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Artifacts
                </div>
                <div className="scrollbar-none flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                  {artifactList.map((name) => {
                    const active = fileName === name
                    return (
                      <button
                        key={name}
                        type="button"
                        className={
                          active
                            ? 'group w-full rounded-lg bg-[var(--surface-card)] px-3 py-2.5 text-left shadow-sm ring-1 ring-black/5'
                            : 'group w-full rounded-lg px-3 py-2.5 text-left hover:bg-[var(--surface-hover)] transition-colors'
                        }
                        onClick={() => onSelectFile(name)}
                      >
                        <div
                          className={`font-mono text-[13px] ${active ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                        >
                          {name}
                        </div>
                        <div
                          className={`mt-0.5 text-[11px] ${active ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]'}`}
                        >
                          {getArtifactSubtitle(name)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Middle Column: Task List */}
              <div className="flex w-[440px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50">
                <div className="border-b border-zinc-200 px-4 py-3">
                  <div className="text-xs font-semibold text-zinc-700">编号关联（US → Tasks → Refs）</div>
                  {specError ? (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                      {specError}
                    </div>
                  ) : null}
                  {loadingSpec ? <div className="mt-2 text-[11px] text-zinc-500">加载 spec.md…</div> : null}
                  {tasks === undefined ? <div className="mt-1 text-[11px] text-zinc-500">加载 tasks…</div> : null}
                </div>

                <div className="scrollbar-none flex-1 overflow-y-auto p-4">
                  {storySections.length === 0 && !unassignedSection ? (
                    <div className="text-sm text-zinc-500">当前 spec 未发现可关联的任务（或 tasks 尚未加载）。</div>
                  ) : null}

                  <div className="flex flex-col gap-3">
                    {storySections.map((sec) => (
                      <div key={sec.storyCode} className="rounded-xl border border-zinc-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-start gap-2">
                              <span
                                className={
                                  sec.missingInSpec
                                    ? 'mt-0.5 shrink-0 rounded bg-red-50 px-1.5 py-0.5 font-mono text-[11px] text-red-700'
                                    : 'mt-0.5 shrink-0 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-[11px] text-sky-700'
                                }
                              >
                                {sec.storyCode}
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zinc-900">{sec.storyTitle}</div>
                                <div className="mt-1 text-[11px] text-zinc-500">
                                  {sec.missingInSpec
                                    ? '未在 spec.md 中找到对应 User Story 标题'
                                    : `spec.md#L${sec.storyLine ?? 1}`}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-start gap-2">
                            <div className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700">
                              {sec.stats.done}/{sec.stats.total}
                            </div>
                            <button
                              type="button"
                              className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-50"
                              onClick={() => onToggleStory(sec.storyCode)}
                            >
                              {expandedStoryCode === sec.storyCode ? '收起' : '展开'}
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-zinc-100">
                          <div
                            className="h-full bg-emerald-500"
                            style={{
                              width:
                                sec.stats.total > 0 ? `${Math.round((sec.stats.done / sec.stats.total) * 100)}%` : '0%',
                            }}
                          />
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {sec.tasks.map((t) => {
                            const title = getDisplayTitle(t)
                            return (
                              <button
                                key={t.line}
                                type="button"
                                className={
                                  t.checked
                                    ? 'rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100'
                                    : 'rounded bg-zinc-100 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-200'
                                }
                                title={t.taskId ? `${t.taskId} · ${title}` : title}
                                onClick={() => onJumpToTaskLine(t.line)}
                              >
                                {t.taskId ?? `L${t.line}`}
                              </button>
                            )
                          })}
                        </div>

                        {sec.refStats.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sec.refStats.map((r) => (
                              <span
                                key={r.code}
                                className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700"
                                title={`${r.done}/${r.total}`}
                              >
                                {r.code} {r.done}/{r.total}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        {expandedStoryCode === sec.storyCode ? (
                          <div className="mt-3 space-y-2">
                            {sec.tasks.map((t) => {
                              const title = getDisplayTitle(t)
                              const refs = extractRefsFromTaskRaw(t.raw)
                              return (
                                <div key={t.line} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                                  <div className="flex items-start gap-2">
                                    <button
                                      type="button"
                                      className="min-w-0 flex-1 break-words text-left text-sm text-zinc-900 hover:underline"
                                      onClick={() => onOpenTask(t)}
                                    >
                                      <span className={t.checked ? 'line-through text-zinc-500' : undefined}>
                                        {t.taskId ? `${t.taskId} · ${title}` : title}
                                      </span>
                                    </button>
                                    <span className="shrink-0 font-mono text-[11px] text-zinc-500">L{t.line}</span>
                                  </div>
                                  {refs.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {refs.map((r) => (
                                        <span
                                          key={r}
                                          className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600"
                                        >
                                          {r}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    ))}

                    {unassignedSection ? (
                      <div className="rounded-xl border border-zinc-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-start gap-2">
                              <span className="mt-0.5 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">
                                未分配
                              </span>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-zinc-900">
                                  没有 [USn] 标记的任务
                                </div>
                                <div className="mt-1 text-[11px] text-zinc-500">tasks.md 中没有 `[USn]` 标记</div>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700">
                            {unassignedSection.stats.done}/{unassignedSection.stats.total}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {unassignedSection.tasks.map((t) => {
                            const title = getDisplayTitle(t)
                            return (
                              <button
                                key={t.line}
                                type="button"
                                className={
                                  t.checked
                                    ? 'rounded bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100'
                                    : 'rounded bg-zinc-100 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-200'
                                }
                                title={t.taskId ? `${t.taskId} · ${title}` : title}
                                onClick={() => onJumpToTaskLine(t.line)}
                              >
                                {t.taskId ?? `L${t.line}`}
                              </button>
                            )
                          })}
                        </div>

                        {unassignedSection.refStats.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {unassignedSection.refStats.map((r) => (
                              <span
                                key={r.code}
                                className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-700"
                                title={`${r.done}/${r.total}`}
                              >
                                {r.code} {r.done}/{r.total}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right Column: Preview/Edit */}
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
                <div className="border-b border-zinc-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs text-zinc-700">{fileName}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="flex overflow-hidden rounded-md border border-zinc-200 bg-white text-xs">
                        <button
                          type="button"
                          className={
                            viewMode === 'preview'
                              ? 'bg-zinc-900 px-2 py-1 text-white'
                              : 'px-2 py-1 text-zinc-700 hover:bg-zinc-50'
                          }
                          onClick={() => onSetViewMode('preview')}
                        >
                          预览
                        </button>
                        <button
                          type="button"
                          className={
                            viewMode === 'edit'
                              ? 'bg-zinc-900 px-2 py-1 text-white'
                              : 'px-2 py-1 text-zinc-700 hover:bg-zinc-50'
                          }
                          onClick={() => onSetViewMode('edit')}
                        >
                          编辑
                        </button>
                      </div>

                      {viewMode === 'edit' ? (
                        <button
                          type="button"
                          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                          disabled={loadingFile}
                          onClick={onSave}
                        >
                          保存
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {fileError ? (
                    <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {fileError}
                    </div>
                  ) : null}
                </div>

                <div className="flex-1 overflow-hidden">
                  {viewMode === 'edit' ? (
                    <textarea
                      className="h-full w-full resize-none border-0 bg-white p-4 font-mono text-xs leading-5 text-zinc-900 outline-none"
                      value={content}
                      onChange={(e) => onChangeContent(e.target.value)}
                      placeholder={loadingFile ? '加载中…' : '文件内容'}
                    />
                  ) : (
                    <div className="scrollbar-none h-full overflow-y-auto p-4">
                      {fileName === 'tasks.md' && tasks ? (
                        <TasksPreview tasks={tasks} highlightLine={highlightTaskLine} onOpenTask={onOpenTask} />
                      ) : (
                        <MarkdownPreview markdown={content} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
