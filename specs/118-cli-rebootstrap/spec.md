# Feature Specification: CLI Rebootstrap

**Feature Branch**: `118-cli-rebootstrap`
**Created**: 2026-04-05
**Status**: Done
**Input**: 将当前 CLI 视为存量材料，改名封存并围绕 runtime.check/runtime.trial/runtime.compare 从 0 到 1 重建新的 control plane CLI。

## Context

CLI 是这轮 cutover 中最适合直接重启的一块。当前命令面仍带有旧时代的 anchor、IR、describe 等历史残留，而新的验证控制面已经明确收敛到：

- `runtime.check`
- `runtime.trial`
- `runtime.compare`

这份 spec 的目标是承认 CLI 可以在命令面上与现状断裂，先把旧目录封存，再围绕新的 control plane 重建命令面与输出契约；同时保留那些已经对齐新输出契约的 helper、artifact 处理与测试资产。

## Scope

### In Scope

- 当前 CLI 的处置策略
- 新 CLI 的主命令面
- 新 CLI 的输出契约与目录模板
- 与 docs、verification、artifacts 的回写关系

### Out of Scope

- 不在本 spec 内实现完整命令
- 不在本 spec 内重构 sandbox 或 test harness

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 用新控制面直接驱动验证 (Priority: P1)

作为维护者，我能通过新的 CLI 直接运行 `runtime.check`、`runtime.trial`、`runtime.compare` 对应的主流程。

**Why this priority**: CLI 的主职责已经应当转向验证控制面，旧命令面不能继续当主入口。

**Independent Test**: 阅读 spec 后，能明确新 CLI 的一级命令和机器输出契约。

**Acceptance Scenarios**:

1. **Given** 我要做静态快检，**When** 我查看新 CLI 规划，**Then** 我知道应该走 `check` 主命令及其输出格式。
2. **Given** 我要运行 startup 或 scenario 验证，**When** 我查看新 CLI 规划，**Then** 我知道 `trial` 如何接收输入与返回结构化结果。

---

### User Story 2 - 旧 CLI 能安全退场 (Priority: P2)

作为实现者，我希望旧 CLI 不再挡路，可以先封存，再从 0 到 1 生长。

**Why this priority**: 若继续原地兼容，命令面很容易被旧包袱绑死。

**Independent Test**: spec 明确记录旧 CLI 的封存策略、新 CLI 目录模板和迁移说明口径。

**Acceptance Scenarios**:

1. **Given** 我准备开始新 CLI，**When** 我读取 spec，**Then** 我知道旧目录怎么封存，新目录从哪里起步。

### Edge Cases

- 某些旧命令可能仍有证据导出价值，此时必须说明是进入 expert 子命令还是完全退出主线。
- 新 CLI 与 docs 命名必须一致，避免命令名和控制面术语不一致。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为当前 CLI 定义封存策略，允许旧目录改名后停止主线增长。
- **FR-002**: 系统 MUST 为新 CLI 定义围绕 `check`、`trial`、`compare` 的主命令面。
- **FR-003**: 系统 MUST 定义新 CLI 的结构化输出契约，确保 verdict、summary、artifacts、repairHints、nextRecommendedStage 可机读。
- **FR-004**: 系统 MUST 定义旧命令的去向，明确哪些退出主线，哪些进入 expert 或后置桶。
- **FR-005**: 系统 MUST 定义新 CLI 的目录模板、bin 入口、internal 命令层和 artifacts 适配层关系。
- **FR-006**: 系统 MUST 识别当前 CLI 中可复用的 helper、artifact 处理与覆盖测试，并记录平移策略。

### Non-Functional Requirements (Command Ergonomics & Stability)

- **NFR-001**: 新 CLI 必须服务 Agent-first 路由，主命令面尽量小、直、稳定。
- **NFR-002**: 新 CLI 输出必须与 verification control plane 口径一致。
- **NFR-003**: CLI 的重启不得保留隐式兼容层或双套命令主线。
- **NFR-004**: CLI 重组默认优先复用已对齐新控制面输出契约的辅助实现与测试资产。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 新 CLI 的一级命令面能被 1 页规范清晰描述。
- **SC-002**: 任意维护者在 5 分钟内能从 spec 说清旧 CLI 的去向和新 CLI 的主流程。
- **SC-003**: 后续 CLI 实现不再需要继续背旧 `anchor` 或旧 IR 叙事作为主入口。
