# Feature Specification: DevServer RunChecks Diagnostics（097 · 可行动结果）

**Feature Branch**: `097-devserver-runchecks-diagnostics`  
**Created**: 2026-01-27  
**Status**: Done  
**Input**: 让 `dev.runChecks` 返回“可行动”的结构化 diagnostics（而不是只给一段截断日志），使 Studio/Agent 能直接定位失败原因与下一步动作。

协议 SSoT：`docs/ssot/platform/contracts/04-devserver-protocol.md`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Studio 展示“可行动”检查结果 (Priority: P0)

作为 Studio，我希望 `dev.runChecks` 返回结构化结果：每个 check 的 ok/耗时/摘要 + diagnostics（可选 pointer 与建议动作），从而 UI 不需要解析日志也能给出下一步。

**Acceptance Scenarios**:

1. **Given** `dev.runChecks(checks=["typecheck"])`，**When** 执行结束，**Then** 每条 result 包含 `durationMs` 与 `diagnostics[]`（JsonValue-only）。
2. **Given** check 失败或超时，**When** 返回结果，**Then** `diagnostics[].code` 至少包含 `CHECK_FAILED` 或 `CHECK_TIMEOUT`，并提供 `action.kind === "run.command"` 与 `action.command === "pnpm <check>"`。

### User Story 2 - Agent 直接利用 pointer 修复 (Priority: P1)

作为 Agent，我希望当 output 中可解析出 `file:line:col` 或 `file(line,col)` 时，diagnostics 能直接给出 pointer，减少“读日志→再解析→再定位”的冗余步骤。

**Acceptance Scenarios**:

1. **Given** output 中存在位置标记，**When** 生成 diagnostics，**Then** 至少生成一条 `CHECK_POINTER` 并填充 `pointer.file/line/column`（最多 N 条，避免爆炸）。

### Edge Cases

- output 过大：仅返回 `preview` 截断 + diagnostics（禁止回传全文日志）
- 无法解析 pointer：仍必须返回 `CHECK_FAILED` + 可执行 action

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: `dev.runChecks` MUST 返回每个 check 的 `durationMs`。
- **FR-002**: `dev.runChecks` MUST 为每个 check 返回 `diagnostics: Diagnostic[]`（JsonValue-only）。
- **FR-003**: `diagnostics` MUST 提供稳定 `code`（至少：`CHECK_FAILED` / `CHECK_TIMEOUT` / `CHECK_CANCELLED` / `CHECK_POINTER`）。
- **FR-004**: `diagnostics` SHOULD 提供可执行 `action`（`{ kind:"run.command", command:"pnpm <check>" }`）。

### Non-Functional Requirements

- **NFR-001**: 所有结果必须 JsonValue-only；不得回传 Error 实例/循环引用。
- **NFR-002**: `preview` 必须截断（避免巨大日志污染协议）。

## Success Criteria _(mandatory)_

- **SC-001**: `docs/ssot/platform/contracts/04-devserver-protocol.md` 中 `dev.runChecks` 返回结构与实现一致。
- **SC-002**: `dev.runChecks` 的结果可直接被 UI/Agent 消费（无需解析整段日志）。
