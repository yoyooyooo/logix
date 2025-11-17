# Feature Specification: logix-galaxy 项目管理与 RBAC（成员/角色/权限/成员组）

**Feature Branch**: `[066-galaxy-project-rbac]`  
**Created**: 2025-12-31  
**Status**: Draft  
**Input**: User description: "分析下 docs/specs/drafts/topics/sdd-platform/，平台侧现在还是想法阶段，但需要先做项目管理、成员管理、权限管理、成员组；继续推进后端 API + 表设计（用 $postgresql-table-design）；apps/logix-galaxy-fe 做对应页面并集成路由，和 API 联调跑通；前端必须 dogfooding Logix；样式只要轻量布局"

## Clarifications

### Session 2025-12-31

- AUTO: Q: 项目/成员组的名称唯一性如何定义？ → A: Project 名称在“同一创建者”范围内大小写不敏感唯一；成员组名称在“同一项目”范围内大小写不敏感唯一。
- AUTO: Q: Project/成员组名称在比较唯一性时是否忽略前后空白？ → A: 是；统一用 `lower(trim(name))` 做归一化后再比较唯一性。
- AUTO: Q: 角色（Owner/Admin/Member/Viewer）与权限能力的最小口径是什么？ → A: 引入稳定的 `permissionKey` 集合并由角色映射：viewer 仅只读（project.read/member.read）；member 增加可读成员组（group.read）；admin 增加成员/成员组管理与审计可读（member.manage/group.manage/audit.read）；owner 在 admin 基础上增加项目变更与所有权管理（project.update/owner.manage）。
- AUTO: Q: 添加项目成员时用什么标识定位用户？ → A: 使用 email（大小写不敏感、trim 后对齐）作为输入标识；若用户不存在则返回 `404`（`NotFoundError`）。
- AUTO: Q: 是否允许把“未加入项目的用户”直接加入某个成员组？ → A: 不允许；用户必须先成为该项目成员，否则加入组返回 `409`（`ConflictError`）。
- AUTO: Q: 项目域接口的 `401/403` 口径是什么？ → A: 未登录/会话无效统一 `401`；已登录但缺少“所需权限”统一 `403`（包含：不是项目成员、或角色不足）。
- AUTO: Q: “最后一个 Owner”约束下如何支持所有权转移？ → A: 支持：`owner` 可以先把另一成员提升为 `owner`，随后再移除/降级自己；但任何操作都不得让项目进入“无 Owner”状态。
- AUTO: Q: 哪些人可以授予/撤销 Owner 角色？ → A: 仅具备 `owner.manage` 权限的成员可以授予/撤销 `owner`（即只有 Owner）；其它角色尝试变更 `owner` 相关操作统一返回 `403`（`ForbiddenError`）。
- AUTO: Q: 响应中 `effectiveRoleKeys/effectivePermissionKeys` 的顺序是否需要稳定？ → A: 需要；`effectiveRoleKeys` 按固定优先级排序（viewer < member < admin < owner），`effectivePermissionKeys` 按字典序升序排序。
- AUTO: Q: “重复添加成员/重复加入成员组”如何处理？ → A: 统一返回 `409`（`ConflictError`），不做 silent no-op。

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

### User Story 1 - 创建项目并管理成员（基础角色闭环） (Priority: P1)

作为已登录用户，我希望能创建一个「Project」作为协作与资产容器，并在项目内添加/移除成员、分配基础角色（Owner/Admin/Member/Viewer），从而形成最小可联调闭环：登录 → 创建项目 → 添加成员 → 成员按权限访问对应页面/接口。

**Why this priority**: 没有 Project 与成员/角色，后续任何平台资产（Specs/Tracks/Artifacts）的协作与治理都无法落地验证；这也是 `docs/specs/drafts/topics/sdd-platform/17-project-governance-and-lean-context.md` 所述 “Project Management Kernel” 的必要前置。

**Independent Test**: 在不实现“成员组/自定义权限/审计查询 UI”的情况下，仅通过「项目创建 + 成员管理 + 后端强制鉴权 + 前端路由可用」即可独立验收：用两个账号验证“可访问/不可访问”的差异，并能在前端完成基本操作而无需手工改库。

**Acceptance Scenarios**:

