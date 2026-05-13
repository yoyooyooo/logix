# Feature Specification: Docs Foundation Governance Convergence

**Feature Branch**: `121-docs-foundation-governance-convergence`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "收口 docs 根入口、ssot/adr/standards/next/proposals 路由与 docs governance 的第二波全量对齐。"

## Context

`113-docs-runtime-cutover` 已完成第一波 docs cutover，但当前 docs 根入口与治理文档承担的是“下一阶段默认路由”。它们需要一份第二波 spec，去承接 root readme mesh、promotion lane、followup bucket、owner routing 和后续页面新增规则。

若这部分缺 spec owner，后续 runtime、platform、standards 和 next 页面虽然能继续长内容，但“写到哪、什么时候升格、谁负责回写”仍会回到口径漂移。

## Scope

### In Scope

- `docs/README.md`
- `docs/ssot/README.md`
- `docs/ssot/runtime/README.md`
- `docs/ssot/platform/README.md`
- `docs/adr/README.md`
- `docs/standards/README.md`
- `docs/next/README.md`
- `docs/proposals/README.md`
- `docs/standards/docs-governance.md`
- `docs/next/2026-04-05-runtime-docs-followups.md`

### Out of Scope

- 不定义 runtime leaf pages 的具体语义
- 不定义 platform leaf pages 的具体语义
- 不直接改实现代码

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能立刻判断文档该写到哪里 (Priority: P1)

作为维护者，我需要从 docs 根入口快速判断某条内容该写进 `proposals / next / ssot / adr / standards` 的哪一层。

**Why this priority**: docs foundation 是所有后续 spec 的入口。路由不稳，后面的 spec owner 再多也会失真。

**Independent Test**: 给出一条新文档需求，维护者能在 2 分钟内通过 root readmes 与 docs governance 确定写入目录和升格目标。

**Acceptance Scenarios**:

1. **Given** 一条仍在收口中的方案，**When** 我查 docs foundation，**Then** 我知道它必须先进入 `docs/proposals/` 或 `docs/next/`。
2. **Given** 一条已经稳定的事实，**When** 我查 docs foundation，**Then** 我知道它必须升格到 `docs/ssot/`、`docs/adr/` 或 `docs/standards/`。

---

### User Story 2 - reviewer 能判断 next / proposals 是否越界 (Priority: P2)

作为 reviewer，我需要判断 `docs/next/**` 和 `docs/proposals/**` 是否正在越界充当事实源。

**Why this priority**: 当前 docs 已经被当作下一阶段默认口径，若 next/proposals 长期承载事实，整套体系会重新失去单一权威。

**Independent Test**: 对任意一个 next 或 proposal 页面，reviewer 能明确它的 target、owner、promotion 条件和回写动作。

**Acceptance Scenarios**:

1. **Given** 一个 next 页面缺 target 或 owner，**When** reviewer 检查，**Then** 能立刻判定它不合格。

---

### User Story 3 - 后续新增 docs cluster 时，根入口仍能稳定扩展 (Priority: P3)

作为 docs owner，我需要在新增专题时只改少量入口文件，就能保持整棵 docs 树路由稳定。

**Why this priority**: 这是 docs foundation 的长期价值。它必须服务持续演进，不只是一次性整理。

**Independent Test**: 新增一个 active docs cluster 时，owner 能依据本 spec 列出需要回写的 root/readme/governance/next 入口文件。

**Acceptance Scenarios**:

1. **Given** 新增一个活跃专题，**When** 我按本 spec 执行，**Then** 我知道需要同时更新根 README、对应子树 README 和必要的 next/proposals 入口。

### Edge Cases

- 某个页面同时具备“治理规则”和“事实正文”两种倾向时，必须先按 primary role 归类，禁止一页兼任多种默认职责。
- 某个 next 页面已没有活跃内容时，必须明确是否删除、归档或升格，禁止悬空保留。
- 某个 proposal 已被消费，但没有去向说明时，必须视为未收口状态。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为 docs 根入口和各子树 README 定义稳定的角色与最短跳转关系。
- **FR-002**: 系统 MUST 固定 `docs/standards/docs-governance.md` 为路由、升格、回写规则的唯一执行协议。
- **FR-003**: 系统 MUST 为 `docs/proposals/`、`docs/next/`、`docs/ssot/`、`docs/adr/`、`docs/standards/` 提供清晰的写入与升格门槛。
- **FR-004**: 系统 MUST 为 active next topic 提供最小元数据与 root routing 更新规则。
- **FR-005**: 系统 MUST 规定 proposal / next 文档被消费后必须写明去向。
- **FR-006**: 系统 MUST 规定新增 docs cluster 时，需要同步回写的 foundation 入口范围。

### Non-Functional Requirements (Governance Stability)

- **NFR-001**: docs foundation 只能表达路由、治理、入口和 promotion lane，不能代替 leaf SSoT 定义业务事实。
- **NFR-002**: root readmes 和 docs governance 的描述必须能互相印证，不能出现冲突口径。
- **NFR-003**: foundation 规则必须足够短，维护者可以在 2 分钟内完成写入路径判断。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 任意维护者可在 2 分钟内通过 docs foundation 判断一条内容该写到哪个目录。
- **SC-002**: 所有 active next topics 都在 `docs/next/README.md` 可直达。
- **SC-003**: proposal / next 文档不再出现无 target、无 owner、无去向说明的长期悬空状态。
