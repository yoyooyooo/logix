# Implementation Plan: 066 logix-galaxy 项目管理与 RBAC（成员/角色/权限/成员组）

**Branch**: `066-galaxy-project-rbac` | **Date**: 2025-12-31 | **Spec**: `specs/066-galaxy-project-rbac/spec.md`  
**Input**: Feature specification from `specs/066-galaxy-project-rbac/spec.md`

## Summary

目标：在 `apps/logix-galaxy-api` 与 `apps/logix-galaxy-fe` 中落地 Project Governance 的最小闭环（Project + 成员 + 角色 + 成员组），并通过真实网络边界联调验证：登录 → 创建项目 → 添加成员 → 成员按权限访问/被拒绝；同时固化 PostgreSQL 数据模型与 OpenAPI 契约，避免实现漂移。

## Deepening Notes

- Decision: Project 名称在“同一创建者”范围内以 `lower(trim(name))` 唯一；成员组名称在“同一项目”范围内以 `lower(trim(name))` 唯一 (source: spec clarify AUTO)
- Decision: 引入稳定 `permissionKey` 集合，并固定角色→权限映射（viewer/member/admin/owner 逐级超集） (source: spec clarify AUTO)
- Decision: 添加项目成员使用 email（case-insensitive + trim），用户不存在返回 `404` (source: spec clarify AUTO)
- Decision: 仅允许“已是项目成员”的用户加入该项目成员组；否则 `409` (source: spec clarify AUTO)
- Decision: `401/403` 口径统一：未登录/会话无效 `401`；已登录但权限不足 `403` (source: spec clarify AUTO)
- Decision: owner.manage 仅 Owner 拥有；Owner 角色授予/撤销与所有权转移均由 owner.manage 管控 (source: spec clarify AUTO)
- Decision: `effectiveRoleKeys/effectivePermissionKeys` 返回顺序稳定可测（角色按优先级、权限按字典序） (source: spec clarify AUTO)
- Decision: 重复添加成员/重复加入成员组统一返回 `409`，不做 silent no-op (source: spec clarify AUTO)

本仓运行约定（联调一致性优先）：

- 后端端口默认 `5500`（避免占用本机数据库端口）。
- 前端通过 Vite dev proxy 访问后端（默认 target `http://127.0.0.1:5500`，可用 `GALAXY_API_PROXY_TARGET` 覆盖）。
- 本地开发环境变量使用 `.env.local`（仅本地用，已 gitignore），包含 `DATABASE_URL`/`BETTER_AUTH_*` 等。
- 本特性业务表默认随服务启动自动创建（幂等），可用 `LOGIX_GALAXY_AUTO_MIGRATE_PROJECT_RBAC='0'` 关闭。

关键裁决（避免实现漂移）：

1. **安全边界**：授权以后端为准；前端路由裁剪仅改善体验，不承担安全责任。
2. **权限模型**：项目域 RBAC（`owner/admin/member/viewer`）+ 成员组绑定角色；有效权限为“直接角色 ∪ 组角色”。
3. **数据模型**：以 `specs/066-galaxy-project-rbac/data-model.md` 为单一事实源；表/索引/约束遵循 `$postgresql-table-design`。
4. **契约优先**：对外 API 以 OpenAPI 3.1 固化在 `specs/066-galaxy-project-rbac/contracts/openapi.yaml`，实现必须对齐错误形状与状态码口径。
5. **前端 dogfooding Logix**：新增的项目/成员/组页面与请求流程由 Logix 承载（状态/请求/错误/权限），不再继续扩展“React useState + 手写 fetch”模式。
6. **确定性**：对外返回中的权限/角色数组必须按稳定顺序输出，便于测试、diff 与缓存策略。

## Existing Foundations（直接复用）

- `apps/logix-galaxy-api/src/main.ts`：Node server + Layer wiring。
- `apps/logix-galaxy-api/src/app/effect-api.ts`：HttpApi 聚合入口（新增 ProjectGroup/RbacGroup）。
- `apps/logix-galaxy-api/src/auth/*`：登录与鉴权能力（作为本特性前置依赖）。
- `apps/logix-galaxy-fe/src/galaxy-api/*`：前端最小 fetch client + token 存储（会被 Logix 化，但可复用协议与错误口径）。
- `apps/logix-galaxy-fe/vite.config.ts`：dev proxy（联调避免浏览器 CORS）。

## Technical Context

