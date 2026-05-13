# Feature Specification: Docs Runtime Cutover

**Feature Branch**: `113-docs-runtime-cutover`
**Created**: 2026-04-05
**Status**: Done
**Input**: 收口 docs 根路由、governance、runtime ssot 与 platform 边界，形成下一轮实现的唯一文档事实源。

## Context

当前 docs 新骨架已建立，但仍缺几类关键收口：

- 根 README、`docs-governance`、`next/proposals` 的升格路径需要彻底统一
- runtime 01 到 09 与 platform 01/02 已有新结论，但页面职责和交叉引用还需要最后固定
- “结构已定”与“命名后置”仍有混写风险

这份 spec 的职责是把 docs 先变成单一事实源，后续代码与包级 topology 再按这个事实源推进。

## Scope

### In Scope

- 根路由、governance、proposal、next 的角色收口
- runtime 01 到 09、platform 01/02 的职责与交叉引用收口
- postponed naming 的唯一落点收口
- `docs/next` followups 与升格回写路径收口

### Out of Scope

- 不在本 spec 内改实现代码
- 不讨论具体包目录如何改名或重建

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 能快速找到真相源 (Priority: P1)

作为维护者，我能从 docs 根入口快速定位应该读哪份文档，哪里写事实，哪里写待升格项。

**Why this priority**: 后续所有实现都会依赖这些页面，入口不稳就会继续产生平行口径。

**Independent Test**: 从 `docs/README.md` 出发，2 分钟内能到达 runtime 主链、governance、next followups 和 platform 边界页。

**Acceptance Scenarios**:

1. **Given** 我需要判断新结论写到哪里，**When** 我阅读根入口与 governance，**Then** 我能区分 `ssot/adr/standards/next/proposals/legacy` 的角色。
2. **Given** 我需要判断某个 runtime 规则写在哪页，**When** 我阅读 runtime README 和相关页面，**Then** 我能定位唯一页面，不会遇到两页都在重复定义同一规则。

---

### User Story 2 - 结构与命名分开管理 (Priority: P2)

作为 reviewer，我能明确哪些结构结论已经冻结，哪些名字仍后置讨论。

**Why this priority**: 如果结构问题和命名问题混在一起，后续每次修改文档都会重开结构争论。

**Independent Test**: 阅读 runtime 06 到 09、platform 01/02 和 postponed naming 页面，能看出结构结论停在 SSoT，命名待定只停在 postponed naming。

**Acceptance Scenarios**:

1. **Given** 我在看 domain package 或 platform 文档，**When** 我遇到命名未决项，**Then** 页面会跳转到 postponed naming，而不是在 SSoT 正文里继续开放结构争论。

### Edge Cases

- 某个结论仍未成熟时，必须进入 `docs/next`，不能继续悬在 `proposals` 伪装成事实源。
- accepted ADR 如需改变裁决，必须新增 ADR，不能直接改原裁决正文。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 统一 `docs/README.md`、`docs/ssot/README.md`、`docs/adr/README.md`、`docs/standards/README.md`、`docs/proposals/README.md`、`docs/next/README.md` 的导航与角色说明。
- **FR-002**: 系统 MUST 把 `docs/standards/docs-governance.md` 固定为路由、升格、回写规则的唯一执行协议。
- **FR-003**: 系统 MUST 明确 runtime 01 到 05 与 runtime 06 到 09、platform 01/02 的页面职责边界，并用交叉引用替代重复定义。
- **FR-004**: 系统 MUST 把命名后置项统一收敛到 `docs/standards/logix-api-next-postponed-naming-items.md`。
- **FR-005**: 系统 MUST 为仍未升格的运行时 followups 提供单一 `docs/next` 承接桶。

### Non-Functional Requirements (Docs Governance)

- **NFR-001**: docs 结构必须支持单一事实源，禁止 proposal、next、legacy 承担事实源职责。
- **NFR-002**: 每个核心页面必须回答三个问题：从哪来、与谁相邻、后续去哪。
- **NFR-003**: 文档收口完成后，后续实现变更必须按受影响页面回写，不允许只改代码不改事实源。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 任意维护者可以在 2 分钟内从 docs 根入口定位到正确的 runtime 或 platform 事实源。
- **SC-002**: runtime 与 platform 关键规则在新 docs 树里各有唯一主页面，不再出现明显的重复定义。
- **SC-003**: 任何未升格事项都能在 `docs/next` 找到承接入口，且能追溯目标页面。
