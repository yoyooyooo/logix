# Feature Specification: logix-galaxy-api 登录与用户模块

**Feature Branch**: `[063-galaxy-user-auth]`  
**Created**: 2025-12-30  
**Status**: Draft  
**Input**: User description: "给 apps/logix-galaxy-api 加个登录和用户模块，用 $postgresql-table-design 设计表结构"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 登录并访问受保护接口 (Priority: P1)

作为 `apps/logix-galaxy-api` 的调用方（开发者/集成方），我希望能通过“账号（email）+ 密码”登录拿到会话凭据，并在后续请求中用该凭据访问受保护接口（如“获取当前用户信息”），从而形成最小可验证闭环：创建账号 → 登录 → 访问 → 登出。

**Why this priority**: 登录是用户模块的入口能力；没有可用的登录闭环，其它用户管理与后续业务接口都无法被可靠验证。

**Independent Test**: 仅实现“登录 + 获取当前用户 + 登出”即可独立验证：对一个已存在的用户完成登录，并能在一次会话内成功访问 `GET /me`，登出后再次访问被拒绝。

**Acceptance Scenarios**:

1. **Given** 已存在一个状态为 `active` 的用户（email+password），**When** 调用 `POST /auth/login` 提交正确凭据，**Then** 返回 `200` 且返回体包含用户信息与会话凭据（不包含任何敏感字段）。
2. **Given** 用户存在但密码错误，**When** 调用 `POST /auth/login`，**Then** 返回 `401` 且错误体为 `{ _tag: "UnauthorizedError", message: <string> }`，并且错误信息不区分“用户不存在/密码错误”。
3. **Given** 用户状态为 `disabled`，**When** 调用 `POST /auth/login`，**Then** 返回 `403` 且错误体为 `{ _tag: "ForbiddenError", message: <string> }`。
4. **Given** 已登录且会话有效，**When** 调用 `GET /me`，**Then** 返回 `200` 且返回体为当前用户信息（与登录时一致，不包含敏感字段）。
5. **Given** 未登录或会话已过期/被撤销，**When** 调用 `GET /me`，**Then** 返回 `401` 且错误体为 `{ _tag: "UnauthorizedError", message: <string> }`。
6. **Given** 已登录且会话有效，**When** 调用 `POST /auth/logout`，**Then** 返回 `204` 且该会话立即失效（之后 `GET /me` 返回 `401`）。

---

### User Story 2 - 管理员管理用户（创建/查询/更新/禁用/重置密码） (Priority: P2)

作为管理员，我希望能对系统内用户进行基础管理：创建账号、查看/查询用户、更新用户资料、禁用/启用账号、重置密码，以便在后续业务接口出现前先把“账号生命周期”打通并可回归。

**Why this priority**: 用户模块不只是登录，还需要账号生命周期管理；否则只能依赖手工写库/改库，不利于长期演进与测试。

**Independent Test**: 仅实现“创建用户 + 禁用用户 + 重置密码”即可独立验证：管理员创建一个新用户，新用户能登录；管理员禁用后登录被拒绝；管理员重置密码后可用新密码登录。

**Acceptance Scenarios**:

1. **Given** 管理员已登录，**When** 调用 `POST /users` 创建用户（至少包含 `email/displayName/password`），**Then** 返回 `201` 且返回体为新用户信息（不包含敏感字段）。
2. **Given** 已存在用户 email = `alice@example.com`，**When** 以 `Alice@Example.com` 再次创建，**Then** 返回 `409` 且错误体为 `{ _tag: "ConflictError", message: <string> }`。
3. **Given** 管理员已登录且用户存在，**When** 调用 `PATCH /users/:id` 更新 `displayName`，**Then** 返回 `200` 且变更生效。
4. **Given** 管理员已登录且用户存在，**When** 调用 `POST /users/:id/disable` 禁用该用户，**Then** 返回 `204` 且该用户后续 `POST /auth/login` 返回 `403`，并且该用户已有会话在一次请求内失效（`GET /me` 返回 `401`）。
5. **Given** 管理员已登录且用户存在，**When** 调用 `POST /users/:id/reset-password` 重置密码，**Then** 返回 `204` 且旧密码登录失败、新密码登录成功。
6. **Given** 普通用户已登录，**When** 访问任意用户管理接口（如 `POST /users`），**Then** 返回 `403` 且错误体为 `{ _tag: "ForbiddenError", message: <string> }`。

