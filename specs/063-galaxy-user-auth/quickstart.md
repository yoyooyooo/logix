# Quickstart: 063 logix-galaxy-api（验收）

本 quickstart 用于在实现完成后，按 `specs/063-galaxy-user-auth/spec.md` 验收：

- 登录闭环：`POST /auth/login` → `GET /me` → `POST /auth/logout`
- 管理员用户管理：创建/更新/禁用/启用/重置密码
- 审计事件：登录成功/失败、登出、用户管理动作可查询
- 默认自动化测试在无 PostgreSQL 环境下可一键通过

## 0) 一键自动化测试（无 PostgreSQL）

```bash
pnpm -C apps/logix-galaxy-api test
```

期望：所有用例通过，且无需设置 `DATABASE_URL`。

## 1) 配置 PostgreSQL

本地开发推荐把这些变量写到 `apps/logix-galaxy-api/.env.local`（仅本地用，已被 gitignore）：

可以先复制 `apps/logix-galaxy-api/env.local.template` 为 `.env.local` 再改。

```dotenv
DATABASE_URL='postgres://postgres:<password>@127.0.0.1:7001/postgres'
BETTER_AUTH_URL='http://127.0.0.1:5500'
BETTER_AUTH_SECRET='replace-with-a-long-random-secret'
BETTER_AUTH_AUTO_MIGRATE='1'
```

注意：`BETTER_AUTH_SECRET` 必须至少 32 字符（BetterAuth 会校验）；`BETTER_AUTH_URL` 填后端对外可访问的 base URL（也就是你访问 `POST /auth/login` 时使用的那个地址）。

## 2) 初始化 BetterAuth schema 并迁移表结构（默认自动）

启动 `apps/logix-galaxy-api` 时会自动执行（默认开启，可重复）：

- 创建 `auth` schema
- 运行 BetterAuth migrations（内部 `runMigrations()`，创建 `auth."user"` / `auth.session` 等表）

如需关闭自动迁移（例如生产环境由外部工具迁移）：

```bash
export BETTER_AUTH_AUTO_MIGRATE='0'
```

仍可手动执行（例如首次初始化、或想在启动服务前预迁移）：

1) 创建 `auth` schema（幂等）：

```bash
tsx apps/logix-galaxy-api/scripts/init-auth-schema.ts
```

2) 运行 BetterAuth migrations（建议首次启动前执行）：

```bash
npx @better-auth/cli@latest migrate --config apps/logix-galaxy-api/auth.ts
```

## 3) 创建/修复管理员账号（seed）

如果你在 `apps/logix-galaxy-api/.env.local` 里设置了：

```dotenv
LOGIX_GALAXY_AUTO_SEED_ADMIN='1'
```

则服务启动前会自动执行一次 seed（本地开发用；会把该账号修正为 `admin` 且密码对齐到环境变量）。

也可以手动执行：

```bash
ADMIN_EMAIL='admin@example.com' ADMIN_PASSWORD='admin123456' tsx apps/logix-galaxy-api/scripts/seed-admin.ts
```

期望：输出 `ok`，并确保该用户具备 `admin` 角色（幂等）。

## 4) 启动服务（默认 5500）

```bash
pnpm -C apps/logix-galaxy-api dev:once
```

## 5) 登录并获取 token

```bash
curl -sS -X POST http://127.0.0.1:5500/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123456"}'
```

期望：返回 `200`，响应体包含 `token`、`expiresAt`、`user`。

## 6) 访问受保护接口：`GET /me`

将上一步返回的 `token` 复制到下方：

```bash
curl -sS http://127.0.0.1:5500/me \
  -H 'authorization: Bearer <token>'
```

期望：返回 `200`，且 user 信息不包含任何敏感字段（password/hash/token）。

## 7) 管理员创建用户

```bash
curl -sS -X POST http://127.0.0.1:5500/users \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <token>' \
  -d '{"email":"alice@example.com","displayName":"Alice","password":"alice123456"}'
```

期望：返回 `201`，并返回新用户（不含敏感字段）。将响应中的 `id` 记为 `<aliceUserId>`。

## 8) 禁用用户并验证会话失效

（将 `<aliceUserId>` 替换为上一步返回的 `id`）

```bash
curl -sS -X POST http://127.0.0.1:5500/users/<aliceUserId>/disable \
  -H 'authorization: Bearer <token>'
```

期望：返回 `204`；该用户后续登录返回 `403`，已有会话在一次请求内失效（`GET /me` 返回 `401`）。

## 9) 重置密码并验证新旧密码行为

```bash
curl -sS -X POST http://127.0.0.1:5500/users/<aliceUserId>/reset-password \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <token>' \
  -d '{"password":"alice654321"}'
```

期望：返回 `204`；旧密码登录失败，新密码登录成功。

## 10) 查询审计事件（管理员）

```bash
curl -sS 'http://127.0.0.1:5500/auth/events?from=1970-01-01T00:00:00.000Z' \
  -H 'authorization: Bearer <token>'
```

期望：返回 `200` 且数组中包含登录、登出、禁用、重置密码等事件。

## 11) 契约与表结构对齐

- 接口契约：`specs/063-galaxy-user-auth/contracts/openapi.yaml`
- 数据模型与表结构：`specs/063-galaxy-user-auth/data-model.md`

## 12) 前端联调：`apps/logix-galaxy-fe` 跑通登录

> 目的：用真实浏览器调用跑通 `POST /auth/login` → `GET /me` → `POST /auth/logout` 的最小闭环。

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

3) 使用 seed 的管理员账号登录：

- Email：`admin@example.com`
- Password：`admin123456`

期望：页面显示当前用户信息（来自 `GET /me`）；点击登出后会话失效，刷新页面不再处于登录态。
