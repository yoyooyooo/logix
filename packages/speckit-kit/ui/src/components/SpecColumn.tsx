import { useMemo } from 'react'

import type { SpecListItem, TaskItem } from '../api/client'
import type { UserStoryDef } from '../lib/spec-relations'
import { computeTaskStats } from '../lib/spec-relations'
import { TaskCard } from './TaskCard'
import { UserStoryCard } from './UserStoryCard'
import { ViewModeTabs } from './ViewModeTabs'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'

interface Props {
  spec: SpecListItem
  allTasks: ReadonlyArray<TaskItem> | undefined
  tasks: ReadonlyArray<TaskItem> | undefined
  loading: boolean
  stories: ReadonlyArray<UserStoryDef> | undefined
  loadingStories: boolean
  viewMode: 'task' | 'us'
  globalViewMode: 'task' | 'us'
  hasViewModeOverride: boolean
  focusedTaskLine: number | null
  onToggleTask: (task: TaskItem, checked: boolean) => void
  onOpenTask: (task: TaskItem) => void
  onOpenSpecDetail: () => void
  onOpenStory: (storyCode: string) => void
  onChangeViewMode: (next: 'task' | 'us') => void
}

export function SpecColumn({
  spec,
  allTasks,
  tasks,
  loading,
  stories,
  loadingStories,
  viewMode,
  globalViewMode,
  hasViewModeOverride,
  focusedTaskLine,
  onToggleTask,
  onOpenTask,
  onOpenSpecDetail,
  onOpenStory,
  onChangeViewMode,
}: Props) {
  const header = useMemo(() => {
    const num = `${String(spec.num).padStart(3, '0')}`
    const title = spec.title
      .replace(/^Feature Specification\s*[:：]\s*/i, '')
      .replace(new RegExp(`^${num}\\s*[-–—·:]\\s*`), '')
      .trim()

    return { num, title: title || spec.title }
  }, [spec.num, spec.title])

  const groupedByStory = useMemo(() => {
    const visible = tasks ?? []
    const byStory = new Map<string, TaskItem[]>()
    const unassigned: TaskItem[] = []

    for (const t of visible) {
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

  const storyOrder = useMemo(() => {
    const ordered: string[] = []
    const seen = new Set<string>()

    for (const s of stories ?? []) {
      if (seen.has(s.code)) continue
      seen.add(s.code)
      ordered.push(s.code)
    }

    for (const code of groupedByStory.storyCodes) {
      if (seen.has(code)) continue
      seen.add(code)
      ordered.push(code)
    }

    return ordered
  }, [stories, groupedByStory.storyCodes])

  const storyByCode = useMemo(() => new Map((stories ?? []).map((s) => [s.code, s] as const)), [stories])

  const storyStatsByCode = useMemo(() => {
    const src = allTasks ?? tasks ?? []
    const byStory = new Map<string, TaskItem[]>()

    for (const t of src) {
      const story = t.story
      if (!story) continue
      const bucket = byStory.get(story) ?? []
      bucket.push(t)
      byStory.set(story, bucket)
    }

    const out = new Map<string, { readonly total: number; readonly done: number; readonly todo: number }>()
    for (const [code, bucket] of byStory.entries()) {
      out.set(code, computeTaskStats(bucket))
    }
    return out
  }, [allTasks, tasks])

  return (
    <div className="group flex h-full w-[360px] flex-col overflow-hidden bg-background transition-all duration-500 hover:bg-muted/20">
      <div className="sticky top-0 z-10 border-b border-border/10 bg-background px-4 py-3 transition-colors duration-300 group-hover:bg-muted/10 relative overflow-hidden">
        <div className="flex items-start gap-3 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start gap-2">
              <Badge
                variant="outline"
                className="mt-0.5 shrink-0 font-mono text-[10px] opacity-50 group-hover:opacity-100 transition-opacity"
              >
                {header.num}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="break-words text-lg font-bold font-serif text-foreground/80 leading-tight line-clamp-2 transition-colors duration-300 group-hover:text-foreground pr-8">
                  {header.title}
                </div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground opacity-40 uppercase tracking-widest truncate group-hover:opacity-70 transition-opacity">
                  {spec.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Stamp (Absolute Watermark) */}
        {spec.taskStats && (
          <div
            className={`absolute top-1 right-2 pointer-events-none select-none transform rotate-12 border-2 border-double rounded-sm px-1 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest transition-opacity duration-300
              ${
                spec.taskStats.todo === 0
                  ? 'border-success text-success opacity-80'
                  : 'border-foreground/40 text-muted-foreground opacity-60 group-hover:opacity-100'
              }`}
          >
            {spec.taskStats.todo === 0 ? 'PASSED' : `${spec.taskStats.done}/${spec.taskStats.total}`}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
          <div className="flex items-center gap-2">
            <ViewModeTabs size="sm" value={viewMode} onChange={onChangeViewMode} />
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] uppercase tracking-widest font-mono text-muted-foreground hover:text-foreground"
            onClick={onOpenSpecDetail}
          >
            Read Spec →
          </Button>
        </div>
      </div>

      <div className="relative scrollbar-none flex-1 overflow-x-hidden overflow-y-auto px-0 py-0">
        {/* Loading Overlay / Progress Line */}
        {loading ? (
          <div className="absolute inset-x-0 top-0 z-20 h-0.5 w-full overflow-hidden bg-transparent">
            <div className="h-full w-full animate-indeterminate-bar bg-accent/50 origin-left" />
          </div>
        ) : null}

        {/* Initial Empty States */}
        {!loading && !tasks ? (
          <div className="p-4 text-center text-xs font-mono text-muted-foreground uppercase tracking-widest border-b border-dashed border-border/60">
            No Data
          </div>
        ) : null}
        {/* Content Area - Always render if we have data (stale-while-revalidate) */}
        {tasks || stories ? (
          <div
            className={`transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}
          >
            {viewMode === 'task' ? (
              <div className="flex flex-col divide-y divide-dashed divide-border/60 border-b border-dashed border-border/60">
                {tasks && tasks.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    Empty
                  </div>
                ) : null}
                {(tasks ?? []).map((t) => (
                  <TaskCard
                    key={`${spec.id}:${t.line}`}
                    task={t}
                    focused={t.line === focusedTaskLine}
                    onToggle={(c) => onToggleTask(t, c)}
                    onOpenDetail={() => onOpenTask(t)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-dashed divide-border/60 border-b border-dashed border-border/60">
                {storyOrder.length === 0 && groupedByStory.unassigned.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    No Stories
                  </div>
                ) : null}

                {/* Remove inline Loading Stories text to avoid jump, relying on global dim opacity */}

                {storyOrder.map((storyCode) => {
                  const stats = storyStatsByCode.get(storyCode)
                  const story = storyByCode.get(storyCode) ?? null
                  const missingInSpec = !loadingStories && story === null
                  const storyTitle = story?.title ?? storyCode
                  const hint = stats ? `Todo ${stats.todo}` : null

                  return (
                    <UserStoryCard
                      key={storyCode}
                      storyCode={storyCode}
                      title={storyTitle}
                      stats={stats}
                      hint={hint}
                      tone={missingInSpec ? 'danger' : 'default'}
                      onOpen={() => onOpenStory(storyCode)}
                    />
                  )
                })}

                {groupedByStory.unassigned.length > 0 ? (
                  <UserStoryCard
                    storyCode="—"
                    title="Unassigned"
                    stats={computeTaskStats(groupedByStory.unassigned)}
                    hint={null}
                    onOpen={onOpenSpecDetail}
                  />
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