**Language/Version**: TypeScript（ESM）  
**Primary Dependencies**: pnpm workspace、`effect` v3、`@effect/platform(-node)`、`@effect/sql-pg`、`better-auth`（身份来源）、React 19、`react-router-dom`、`@logixjs/*`  
**Storage**: PostgreSQL（`DATABASE_URL` 注入；BetterAuth 表在 schema `auth`，业务表在 `public`）  
**Testing**: Vitest（以 handler-level tests 为主，通过 Layer 注入替身 Repo/Service）  
**Target Platform**: Node.js 20+ + 现代浏览器（Vite dev）  
**Constraints**:

- 错误体必须结构化且稳定（`{ _tag, message }`），并对 `401/403/409/400/404` 给出一致语义。
- 关键治理操作必须记录审计事件（项目/成员/组/角色变更）。
- 对外返回 `effectiveRoleKeys/effectivePermissionKeys` 必须稳定排序（见 `spec.md` 的 Clarifications）。
- 不引入 Org/Tenant；先把“项目域”闭环跑通。

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate Mapping（逐条对齐宪章）

- **Intent → Flow/Logix → Code → Runtime**：本特性属于 Galaxy 示例应用层（HTTP + PostgreSQL + FE 页面），用于把“治理层/协作权限”跑通到可联调闭环；不改变 Logix Runtime 核心语义，但前端必须以 Logix 方式组织状态与副作用。
- **docs-first & SSoT**：事实源以 `specs/066-galaxy-project-rbac/*` 为主：`spec.md`（验收）、`data-model.md`（DDL/存储口径）、`contracts/openapi.yaml`（接口契约）、`quickstart.md`（验收路径）。
- **Performance budget**：N/A（不触及 Logix Runtime 核心路径或对外性能边界）；但避免无界列表/无界审计写入导致不可控成本。
- **Breaking changes**：属于增量能力；如调整 FE 现有联调页面的组织方式，以“向前兼容”策略直接迁移到新路由/模块结构，不保留兼容层。
- **Quality gates**：实现完成前必须通过：
  - `pnpm -C apps/logix-galaxy-api typecheck`
  - `pnpm -C apps/logix-galaxy-api test`
  - `pnpm -C apps/logix-galaxy-fe typecheck`

### Gate Result

PASS（不改 runtime 核心路径；以契约/DDL 固化对外口径）

## Perf Evidence Plan（MUST）

N/A（不触及 Logix Runtime 核心路径或对外性能边界）

## Project Structure

### Documentation (this feature)

```text
specs/066-galaxy-project-rbac/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/logix-galaxy-api/
└── src/
    ├── app/
    │   └── effect-api.ts                 # 增加 ProjectGroup
    ├── project/
    │   ├── project.contract.ts           # Schema + HttpApiGroup（Project）
    │   ├── project.http.live.ts          # handlers（Project）
    │   ├── project.http.test.ts          # handler-level tests
    │   ├── project.repo.ts               # Repo Tag（抽象）
    │   ├── project.repo.live.ts          # Repo Live（PostgreSQL）
    │   ├── project.schema.live.ts        # DDL init（create table/index if not exists）
    │   ├── project.rbac.ts               # roles → permissions（纯函数/常量）
    │   ├── project-audit.repo.ts         # 审计 Repo Tag
    │   └── project-audit.repo.live.ts    # 审计 Repo Live（PostgreSQL）

apps/logix-galaxy-fe/
└── src/
    ├── galaxy-api/                       # 扩展 client：projects/members/groups
    ├── routes/                           # react-router 路由与页面壳
    └── galaxy/                           # Logix Modules（auth + project governance）
```

## Phase 0: Research（本特性）

- 关键裁决与取舍：`specs/066-galaxy-project-rbac/research.md`

## Phase 1: Design & Contracts（本特性）

- 数据模型与 PostgreSQL 口径：`specs/066-galaxy-project-rbac/data-model.md`（已落盘）
- HTTP API 契约（OpenAPI 3.1）：`specs/066-galaxy-project-rbac/contracts/openapi.yaml`（本轮补齐）
- 验收路径：`specs/066-galaxy-project-rbac/quickstart.md`（本轮补齐）

## Phase 2: Frontend Integration（联调闭环）

- `apps/logix-galaxy-fe` 增加 Projects/Project Detail/Members/Groups 等路由与页面壳（样式仅轻量布局）。
- 前端通过 Logix Modules 承载：
  - 会话态（token、me、未登录/无权限/加载/失败）
  - Projects 列表与创建
  - Project members 与 roles（含基于有效权限的能力裁剪）
  - Groups 与 group members（以及 group role 变更）
- 开发环境默认启用 Logix Devtools（Runtime `devtools: true` + `<LogixDevtools />`），便于调试 Timeline/权限计算/审计事件。
- 默认使用 Vite dev proxy（`/api` → `http://127.0.0.1:5500`）以避免浏览器 CORS；后端地址变化用 `GALAXY_API_PROXY_TARGET` 覆盖。