1. **Given** 用户已登录，**When** 创建一个项目（至少包含 `name`），**Then** 创建成功且该用户成为该项目 `Owner`，并能在“我的项目列表”中看到它。
2. **Given** 用户已登录且已创建一个名为 `Demo` 的项目，**When** 以 `demo`（仅大小写不同）再次创建项目，**Then** 返回 `409` 且错误体为 `{ _tag: "ConflictError", message: <string> }`。
3. **Given** 用户未登录或会话无效，**When** 访问任一项目相关接口或页面，**Then** 统一被拒绝（`401 Unauthorized`）且不泄露任何项目存在性信息。
4. **Given** 项目存在且用户不是该项目成员，**When** 尝试访问该项目详情/成员列表，**Then** 被拒绝（`403 Forbidden`）并且后端拒绝原因可被一致验证。
5. **Given** `Owner` 在项目中将用户 `B` 添加为 `Viewer`，**When** `B` 登录后访问项目详情，**Then** `B` 能只读查看项目与成员列表，但无法进行任何成员/角色变更（尝试变更返回 `403`）。
6. **Given** `Owner` 将 `B` 从项目中移除，**When** `B` 再次访问该项目任一接口或页面，**Then** 立即被拒绝（`403` 或 `401`，取决于会话是否仍有效，但不得继续拥有项目访问能力）。
7. **Given** 项目仅剩一个 `Owner`，**When** 该 `Owner` 尝试移除自己或将自己降级为非 Owner，**Then** 系统拒绝该操作并给出可解释的错误（避免“项目无 Owner”状态）。
8. **Given** 项目存在且至少有两个 `Owner`，**When** 其中一个 `Owner` 将另一成员提升为 `Owner` 后再将自己降级为 `Admin`（或移除自己），**Then** 操作成功且项目始终至少保留一个 `Owner`。

---

### User Story 2 - 成员组（Group）与角色绑定 (Priority: P2)

作为项目 `Owner/Admin`，我希望能创建「成员组」，把成员归组并给组绑定角色（或等价的权限集合），从而用更低的运维成本管理一批成员的访问权限（尤其在成员规模增长时）。

**Why this priority**: 单独给每个成员分配角色在中长期不可维护；成员组是最小可复用的权限治理单元，能支撑后续“按团队/职能”裁剪导航与能力（呼应 `docs/specs/drafts/topics/sdd-platform/ui-ux/05-multi-view-principles.md` 中“导航与权限：按角色裁剪”的原则）。

**Independent Test**: 仅实现「创建组 + 组内加成员 + 给组绑定角色 + 权限生效」即可独立验收：不要求完整的权限编辑器，只要能验证“来自组的角色”会影响成员的可访问接口/页面即可。

**Acceptance Scenarios**:

1. **Given** `Owner/Admin` 已登录且进入项目，**When** 创建一个成员组并把用户 `B` 加入该组，**Then** `B` 的“有效角色/权限”发生变化且可被后端接口查询到。
2. **Given** 成员组已绑定某个角色（例如 `Member`），**When** `B` 不再被单独赋予该角色而仅通过成员组获得，**Then** `B` 依然拥有该角色对应能力（以受保护接口返回 `200` 为准）。
3. **Given** `B` 被移出成员组，**When** `B` 再次访问该组所赋予的能力，**Then** 权限立即失效并被后端拒绝。
4. **Given** 同一成员同时拥有“直接角色”与“来自组的角色”，**When** 计算其有效权限，**Then** 系统按“并集”生效（不得因为重复绑定出现异常或不稳定结果）。
5. **Given** 用户 `C` 存在但不是该项目成员，**When** 尝试把 `C` 加入该项目的任一成员组，**Then** 返回 `409` 且错误体为 `{ _tag: "ConflictError", message: <string> }`。

---

### User Story 3 - 前端路由联调闭环（Logix dogfooding） (Priority: P3)

作为本仓库贡献者，我希望在 `apps/logix-galaxy-fe` 中有可用页面与路由把 P1/P2 的能力串起来，并通过真实后端 API 联调跑通关键路径；同时前端的状态与请求流程必须由 Logix 承载（吃自己狗粮），以便后续把这些页面演进为 Spec Studio / Governance 的真实落点。

**Why this priority**: 仅有后端接口无法验证“真实用户路径”；而本仓库的北极星要求通过 dogfooding 推动 Logix Runtime 形态收敛，前端必须从第一天就以 Logix 方式组织状态/流程/诊断。

**Independent Test**: 仅实现 P1 的最小页面闭环即可独立验收：项目列表 → 创建项目 → 进入项目 → 成员列表 → 添加成员/修改角色；样式不做精细化，只要布局清晰可操作。

**Acceptance Scenarios**:

