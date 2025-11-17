# Quickstart: 066 logix-galaxy（验收：项目/成员/成员组/RBAC）

本 quickstart 用于在实现完成后，按 `specs/066-galaxy-project-rbac/spec.md` 验收：

- Project：创建项目、列出可访问项目、读取项目详情
- 成员：添加/移除成员、变更成员角色、后端强制授权（`401/403`）
- 成员组：创建组、维护组成员、组绑定角色并影响成员有效权限
- 审计：关键治理操作可查询
- 前端联调：`apps/logix-galaxy-fe` 跑通 P1/P2 页面闭环（轻量布局；状态/请求由 Logix 承载）

## 0) 前置：登录与用户模块

本特性依赖 `specs/063-galaxy-user-auth` 已可用（登录 + 创建用户/管理员 token）。

## 1) 配置 PostgreSQL

本地开发推荐把变量写到 `apps/logix-galaxy-api/.env.local`（仅本地用，已被 gitignore）：

可以先复制 `apps/logix-galaxy-api/env.local.template` 为 `.env.local` 再改。

```dotenv
DATABASE_URL='postgres://postgres:<password>@127.0.0.1:7001/postgres'
BETTER_AUTH_URL='http://127.0.0.1:5500'
BETTER_AUTH_SECRET='replace-with-a-long-random-secret'
BETTER_AUTH_AUTO_MIGRATE='1'
LOGIX_GALAXY_AUTO_SEED_ADMIN='1'
LOGIX_GALAXY_AUTO_MIGRATE_PROJECT_RBAC='1'
```

## 2) 启动后端（默认 5500）

```bash
pnpm -C apps/logix-galaxy-api dev:once
```

## 3) 登录获取 token（管理员）

```bash
curl -sS -X POST http://127.0.0.1:5500/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123456"}'
```

将返回的 `token` 记为 `<adminToken>`。

## 4) 创建一个普通用户（用于成员联调）

```bash
curl -sS -X POST http://127.0.0.1:5500/users \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <adminToken>' \
  -d '{"email":"alice@example.com","displayName":"Alice","password":"alice123456"}'
```

将响应中的 `id` 记为 `<aliceUserId>`。

## 5) 创建 Project 表结构（默认自动）

实现完成后，启动 `apps/logix-galaxy-api` 时会自动创建本特性的业务表（幂等，可重复），表结构与 `specs/066-galaxy-project-rbac/data-model.md` 一致。

如需关闭自动创建（例如生产环境由外部迁移工具管理）：

```bash
export LOGIX_GALAXY_AUTO_MIGRATE_PROJECT_RBAC='0'
```

验收口径：在数据库中存在 `projects/project_members/project_groups/project_group_members/project_audit_events` 等表。

## 6) 创建项目

```bash
curl -sS -X POST http://127.0.0.1:5500/projects \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <adminToken>' \
  -d '{"name":"Galaxy Demo Project"}'
```

将响应中的 `projectId` 记为 `<projectId>`。

## 7) 添加成员（Viewer）

```bash
curl -sS -X POST http://127.0.0.1:5500/projects/<projectId>/members \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <adminToken>' \
  -d '{"email":"alice@example.com","roleKey":"viewer"}'
```

期望：返回 `201`，且成员列表中能看到 Alice。

## 8) Alice 登录并验证只读访问

```bash
curl -sS -X POST http://127.0.0.1:5500/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"alice@example.com","password":"alice123456"}'
```

将返回的 `token` 记为 `<aliceToken>`。

1) Alice 可列出项目：

```bash
curl -sS http://127.0.0.1:5500/projects \
  -H 'authorization: Bearer <aliceToken>'
```

2) Alice 可读取项目详情：

```bash
curl -sS http://127.0.0.1:5500/projects/<projectId> \
  -H 'authorization: Bearer <aliceToken>'
```

3) Alice 不可变更成员（应 `403`）：

```bash
curl -sS -X PATCH http://127.0.0.1:5500/projects/<projectId>/members/<aliceUserId> \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <aliceToken>' \
  -d '{"roleKey":"member"}'
```

## 9) 创建成员组并赋予 Member 角色

```bash
curl -sS -X POST http://127.0.0.1:5500/projects/<projectId>/groups \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <adminToken>' \
  -d '{"name":"Developers","roleKey":"member"}'
```

将响应中的 `groupId` 记为 `<groupId>`。

## 10) 把 Alice 加入成员组

```bash
curl -sS -X POST http://127.0.0.1:5500/projects/<projectId>/groups/<groupId>/members \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <adminToken>' \
  -d '{"userId":"<aliceUserId>"}'
```

期望：返回 `201`。

## 11) 验证 Alice 的有效权限发生变化

```bash
curl -sS http://127.0.0.1:5500/projects/<projectId>/access \
  -H 'authorization: Bearer <aliceToken>'
```

期望：响应体中 `groupRoleKeys/effectiveRoleKeys/effectivePermissionKeys` 发生变化（至少包含 `member` 的有效角色或对应权限 key）。

## 12) 查询项目审计事件

```bash
curl -sS 'http://127.0.0.1:5500/projects/<projectId>/audit-events?from=1970-01-01T00:00:00.000Z' \
  -H 'authorization: Bearer <adminToken>'
```

期望：返回 `200` 且包含 `project_created/member_added/group_created/group_member_added` 等事件。

## 13) 契约与表结构对齐

- 接口契约：`specs/066-galaxy-project-rbac/contracts/openapi.yaml`
- 数据模型与表结构：`specs/066-galaxy-project-rbac/data-model.md`

## 14) 前端联调：`apps/logix-galaxy-fe`

`apps/logix-galaxy-fe` 默认通过 Vite dev proxy 将 `/api/*` 转发到 `http://127.0.0.1:5500`，避免浏览器 CORS。

如果后端不是默认端口/地址，可在启动前端时指定：

```bash
GALAXY_API_PROXY_TARGET='http://127.0.0.1:5501' pnpm -C apps/logix-galaxy-fe dev
```

1) 启动前端：

```bash
pnpm -C apps/logix-galaxy-fe dev
```

2) 打开浏览器：

- `http://127.0.0.1:5173`

3) 期望：

- 登录后可以在前端完成：创建项目 → 进入项目 → 成员管理 → 成员组管理（轻量布局即可）
- 未登录访问受保护路由会被拦截；无权限访问会显示明确提示
