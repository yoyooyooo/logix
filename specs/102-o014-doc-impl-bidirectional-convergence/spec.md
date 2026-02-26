# Feature Specification: O-014 文档-实现双向收敛机制固化

**Feature Branch**: `pr/o014-doc-impl-bidirectional-convergence`  
**Created**: 2026-02-26  
**Status**: Draft  
**Input**: 固化 backlog item 最小模板与“机会池 -> spec -> 实现 -> 证据 -> 回写”机制，补齐链接与状态回写规范。

## 1. 背景

当前仓库缺少 backlog item 的统一最小模板与状态回写规则，导致条目推进链路不稳定，且 links/status 难以一致维护。

## 2. Scope

- 固化 backlog item 最小模板：`problem/evidence/design/budget/check`。
- 固化阶段机制：`pool -> spec -> implement -> evidence -> writeback -> done`。
- 固化链接契约：`spec/implementation/evidence/writeback` 必填规则。
- 固化状态回写：item frontmatter、items index、机器注册表三处一致。

## 3. Functional Requirements

- **FR-001**: 新增条目必须基于统一模板，并保留五段固定章节。
- **FR-002**: 必须定义阶段状态枚举、合法流转与阻塞/冻结语义。
- **FR-003**: 每个条目必须具备可审计链接字段，且与状态阶段匹配。
- **FR-004**: 必须提供机器可读状态注册表，至少包含 `statusEnum`、`transition`、`entries`。
- **FR-005**: 必须补齐入口链接，保证从 `docs/specs/README.md` 可到达 backlog 机制文档。

## 4. Non-Goals

- 不修改 runtime 或业务代码。
- 不补齐其它 O-xxx 条目的历史内容，仅落地 O-014 所需机制。

## 5. Acceptance Criteria

- O-014 条目可通过 links 串到对应 `spec/plan/tasks`。
- backlog README 明确最小模板、阶段机制、链接契约、状态回写规则。
- `items/README.md` 与 `status-registry.json` 中 O-014 状态一致。
- 相关校验通过（JSON 语法 + 相对链接可达性）。

