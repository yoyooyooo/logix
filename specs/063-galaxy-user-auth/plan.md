# Implementation Plan: 063 logix-galaxy-api 登录与用户模块（BetterAuth-first）

**Branch**: `063-galaxy-user-auth` | **Date**: 2025-12-30 | **Spec**: `specs/063-galaxy-user-auth/spec.md`  
**Input**: Feature specification from `specs/063-galaxy-user-auth/spec.md`

## Summary

目标：在现有 `apps/logix-galaxy-api` 示例服务基础上新增“登录 + 用户模块”，并以 **BetterAuth-first** 的方式落地最小闭环，同时用 Effect Tag/Layer 做解耦，便于未来扩展到 “SSO（Casdoor）+ 本地账号并存”。

同时，为了把接口契约跑通到 UI 调用方，补充 `apps/logix-galaxy-fe` 的最小联调闭环：在前端用 `POST /auth/login` 获取 token，通过 `Authorization: Bearer <token>` 调用 `GET /me`，并支持 `POST /auth/logout`。

本仓运行约定（联调一致性优先）：

- 后端端口默认 `5500`（`7001` 留给本机数据库）。
- 本地开发推荐在 `apps/logix-galaxy-api/.env.local` 里维护 `DATABASE_URL`/`BETTER_AUTH_*` 等环境变量（仅本地用，已被 gitignore）。

本特性对外契约（保持我们自己的 API 口径）：

- **登录闭环**：`POST /auth/login` → `GET /me` → `POST /auth/logout`（会话立刻失效）。
- **用户管理（管理员）**：创建/查询/更新展示名、禁用/启用、重置密码。
- **审计事件**：记录登录成功/失败、登出、用户创建、禁用/启用、密码重置，并可按时间与用户维度查询：`GET /auth/events`。
- **默认测试不依赖 PostgreSQL**：通过替身 `AuthService`/Repo 覆盖核心语义，保证在 CI/新机器上稳定回归。

关键裁决（避免实现漂移）：

1. **身份与会话**：使用 BetterAuth（Email&Password + Session），并启用 `bearer` 插件以支持 `Authorization: Bearer <token>`。
2. **管理员能力**：使用 BetterAuth `admin` 插件承载用户创建/角色/禁用/重置密码等能力；我们仅在外层适配错误形状与字段口径。
3. **未来 SSO**：优先通过 BetterAuth `genericOAuth` 插件接入 OIDC（Casdoor）；同时保留 “替换 AuthService 实现” 的架构出口。
4. **审计事件**：由本服务自维护 `public.auth_events` 表；写入失败不阻断主流程，但必须可观测。
5. **暴力破解防护**：对 `POST /auth/login` 做基础限速/冻结（内存实现，可配置，可升级）。

## Existing Foundations（直接复用）

- 示例服务骨架：`apps/logix-galaxy-api/src/main.ts`（`HttpApiBuilder.serve(HttpMiddleware.logger)` + Layer wiring + Node server）。
- API 契约组装：`apps/logix-galaxy-api/src/app/effect-api.ts`（`HttpApi.make(...).add(...)`）。
- 测试口径：`HttpApiBuilder.toWebHandler(...)` + 通过 Layer 注入替身 Service/Repo（见 `apps/logix-galaxy-api/src/todo/todo.http.test.ts`）。

## Technical Context

