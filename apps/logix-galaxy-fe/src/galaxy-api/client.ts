export type UserStatus = 'active' | 'disabled'
export type RoleCode = 'admin' | 'user'

export type ApiErrorTag =
  | 'UnauthorizedError'
  | 'ForbiddenError'
  | 'ConflictError'
  | 'ValidationError'
  | 'NotFoundError'
  | 'TooManyRequestsError'
  | 'ServiceUnavailableError'

export interface ApiErrorBody {
  readonly _tag: ApiErrorTag
  readonly message: string
}

export interface UserDto {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly status: UserStatus
  readonly roles: ReadonlyArray<RoleCode>
  readonly createdAt: string
  readonly updatedAt: string
  readonly lastLoginAt: string | null
  readonly disabledAt: string | null
}

export interface AuthLoginRequest {
  readonly email: string
  readonly password: string
}

export interface AuthLoginResponse {
  readonly token: string
  readonly expiresAt: string
  readonly user: UserDto
}

export type ProjectRoleKey = 'owner' | 'admin' | 'member' | 'viewer'

export type ProjectPermissionKey =
  | 'project.read'
  | 'project.update'
  | 'member.read'
  | 'member.manage'
  | 'group.read'
  | 'group.manage'
  | 'audit.read'
  | 'owner.manage'

export interface UserSummaryDto {
  readonly id: string
  readonly email: string
  readonly displayName: string
}