---

### User Story 3 - 自动化测试与安全审计可回归 (Priority: P3)

作为本仓库的贡献者，我希望通过一键自动化测试验证登录/用户管理的核心行为，并且系统能记录关键安全审计事件（登录成功/失败、登出、账号禁用/启用、密码重置），以便后续扩展更多业务接口时仍能持续回归。

**Why this priority**: “可维护性”来自自动化测试与可诊断性；安全相关能力如果没有可回归与可解释链路，后续很难安全演进。

**Independent Test**: 仅提供测试（不依赖真实 PostgreSQL）即可独立验证：用可替换 Repo（内存实现/替身）驱动 HTTP handlers，断言状态码、返回形状与审计事件的产生。

**Acceptance Scenarios**:

1. **Given** 未配置数据库连接或不提供真实 PostgreSQL，**When** 运行自动化测试，**Then** 所有测试通过且不要求本机存在 PostgreSQL。
2. **Given** 完成一次登录成功与一次登录失败，**When** 查询审计事件，**Then** 至少能看到对应的事件记录，且事件可关联到用户（或输入标识）与时间。
3. **Given** 任意失败场景（401/403/409/400/404），**When** 读取响应体，**Then** 均为结构化错误 `{ _tag, message }` 且不包含敏感信息（password/hash/token）。

---

### Edge Cases

- email 输入包含前后空白或大小写变化：系统应在验证与唯一性判断时做一致处理（行为对用户可解释）。
- 密码不满足最小策略（例如长度不足）：返回 `400`（或等价客户端错误）且给出可读错误信息。
- 登录失败次数过多：系统应对暴力破解提供基础防护（限速/短时冻结），并对用户返回可理解的提示（例如“稍后再试”）。
- 会话过期/撤销：访问受保护接口返回 `401`，且不得误报为 `404` 或 `500`。
- 禁用用户：既要阻止再次登录，也要使已有会话在一次请求内失效。
- 日志与错误信息：不得泄露密码明文、密码哈希、会话令牌、重置令牌、数据库连接字符串等敏感信息。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统 MUST 在 `apps/logix-galaxy-api` 提供“账号（email）+ 密码”的登录能力，并能为后续受保护接口建立可验证的会话。
- **FR-002**: 系统 MUST 在登录成功时创建会话，并向调用方返回可用于后续请求的会话凭据（不要求调用方理解其内部结构）。
- **FR-003**: 系统 MUST 提供获取当前会话用户信息的接口（例如 `GET /me`），并保证响应不包含任何敏感字段（password/hash/token）。
- **FR-004**: 系统 MUST 提供登出能力，使当前会话立即失效（例如 `POST /auth/logout` 返回 `204`）。
- **FR-005**: 系统 MUST 提供用户管理能力：创建用户、查询用户、更新基础资料、禁用/启用账号、重置密码。
- **FR-006**: 系统 MUST 至少区分两类权限：管理员与普通用户；普通用户 MUST 无法访问用户管理接口。
- **FR-007**: 系统 MUST 将用户 email 视为大小写不敏感，并在持久化层强制唯一性（`Alice@x.com` 与 `alice@x.com` 视为同一账号）。
- **FR-008**: 系统 MUST 以结构化错误返回失败原因（至少包含 `_tag` 与 `message`），并为常见错误提供稳定 `_tag`：`UnauthorizedError`、`ForbiddenError`、`ConflictError`、`ValidationError`、`NotFoundError`。
- **FR-009**: 系统 MUST 记录关键安全/审计事件，并支持按时间范围与用户维度查询：登录成功/失败、登出、用户创建、用户禁用/启用、密码重置。
- **FR-010**: 系统 MUST 在任何响应与日志中避免泄露敏感信息：密码明文、密码哈希、会话令牌、重置令牌、数据库连接字符串等。
- **FR-011**: 系统 MUST 提供自动化测试覆盖 User Story 1/2 的核心验收场景，且测试 MUST 可在无真实 PostgreSQL 的环境中运行通过（通过可替换 Repo/内存实现）。

