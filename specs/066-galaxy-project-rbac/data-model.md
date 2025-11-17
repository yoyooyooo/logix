# Data Model: 066 logix-galaxy 项目管理与 RBAC（成员/角色/权限/成员组）

**Feature**: `specs/066-galaxy-project-rbac/spec.md`  
**Date**: 2025-12-31

## 1) 范围

- 本数据模型覆盖 `apps/logix-galaxy-api` 的 Project Governance 最小实体：Project、ProjectMember、MemberGroup、审计事件。
- 用户主数据由 BetterAuth 管理（schema: `auth`），本特性仅引用其稳定 `userId`。
- 不包含：组织/租户（Org/Tenant）、跨项目权限、邮件邀请/审批流、细粒度 ABAC、计费与配额。

## 2) 领域实体（Domain）

### 2.1 Project

项目是协作与资产容器（承载后续 Tracks/Artifacts）。

- `projectId: number`
- `name: string`
- `createdByUserId: string`
- `createdAt/updatedAt: string`

### 2.2 ProjectMember

用户在 Project 下的成员关系（直接角色）。

- `projectId: number`
- `userId: string`
- `directRole: "owner" | "admin" | "member" | "viewer"`
- `createdByUserId: string`
- `createdAt: string`

备注：有效权限 = 直接角色 ∪ 来自成员组的角色（见 2.3）。

### 2.3 MemberGroup

成员组用于批量授权与成员治理。

- `groupId: number`
- `projectId: number`
- `name: string`
- `createdByUserId: string`
- `createdAt: string`
- `roleKey: "owner" | "admin" | "member" | "viewer"`（组绑定角色；可后续扩展为权限集合）

### 2.4 ProjectAuditEvent

关键治理操作的审计事件（可用于回溯与排错）。

- `eventId: number`
- `projectId: number`
- `eventType: string`（如 `project_created` / `member_added` / `member_role_changed` / `group_created` 等）
- `actorUserId?: string`
- `subjectUserId?: string`
- `subjectGroupId?: number`
- `createdAt: string`
- `detail: object`（保持小且稳定、可序列化）

## 3) 持久化模型（PostgreSQL）

### 3.1 总体策略

- 业务表落在默认 schema（`public`）。
- 用户表由 BetterAuth 维护（schema: `auth`，表：`auth."user"`）；业务表通过外键引用用户 id（`text`）。
- 所有外键列显式建索引（PostgreSQL 不会自动为 FK 建索引）。

### 3.2 表：`public.projects`

```sql
create table if not exists projects (
  project_id bigint generated always as identity primary key,
  name text not null check (length(btrim(name)) between 1 and 120),
  created_by_user_id text not null references auth."user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists projects_created_by_user_id_name_lower_uniq
  on projects (created_by_user_id, lower(btrim(name)));

create index if not exists projects_created_by_user_id_idx on projects (created_by_user_id);
create index if not exists projects_created_at_idx on projects (created_at);
```

### 3.3 表：`public.project_members`

```sql
create table if not exists project_members (
  project_id bigint not null references projects(project_id) on delete cascade,
  user_id text not null references auth."user"(id),
  direct_role text not null check (direct_role in ('owner', 'admin', 'member', 'viewer')),
  created_by_user_id text not null references auth."user"(id),
  created_at timestamptz not null default now(),

  primary key (project_id, user_id)
);

create index if not exists project_members_user_id_idx on project_members (user_id);
create index if not exists project_members_project_id_direct_role_idx on project_members (project_id, direct_role);
```

### 3.4 表：`public.project_groups`

```sql
create table if not exists project_groups (
  group_id bigint generated always as identity primary key,
  project_id bigint not null references projects(project_id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  role_key text not null check (role_key in ('owner', 'admin', 'member', 'viewer')),
  created_by_user_id text not null references auth."user"(id),
  created_at timestamptz not null default now()
);

create unique index if not exists project_groups_project_id_group_id_uniq on project_groups (project_id, group_id);
create unique index if not exists project_groups_project_id_name_lower_uniq on project_groups (project_id, lower(btrim(name)));
create index if not exists project_groups_project_id_idx on project_groups (project_id);
```

### 3.5 表：`public.project_group_members`

`project_id` 同时用于约束“组必须属于该项目、成员必须属于该项目”，避免跨项目越权数据。

```sql
create table if not exists project_group_members (
  project_id bigint not null,
  group_id bigint not null,
  user_id text not null,
  created_by_user_id text not null references auth."user"(id),
  created_at timestamptz not null default now(),

  primary key (group_id, user_id),
  foreign key (project_id, group_id) references project_groups(project_id, group_id) on delete cascade,
  foreign key (project_id, user_id) references project_members(project_id, user_id) on delete cascade,
  foreign key (user_id) references auth."user"(id)
);

create index if not exists project_group_members_project_id_user_id_idx on project_group_members (project_id, user_id);
create index if not exists project_group_members_user_id_idx on project_group_members (user_id);
```

### 3.6 表：`public.project_audit_events`

```sql
create table if not exists project_audit_events (
  event_id bigint generated always as identity primary key,
  project_id bigint not null references projects(project_id) on delete cascade,
  event_type text not null check (
    event_type in (
      'project_created',
      'member_added',
      'member_removed',
      'member_role_changed',
      'group_created',
      'group_deleted',
      'group_member_added',
      'group_member_removed',
      'group_role_changed'
    )
  ),
  actor_user_id text,
  subject_user_id text,
  subject_group_id bigint,
  created_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object')
);

create index if not exists project_audit_events_created_at_idx on project_audit_events (created_at);
create index if not exists project_audit_events_project_id_created_at_idx on project_audit_events (project_id, created_at);
create index if not exists project_audit_events_event_type_created_at_idx on project_audit_events (event_type, created_at);
create index if not exists project_audit_events_actor_user_id_created_at_idx on project_audit_events (actor_user_id, created_at);
create index if not exists project_audit_events_subject_user_id_created_at_idx on project_audit_events (subject_user_id, created_at);
create index if not exists project_audit_events_subject_group_id_created_at_idx on project_audit_events (subject_group_id, created_at);
```

约束与不变量（摘要）：

- `detail` 仅用于少量附加信息（例如变更前后角色），保持小且可序列化。
- 审计表中的 `actor_user_id/subject_user_id` 不做外键（允许用户删除/匿名操作的历史保留；避免审计写入被外键阻塞）。