export interface ProjectDto {
  readonly projectId: number
  readonly name: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface ProjectCreateRequest {
  readonly name: string
}

export interface ProjectUpdateRequest {
  readonly name?: string | undefined
}

export interface ProjectAccessDto {
  readonly projectId: number
  readonly userId: string
  readonly directRole: ProjectRoleKey
  readonly groupRoleKeys: ReadonlyArray<ProjectRoleKey>
  readonly effectiveRoleKeys: ReadonlyArray<ProjectRoleKey>
  readonly effectivePermissionKeys: ReadonlyArray<ProjectPermissionKey>
}

export interface ProjectMemberDto {
  readonly user: UserSummaryDto
  readonly directRole: ProjectRoleKey
  readonly groupRoleKeys: ReadonlyArray<ProjectRoleKey>
  readonly effectiveRoleKeys: ReadonlyArray<ProjectRoleKey>
  readonly effectivePermissionKeys: ReadonlyArray<ProjectPermissionKey>
  readonly createdAt: string
}

export interface ProjectMemberAddRequest {
  readonly email: string
  readonly roleKey: ProjectRoleKey
}

export interface ProjectMemberUpdateRoleRequest {
  readonly roleKey: ProjectRoleKey
}

export interface ProjectGroupDto {
  readonly groupId: number
  readonly projectId: number
  readonly name: string
  readonly roleKey: ProjectRoleKey
  readonly createdAt: string
}

export interface ProjectGroupCreateRequest {
  readonly name: string
  readonly roleKey: ProjectRoleKey
}

export interface ProjectGroupUpdateRequest {
  readonly name?: string | undefined
  readonly roleKey?: ProjectRoleKey | undefined
}

export interface ProjectGroupMemberDto {
  readonly user: UserSummaryDto
  readonly createdAt: string
}

export interface ProjectGroupMemberAddRequest {
  readonly userId: string
}

export type ProjectAuditEventType =
  | 'project_created'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'group_created'
  | 'group_deleted'
  | 'group_member_added'
  | 'group_member_removed'
  | 'group_role_changed'

export interface ProjectAuditEventDto {
  readonly eventId: number
  readonly projectId: number
  readonly eventType: ProjectAuditEventType
  readonly actorUserId: string | null
  readonly subjectUserId: string | null
  readonly subjectGroupId: number | null
  readonly createdAt: string
  readonly detail: Readonly<Record<string, unknown>> | null
}

export class GalaxyApiError extends Error {
  readonly _tag = 'GalaxyApiError'

  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Galaxy API error (${status})`)
  }
}

const baseUrlFromEnv = import.meta.env.VITE_GALAXY_API_BASE_URL
const DefaultBaseUrl = (typeof baseUrlFromEnv === 'string' ? baseUrlFromEnv : '/api').replace(/\/$/, '')

const isApiErrorBody = (value: unknown): value is ApiErrorBody => {
  if (!value || typeof value !== 'object') return false
  const v: any = value
  return typeof v._tag === 'string' && typeof v.message === 'string'
}

const request = async <T>(baseUrl: string, path: string, init: RequestInit): Promise<T> => {
  const res = await fetch(`${baseUrl}${path}`, init)

  if (res.status === 204) {
    return undefined as T
  }

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined)

  if (!res.ok) {
    throw new GalaxyApiError(res.status, body)
  }

  return body as T
}

const toQueryString = (params: Readonly<Record<string, string | number | undefined>>): string => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return ''
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return `?${qs}`
}

export const createGalaxyApiClient = (options?: { readonly baseUrl?: string }) => {
  const baseUrl = (options?.baseUrl ?? DefaultBaseUrl).replace(/\/$/, '')

  return {
    baseUrl,

    login: (payload: AuthLoginRequest) =>
      request<AuthLoginResponse>(baseUrl, '/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    me: (token: string) =>
      request<UserDto>(baseUrl, '/me', {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }),

    logout: (token: string) =>
      request<void>(baseUrl, '/auth/logout', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectList: (token: string) =>
      request<ReadonlyArray<ProjectDto>>(baseUrl, '/projects', {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectCreate: (token: string, payload: ProjectCreateRequest) =>
      request<ProjectDto>(baseUrl, '/projects', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    projectGet: (token: string, projectId: number) =>
      request<ProjectDto>(baseUrl, `/projects/${projectId}`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectUpdate: (token: string, projectId: number, payload: ProjectUpdateRequest) =>
      request<ProjectDto>(baseUrl, `/projects/${projectId}`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    projectAccessMe: (token: string, projectId: number) =>
      request<ProjectAccessDto>(baseUrl, `/projects/${projectId}/access`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectMemberList: (token: string, projectId: number) =>
      request<ReadonlyArray<ProjectMemberDto>>(baseUrl, `/projects/${projectId}/members`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectMemberAdd: (token: string, projectId: number, payload: ProjectMemberAddRequest) =>
      request<ProjectMemberDto>(baseUrl, `/projects/${projectId}/members`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    projectMemberUpdateRole: (token: string, projectId: number, userId: string, payload: ProjectMemberUpdateRoleRequest) =>
      request<ProjectMemberDto>(baseUrl, `/projects/${projectId}/members/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    projectMemberRemove: (token: string, projectId: number, userId: string) =>
      request<void>(baseUrl, `/projects/${projectId}/members/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectGroupList: (token: string, projectId: number) =>
      request<ReadonlyArray<ProjectGroupDto>>(baseUrl, `/projects/${projectId}/groups`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectGroupCreate: (token: string, projectId: number, payload: ProjectGroupCreateRequest) =>
      request<ProjectGroupDto>(baseUrl, `/projects/${projectId}/groups`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    projectGroupUpdate: (token: string, projectId: number, groupId: number, payload: ProjectGroupUpdateRequest) =>
      request<ProjectGroupDto>(baseUrl, `/projects/${projectId}/groups/${groupId}`, {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    projectGroupDelete: (token: string, projectId: number, groupId: number) =>
      request<void>(baseUrl, `/projects/${projectId}/groups/${groupId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectGroupMemberList: (token: string, projectId: number, groupId: number) =>
      request<ReadonlyArray<ProjectGroupMemberDto>>(baseUrl, `/projects/${projectId}/groups/${groupId}/members`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}` },
      }),

    projectGroupMemberAdd: (token: string, projectId: number, groupId: number, payload: ProjectGroupMemberAddRequest) =>
      request<ProjectGroupMemberDto>(baseUrl, `/projects/${projectId}/groups/${groupId}/members`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    projectGroupMemberRemove: (token: string, projectId: number, groupId: number, userId: string) =>
      request<void>(
        baseUrl,
        `/projects/${projectId}/groups/${groupId}/members/${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: { authorization: `Bearer ${token}` } },
      ),

    projectAuditEventList: (
      token: string,
      projectId: number,
      query: {
        readonly from?: string | undefined
        readonly to?: string | undefined
        readonly eventType?: ProjectAuditEventType | undefined
        readonly actorUserId?: string | undefined
        readonly subjectUserId?: string | undefined
        readonly subjectGroupId?: number | undefined
      },
    ) =>
      request<ReadonlyArray<ProjectAuditEventDto>>(
        baseUrl,
        `/projects/${projectId}/audit-events${toQueryString({
          from: query.from,
          to: query.to,
          eventType: query.eventType,
          actorUserId: query.actorUserId,
          subjectUserId: query.subjectUserId,
          subjectGroupId: query.subjectGroupId,
        })}`,
        { method: 'GET', headers: { authorization: `Bearer ${token}` } },
      ),

    toMessage: (error: unknown): string => {
      if (error instanceof GalaxyApiError) {
        if (isApiErrorBody(error.body)) return error.body.message
        return `${error.status}`
      }
      if (error instanceof Error) return error.message
      return 'Unknown error'
    },
  }
}

export const galaxyApi = createGalaxyApiClient()