#### Assumptions & Dependencies

- 本特性基于 `specs/062-galaxy-api-postgres` 提供的服务骨架与 PostgreSQL 接入能力（如已落地）；若尚未落地，实现阶段需先补齐其必要前置。
- 默认单租户；不包含 SSO/OAuth、多因素认证、邮箱验证/邀请流程等扩展能力。
- 默认账号标识为 email；默认密码最小策略：长度 ≥ 8（后续可加严）。
- 数据模型与 PostgreSQL 表结构见：`specs/063-galaxy-user-auth/data-model.md`。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 系统 MUST 绝不存储或传输密码明文；持久化层仅保存不可逆的密码哈希，并允许未来平滑升级哈希策略（不要求一次性强制全量用户重置）。
- **NFR-002**: 系统 MUST 对暴力破解提供基础防护：对同一账号标识或同一 IP 的连续失败登录进行限速/短时冻结（阈值与窗口可配置），并给出可理解的错误提示。
- **NFR-003**: 系统 MUST 明确会话有效期，并保证“过期/登出/禁用”能在一次请求内生效（后续请求被拒绝）。
- **NFR-004**: 审计事件 MUST 结构化、可序列化、字段固定；审计写入失败时不得导致登录/登出/用户管理的成功路径被误判为失败，但 MUST 有可观测信号用于排错。
- **NFR-005**: 自动化测试 MUST 具备确定性（不依赖不可控时间/随机数导致的脆弱断言），并应在常规开发机/CI 上在合理时间内完成。
- **NFR-006**: 系统 MUST 避免在任何日志/错误信息中泄露敏感信息（password/hash/token/连接字符串），并确保错误 `message` 对调用方可读。

### Key Entities _(include if feature involves data)_

- **User**: 用户账号；关键属性：`userId`、`email`、`displayName`、`status(active|disabled)`、`createdAt/updatedAt`、`lastLoginAt`。
- **Role**: 权限角色；用于区分管理员与普通用户（至少包含 `admin` 与 `user` 两类）。
- **UserSession**: 登录会话；关联 `userId`，具备明确的过期时间与撤销状态，用于保护后续接口访问。
- **AuthEvent**: 安全/审计事件；记录登录成功/失败、登出、用户创建、禁用/启用、密码重置等关键动作，并可按用户与时间查询。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 管理员可通过用户管理接口创建一个新用户，且该用户可在 2 分钟内完成首次登录并成功访问 `GET /me`（覆盖 User Story 1/2 的核心验收场景）。
- **SC-002**: 对同一 email（不区分大小写）重复创建用户必定失败，并返回稳定的冲突错误（例如 `409` + `ConflictError`），且不会产生重复账号（覆盖 FR-007、User Story 2）。
- **SC-003**: 暴力破解防护在阈值触发后生效：后续登录尝试被限速/短时冻结，并返回对用户可理解的提示（覆盖 NFR-002）。
- **SC-004**: 自动化测试在未配置 PostgreSQL 的环境中可一键运行并全部通过（覆盖 FR-011、User Story 3）。
- **SC-005**: 关键审计事件可被查询，且每条事件至少可关联到“用户或输入标识 + 时间 + 事件类型”（覆盖 FR-009、User Story 3）。
- **SC-006**: 任意错误响应与日志中不包含敏感字段（password/hash/token/连接字符串），且错误信息对调用方可读（覆盖 FR-010、NFR-006）。
