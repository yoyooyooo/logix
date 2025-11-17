import { Schema } from 'effect'
import type {
  ProjectPermissionKey as ApiProjectPermissionKey,
  ProjectRoleKey as ApiProjectRoleKey,
} from '../galaxy-api/client'

export const ProjectRoleKeySchema = Schema.Union(
  Schema.Literal('owner'),
  Schema.Literal('admin'),
  Schema.Literal('member'),
  Schema.Literal('viewer'),
)

export type ProjectRoleKey = Schema.Schema.Type<typeof ProjectRoleKeySchema>

type _ProjectRoleKeyCompatA = ApiProjectRoleKey extends ProjectRoleKey ? true : never
type _ProjectRoleKeyCompatB = ProjectRoleKey extends ApiProjectRoleKey ? true : never

export const ProjectPermissionKeySchema = Schema.Union(
  Schema.Literal('project.read'),
  Schema.Literal('project.update'),
  Schema.Literal('member.read'),
  Schema.Literal('member.manage'),
  Schema.Literal('group.read'),
  Schema.Literal('group.manage'),
  Schema.Literal('audit.read'),
  Schema.Literal('owner.manage'),
)

export type ProjectPermissionKey = Schema.Schema.Type<typeof ProjectPermissionKeySchema>

type _ProjectPermissionKeyCompatA = ApiProjectPermissionKey extends ProjectPermissionKey ? true : never
type _ProjectPermissionKeyCompatB = ProjectPermissionKey extends ApiProjectPermissionKey ? true : never

export const ProjectRoleKeysByPriority: ReadonlyArray<ProjectRoleKey> = ['viewer', 'member', 'admin', 'owner']

const RolePriority: Record<ProjectRoleKey, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
}

const RolePermissions: Record<ProjectRoleKey, ReadonlyArray<ProjectPermissionKey>> = {
  viewer: ['project.read', 'member.read'],
  member: ['project.read', 'member.read', 'group.read'],
  admin: ['project.read', 'member.read', 'group.read', 'member.manage', 'group.manage', 'audit.read'],
  owner: [
    'project.read',
    'member.read',
    'group.read',
    'member.manage',
    'group.manage',
    'audit.read',
    'project.update',
    'owner.manage',
  ],
}

export const sortRoleKeys = (keys: Iterable<ProjectRoleKey>): ReadonlyArray<ProjectRoleKey> => {
  const uniq = new Set<ProjectRoleKey>()
  for (const k of keys) uniq.add(k)
  return Array.from(uniq).sort((a, b) => RolePriority[a] - RolePriority[b])
}

export const rolePermissionKeys = (roleKey: ProjectRoleKey): ReadonlyArray<ProjectPermissionKey> => RolePermissions[roleKey]

export const computeEffectiveRoleKeys = (
  directRole: ProjectRoleKey,
  groupRoleKeys: ReadonlyArray<ProjectRoleKey>,
): ReadonlyArray<ProjectRoleKey> => sortRoleKeys([directRole, ...groupRoleKeys])

export const computeEffectivePermissionKeys = (
  effectiveRoleKeys: ReadonlyArray<ProjectRoleKey>,
): ReadonlyArray<ProjectPermissionKey> => {
  const uniq = new Set<ProjectPermissionKey>()
  for (const role of effectiveRoleKeys) {
    for (const p of RolePermissions[role]) uniq.add(p)
  }
  return Array.from(uniq).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

export const hasPermission = (
  access: { readonly effectivePermissionKeys: ReadonlyArray<ProjectPermissionKey> },
  required: ProjectPermissionKey,
): boolean => access.effectivePermissionKeys.includes(required)

