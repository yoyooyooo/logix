export interface ApiError {
  readonly _tag: string
  readonly message: string
}

export interface SpecTaskStats {
  readonly total: number
  readonly done: number
  readonly todo: number
}

export interface SpecListItem {
  readonly id: string
  readonly num: number
  readonly title: string
  readonly taskStats?: SpecTaskStats
}

export interface SpecListResponse {
  readonly items: ReadonlyArray<SpecListItem>
}

export interface TaskItem {
  readonly line: number
  readonly checked: boolean
  readonly raw: string
  readonly title: string
  readonly taskId?: string
  readonly parallel?: boolean
  readonly story?: string
}

export interface TaskListResponse {
  readonly specId: string
  readonly tasks: ReadonlyArray<TaskItem>
}

export type ArtifactName = 'spec.md' | 'plan.md' | 'tasks.md'

export interface FileReadResponse {
  readonly name: ArtifactName
  readonly path: string
  readonly content: string
}

export interface FileWriteResponse {
  readonly name: ArtifactName
  readonly path: string
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (res.ok) {
    return (await res.json()) as T
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const err = (await res.json()) as Partial<ApiError>
    throw new Error(`[${res.status}] ${err._tag ?? 'Error'}: ${err.message ?? 'Unknown error'}`)
  }

  throw new Error(`[${res.status}] ${await res.text()}`)
}

export const api = {
  listSpecs: (): Promise<SpecListResponse> => requestJson('/api/specs'),
  listTasks: (specId: string): Promise<TaskListResponse> => requestJson(`/api/specs/${encodeURIComponent(specId)}/tasks`),
  toggleTask: (specId: string, line: number, checked: boolean): Promise<TaskListResponse> =>
    requestJson(`/api/specs/${encodeURIComponent(specId)}/tasks/toggle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ line, checked }),
    }),
  readFile: (specId: string, name: ArtifactName): Promise<FileReadResponse> =>
    requestJson(`/api/specs/${encodeURIComponent(specId)}/files/${encodeURIComponent(name)}`),
  writeFile: (specId: string, name: ArtifactName, content: string): Promise<FileWriteResponse> =>
    requestJson(`/api/specs/${encodeURIComponent(specId)}/files/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    }),
}

