# Feature Specification: DevServer Process Governance（098 · status/stop/health/token/state）

**Feature Branch**: `098-devserver-process-governance`  
**Created**: 2026-01-27  
**Status**: Done  
**Input**: DevServer 作为常驻桥接进程，必须可治理：可发现、可自检、可停止、可（可选）鉴权，避免“孤儿进程 + 无法收敛”的失控状态。

协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 可发现与自检 (Priority: P0)

作为 Agent，我希望 devserver 启动后写入 state file；后续只要在同一 repo 内，就能用 `status/health` 快速确认是否可用。

**Acceptance Scenarios**:

1. **Given** 执行 `logix-devserver --port 0`，**When** 启动成功，**Then** 输出 `DevServerStarted@v1`，且包含 `stateFile`。
2. **Given** state file 存在，**When** 执行 `logix-devserver status`，**Then** 返回 `DevServerStatus@v1(ok:true)` 且包含 `dev.info` 的最小信息。

### User Story 2 - 可停止 (Priority: P0)

作为 Agent/CI，我希望能通过 `stop` 可靠关闭 devserver，并清理 state file，避免泄漏或端口占用。

**Acceptance Scenarios**:

1. **Given** devserver 正在运行，**When** 执行 `logix-devserver stop`，**Then** 进程退出且 state file 被删除。

### User Story 3 - 可选 token 鉴权 (Priority: P1)

作为用户，我希望在需要时开启 token，避免同机/同用户下的误连或误停。

**Acceptance Scenarios**:

1. **Given** devserver 用 `--token T` 启动，**When** 不带 token 调用 `dev.info`，**Then** 返回 `ERR_UNAUTHORIZED`。
2. **Given** 带 token 调用，**When** 请求发出，**Then** 正常返回 response。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `logix-devserver` MUST 写入 state file（默认路径可推导；可通过 `--stateFile`/env 覆盖）。
- **FR-002**: `logix-devserver status/health/stop` MUST 存在，且 stdout 为单行 JSON。
- **FR-003**: state file MUST 包含 `url/pid/cwd/host/port`，并可选包含 `token`（仅本机本用户可读语义）。
- **FR-004**: `dev.stop` MUST 存在（协议层 stop），`stop` 命令通过协议触发退出并清理 state file。
- **FR-005**: token 模式下，request MUST 支持 `auth: { token }`，缺失/错误返回 `ERR_UNAUTHORIZED`。

### Non-Functional Requirements

- **NFR-001**: 优先级必须固定且可解释：
  - state file 路径：`--stateFile` > `LOGIX_DEVSERVER_STATE_FILE` > default（基于 repoRoot 的 tmp 路径）
  - token：`--token` > `state.token` > `LOGIX_DEVSERVER_TOKEN`
- **NFR-002**: 所有命令必须可自动结束；测试/CI 场景可用 `--shutdownAfterMs`。
- **NFR-003**: 禁止破坏性 git 操作；治理能力不得引入任何自动 `git add/commit` 行为。

## Success Criteria _(mandatory)_

- **SC-001**: `packages/logix-cli/test/Integration/cli.devserver.smoke.test.ts` 覆盖 `stateFile` 与 `status`。
- **SC-002**: `docs/ssot/platform/contracts/04-devserver-protocol.md` 记录 token 与 stop 的协议裁决。
