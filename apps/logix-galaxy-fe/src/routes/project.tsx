import { useDispatch, useModule } from '@logixjs/react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ProjectGroupsDef } from '../galaxy/project-groups.module'
import { ProjectMembersDef } from '../galaxy/project-members.module'
import { hasPermission, ProjectRoleKeysByPriority, type ProjectRoleKey } from '../galaxy/permissions'
import { ProjectsDef } from '../galaxy/projects.module'

export function ProjectPage() {
  const params = useParams()
  const projectId = typeof params.projectId === 'string' ? Number(params.projectId) : NaN

  const project = useModule(ProjectsDef, (s) => s.selectedProject) as any as { readonly projectId: number; readonly name: string } | null
  const access = useModule(ProjectsDef, (s) => s.access) as any as
    | { readonly effectivePermissionKeys: ReadonlyArray<any>; readonly effectiveRoleKeys: ReadonlyArray<any>; readonly directRole: string }
    | null

  const members = useModule(ProjectMembersDef, (s) => s.members) as any as ReadonlyArray<any>
  const membersLoading = useModule(ProjectMembersDef, (s) => s.loading)
  const membersError = useModule(ProjectMembersDef, (s) => s.error)

  const groups = useModule(ProjectGroupsDef, (s) => s.groups) as any as ReadonlyArray<any>
  const groupsLoading = useModule(ProjectGroupsDef, (s) => s.groupsLoading)
  const groupsError = useModule(ProjectGroupsDef, (s) => s.groupsError)
  const selectedGroupId = useModule(ProjectGroupsDef, (s) => s.selectedGroupId) as any as number | null
  const groupMembers = useModule(ProjectGroupsDef, (s) => s.selectedGroupMembers) as any as ReadonlyArray<any>
  const groupMembersLoading = useModule(ProjectGroupsDef, (s) => s.membersLoading)
  const groupMembersError = useModule(ProjectGroupsDef, (s) => s.membersError)

  const dispatchMembers = useDispatch(ProjectMembersDef.tag)
  const dispatchGroups = useDispatch(ProjectGroupsDef.tag)

  const canManageMembers = useMemo(() => (access ? hasPermission(access as any, 'member.manage') : false), [access])
  const canReadGroups = useMemo(() => (access ? hasPermission(access as any, 'group.read') : false), [access])
  const canManageGroups = useMemo(() => (access ? hasPermission(access as any, 'group.manage') : false), [access])
  const canOwnerManage = useMemo(() => (access ? hasPermission(access as any, 'owner.manage') : false), [access])

  const assignableRoleKeys = useMemo(
    () => (canOwnerManage ? ProjectRoleKeysByPriority : ProjectRoleKeysByPriority.filter((k) => k !== 'owner')),
    [canOwnerManage],
  )

  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<ProjectRoleKey>('viewer')
  const [memberRoleDraft, setMemberRoleDraft] = useState<Record<string, ProjectRoleKey>>({})

  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupRole, setNewGroupRole] = useState<ProjectRoleKey>('member')
  const [groupRoleDraft, setGroupRoleDraft] = useState<Record<number, ProjectRoleKey>>({})

  const memberOptions = useMemo(() => {
    return members.map((m: any) => ({
      userId: String(m.user?.id ?? ''),
      label: `${String(m.user?.displayName ?? m.user?.email ?? m.user?.id ?? '')} (${String(m.user?.email ?? '')})`,
    }))
  }, [members])

  const [groupAddUserId, setGroupAddUserId] = useState('')

  if (!Number.isFinite(projectId)) {
    return <div className="text-sm text-red-700">Invalid projectId</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded border bg-white p-4 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{project?.name ?? `Project #${projectId}`}</h1>
            <div className="text-xs text-zinc-500">projectId: {projectId}</div>
          </div>
          <button
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={() => {
              dispatchMembers({ _tag: 'refresh', payload: undefined })
              dispatchGroups({ _tag: 'refreshGroups', payload: undefined })
            }}
          >
            Refresh
          </button>
        </div>

        {access ? (
          <div className="pt-2 text-sm text-zinc-700">
            <div className="font-medium">My Access</div>
            <div className="mt-1 text-xs text-zinc-500">directRole: {String((access as any).directRole)}</div>
            <div className="mt-2 text-xs">
              <div className="text-zinc-500">effectiveRoleKeys</div>
              <div className="mt-1 font-mono text-[11px] break-all">{JSON.stringify((access as any).effectiveRoleKeys)}</div>
            </div>
            <div className="mt-2 text-xs">
              <div className="text-zinc-500">effectivePermissionKeys</div>
              <div className="mt-1 font-mono text-[11px] break-all">
                {JSON.stringify((access as any).effectivePermissionKeys)}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <section className="rounded border bg-white">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="font-medium">Members</div>
          <button
            className="rounded border bg-white px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-60"
            onClick={() => dispatchMembers({ _tag: 'refresh', payload: undefined })}
            disabled={membersLoading}
          >
            Refresh
          </button>
        </div>

        <div className="p-4 space-y-3">
          {membersError ? <div className="text-sm text-red-700">{membersError}</div> : null}

          {canManageMembers ? (
            <div className="rounded border bg-zinc-50 p-3 space-y-2">
              <div className="text-sm font-medium">Add Member</div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="flex-1 min-w-[220px] rounded border px-3 py-2 text-sm"
                  placeholder="email (e.g. alice@example.com)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
                <select
                  className="rounded border px-3 py-2 text-sm"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as ProjectRoleKey)}
                >
                  {assignableRoleKeys.map((rk) => (
                    <option key={rk} value={rk}>
                      {rk}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded border bg-zinc-900 text-white px-3 py-2 text-sm disabled:opacity-60"
                  onClick={() => {
                    const email = newMemberEmail.trim()
                    if (!email) return
                    dispatchMembers({ _tag: 'addByEmail', payload: { email, roleKey: newMemberRole } })
                    setNewMemberEmail('')
                  }}
                  disabled={membersLoading || newMemberEmail.trim().length === 0}
                >
                  Add
                </button>
              </div>
              <div className="text-xs text-zinc-600">后端会拒绝重复添加（409）或不存在用户（404）。</div>
            </div>
          ) : (
            <div className="text-sm text-zinc-600">你没有 `member.manage` 权限，仅可只读查看成员列表。</div>
          )}

          <div className="rounded border">
            <div className="grid grid-cols-12 gap-2 border-b bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              <div className="col-span-4">User</div>
              <div className="col-span-2">directRole</div>
              <div className="col-span-4">effectiveRoleKeys</div>
              <div className="col-span-2">Actions</div>
            </div>
            <div className="divide-y">
              {members.length === 0 ? (
                <div className="px-3 py-3 text-sm text-zinc-600">{membersLoading ? 'Loading…' : '暂无成员'}</div>
              ) : (
                members.map((m: any) => {
                  const userId = String(m.user?.id ?? '')
                  const draft = memberRoleDraft[userId] ?? (m.directRole as ProjectRoleKey)
                  return (
                    <div key={userId} className="grid grid-cols-12 gap-2 px-3 py-3 text-sm">
                      <div className="col-span-4">
                        <div className="font-medium">{String(m.user?.displayName ?? m.user?.email ?? userId)}</div>
                        <div className="text-xs text-zinc-500">{String(m.user?.email ?? userId)}</div>
                      </div>
                      <div className="col-span-2">{String(m.directRole)}</div>
                      <div className="col-span-4">
                        <div className="font-mono text-[11px] text-zinc-600 break-all">
                          {JSON.stringify(m.effectiveRoleKeys)}
                        </div>
                      </div>
                      <div className="col-span-2">
                        {canManageMembers ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="rounded border px-2 py-1 text-xs"
                              value={draft}
                              onChange={(e) =>
                                setMemberRoleDraft((prev) => ({ ...prev, [userId]: e.target.value as ProjectRoleKey }))
                              }
                            >
                              {assignableRoleKeys.map((rk) => (
                                <option key={rk} value={rk}>
                                  {rk}
                                </option>
                              ))}
                            </select>
                            <button
                              className="rounded border bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                              onClick={() =>
                                dispatchMembers({ _tag: 'setRole', payload: { userId, roleKey: draft } })
                              }
                            >
                              Set
                            </button>
                            <button
                              className="rounded border bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                              onClick={() => dispatchMembers({ _tag: 'remove', payload: userId })}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-zinc-400">—</div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded border bg-white">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="font-medium">Groups</div>
          <button
            className="rounded border bg-white px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-60"
            onClick={() => dispatchGroups({ _tag: 'refreshGroups', payload: undefined })}
            disabled={groupsLoading}
          >
            Refresh
          </button>
        </div>

        <div className="p-4 space-y-3">
          {groupsError ? <div className="text-sm text-red-700">{groupsError}</div> : null}

          {!canReadGroups ? (
            <div className="text-sm text-zinc-600">你没有 `group.read` 权限，无法查看成员组。</div>
          ) : (
            <>
              {canManageGroups ? (
                <div className="rounded border bg-zinc-50 p-3 space-y-2">
                  <div className="text-sm font-medium">Create Group</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="flex-1 min-w-[220px] rounded border px-3 py-2 text-sm"
                      placeholder="group name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                    <select
                      className="rounded border px-3 py-2 text-sm"
                      value={newGroupRole}
                      onChange={(e) => setNewGroupRole(e.target.value as ProjectRoleKey)}
                    >
                      {assignableRoleKeys.map((rk) => (
                        <option key={rk} value={rk}>
                          {rk}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded border bg-zinc-900 text-white px-3 py-2 text-sm disabled:opacity-60"
                      onClick={() => {
                        const trimmed = newGroupName.trim()
                        if (!trimmed) return
                        dispatchGroups({ _tag: 'createGroup', payload: { name: trimmed, roleKey: newGroupRole } })
                        setNewGroupName('')
                      }}
                      disabled={groupsLoading || newGroupName.trim().length === 0}
                    >
                      Create
                    </button>
                  </div>
                  <div className="text-xs text-zinc-600">组角色变更/删除由后端强制鉴权。</div>
                </div>
              ) : (
                <div className="text-sm text-zinc-600">你没有 `group.manage` 权限，仅可只读查看成员组。</div>
              )}

              <div className="rounded border">
                <div className="grid grid-cols-12 gap-2 border-b bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  <div className="col-span-5">Group</div>
                  <div className="col-span-3">roleKey</div>
                  <div className="col-span-4">Actions</div>
                </div>
                <div className="divide-y">
                  {groups.length === 0 ? (
                    <div className="px-3 py-3 text-sm text-zinc-600">{groupsLoading ? 'Loading…' : '暂无成员组'}</div>
                  ) : (
                    groups.map((g: any) => {
                      const gid = Number(g.groupId)
                      const draft = groupRoleDraft[gid] ?? (g.roleKey as ProjectRoleKey)
                      const isSelected = selectedGroupId === gid
                      return (
                        <div key={gid} className={`grid grid-cols-12 gap-2 px-3 py-3 text-sm ${isSelected ? 'bg-zinc-50' : ''}`}>
                          <div className="col-span-5">
                            <div className="font-medium">{String(g.name)}</div>
                            <div className="text-xs text-zinc-500">groupId: {gid}</div>
                          </div>
                          <div className="col-span-3">{String(g.roleKey)}</div>
                          <div className="col-span-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                className="rounded border bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                                onClick={() => dispatchGroups({ _tag: 'selectGroup', payload: gid })}
                              >
                                {isSelected ? 'Selected' : 'Members'}
                              </button>

                              {canManageGroups ? (
                                <>
                                  <select
                                    className="rounded border px-2 py-1 text-xs"
                                    value={draft}
                                    onChange={(e) =>
                                      setGroupRoleDraft((prev) => ({
                                        ...prev,
                                        [gid]: e.target.value as ProjectRoleKey,
                                      }))
                                    }
                                  >
                                    {assignableRoleKeys.map((rk) => (
                                      <option key={rk} value={rk}>
                                        {rk}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    className="rounded border bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                                    onClick={() =>
                                      dispatchGroups({
                                        _tag: 'updateGroup',
                                        payload: { groupId: gid, roleKey: draft },
                                      })
                                    }
                                  >
                                    Set Role
                                  </button>
                                  <button
                                    className="rounded border bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                                    onClick={() => dispatchGroups({ _tag: 'deleteGroup', payload: gid })}
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {selectedGroupId != null ? (
                <div className="rounded border bg-white">
                  <div className="border-b px-4 py-3 flex items-center justify-between">
                    <div className="font-medium">Group Members (groupId: {selectedGroupId})</div>
                    <button
                      className="rounded border bg-white px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-60"
                      onClick={() => dispatchGroups({ _tag: 'refreshMembers', payload: undefined })}
                      disabled={groupMembersLoading}
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {groupMembersError ? <div className="text-sm text-red-700">{groupMembersError}</div> : null}

                    {canManageGroups ? (
                      <div className="rounded border bg-zinc-50 p-3 space-y-2">
                        <div className="text-sm font-medium">Add Member to Group</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            className="min-w-[220px] rounded border px-3 py-2 text-sm"
                            value={groupAddUserId}
                            onChange={(e) => setGroupAddUserId(e.target.value)}
                          >
                            <option value="">Select a project member…</option>
                            {memberOptions
                              .filter((m) => m.userId)
                              .map((m) => (
                                <option key={m.userId} value={m.userId}>
                                  {m.label}
                                </option>
                              ))}
                          </select>
                          <button
                            className="rounded border bg-zinc-900 text-white px-3 py-2 text-sm disabled:opacity-60"
                            onClick={() => {
                              if (!groupAddUserId) return
                              dispatchGroups({
                                _tag: 'addMember',
                                payload: { groupId: selectedGroupId, userId: groupAddUserId },
                              })
                              setGroupAddUserId('')
                            }}
                            disabled={groupMembersLoading || !groupAddUserId}
                          >
                            Add
                          </button>
                          <button
                            className="rounded border bg-white px-3 py-2 text-sm hover:bg-zinc-50"
                            onClick={() => dispatchGroups({ _tag: 'selectGroup', payload: null })}
                          >
                            Close
                          </button>
                        </div>
                        <div className="text-xs text-zinc-600">仅允许添加“已是项目成员”的用户（否则后端返回 409）。</div>
                      </div>
                    ) : null}

                    <div className="rounded border">
                      <div className="grid grid-cols-12 gap-2 border-b bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                        <div className="col-span-8">User</div>
                        <div className="col-span-4">Actions</div>
                      </div>
                      <div className="divide-y">
                        {groupMembers.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-zinc-600">
                            {groupMembersLoading ? 'Loading…' : '暂无组成员'}
                          </div>
                        ) : (
                          groupMembers.map((gm: any) => {
                            const uid = String(gm.user?.id ?? '')
                            return (
                              <div key={uid} className="grid grid-cols-12 gap-2 px-3 py-3 text-sm">
                                <div className="col-span-8">
                                  <div className="font-medium">{String(gm.user?.displayName ?? gm.user?.email ?? uid)}</div>
                                  <div className="text-xs text-zinc-500">{String(gm.user?.email ?? uid)}</div>
                                </div>
                                <div className="col-span-4">
                                  {canManageGroups ? (
                                    <button
                                      className="rounded border bg-white px-2 py-1 text-xs hover:bg-zinc-50"
                                      onClick={() =>
                                        dispatchGroups({
                                          _tag: 'removeMember',
                                          payload: { groupId: selectedGroupId, userId: uid },
                                        })
                                      }
                                    >
                                      Remove
                                    </button>
                                  ) : (
                                    <div className="text-xs text-zinc-400">—</div>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
