# Feature Specification: DevServer Event Stream + Cancel（096）

**Feature Branch**: `096-devserver-event-stream-cancel`  
**Created**: 2026-01-27  
**Status**: Done  
**Input**: 让 devserver 支持“服务端推送 event（进度/诊断）”与“请求级 cancel”，避免 Studio/Agent 只能靠长超时或解析非结构化日志来推断进度。

协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 事件流（Priority: P0）

作为 Studio/Agent，我希望在 `dev.runChecks` 过程中收到结构化进度事件（started/finished），用于 UI 展示与“卡住/变慢”的可解释链路。

**Acceptance Scenarios**:

1. **Given** 发起 `dev.runChecks`，**When** 进入每个 check，**Then** server 推送 `dev.event.check.started`，并在结束后推送 `dev.event.check.finished`。

### User Story 2 - 请求级取消（Priority: P0）

作为 Studio/Agent，我希望能取消一个 in-flight 请求（`dev.run` 或 `dev.runChecks`），并得到稳定的 `ERR_CANCELLED` 响应。

**Acceptance Scenarios**:

1. **Given** 一个 `dev.runChecks` 请求正在执行，**When** 发送 `dev.cancel(targetRequestId)`，**Then** cancel 调用返回 `{ cancelled: true }` 且原请求返回 `ok:false`、`error.code === "ERR_CANCELLED"`。
2. **Given** 原请求已进入取消流程，**When** server 处理取消，**Then** server MAY 推送 `dev.event.request.cancelled` event（与原请求同 `requestId`），用于 UI/Agent 及时更新状态。

### Edge Cases

- cancel 目标不存在：返回 `ERR_NOT_FOUND`
- client 断开连接：server 取消该连接发起的 in-flight 请求（避免 orphan）
- event 与 response 混发：client 不应因 event 提前退出（按 `requestId` 等待最终 response）

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 协议 MUST 支持 event 信封（包含 `requestId` 用于关联）。
- **FR-002**: 必须提供 `dev.cancel` 方法，并对 `dev.run/dev.runChecks` 生效。
- **FR-003**: 取消后原请求 MUST 返回 `ERR_CANCELLED`（可包含 partial results 作为 data）。

### Non-Functional Requirements

- **NFR-001**: event payload 必须 JsonValue-only（可序列化、无循环引用）。
- **NFR-002**: cancel 必须 best-effort 且可终止：子进程需 `SIGTERM → SIGKILL` 兜底；Effect fiber 必须 interrupt。

## Success Criteria _(mandatory)_

- **SC-001**: 集成测试覆盖：`packages/logix-cli/test/Integration/cli.devserver.cancel.test.ts` 通过（runChecks → event → cancel）。
