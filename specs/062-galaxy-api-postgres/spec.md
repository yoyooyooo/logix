# Feature Specification: logix-galaxy-api（PostgreSQL 接口服务样例）

**Feature Branch**: `[062-galaxy-api-postgres]`  
**Created**: 2025-12-30  
**Status**: Draft  
**Input**: User description: "在 apps/logix-galaxy-api 下面创建以 postgresql 为数据库的接口服务，我已创建服务，端口 7001 ，然后打个样，能做好自动化测试"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 启动服务并健康检查 (Priority: P1)

作为本仓库的开发者/贡献者，我希望能在本地启动 `apps/logix-galaxy-api` 下的接口服务，并通过健康检查快速确认：服务本身可用、以及数据库连通性状态。

**Why this priority**: 这是后端示例服务最小可验证闭环（启动 → 请求 → 响应），也是后续数据库样例与自动化测试的前置条件。

**Independent Test**: 仅实现健康检查即可独立验证：启动服务后访问 `/health` 能得到明确的 `ok/db` 状态（不依赖数据库）。

**Acceptance Scenarios**:

1. **Given** 服务已启动且未配置数据库连接，**When** 请求 `GET /health`，**Then** 返回 `200` 且响应体包含 `{ ok: true, db: "disabled" }`。
2. **Given** 服务已启动且数据库连接可用，**When** 请求 `GET /health`，**Then** 返回 `200` 且响应体包含 `{ ok: true, db: "ok" }`。
3. **Given** 服务已启动且数据库连接配置存在但数据库不可达，**When** 请求 `GET /health`，**Then** 返回 `200` 且响应体包含 `{ ok: false, db: "down" }`。
4. **Given** 服务已启动，**When** 请求 `GET /health/:probe`（其中 `:probe` 是可解析为整数的路径参数），**Then** 返回 `200` 且响应体包含 `probe: <number>`（与请求一致）。

---

### User Story 2 - Todo CRUD 数据库样例链路 (Priority: P2)

作为开发者/贡献者，我希望在配置 PostgreSQL 后，可以通过一组最小的 Todo CRUD 接口验证“请求 → 持久化 → 再读出”的完整链路，以便后续在此基础上扩展更多业务接口。

**Why this priority**: “打个样”的价值在于提供可复用的端到端模式；CRUD 足够小且覆盖常见读写形态。

**Independent Test**: 仅实现 Todo CRUD 即可独立验证：通过 HTTP 调用完成 create/list/get/update/delete，并校验状态码与返回结构。

**Acceptance Scenarios**:

1. **Given** 已配置可用的 PostgreSQL 连接，**When** `POST /todos` 提交 `{ "title": "a" }`，**Then** 返回 `201` 且返回 Todo（含 `id/title/completed/createdAt`）。
2. **Given** 已创建至少一个 Todo，**When** 请求 `GET /todos`，**Then** 返回 `200` 且返回 Todo 数组（包含已创建 Todo）。
3. **Given** 已创建 Todo `id = X`，**When** 请求 `GET /todos/X`，**Then** 返回 `200` 且返回该 Todo。
4. **Given** 已创建 Todo `id = X`，**When** `PATCH /todos/X` 提交 `{ "completed": true }`，**Then** 返回 `200` 且该 Todo 的 `completed` 更新为 `true`。
5. **Given** 已创建 Todo `id = X`，**When** 请求 `DELETE /todos/X`，**Then** 返回 `204` 且后续 `GET /todos/X` 返回 `404`。
6. **Given** 访问不存在的 Todo `id`，**When** 请求 `GET /todos/:id`，**Then** 返回 `404` 且错误体包含 `{ _tag: "NotFoundError", message: <string> }`。

---

### User Story 3 - 一键自动化测试（可在无数据库环境下运行） (Priority: P3)

作为贡献者，我希望在不依赖本机 PostgreSQL 的情况下，通过一键自动化测试验证健康检查与 Todo CRUD 的主要行为，从而保证示例服务可长期演进且易回归。

**Why this priority**: 示例服务的“可维护性”来自自动化测试；同时要求在无数据库环境下可运行，才能在 CI/新机器上稳定回归。

**Independent Test**: 仅提供测试（不启动真实服务进程）即可验证：用内存实现/替身替代持久化层，运行测试断言 HTTP handler 行为。

**Acceptance Scenarios**:

1. **Given** 未配置数据库连接，**When** 运行自动化测试，**Then** 所有测试通过且不要求本机存在 PostgreSQL。
2. **Given** 未配置数据库连接，**When** 自动化测试覆盖 `GET /health`，**Then** 断言响应为 `200` 且 `db = "disabled"`。
3. **Given** 使用可替换的 TodoRepo（内存实现/替身），**When** 自动化测试覆盖 Todo CRUD，**Then** 断言 create/list/get/update/delete 与 `404` 行为符合 User Story 2 的验收场景。

---

### Edge Cases

