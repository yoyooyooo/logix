import { useMemo } from 'react'

import type { SpecListItem, TaskItem } from '../api/client'
import type { UserStoryDef } from '../lib/spec-relations'
import { computeTaskStats } from '../lib/spec-relations'
import { TaskCard } from './TaskCard'
import { UserStoryCard } from './UserStoryCard'
import { ViewModeTabs } from './ViewModeTabs'

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
    <div className="flex h-full w-[360px] flex-col overflow-hidden rounded-2xl bg-[var(--surface-base)]">
      {/* Header: Floating feel */}
      <div className="sticky top-0 z-10 bg-[var(--surface-float)] px-4 py-3 backdrop-blur-md shadow-sm border-b border-[var(--border-subtle)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 shrink-0 rounded bg-[var(--intent-primary-bg)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                {header.num}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{header.title}</div>
              </div>
            </div>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)] font-mono opacity-60 ml-1">{spec.id}</div>
          </div>

          {spec.taskStats ? (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="au-clickable rounded-md bg-[var(--surface-card)] px-2 py-1 text-xs text-[var(--text-secondary)] shadow-sm hover:text-[var(--text-primary)]"
                onClick={onOpenSpecDetail}
              >
                详情
              </button>
              <div className="rounded-full bg-[var(--intent-primary-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                {spec.taskStats.done}/{spec.taskStats.total}
              </div>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="au-clickable rounded-md bg-[var(--surface-card)] px-2 py-1 text-xs text-[var(--text-secondary)] shadow-sm hover:text-[var(--text-primary)]"
                onClick={onOpenSpecDetail}
              >
                详情
              </button>
              <div className="rounded-full bg-[var(--surface-base)] px-2 py-0.5 text-[11px] text-[var(--text-tertiary)]">
                —
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          {/* ViewModeTabs will need refactor too, but for now we keep it and trust it adapts or we fix it next */}
          <ViewModeTabs size="sm" value={viewMode} onChange={onChangeViewMode} />
          {hasViewModeOverride ? (
            <span className="rounded bg-[var(--intent-warning-bg)] px-1.5 py-0.5 text-[10px] text-[var(--intent-warning-fg)] font-medium">
              列覆写
            </span>
          ) : (
            <span className="text-[10px] text-[var(--text-tertiary)] opacity-60">
              跟随 {globalViewMode === 'us' ? 'US' : 'Task'}
            </span>
          )}
        </div>
      </div>

      <div className="scrollbar-none flex-1 overflow-x-hidden overflow-y-auto px-2 py-2">
        {loading ? <div className="p-4 text-center text-xs text-[var(--text-tertiary)]">加载中…</div> : null}
        {!loading && !tasks ? <div className="p-4 text-center text-xs text-[var(--text-tertiary)]">未加载</div> : null}
        {!loading && tasks && tasks.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--text-tertiary)]">暂无任务</div>
        ) : null}

        {viewMode === 'task' ? (
          <div className="mt-1 flex flex-col gap-2.5 pb-2">
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
          <div className="mt-1 flex flex-col gap-2.5 pb-2">
            {loadingStories ? <div className="p-2 text-xs text-[var(--text-tertiary)]">Loading Stories...</div> : null}

            {storyOrder.map((storyCode) => {
              const stats = storyStatsByCode.get(storyCode)
              const story = storyByCode.get(storyCode) ?? null
              const missingInSpec = story === null
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
                title="未归属"
                stats={computeTaskStats(groupedByStory.unassigned)}
                hint={null}
                onOpen={onOpenSpecDetail}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
