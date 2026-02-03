# Feature Specification: DevServer 安全硬化（101）

**Feature Branch**: `101-devserver-safety-hardening`  
**Created**: 2026-01-28  
**Status**: Done  
**Input**: DevServer 作为常驻桥接进程，虽然已禁止破坏性 git 操作（094/SSoT），但仍缺少更细粒度的“可控写回”与“权限面”治理：例如 readOnly 模式、对 `dev.run` 的 allowlist、state file 的权限与泄漏面、以及写回门槛（显式授权/能力位）。

协议 SSoT（现状基线）：`docs/ssot/platform/contracts/04-devserver-protocol.md`

## Goals / Scope

### In Scope

- 增加 **readOnly**（默认）与 **allowWrite** 的显式开关：
  - readOnly 下禁止任何写回类行为（包括 `logix --mode write` 的执行；以及未来新增的写回类命令，默认按“拒绝优先”处理）。
- 为 `dev.run` 增加拒绝策略（至少能拒绝 `--mode write` / `--mode=write` 以及等价写法）。
- 强化 state file 安全：
  - 文件权限（本机本用户可读语义）
  - token 不应被无意泄漏（最小字段、清理策略）
- 为 `dev.info`/`status` 增加 capability 描述（例如 `{ write: boolean }`），便于客户端 UI 做防呆。

### Out of Scope

- 远程访问/跨用户鉴权与加密（仍坚持 local-only）。
- 细粒度文件级 ACL（过重；先解决“能不能写/能写什么”的最小集合）。

## Success Criteria _(mandatory)_

- readOnly 模式下，任何尝试写回的请求都被拒绝并返回稳定错误码（例如 `ERR_FORBIDDEN`）。
- state file 在类 Unix 系统上为 0600（或等价），且 stop 后被清理。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 默认只读，写回需显式授权 (Priority: P0)

作为 Agent/Studio，我希望 devserver 默认只读；只有当用户显式允许写回时，才允许执行 `--mode write` 的命令，从而避免误写回。

**Acceptance Scenarios**:

1. **Given** devserver 默认启动（未传 `--allowWrite`），**When** 调用 `dev.run(argv=["anchor","autofill","--mode","write",...])`，**Then** 返回 `ok:false` 且 `error.code === "ERR_FORBIDDEN"`。
2. **Given** devserver 以 `--allowWrite` 启动，**When** 发起同样请求，**Then** request 被执行（成功与否由 CLI 命令结果决定，但不得被 policy 拦截）。

### User Story 2 - 能力位可发现 (Priority: P0)

作为 Studio，我希望通过 `dev.info` 或 `status` 直接获知 server 是否允许写回（capabilities），以便 UI 做防呆（禁用危险按钮/提示用户开启 allowWrite）。

**Acceptance Scenarios**:

1. **Given** devserver 默认只读，**When** 调用 `dev.info`，**Then** 返回 `capabilities.write === false`。
2. **Given** devserver 允许写回，**When** 调用 `dev.info`，**Then** 返回 `capabilities.write === true`。

### User Story 3 - state file 不泄漏 token (Priority: P0)

作为用户，我希望 state file 在本机本用户语义下可读（0600），并在 stop/退出后清理，避免 token 泄漏或残留。

**Acceptance Scenarios**:

1. **Given** devserver 启用 token 并写入 state file，**When** 检查文件权限，**Then** 在类 Unix 系统上为 0600（或更严格）。
2. **Given** 执行 `logix-devserver stop`，**When** 进程退出，**Then** state file 被删除。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `logix-devserver` 必须支持 `--allowWrite`（默认 false），并可选提供 `--readOnly`（默认 true，等价于未传 allowWrite）。
- **FR-002**: 当 `capabilities.write === false` 时，`dev.run` 必须拒绝任何显式写回意图，并返回 `ERR_FORBIDDEN`。
- **FR-003**: `dev.info`（以及 `status`）必须返回 `capabilities: { write: boolean }`。
- **FR-004**: state file 写入必须 best-effort 收口权限（dir 0700 + file 0600；平台不支持时允许降级但必须在 diagnostics 中可解释）。

### Non-Functional Requirements

- **NFR-001**: 规则必须简单可审计：拒绝策略优先基于 argv 的“显式意图”（例如 `--mode write`），避免引入复杂 parser。
- **NFR-002**: 不引入第二事实源：写回语义仍由 082/079/085 决定，本 spec 只做“是否允许写回”的外层护栏。
