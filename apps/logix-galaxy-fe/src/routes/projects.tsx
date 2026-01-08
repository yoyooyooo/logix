import { useDispatch, useModule } from '@logixjs/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ProjectsDef } from '../galaxy/projects.module'

export function ProjectsPage() {
  const projects = useModule(ProjectsDef, (s) => s.projects) as any as ReadonlyArray<{
    readonly projectId: number
    readonly name: string
  }>
  const loading = useModule(ProjectsDef, (s) => s.projectsLoading)
  const error = useModule(ProjectsDef, (s) => s.projectsError)

  const dispatchProjects = useDispatch(ProjectsDef.tag)

  const [name, setName] = useState('')

  useEffect(() => {
    dispatchProjects({ _tag: 'refreshProjects', payload: undefined })
  }, [dispatchProjects])

  const canCreate = useMemo(() => name.trim().length > 0 && !loading, [loading, name])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <div className="mt-1 text-sm text-zinc-600">创建项目，并进入成员/成员组管理。</div>
        </div>
        <button
          className="rounded border bg-white px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-60"
          onClick={() => dispatchProjects({ _tag: 'refreshProjects', payload: undefined })}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="font-medium">创建项目</div>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded border px-3 py-2 text-sm"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
          <button
            className="rounded border bg-zinc-900 text-white px-3 py-2 text-sm disabled:opacity-60"
            onClick={() => {
              const trimmed = name.trim()
              if (!trimmed) return
              dispatchProjects({ _tag: 'createProject', payload: trimmed })
              setName('')
            }}
            disabled={!canCreate}
          >
            Create
          </button>
        </div>
        {error ? <div className="text-sm text-red-700">{error}</div> : null}
      </div>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3 font-medium">我的项目</div>
        <div className="divide-y">
          {projects.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-600">{loading ? 'Loading…' : '暂无项目'}</div>
          ) : (
            projects.map((p) => (
              <Link key={p.projectId} to={`/projects/${p.projectId}`} className="block px-4 py-3 hover:bg-zinc-50">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-zinc-500">projectId: {p.projectId}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
