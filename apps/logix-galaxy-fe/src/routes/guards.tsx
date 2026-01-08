import type React from 'react'
import { useEffect } from 'react'
import { useDispatch, useModule } from '@logixjs/react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { AuthDef } from '../galaxy/auth.module'
import { hasPermission, type ProjectPermissionKey } from '../galaxy/permissions'
import { ProjectsDef } from '../galaxy/projects.module'

export function RequireLogin({ children }: { children: React.ReactNode }) {
  const phase = useModule(AuthDef, (s) => s.phase)
  const pending = useModule(AuthDef, (s) => s.pending)
  const location = useLocation()

  if (phase === 'booting' || pending) {
    return <div className="py-8 text-sm text-zinc-500">Checking session…</div>
  }

  if (phase !== 'authenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          next: `${location.pathname}${location.search}`,
        }}
      />
    )
  }

  return <>{children}</>
}

export function RequireProjectPermission({
  permissionKey,
  children,
}: {
  readonly permissionKey: ProjectPermissionKey
  readonly children: React.ReactNode
}) {
  const params = useParams()
  const projectIdRaw = params.projectId
  const projectId = typeof projectIdRaw === 'string' ? Number(projectIdRaw) : NaN

  const selectedProjectId = useModule(ProjectsDef, (s) => s.selectedProjectId)
  const selectedProjectLoading = useModule(ProjectsDef, (s) => s.selectedProjectLoading)
  const selectedProjectError = useModule(ProjectsDef, (s) => s.selectedProjectError)
  const access = useModule(ProjectsDef, (s) => s.access)
  const accessLoading = useModule(ProjectsDef, (s) => s.accessLoading)
  const accessError = useModule(ProjectsDef, (s) => s.accessError)

  const dispatchProjects = useDispatch(ProjectsDef.tag)

  useEffect(() => {
    if (!Number.isFinite(projectId)) return
    if (selectedProjectId === projectId) return
    dispatchProjects({ _tag: 'selectProject', payload: projectId })
  }, [dispatchProjects, projectId, selectedProjectId])

  if (!Number.isFinite(projectId)) {
    return <div className="text-sm text-red-700">Invalid projectId</div>
  }

  if (selectedProjectId !== projectId || selectedProjectLoading || accessLoading) {
    return <div className="py-8 text-sm text-zinc-500">Loading project…</div>
  }

  if (selectedProjectError) {
    return <div className="rounded border bg-white p-4 text-sm text-red-700">{selectedProjectError}</div>
  }

  if (accessError) {
    return <div className="rounded border bg-white p-4 text-sm text-red-700">{accessError}</div>
  }

  if (!access) {
    return <div className="rounded border bg-white p-4 text-sm text-zinc-600">No access</div>
  }

  if (!hasPermission(access as any, permissionKey)) {
    return <div className="rounded border bg-white p-4 text-sm text-zinc-600">Forbidden</div>
  }

  return <>{children}</>
}