- 数据库连接未配置时：除 `/health` 外，任何需要数据库的接口都应返回 `503`，且错误体必须包含 `{ _tag: "ServiceUnavailableError", message: <string> }`。
- 数据库不可达时：需要数据库的接口返回 `503`，且错误信息不应泄露连接字符串/用户名/密码等敏感信息。
- 路径参数 `:id`/`:probe` 无法解析为整数时：返回 `400`（或等价的客户端错误），并提供可读的错误信息。
- `PATCH /todos/:id` 提交空对象时：不应清空字段，且返回结果应与原 Todo 保持一致。
- `POST /todos` 缺少必填字段（例如缺少 `title`）时：返回 `400`（或等价的客户端错误）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供一个位于 `apps/logix-galaxy-api` 的最小后端接口服务，用于演示“接口 + PostgreSQL”的最小可跑闭环。
- **FR-002**: 系统 MUST 默认监听端口 `7001`，并支持通过环境变量覆盖监听端口（例如 `PORT`）。
- **FR-003**: 系统 MUST 提供健康检查接口 `GET /health`，返回 `200` 且响应体至少包含 `ok: boolean` 与 `db: "ok" | "disabled" | "down"`。
- **FR-004**: 当未配置数据库连接时，系统 MUST 仍可提供 `GET /health`，并返回 `db = "disabled"` 且 `ok = true`。
- **FR-005**: 当已配置数据库连接且数据库可达时，系统 MUST 在 `GET /health` 返回 `db = "ok"` 且 `ok = true`。
- **FR-006**: 当已配置数据库连接但数据库不可达/查询失败时，系统 MUST 在 `GET /health` 返回 `db = "down"` 且 `ok = false`。
- **FR-007**: 系统 MUST 提供 `GET /health/:probe`，并保证 `:probe` 可解析为整数并在响应中回显为 `probe: number`。
- **FR-008**: 系统 MUST 提供 Todo CRUD 接口：`POST /todos`、`GET /todos`、`GET /todos/:id`、`PATCH /todos/:id`、`DELETE /todos/:id`，并满足 User Story 2 的状态码与响应结构约束。
- **FR-009**: 系统 MUST 在 Todo 不存在时返回 `404` 且错误体为 `{ _tag: "NotFoundError", message: string }`。
- **FR-010**: 当数据库连接未配置或数据库不可达时，所有需要数据库的接口（如 Todo CRUD） MUST 返回 `503` 且错误体为 `{ _tag: "ServiceUnavailableError", message: string }`。
- **FR-011**: 系统 MUST 提供自动化测试覆盖至少：`GET /health`（含 `db = "disabled"`）与 Todo CRUD（含 `404`），并且测试 MUST 可在未配置数据库连接的环境中运行通过。

#### Assumptions & Dependencies

- 本特性目标是“后端示例服务打样”，默认不包含认证/鉴权、多租户、分页/排序等扩展能力。
- 持久化数据库约束为 PostgreSQL；数据库连接信息通过环境变量提供（命名由实现决定，但需支持缺省未配置场景）。
- Todo 数据模型为示例用途：字段至少包含 `id/title/completed/createdAt`（`createdAt` 为可序列化字符串）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统 MUST 提供最小可用的诊断信息：启动时输出监听地址/端口；每个请求至少能观测到请求路径与响应状态（便于本地排错）。
- **NFR-002**: 系统 MUST 返回结构化错误对象（包含 `_tag` 与 `message`），并 MUST 避免在错误信息中泄露数据库连接字符串、用户名、密码等敏感信息。
- **NFR-003**: 自动化测试 MUST 具备确定性（不依赖时间/随机数导致的脆弱断言），并应在常规开发机/CI 上在合理时间内完成。
- **NFR-004**: 运行时配置（端口、数据库连接） MUST 通过环境变量或等价机制注入，且在未配置时有清晰的可观测退化行为（disabled）。

### Key Entities _(include if feature involves data)_

- **Todo**: 用于演示持久化读写的最小实体；关键字段：`id`（数字标识）、`title`（标题）、`completed`（是否完成）、`createdAt`（创建时间字符串）。
- **HealthStatus**: 健康检查响应对象；字段：`ok`（服务是否认为自身健康）、`db`（数据库状态：ok/disabled/down），以及可选的 `probe`（路径参数回显）。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 使用默认端口启动服务后，`GET /health` 返回 `200`，且响应体满足 `ok/db` 约束（覆盖 FR-003~FR-006）。
- **SC-002**: 未配置数据库连接时，`GET /health` 返回 `{ ok: true, db: "disabled" }`，且 Todo CRUD 相关接口返回 `503`（覆盖 FR-004、FR-010）。
- **SC-003**: 配置可用 PostgreSQL 后，可通过 Todo CRUD 接口完成 create/list/get/update/delete 全链路，且状态码与响应体满足 FR-008~FR-010。
- **SC-004**: 自动化测试在未配置数据库连接的环境中可一键运行并全部通过（覆盖 FR-011）。
- **SC-005**: 错误响应体始终包含 `_tag` 与 `message`，并且不包含数据库连接字符串/凭据等敏感信息（覆盖 NFR-002）。
- **SC-006**: 启动与请求日志足以在本地复现并定位常见问题（端口冲突、数据库未配置/不可达、404 等）（覆盖 NFR-001）。