**Language/Version**: TypeScript（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@effect/platform`、`@effect/platform-node`、`better-auth`、`pg`  
**Storage**: PostgreSQL（`DATABASE_URL` 注入；BetterAuth 建议落在 schema `auth`）  
**Testing**: Vitest（`vitest run`；以 handler 级测试为主）  
**Target Platform**: Node.js 20+（与现有 app 运行方式一致）  
**Constraints**:

- 安全：响应/日志不得泄露 password/hash/token/连接字符串等敏感信息。
- 会话语义：过期/登出/禁用/重置密码后，会话必须在一次请求内失效（对外观察）。
- 唯一性：email 视为大小写不敏感（应用层归一化 + DB 唯一性约束）。
- 可诊断：审计事件结构化、可序列化、字段固定；审计失败不误判主流程失败。
- 可回归：自动化测试默认不依赖 PostgreSQL；时间相关断言必须确定性。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate Mapping（逐条对齐宪章）

- **Intent → Flow/Logix → Code → Runtime**：本特性属于业务样例服务层（HTTP + PostgreSQL + Auth），用于验证契约与可回归形态；不改变 Logix Runtime/Flow 语义。
- **docs-first & SSoT**：事实源以 `specs/063-galaxy-user-auth/*` 为主：`spec.md`（验收）、`data-model.md`（DDL/存储口径）、`contracts/openapi.yaml`（接口契约）、`quickstart.md`（验收路径）。
- **Effect contracts**：服务实现通过 Tag/Layer 注入（`AuthService`、`AuthEventRepo`），测试用替身实现替换，无进程级全局单例。
- **Performance budget**：N/A（示例服务，不触及 Logix Runtime 核心路径）；但避免引入无界缓存/无界日志事件。
- **Diagnosability**：新增审计事件与稳定错误 `_tag/message`；确保审计失败不影响主流程但可观测。
- **Breaking changes**：新增 API group（Auth/User）属于增量变更；不引入兼容层与 deprecation 逻辑。
- **Quality gates**：实现完成前必须通过：
  - `pnpm -C apps/logix-galaxy-api typecheck`
  - `pnpm -C apps/logix-galaxy-api test`
  - `pnpm -C apps/logix-galaxy-fe typecheck`

### Gate Result

PASS（不触及 runtime 核心路径；契约/DDL/测试口径已固化）

## Perf Evidence Plan（MUST）

N/A（不触及 Logix Runtime 核心路径或对外性能边界）

## Project Structure

### Documentation (this feature)

```text
specs/063-galaxy-user-auth/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
apps/logix-galaxy-api/
├── auth.ts                           # BetterAuth CLI config（仅供 CLI；runtime 不依赖）
├── scripts/
│   ├── init-auth-schema.ts           # 创建 auth schema（幂等）
│   └── seed-admin.ts                 # 创建/修复 admin 用户（幂等）
└── src/
    ├── app/
    │   └── effect-api.ts             # 增加 AuthGroup + UserGroup
    ├── auth/
    │   ├── auth.contract.ts          # Schema + HttpApiGroup（Auth）
    │   ├── auth.http.live.ts         # handlers（Auth）
    │   ├── auth.http.test.ts         # handler-level tests
    │   ├── auth.rate-limit.ts        # 登录限速/冻结
    │   ├── auth.service.ts           # AuthService Tag（抽象）
    │   ├── auth.service.live.ts      # BetterAuth 实现（Live）
    │   ├── better-auth.ts            # makeBetterAuth（纯函数，不读 env）
    │   ├── auth-event.repo.ts        # 审计事件 Repo Tag
    │   └── auth-event.repo.live.ts   # 审计事件 Repo Live（PostgreSQL）
    ├── user/
        ├── user.contract.ts          # Schema + HttpApiGroup（User）
        ├── user.http.live.ts         # handlers（User）
        └── user.http.test.ts         # handler-level tests

    └── test/
        └── auth-harness.ts           # 测试用 Auth/AuthEventRepo 替身

apps/logix-galaxy-fe/
└── src/
    ├── galaxy-api/                   # 最小 fetch client + token 存储 + 领域 DTO（前端联调）
    └── App.tsx                       # 登录/登出/当前用户（联调 UI）
```

## Phase 0: Research（已落盘）

- 结论与取舍见：`specs/063-galaxy-user-auth/research.md`

## Phase 1: Design & Contracts（已落盘）

- 数据模型与 PostgreSQL 口径：`specs/063-galaxy-user-auth/data-model.md`
- HTTP API 契约（OpenAPI 3.1）：`specs/063-galaxy-user-auth/contracts/openapi.yaml`
- 验收路径：`specs/063-galaxy-user-auth/quickstart.md`

## Phase 2: Frontend Integration（联调落盘）

- `apps/logix-galaxy-fe` 提供最小联调页面：登录（email/password）→ 展示 `GET /me` 返回的 user → 登出。
- 默认使用 Vite dev proxy（`/api` → `http://127.0.0.1:5500`）避免浏览器 CORS；如后端地址变化，通过 `GALAXY_API_PROXY_TARGET` 覆盖 proxy target。
