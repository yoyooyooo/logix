export interface ParsedTask {
  readonly line: number
  readonly checked: boolean
  readonly raw: string
  readonly title: string
  readonly taskId?: string
  readonly parallel?: boolean
  readonly story?: string
}

const CheckboxLine = /^(\s*-\s*\[)([ xX])(\]\s+)(.+)$/

export function parseTasksMarkdown(markdown: string): ReadonlyArray<ParsedTask> {
  const tasks: ParsedTask[] = []
  const lines = markdown.split(/\r?\n/)

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? ''
    const match = raw.match(CheckboxLine)
    if (!match) continue

    const checked = match[2]?.toLowerCase() === 'x'
    const title = match[4]?.trim() ?? ''
    const taskId = title.match(/\bT\d{3}\b/)?.[0]
    const parallel = /\[P\]/.test(title) ? true : undefined
    const story = title.match(/\[(US\d+)\]/)?.[1]

    tasks.push({
      line: index + 1,
      checked,
      raw,
      title,
      taskId,
      parallel,
      story,
    })
  }

  return tasks
}

export function updateCheckboxLine(rawLine: string, checked: boolean): string | null {
  const match = rawLine.match(CheckboxLine)
  if (!match) return null

  const prefix = match[1] ?? ''
  const suffix = `${match[3] ?? ''}${match[4] ?? ''}`
  return `${prefix}${checked ? 'x' : ' '}${suffix}`
}

