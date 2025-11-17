# Data Model: 063 logix-galaxy-api 登录与用户模块（BetterAuth-first）

**Feature**: `specs/063-galaxy-user-auth/spec.md`  
**Date**: 2025-12-30

## 1) 范围

- 本数据模型覆盖 `apps/logix-galaxy-api` 的“登录 + 用户模块”最小实体：用户、会话与审计事件。
- 用户与会话的主存储使用 BetterAuth（PostgreSQL）；审计事件由本服务自行落库。
- 不包含：多租户、MFA、邮件验证码/邀请流程、精细化 ABAC、组织/团队等（后续按需另起 spec）。

## 2) 领域实体（Domain）

### 2.1 User

系统内的用户账号（对外 API 口径）。

- `userId: string`：稳定用户标识（当前由 BetterAuth 生成；未来接 OIDC/SSO 也保持 string 语义）。
- `email: string`：登录标识（大小写不敏感，需唯一）。
- `displayName: string`：展示名称（当前映射自 BetterAuth 的 `name`）。
- `status: "active" | "disabled"`：账号状态（当前映射自 BetterAuth Admin 插件的 `banned` 字段）。
- `roles: Array<"admin" | "user">`：角色集合（当前由 BetterAuth Admin 插件的 `role` 映射；API 保持数组以便未来扩展）。
- `createdAt/updatedAt: string`：时间戳（可序列化字符串；建议为 ISO-8601）。
- `lastLoginAt?: string`：最近一次登录时间（可选；当前不强依赖）。
- `disabledAt?: string`：禁用时间（可选；当前不强依赖）。

### 2.2 Session

登录会话（用于保护受保护接口访问）。

- `token: string`：不透明 session token（对调用方暴露为 Bearer token）。
- `expiresAt: string`：过期时间。

备注：会话存储由 BetterAuth 负责；服务侧会话校验以 BetterAuth 为准（见 `plan.md`）。

### 2.3 AuthEvent

安全/审计事件，用于回溯与排错。

- `eventId: number`
- `eventType: string`：事件类型（例如 `login_succeeded`/`login_failed`/`logout`/`user_created`/`user_disabled`/`user_enabled`/`password_reset`）。
- `actorUserId?: string`：执行者（可选；例如匿名登录失败时不存在）。
- `subjectUserId?: string`：被影响用户（可选）。
- `identifier?: string`：输入标识（例如 email；用于匿名失败场景关联）。
- `createdAt: string`
- `detail: object`：附加字段（可选、保持小且稳定）。

## 3) 持久化模型（PostgreSQL）

### 3.1 总体策略

- BetterAuth 核心表由 BetterAuth CLI 生成/迁移（权威来源：BetterAuth 文档与 `npx @better-auth/cli generate/migrate`）。
- 将 BetterAuth 的表落在独立 schema `auth`（通过 `search_path=auth`），避免与业务表冲突并便于后续治理。
- 本服务自维护的审计表落在默认 schema（`public`），不强依赖 BetterAuth 表的外键（降低启动耦合；避免“auth 表未迁移导致审计表无法创建”的硬阻塞）。

### 3.2 BetterAuth 核心表（schema: `auth`）

BetterAuth 核心表（核心 schema 摘要见官方文档 `Database | Better Auth`）：

- `auth."user"`：用户认证主表（`id/name/email/createdAt/updatedAt/...`）
- `auth.session`：会话表（`id/userId/token/expiresAt/ipAddress/userAgent/...`）
- `auth.account`：账号表（OAuth/SSO 账号与 credential 密码存储所在；`providerId=credential` 时包含 `password`）
- 其它表（如 `verification`）按启用的能力/插件由 CLI 自动补齐

为了满足本特性 **FR-007（email 大小写不敏感唯一）**，建议额外补充：

```sql
create unique index if not exists auth_user_email_lower_uniq
  on auth."user" (lower(email));
```

并在应用层统一将 email 归一化为 `lower(trim(email))` 后写入（避免出现不同大小写重复记录导致该索引创建失败）。

### 3.3 表：`public.auth_events`

```sql
create table if not exists auth_events (
  event_id bigint generated always as identity primary key,
  event_type text not null check (
    event_type in (
      'login_succeeded',
      'login_failed',
      'logout',
      'user_created',
      'user_disabled',
      'user_enabled',
      'password_reset'
    )
  ),
  actor_user_id text,
  subject_user_id text,
  identifier text,
  created_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object')
);

create index if not exists auth_events_created_at_idx on auth_events (created_at);
create index if not exists auth_events_event_type_created_at_idx on auth_events (event_type, created_at);
create index if not exists auth_events_actor_user_id_created_at_idx on auth_events (actor_user_id, created_at);
create index if not exists auth_events_subject_user_id_created_at_idx on auth_events (subject_user_id, created_at);
create index if not exists auth_events_identifier_lower_created_at_idx on auth_events (lower(identifier), created_at);
```

约束与不变量（摘要）：

- `detail` 仅用于少量附加信息（例如 `reason`），保持小且可序列化。
- `actor_user_id/subject_user_id` 采用 `text` 而非外键：避免把“auth schema 迁移”变成审计表创建的硬前置；审计更偏“可观测性数据”，允许弱一致。