1. **Given** 用户已登录，**When** 在前端依次完成“创建项目 → 进入项目 → 添加成员”，**Then** 整条链路无需手工改库即可跑通，且页面能对常见错误给出可理解反馈（例如无权限/成员不存在/输入不合法）。
2. **Given** 用户无访问某路由所需权限，**When** 直接访问该路由（刷新/手工输入 URL），**Then** 前端会被稳定拦截并展示明确的“无权限/需要登录”结果，同时后端接口同样返回 `401/403`（前后端一致）。
3. **Given** 成员/角色/组发生变更，**When** 在前端刷新页面或重新进入项目，**Then** 页面展示与后端状态一致，不出现“前端仍显示可操作但提交后 403”的长时间漂移。

---

### Edge Cases

- 重复创建：同一用户重复创建同名项目/同名成员组时的冲突处理与错误信息（必须可测试、可解释）。
- 重复绑定：同一成员被重复加入同一组、或同一角色被重复绑定到同一成员/组时应幂等或返回明确冲突。
- 删除/退出：成员被移除后其已有页面/会话的体验（允许短暂“刷新后消失”，但不得继续写入）。
- 权限边界：任何项目内操作都必须基于“当前项目上下文”做权限判断，不得出现跨项目越权。
- 最后 Owner：禁止出现“项目无 Owner”状态；需要明确的所有权转移策略或拒绝策略。
- 输入校验：空白 name、超长 name、非法字符、大小写/空白导致的唯一性歧义，均需定义预期行为。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统 MUST 提供 Project 的最小管理能力：创建项目、列出“我可访问的项目”、读取项目详情。
- **FR-002**: 系统 MUST 将 Project 与成员关系持久化，并能查询项目成员列表（包含成员的角色/来源，如“直接绑定/来自成员组”）。
- **FR-003**: 系统 MUST 在项目域内提供至少 4 种基础角色：`Owner`、`Admin`、`Member`、`Viewer`，并为每种角色定义一组稳定的权限能力（可扩展但需向前演进）。
- **FR-004**: 系统 MUST 对所有项目域接口进行后端强制鉴权与授权校验；未登录返回 `401`，已登录但无权限返回 `403`。
- **FR-005**: 系统 MUST 提供成员管理能力：添加成员（基于已存在用户）、移除成员、变更成员角色；并保证“最后一个 Owner 不可被移除或降级”。
- **FR-006**: 系统 MUST 提供成员组管理能力：创建/列出/更新/删除成员组，并能维护“组-成员”的隶属关系。
- **FR-007**: 系统 MUST 支持“组绑定角色”（或等价的权限集合），并定义成员的有效权限计算规则为“直接角色 ∪ 组角色”（并集）。
- **FR-008**: 系统 MUST 提供查询“某用户在某项目的有效角色/权限”的能力，以支撑前端路由裁剪与能力开关（前端仅做呈现，不作为安全边界）。
- **FR-009**: `apps/logix-galaxy-fe` MUST 提供对应页面与路由，至少覆盖：项目列表/创建、项目详情（基础信息）、成员列表与成员变更、成员组列表与成员组维护（P2）。
- **FR-010**: 前端的业务状态与请求流程 MUST 由 Logix 承载（dogfooding），并且关键状态切换（加载/成功/失败/无权限/未登录）对用户可见且可测试。
- **FR-011**: 系统 MUST 记录关键审计事件：项目创建、成员添加/移除、成员角色变更、成员组创建/删除、组成员变更、组角色绑定变更；事件必须可关联到操作者与目标对象。
- **FR-012**: 系统 MUST 将 Project 名称在“同一创建者”范围内视为大小写不敏感且忽略前后空白唯一（比较口径：`lower(trim(name))`）；重复创建返回 `409`（`ConflictError`）。
- **FR-013**: 系统 MUST 将成员组名称在“同一项目”范围内视为大小写不敏感且忽略前后空白唯一（比较口径：`lower(trim(name))`）；重复创建返回 `409`（`ConflictError`）。
- **FR-014**: 系统 MUST 定义并对外暴露一组稳定的项目域权限 key（用于路由裁剪与能力开关）：`project.read`、`project.update`、`member.read`、`member.manage`、`group.read`、`group.manage`、`audit.read`、`owner.manage`。
- **FR-015**: 系统 MUST 按固定映射把项目角色转换为权限（最小集合）：
  - `viewer` → `project.read`、`member.read`
  - `member` → `viewer` ∪ `group.read`
  - `admin` → `member` ∪ `member.manage`、`group.manage`、`audit.read`
  - `owner` → `admin` ∪ `project.update`、`owner.manage`
