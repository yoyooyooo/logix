# Feature Specification: Runtime Public Authoring Convergence

**Feature Branch**: `122-runtime-public-authoring-convergence`
**Created**: 2026-04-06
**Status**: Done
**Input**: User description: "围绕 runtime 公开主链、canonical authoring、logic composition 与 charter/guardrails 的第二波实现收敛。"

## Context

`01-public-api-spine`、`03-canonical-authoring`、`05-logic-composition-and-override` 与 `2026-04-04-logix-api-next-charter` 已经把公开主链收敛到 `Module / Logic / Program / Runtime / RuntimeProvider`。

第一波 cutover 已经完成 kernel、host、domain、CLI 和 examples 的基础重排，但 docs 当前描述的公开主链仍大于代码现状。需要一份第二波 spec，把 surviving surface、legacy facade、expert surface、内核 examples、公开导出与 SSoT 的剩余差距收紧。

## Scope

### In Scope

- `docs/ssot/runtime/01-public-api-spine.md`
- `docs/ssot/runtime/03-canonical-authoring.md`
- `docs/ssot/runtime/05-logic-composition-and-override.md`
- `docs/adr/2026-04-04-logix-api-next-charter.md`
- `docs/standards/logix-api-next-guardrails.md` 中与公开主链相关的部分
- `packages/logix-core/**`
- `examples/logix/**`
- `examples/logix-react/**` 中 canonical 内核 examples 与直接相关测试

### Out of Scope

- 不定义 verification control plane
- 不定义 hot path 细节
- 不定义 Form / domain package / platform 静态化细节
- 不在本轮收口 `apps/docs/**` 的对外用户文档

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 作者能识别唯一公开主链 (Priority: P1)

作为作者，我需要明确哪些 API 仍在 canonical surface，哪些已降到 expert 层或退出主线。

**Why this priority**: docs 当前最核心的目标是压缩作者分叉。公开主链未落地，就无法支撑 Agent 稳定生成。

**Independent Test**: 对外 API、内核 examples、公开导出和 SSoT 都能在 5 分钟内归类到 canonical、expert 或 legacy-exit。

**Acceptance Scenarios**:

1. **Given** 一个现有公开入口，**When** 我按本 spec 审视，**Then** 我能判断它属于 `Module / Logic / Program / Runtime / RuntimeProvider` 主链，还是必须降到 expert 层。
2. **Given** 一个旧 facade，**When** 我按本 spec 审视，**Then** 我知道它是否应删除、迁移或只保留为迁移说明。

---

### User Story 2 - reviewer 能阻止第二组公开相位对象回流 (Priority: P2)

作为 reviewer，我需要有一套明确口径，阻止新的公开相位对象、装配入口和 logic surface 回流。

**Why this priority**: 第二波实现阶段最容易在 convenience API 或 facade 修补中重新长回旧心智。

**Independent Test**: reviewer 能据此判断新增入口是否违反 `Program.make(Module, config)`、`logics: []`、`process expert family` 等规则。

**Acceptance Scenarios**:

1. **Given** 一个新增公开入口提议，**When** reviewer 对照本 spec，**Then** 能判断它是否会引入第二组公开相位对象。

---

### User Story 3 - 公开 docs、examples、generators 口径一致 (Priority: P3)

作为维护者，我需要让 SSoT、内核 examples、生成器和包导出都对同一条公开主链说话。

**Why this priority**: 公开口径不一致时，Agent 和人类都会继续生成旧写法。

**Independent Test**: 抽查一组 SSoT、canonical examples、public exports 和 codegen/generator 输出，没有自相矛盾的公开主链叙事。

**Acceptance Scenarios**:

1. **Given** 一个 public example，**When** 我对照本 spec，**Then** 它展示的必须是 canonical surface 或被明确标注为 expert surface。

### Edge Cases

- 某个 API 对用户很常见，但本质上只适合 expert 层时，必须优先守住主链边界，再通过迁移说明降低摩擦。
- 某个便捷 helper 只改名字不改语义时，仍需判断它是否构成第二语义面。
- 某个 surface 同时被 docs 和 examples 使用时，必须统一降级或统一保留，不能一边留一边删。
- `apps/docs/**` 若仍保留旧写法，不构成本轮阻塞，但必须在账本中标为 deferred，避免再次漂移成事实源。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 明确 `Module / Logic / Program / Runtime / RuntimeProvider` 的公开角色分工。
- **FR-002**: 系统 MUST 固定 `Program.make(Module, config)` 为唯一公开装配入口。
- **FR-003**: 系统 MUST 固定 `logics: []` 为 canonical 主写法，并明确 `logic` 的标准分区。
- **FR-004**: 系统 MUST 为 surviving surface、expert surface、legacy exit 建立显式分类账。
- **FR-005**: 系统 MUST 规定 `process`、`mutate`、覆盖/禁用等能力留在 expert family 的边界。
- **FR-006**: 系统 MUST 要求 SSoT、canonical examples、public exports 与 generators 对外口径保持一致。
- **FR-007**: 系统 MUST 在本轮把 `apps/docs/**` 标记为 deferred，不作为 `122` 的实现阻塞面。

### Non-Functional Requirements (Surface Discipline)

- **NFR-001**: 公开 authoring surface 必须持续压缩作者分叉，禁止重新长出第二组公开相位对象。
- **NFR-002**: 所有 surviving surface 都必须能降到同一个 authoring kernel，不得保留并行装配心智。
- **NFR-003**: 当 public docs 与现状代码冲突时，必须先用本 spec 给出收敛优先级，避免零散修补。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 抽样检查 SSoT、canonical examples、exports 时，公开主链叙事无相互冲突项。
- **SC-002**: reviewer 可以在 5 分钟内判断一个 API 属于 canonical、expert 还是 legacy exit。
- **SC-003**: 第二波收敛后，公开 surface 的新增提议都能落到本 spec 的分类口径中。

## Clarifications

### Session 2026-04-06

- Q: 这轮 examples 要扫到多宽？ → A: 只改 canonical 内核 examples 与直接相关测试。
- Q: `apps/docs/**` 是否纳入本轮 `122` 实现？ → A: 不纳入，先收口内核、examples、公开导出与 SSoT。
- Q: workflow expert family 是否还能通过 `withWorkflow(...).implement(...)` 走独立装配路径？ → A: 不能。workflow 仍属 expert family，但装配统一回到 `Program.make(..., { workflows })`，`Module.withWorkflow(s)` 退出公开 surface。
