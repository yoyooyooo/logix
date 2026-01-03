import { useEffect, useMemo, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { MotionDialog, MotionDialogContent } from './ui/motion-dialog'

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
import { Badge } from './ui/badge'
import { Button } from './ui/button'

const STORY_HIGHLIGHT_MS = 2000

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
  open: boolean
  specId: string | null
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
  pendingScrollToStoryLine: number | null
  highlightTaskLine: number | null
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onClose: () => void
  onSelectFile: (name: ArtifactName) => void
  onSetViewMode: (mode: 'preview' | 'edit') => void
  onChangeContent: (next: string) => void
  onSave: () => void
  onToggleStory: (storyCode: string) => void
  onJumpToTaskLine: (line: number) => void
  onDidScrollToTaskLine: (line: number) => void
  onJumpToStoryLine: (line: number) => void
  onDidScrollToStoryLine: (line: number) => void
  onClearHighlight: () => void
  onOpenTask: (task: TaskItem) => void
}

export function SpecDetailDialog({
  open,
  specId,
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
  pendingScrollToStoryLine,
  highlightTaskLine,
  isFullscreen,
  onToggleFullscreen,
  onClose,
  onSelectFile,
  onSetViewMode,
  onChangeContent,
  onSave,
  onToggleStory,
  onJumpToTaskLine,
  onDidScrollToTaskLine,
  onJumpToStoryLine,
  onDidScrollToStoryLine,
  onClearHighlight,
  onOpenTask,
}: Props) {
  const headerId = spec?.id ?? specId
  const previewScrollRef = useRef<HTMLDivElement | null>(null)
  const [highlightStoryLine, setHighlightStoryLine] = useState<number | null>(null)
  const storyHighlightTimeoutRef = useRef<number | null>(null)

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
    return () => {
      if (storyHighlightTimeoutRef.current !== null) {
        window.clearTimeout(storyHighlightTimeoutRef.current)
        storyHighlightTimeoutRef.current = null
      }
    }
  }, [])

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

  useEffect(() => {
    if (viewMode !== 'preview') return
    if (fileName !== 'spec.md') return
    if (pendingScrollToStoryLine === null) return

    const root = previewScrollRef.current
    if (!root) return

    const selector = [
      `h1[data-md-line="${pendingScrollToStoryLine}"]`,
      `h2[data-md-line="${pendingScrollToStoryLine}"]`,
      `h3[data-md-line="${pendingScrollToStoryLine}"]`,
      `h4[data-md-line="${pendingScrollToStoryLine}"]`,
      `h5[data-md-line="${pendingScrollToStoryLine}"]`,
      `h6[data-md-line="${pendingScrollToStoryLine}"]`,
      `[data-md-line="${pendingScrollToStoryLine}"]`,
    ].join(', ')
    const el = root.querySelector(selector)
    if (!(el instanceof HTMLElement)) return

    const line = pendingScrollToStoryLine
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      onDidScrollToStoryLine(line)

      setHighlightStoryLine(line)
      if (storyHighlightTimeoutRef.current !== null) {
        window.clearTimeout(storyHighlightTimeoutRef.current)
        storyHighlightTimeoutRef.current = null
      }

      storyHighlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightStoryLine((cur) => (cur === line ? null : cur))
        storyHighlightTimeoutRef.current = null
      }, STORY_HIGHLIGHT_MS)
    })
  }, [viewMode, fileName, pendingScrollToStoryLine, content, onDidScrollToStoryLine])

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
    const allStoryCodes = Array.from(new Set<string>([...grouped.storyCodes, ...Array.from(storyByCode.keys())])).sort(
      (a, b) => {
        const ai = Number.parseInt(a.replace(/^US/, ''), 10)
        const bi = Number.parseInt(b.replace(/^US/, ''), 10)
        if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi
        return a.localeCompare(b)
      },
    )

    const sections: Array<{
      readonly storyCode: string
      readonly storyTitle: string
      readonly storyLine: number | null
      readonly tasks: ReadonlyArray<TaskItem>
      readonly refStats: ReadonlyArray<{ readonly code: string; readonly total: number; readonly done: number }>
      readonly stats: { readonly total: number; readonly done: number; readonly todo: number }
      readonly missingInSpec: boolean
    }> = []

    for (const storyCode of allStoryCodes) {
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

  return (
    <MotionDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <MotionDialogContent
        className={
          isFullscreen
            ? 'fixed inset-0 h-full w-full sm:max-w-none rounded-none border-none shadow-none outline-none'
            : 'w-[1200px] sm:max-w-none rounded-none border-l border-border bg-background shadow-none outline-none'
        }
        overlayClassName={isFullscreen ? 'hidden' : 'bg-foreground/20 transition-opacity duration-300'}
        motionProps={{
          initial: isFullscreen ? false : { x: '100%' },
          animate: { x: 0 },
          exit: isFullscreen ? { x: 0 } : { x: '100%' },
          transition: isFullscreen ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 40 },
        }}
        aria-describedby={undefined}
      >
        <DialogPrimitive.Title className="sr-only">Spec Detail</DialogPrimitive.Title>
        <div className={isFullscreen ? 'absolute inset-0' : 'h-full w-full'}>
          {specId ? (
            <div className={isFullscreen ? 'flex h-full flex-col bg-background' : 'flex h-full flex-col bg-background'}>
              {/* Header */}
              <div className="relative flex-none overflow-hidden border-b-4 border-double border-border/40 bg-background px-6 py-5">
                <div className="relative z-10 flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs font-bold text-muted-foreground opacity-50">
                        {spec ? String(spec.num).padStart(3, '0') : '---'}
                      </div>
                      <div className="truncate text-2xl font-bold font-serif tracking-tight text-foreground">
                        {spec?.title ?? '—'}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {headerId ? (
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground opacity-70">
                          {headerId}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-none border border-transparent hover:border-border hover:bg-muted focus-visible:ring-0"
                      onClick={onToggleFullscreen}
                      aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 3H5a2 2 0 0 0-2 2v4m18 0V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4m10 0h4a2 2 0 0 0 2-2v-4"
                          />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3"
                          />
                        </svg>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-none border border-transparent hover:border-border hover:bg-destructive/10 hover:text-destructive focus-visible:ring-0"
                      onClick={onClose}
                      aria-label="Close"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                </div>

                {/* Watermark Stamp */}
                {spec?.taskStats && (
                  <div
                    className={`pointer-events-none absolute right-16 top-2 select-none border-4 border-double px-2 py-1 font-mono text-sm font-black uppercase tracking-widest opacity-20 transition-opacity duration-300 md:right-32 md:top-4 md:text-xl md:opacity-10 ${
                      spec.taskStats.todo === 0
                        ? 'rotate-12 border-success text-success'
                        : '-rotate-12 border-foreground text-foreground'
                    }`}
                  >
                    {spec.taskStats.todo === 0 ? 'PASSED' : 'WORK IN PROGRESS'}
                  </div>
                )}
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="flex w-[200px] shrink-0 flex-col border-r border-border/50 bg-background">
                  <div className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Artifacts
                  </div>
                  <div className="scrollbar-none flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
                    {artifactList.map((name) => {
                      const active = fileName === name
                      return (
                        <button
                          key={name}
                          type="button"
                          className={
                            active
                              ? 'group w-full border-l-2 border-foreground bg-muted/30 px-4 py-3 text-left transition-all duration-300'
                              : 'group w-full border-l-2 border-transparent px-4 py-3 text-left transition-all duration-300 hover:bg-muted/10 hover:border-border/50'
                          }
                          onClick={() => onSelectFile(name)}
                        >
                          <div
                            className={`font-mono text-[13px] ${active ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                          >
                            {name}
                          </div>
                          <div
                            className={`mt-0.5 text-[11px] ${active ? 'text-muted-foreground' : 'text-muted-foreground/70 group-hover:text-muted-foreground'}`}
                          >
                            {getArtifactSubtitle(name)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Middle Column: Task List */}
                <div className="flex w-[480px] shrink-0 flex-col border-r border-border/30 bg-background">
                  <div className="flex h-12 flex-none items-center border-b border-border/30 px-4">
                    <div className="text-xs font-semibold text-foreground">编号关联（US → Tasks → Refs）</div>
                    {specError ? (
                      <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                        {specError}
                      </div>
                    ) : null}
                  </div>

                  <div className="scrollbar-none flex-1 overflow-y-auto p-4">
                    {tasks !== undefined && storySections.length === 0 && !unassignedSection ? (
                      <div className="text-sm text-muted-foreground">当前 spec 未发现可关联的任务。</div>
                    ) : null}

                    <div className="flex flex-col gap-0 divide-y divide-dashed divide-border/40">
                      {storySections.map((sec) => (
                        <div
                          key={sec.storyCode}
                          className="py-6 px-2 transition-colors duration-500 hover:bg-muted/5 group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-start gap-2">
                                {sec.storyLine !== null ? (
                                  <button
                                    type="button"
                                    className={
                                      sec.missingInSpec
                                        ? 'mt-0.5 shrink-0 cursor-pointer rounded-sm border border-destructive px-1.5 py-0.5 font-mono text-[11px] font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground'
                                        : 'mt-0.5 shrink-0 cursor-pointer rounded-sm border border-border px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background'
                                    }
                                    onClick={() => onJumpToStoryLine(sec.storyLine ?? 1)}
                                  >
                                    {sec.storyCode}
                                  </button>
                                ) : (
                                  <span
                                    className={
                                      sec.missingInSpec
                                        ? 'mt-0.5 shrink-0 rounded-sm border border-destructive px-1.5 py-0.5 font-mono text-[11px] font-bold text-destructive'
                                        : 'mt-0.5 shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground'
                                    }
                                  >
                                    {sec.storyCode}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-foreground">{sec.storyTitle}</div>
                                  <div className="mt-1 text-[11px] text-muted-foreground">
                                    {sec.missingInSpec
                                      ? '未在 spec.md 中找到对应 User Story 标题'
                                      : `spec.md#L${sec.storyLine ?? 1}`}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-start gap-2">
                              <Badge variant="outline" className="font-mono text-[11px]">
                                {sec.stats.done}/{sec.stats.total}
                              </Badge>
                              {sec.tasks.length > 0 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 py-0.5 text-[11px]"
                                  onClick={() => onToggleStory(sec.storyCode)}
                                >
                                  {expandedStoryCode === sec.storyCode ? '收起' : '展开'}
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-border/40">
                            <div
                              className="h-full bg-success"
                              style={{
                                width:
                                  sec.stats.total > 0
                                    ? `${Math.round((sec.stats.done / sec.stats.total) * 100)}%`
                                    : '0%',
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
                                      ? 'rounded bg-success/10 px-2 py-1 text-[11px] text-success-foreground hover:bg-success/15'
                                      : 'rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent'
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
                                <Badge
                                  key={r.code}
                                  variant="outline"
                                  className="font-mono text-[11px]"
                                  title={`${r.done}/${r.total}`}
                                >
                                  {r.code} {r.done}/{r.total}
                                </Badge>
                              ))}
                            </div>
                          ) : null}

                          {sec.tasks.length > 0 && expandedStoryCode === sec.storyCode ? (
                            <div className="mt-3 space-y-2">
                              {sec.tasks.map((t) => {
                                const title = getDisplayTitle(t)
                                const refs = extractRefsFromTaskRaw(t.raw)
                                return (
                                  <div
                                    key={t.line}
                                    className="group/task flex flex-col p-2 transition-colors duration-300 hover:bg-muted/20 border-l-2 border-transparent hover:border-accent/50"
                                  >
                                    <div className="flex items-start gap-2">
                                      <button
                                        type="button"
                                        className="min-w-0 flex-1 break-words text-left text-sm text-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 rounded-lg"
                                        onClick={() => onOpenTask(t)}
                                      >
                                        <span
                                          className={
                                            t.checked ? 'line-through text-muted-foreground opacity-80' : undefined
                                          }
                                        >
                                          {t.taskId ? `${t.taskId} · ${title}` : title}
                                        </span>
                                      </button>
                                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground opacity-70">
                                        L{t.line}
                                      </span>
                                    </div>
                                    {refs.length > 0 ? (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {refs.map((r) => (
                                          <Badge
                                            key={r}
                                            variant="outline"
                                            className="font-mono text-[11px] text-muted-foreground"
                                          >
                                            {r}
                                          </Badge>
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
                        <div className="py-6 px-2 border-t border-dashed border-border/40">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-start gap-2">
                                <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-[11px]">
                                  未分配
                                </Badge>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-foreground">
                                    没有 [USn] 标记的任务
                                  </div>
                                  <div className="mt-1 text-[11px] text-muted-foreground">
                                    tasks.md 中没有 `[USn]` 标记
                                  </div>
                                </div>
                              </div>
                            </div>

                            <Badge variant="outline" className="font-mono text-[11px]">
                              {unassignedSection.stats.done}/{unassignedSection.stats.total}
                            </Badge>
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
                                      ? 'rounded bg-success/10 px-2 py-1 text-[11px] text-success-foreground hover:bg-success/15'
                                      : 'rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent'
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
                                <Badge
                                  key={r.code}
                                  variant="outline"
                                  className="font-mono text-[11px]"
                                  title={`${r.done}/${r.total}`}
                                >
                                  {r.code} {r.done}/{r.total}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Right Column: Preview/Edit */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-card">
                  <div className="flex h-12 flex-none items-center justify-between border-b border-border/30 bg-card px-4">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs text-muted-foreground">{fileName}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                      {viewMode === 'edit' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 border-border px-3 font-mono text-[10px] tracking-wider hover:bg-foreground hover:text-background"
                          disabled={loadingFile}
                          onClick={onSave}
                        >
                          SAVE
                        </Button>
                      ) : null}

                      <div className="flex items-center border border-border bg-background">
                        <button
                          type="button"
                          className={
                            viewMode === 'preview'
                              ? 'bg-foreground px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-background transition-colors'
                              : 'bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                          }
                          onClick={() => onSetViewMode('preview')}
                        >
                          PREVIEW
                        </button>
                        <div className="h-3 w-px bg-border" />
                        <button
                          type="button"
                          className={
                            viewMode === 'edit'
                              ? 'bg-foreground px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-background transition-colors'
                              : 'bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold tracking-wider text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                          }
                          onClick={() => onSetViewMode('edit')}
                        >
                          EDIT
                        </button>
                      </div>
                    </div>
                  </div>
                  {fileError ? (
                    <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {fileError}
                    </div>
                  ) : null}

                  <div className="flex-1 overflow-hidden">
                    {viewMode === 'edit' ? (
                      <textarea
                        className="h-full w-full resize-none border-0 bg-transparent p-4 font-mono text-xs leading-5 text-foreground outline-none placeholder:text-muted-foreground"
                        value={content}
                        onChange={(e) => onChangeContent(e.target.value)}
                        placeholder={loadingFile ? '加载中…' : '文件内容'}
                      />
                    ) : (
                      <div ref={previewScrollRef} className="scrollbar-none h-full overflow-y-auto p-4">
                        {fileName === 'tasks.md' && tasks ? (
                          <TasksPreview tasks={tasks} highlightLine={highlightTaskLine} onOpenTask={onOpenTask} />
                        ) : (
                          <MarkdownPreview
                            markdown={content}
                            highlightLine={fileName === 'spec.md' ? highlightStoryLine : null}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </MotionDialogContent>
    </MotionDialog>
  )
}
