import type { TaskItem } from '../api/client'

export interface UserStoryDef {
  readonly code: string
  readonly index: number
  readonly title: string
  readonly line: number
}

export function parseUserStories(specMarkdown: string): ReadonlyArray<UserStoryDef> {
  const lines = specMarkdown.split(/\r?\n/)
  const out: UserStoryDef[] = []

  const headingPattern = /^(#{1,6})\s+(.+?)\s*$/
  const userStoryPattern = /^User\s+Story\s+(?<num>\d+)\b(?<rest>.*)$/i
  const priorityPattern = /\(\s*Priority\s*:\s*(?<priority>P\d+)\s*\)\s*$/i

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    const m = raw.match(headingPattern)
    if (!m) continue

    const headingText = (m[2] ?? '').trim()
    const us = headingText.match(userStoryPattern)
    if (!us?.groups?.num) continue

    const index = Number.parseInt(us.groups.num, 10)
    if (!Number.isFinite(index)) continue

    let rest = (us.groups.rest ?? '').trim()
    const pri = rest.match(priorityPattern)
    if (pri) {
      rest = rest.slice(0, pri.index).trim()
    }

    rest = rest.replace(/^[-–—:：]\s*/, '').trim()

    out.push({
      code: `US${index}`,
      index,
      title: rest || `User Story ${index}`,
      line: i + 1,
    })
  }

  return out.sort((a, b) => a.index - b.index)
}

export function extractRefsFromTaskRaw(raw: string): ReadonlyArray<string> {
  const matches = raw.match(/\b(?:FR|NFR|SC)-\d{3}\b/g) ?? []
  return Array.from(new Set(matches)).sort()
}

export interface RefStat {
  readonly code: string
  readonly total: number
  readonly done: number
}

export function computeRefStats(tasks: ReadonlyArray<TaskItem>): ReadonlyArray<RefStat> {
  const byCode = new Map<string, { done: number; total: number }>()

  for (const t of tasks) {
    const codes = extractRefsFromTaskRaw(t.raw)
    for (const code of codes) {
      const prev = byCode.get(code) ?? { done: 0, total: 0 }
      prev.total += 1
      if (t.checked) prev.done += 1
      byCode.set(code, prev)
    }
  }

  return Array.from(byCode.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, s]) => ({ code, total: s.total, done: s.done }))
}

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getDisplayTitle(task: TaskItem): string {
  let title = task.title

  if (task.taskId) {
    title = title.replace(new RegExp(`^\\s*${escapeRegExp(task.taskId)}\\b\\s*`), '')
    title = title.replace(/^\s*[-–—·:：]\s*/, '')
  }

  if (task.story) {
    title = title.replace(new RegExp(`\\s*\\[${escapeRegExp(task.story)}\\]\\s*`, 'g'), ' ')
  }

  if (task.parallel) {
    title = title.replace(/\s*\[P\]\s*/g, ' ')
  }

  title = title.replace(/\s{2,}/g, ' ').trim()
  return title || task.title
}

export function computeTaskStats(tasks: ReadonlyArray<TaskItem>): { readonly total: number; readonly done: number; readonly todo: number } {
  const total = tasks.length
  const done = tasks.filter((t) => t.checked).length
  return { total, done, todo: total - done }
}
