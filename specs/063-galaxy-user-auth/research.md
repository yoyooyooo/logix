# Research: 063 logix-galaxy-api 登录与用户模块

**Feature**: `specs/063-galaxy-user-auth/spec.md`  
**Date**: 2025-12-30

## Decision 1：BetterAuth-first（用现成能力替代自研安全内核）

- **Decision**：使用 BetterAuth 作为身份与会话系统的主实现（Email&Password + Session），本服务仅提供“对外 API 契约”的适配层（`/auth/login`、`/me`、`/users/*` 等），并通过 Effect Tag/Layer 抽象，保留未来替换/扩展空间。
- **Rationale**：
  - 更快获得“正确的默认安全语义”（密码哈希、会话生命周期、常见边界与插件生态），避免把示例服务变成自研 IAM。
  - 前端团队可按需学习 BetterAuth（理念/插件/Client），但业务仍依赖我们自己的 API 契约，降低耦合。
- **Alternatives considered**：
  - 完全自研（password hash + session store + admin 管理）：学习价值高但安全与维护成本更大，且容易偏离主目标。

## Decision 2：认证传输口径（Bearer token）

- **Decision**：启用 BetterAuth 的 `bearer` 插件，使会话 token 可用 `Authorization: Bearer <token>` 传递；`POST /auth/login` 会从 BetterAuth 返回头 `set-auth-token` 读取 token，并在响应体返回 `token/expiresAt`（与 OpenAPI 契约对齐）。
- **Rationale**：
  - 对“纯 API 调用方 / 测试脚本 / 非同域”更直观，且不依赖浏览器 cookie 策略。
  - 仍保留未来改回 cookie-first 的空间（不改变对外契约即可内部替换）。

## Decision 3：管理员用户管理用 BetterAuth Admin 插件承载

- **Decision**：启用 BetterAuth 的 `admin` 插件，用其提供的能力完成：
  - 管理员创建用户
  - 设置角色（`admin` / `user`）
  - 禁用/启用用户（映射到 API 的 `status=disabled/active`）
  - 管理员重置用户密码（`set-user-password`）
- **Rationale**：
  - 直接覆盖本特性 P2 的核心能力（用户生命周期），且避免自研“重置密码/禁用语义”的安全坑。
  - 未来接企业 SSO 时仍可复用：用户来源变了，但用户管理入口可保持一致。

## Decision 4：未来 SSO（Casdoor）路径：优先“仍用 BetterAuth”，而不是替换

- **Decision**：为未来企业 SSO 预留两条路径：
  1) **优先路径**：通过 BetterAuth 的 `genericOAuth` 插件接入 OIDC（Casdoor 属于典型 OIDC 场景），在不替换 BetterAuth 的前提下实现 “SSO + 本地账号并存”；  
  2) 备选路径：若未来需要完全替换 BetterAuth，则保持 app 内的 `AuthService` Tag 接口不变，新增 `CasdoorAuthServiceLive` 作为可替换实现。
- **Rationale**：
  - “先快起来 + 以后好切换”：更可能的现实是“继续用 BetterAuth 叠加 OIDC”，而不是完全替换；但架构上仍留出替换口。

## Decision 5：登录失败防暴力破解（服务层内存限速 + 可升级）

- **Decision**：对 `POST /auth/login` 在服务层按 `identifier(email)` 与 `ip` 做基础限速/短时冻结；阈值与窗口通过环境变量配置；触发返回 `429 TooManyRequestsError`。
- **Rationale**：
  - 满足 NFR-002；不引入额外表与写放大；示例服务单进程足够。
  - 后续若多实例/高并发，可升级为 Redis（可借助 BetterAuth 的 `secondaryStorage` 或另起 spec）。

## Decision 6：审计事件结构化落库，失败不阻断主流程

- **Decision**：关键动作写入 `public.auth_events`（含 `event_type`、actor/subject、identifier、ip/user_agent、detail jsonb）；审计写入失败时不阻断主流程，但必须有可观测信号用于排错。
- **Rationale**：
  - 满足 FR-009/NFR-004 的可诊断性要求。
  - 将审计与业务结果解耦，避免“审计不可用导致业务不可用”的耦合风险。

## Open Questions（当前无阻塞项）

- 是否需要把 BetterAuth 的 `/api/auth/*` 原生路由也暴露出来供前端直接使用（学习/对比方便），还是仅保留我们自己的 `/auth/*` 契约端点（更收敛）。当前默认仅实现后者。