- **FR-016**: 系统 MUST 支持通过 `email` 添加项目成员（email 大小写不敏感、trim 后对齐）；当 email 对应用户不存在时返回 `404`（`NotFoundError`）。
- **FR-017**: 系统 MUST 保持成员组数据不越权：仅允许将“已是项目成员”的用户加入该项目成员组；对非项目成员的加入请求返回 `409`（`ConflictError`）。
- **FR-018**: 系统 MUST 对项目域接口统一鉴权/授权口径：未登录或会话无效返回 `401`（`UnauthorizedError`）；已登录但权限不足返回 `403`（`ForbiddenError`）。
- **FR-019**: 系统 MUST 支持所有权转移：具备 `owner.manage` 的成员可以将其它成员提升为 `Owner`；并且任何成员/角色变更都不得使项目进入“无 Owner”状态（违反时返回 `409`）。
- **FR-020**: 系统 MUST 仅允许具备 `owner.manage` 权限的成员授予/撤销 `Owner` 角色；其它角色尝试进行 owner 相关变更返回 `403`（`ForbiddenError`）。
- **FR-021**: 系统 MUST 以稳定顺序返回 `effectiveRoleKeys` 与 `effectivePermissionKeys`：`effectiveRoleKeys` 按（viewer < member < admin < owner）排序，`effectivePermissionKeys` 按字典序升序排序。
- **FR-022**: 系统 MUST 将“重复添加成员/重复加入成员组”视为冲突并返回 `409`（`ConflictError`），不做 silent no-op。

#### Assumptions & Dependencies

- 本特性依赖 `specs/063-galaxy-user-auth` 已提供可用的登录与用户标识（UserId）；Project 成员管理默认“添加已存在用户”，不做邮件邀请/注册审批等流程。
- 数据库使用 PostgreSQL，并以 `$postgresql-table-design` 约束表结构/索引/约束设计（实现阶段产出 data-model/DDL 作为单一事实源）。
- 权限体系默认先落地“项目域”RBAC；不包含跨项目的组织/租户（Org/Tenant）模型与计费等能力。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: 授权校验 MUST 以“后端为准”，前端的路由裁剪仅用于用户体验，任何越权请求都必须被后端拒绝。
- **NFR-002**: 任意 `401/403/409/400/404` 场景 MUST 返回结构化且可序列化的错误体（至少包含 `_tag` 与 `message`），并且不得泄露敏感信息。
- **NFR-003**: 审计事件 MUST 为结构化数据并可持久化，支持按项目与时间范围检索，并能在自动化测试中验证关键事件的产生。
- **NFR-004**: 前端页面必须具备“轻量布局 + 清晰信息层级”，即使无美术样式也能完成操作与判断当前状态（加载/失败/无权限/未登录）。
- **NFR-005**: 权限与成员变更在用户可感知层面应尽量“即时生效”：变更后刷新/重新进入项目不得出现长期缓存导致的越权显示。

### Key Entities _(include if feature involves data)_

- **Project**: 协作与资产容器（承载后续 SDD Tracks/Artifacts），具有稳定标识与可读名称。
- **User**: 已登录的身份主体（由用户/登录模块提供），可作为审计事件的操作者/目标。
- **ProjectMember**: 用户在某 Project 下的成员关系（包含角色与状态）。
- **Role**: 项目域的角色（如 Owner/Admin/Member/Viewer），用于聚合权限能力。
- **Permission**: 可被授权的能力点（以稳定 key 表示，如“管理成员/管理成员组/只读访问”等）。
- **MemberGroup**: 项目域下的成员组，用于批量授权与成员治理。
- **AuditEvent**: 关键治理操作的审计事件（项目/成员/组/角色相关变更）。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 一个新用户在 10 分钟内可完成 P1 闭环（登录 → 创建项目 → 添加成员 → 成员按权限访问），全程无需手工改库/跑额外脚本。
- **SC-002**: 对任一项目域接口，未登录请求稳定返回 `401`；已登录但无权限稳定返回 `403`，且不出现“偶发 500/空响应”。
- **SC-003**: `Viewer` 角色在 UI 与 API 层均无法完成成员/组/角色变更（成功率 0%，且每次都被明确拒绝）。
- **SC-004**: 成员组带来的权限变化可被稳定验证：加入组后获得能力、移出组后能力消失，且一次刷新后必然一致。
- **SC-005**: P1/P2 的所有关键治理操作都会产生审计事件，且每个事件都能关联到（操作者、目标对象、项目、时间）。
