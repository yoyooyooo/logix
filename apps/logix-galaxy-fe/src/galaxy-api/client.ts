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

  const authHeaders = (token: string): Readonly<Record<string, string>> => ({
    authorization: `Bearer ${token}`,
  })

  const authJsonHeaders = (token: string): Readonly<Record<string, string>> => ({
    ...authHeaders(token),
    'content-type': 'application/json',
  })

  const requestJson = <T>(path: string, method: NonNullable<RequestInit['method']>, payload: unknown) =>
    request<T>(baseUrl, path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

  const requestAuth = <T>(token: string, path: string, method: NonNullable<RequestInit['method']>) =>
    request<T>(baseUrl, path, {
      method,
      headers: authHeaders(token),
    })

  const requestAuthJson = <T>(
    token: string,
    path: string,
    method: NonNullable<RequestInit['method']>,
    payload: unknown,
  ) =>
    request<T>(baseUrl, path, {
      method,
      headers: authJsonHeaders(token),
      body: JSON.stringify(payload),
    })

  return {
    baseUrl,

    login: (payload: AuthLoginRequest) => requestJson<AuthLoginResponse>('/auth/login', 'POST', payload),

    me: (token: string) => requestAuth<UserDto>(token, '/me', 'GET'),

    logout: (token: string) => requestAuth<void>(token, '/auth/logout', 'POST'),

    projectList: (token: string) => requestAuth<ReadonlyArray<ProjectDto>>(token, '/projects', 'GET'),

    projectCreate: (token: string, payload: ProjectCreateRequest) =>
      requestAuthJson<ProjectDto>(token, '/projects', 'POST', payload),

    projectGet: (token: string, projectId: number) => requestAuth<ProjectDto>(token, `/projects/${projectId}`, 'GET'),

    projectUpdate: (token: string, projectId: number, payload: ProjectUpdateRequest) =>
      requestAuthJson<ProjectDto>(token, `/projects/${projectId}`, 'PATCH', payload),

    projectAccessMe: (token: string, projectId: number) =>
      requestAuth<ProjectAccessDto>(token, `/projects/${projectId}/access`, 'GET'),

    projectMemberList: (token: string, projectId: number) =>
      requestAuth<ReadonlyArray<ProjectMemberDto>>(token, `/projects/${projectId}/members`, 'GET'),

    projectMemberAdd: (token: string, projectId: number, payload: ProjectMemberAddRequest) =>
      requestAuthJson<ProjectMemberDto>(token, `/projects/${projectId}/members`, 'POST', payload),

    projectMemberUpdateRole: (token: string, projectId: number, userId: string, payload: ProjectMemberUpdateRoleRequest) =>
      requestAuthJson<ProjectMemberDto>(
        token,
        `/projects/${projectId}/members/${encodeURIComponent(userId)}`,
        'PATCH',
        payload,
      ),

    projectMemberRemove: (token: string, projectId: number, userId: string) =>
      requestAuth<void>(token, `/projects/${projectId}/members/${encodeURIComponent(userId)}`, 'DELETE'),

    projectGroupList: (token: string, projectId: number) =>
      requestAuth<ReadonlyArray<ProjectGroupDto>>(token, `/projects/${projectId}/groups`, 'GET'),

    projectGroupCreate: (token: string, projectId: number, payload: ProjectGroupCreateRequest) =>
      requestAuthJson<ProjectGroupDto>(token, `/projects/${projectId}/groups`, 'POST', payload),

    projectGroupUpdate: (token: string, projectId: number, groupId: number, payload: ProjectGroupUpdateRequest) =>
      requestAuthJson<ProjectGroupDto>(token, `/projects/${projectId}/groups/${groupId}`, 'PATCH', payload),

    projectGroupDelete: (token: string, projectId: number, groupId: number) =>
      requestAuth<void>(token, `/projects/${projectId}/groups/${groupId}`, 'DELETE'),

    projectGroupMemberList: (token: string, projectId: number, groupId: number) =>
      requestAuth<ReadonlyArray<ProjectGroupMemberDto>>(token, `/projects/${projectId}/groups/${groupId}/members`, 'GET'),

    projectGroupMemberAdd: (token: string, projectId: number, groupId: number, payload: ProjectGroupMemberAddRequest) =>
      requestAuthJson<ProjectGroupMemberDto>(token, `/projects/${projectId}/groups/${groupId}/members`, 'POST', payload),

    projectGroupMemberRemove: (token: string, projectId: number, groupId: number, userId: string) =>
      requestAuth<void>(token, `/projects/${projectId}/groups/${groupId}/members/${encodeURIComponent(userId)}`, 'DELETE'),

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
      requestAuth<ReadonlyArray<ProjectAuditEventDto>>(
        token,
        `/projects/${projectId}/audit-events${toQueryString({
          from: query.from,
          to: query.to,
          eventType: query.eventType,
          actorUserId: query.actorUserId,
          subjectUserId: query.subjectUserId,
          subjectGroupId: query.subjectGroupId,
        })}`,
        'GET',
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
