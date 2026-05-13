# Feature Specification: Logic Domain Authoring Convergence Roadmap

**Feature Branch**: `135-logic-domain-authoring-roadmap`
**Created**: 2026-04-09
**Status**: Planned
**Input**: User description: "围绕 Logic 作者面相位、fields/field-kernel 与 Form/Query/I18n 领域包统一收口的总控路线。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

当前仓库已经把公开主链收口到 `Module / Logic / Program / Runtime`，也把 `FieldKernel` 下沉成 `field-kernel` 直达 API，把 Form、Query、I18n 放进统一的领域包规划。

但作者面还残留几组并列入口与并列相位心智：

- `setup / run` 仍作为可见相位对象存在
- `$.lifecycle.*`、`$.fields(...)` 与 `Module.make({ fields })` 还没有压成同一条公开心智
- `@logixjs/form` 仍保留 `rules / derived / fields` 多入口
- `@logixjs/query` 仍带有 `fields` root export 与独立 query 世界心智
- `@logixjs/i18n` 仍缺一份与 shared Logic contract 对齐后的 service-first 收口规格

这份总控 spec 的职责，是把这轮“作者面相位统一 + 领域包 contract 统一”收成一个母需求，并把具体工作拆到互斥的子需求里执行，追求一次性清理干净，不保留兼容债。

## Scope

### In Scope

- `Logic` 作者面相位模型的总控拆分
- `fields / field-kernel / lifecycle` 与 Logic 作者面的统一路由
- `@logixjs/form`、`@logixjs/query`、`@logixjs/i18n` 对 shared Logic contract 的收口
- `specs/135-logic-domain-authoring-roadmap/spec-registry.json`
- `specs/135-logic-domain-authoring-roadmap/spec-registry.md`

### Out of Scope

- 不在本 spec 内直接定义 `@logixjs/react` host scenario 边界
- 不在本 spec 内重开 verification control plane
- 不在本 spec 内新增新的领域包家族
- `@logixjs/domain` 当前波次不作为 primary workstream 进入；只有在 `136-139` 的 planning 明确证明它被当前相位合同直接卡死时，才额外拆出新的 member spec
- 不在本 spec 内复制各 member spec 的 plan 或 tasks

## Existing And New Members

### Existing Dependency Specs

- `122-runtime-public-authoring-convergence`
- `125-form-field-kernel-second-wave`
- `127-domain-packages-second-wave`
- `129-anchor-profile-static-governance`

### New Member Specs

- `136-declare-run-phase-contract`
- `137-form-logic-authoring-cutover`
- `138-query-logic-contract-cutover`
- `139-i18n-logic-contract-cutover`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能从一个总控入口定位这轮收口工作的 owner spec (Priority: P1)

作为维护者，我希望用一个总控 spec 看清这轮作者面与领域包收口的主问题、子问题、依赖关系和执行顺序。

**Traceability**: NS-4, KF-9

**Why this priority**: 若没有总控入口，`setup/run`、fields、Form、Query、I18n 很容易再次分头演进，重新长出平行真相源。

**Independent Test**: 打开 `135/spec-registry.md`，维护者可以在 3 分钟内判断某个问题应归到 `136`、`137`、`138` 还是 `139`。

**Acceptance Scenarios**:

1. **Given** 我看到一个关于 `setup / run` 的设计争议，**When** 我查看 `135` registry，**Then** 我能直接定位 `136` 为 primary owner。
2. **Given** 我看到一个关于 `Query.fields` 是否该保留的争议，**When** 我查看 `135` registry，**Then** 我能直接定位 `138` 为 primary owner。

---

### User Story 2 - 领域包 owner 能知道这轮收口要追求的终局边界 (Priority: P2)

作为 Form、Query、I18n 的 owner，我希望看到这轮收口的共同目标与每个包的互斥职责，避免边写边重新拆题。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Why this priority**: 这轮工作追求的是一次性收口。作者面和 shared runtime contract 需要同时讲清楚，包级默认写法也要同步收掉分叉。

**Independent Test**: 每个包的 owner 都能只读 `135/spec.md` 和 `135/spec-registry.md`，然后说出自己的 primary scope、依赖 spec 与交付边界。

**Acceptance Scenarios**:

1. **Given** 我是 Form owner，**When** 我查看 `135`，**Then** 我知道 `137` 负责默认作者面与 field-kernel 边界收口，不需要再重开 `136` 的相位争论。
2. **Given** 我是 I18n owner，**When** 我查看 `135`，**Then** 我知道 service-first 与 shared Logic contract 的包级收口由 `139` 负责。

---

### User Story 3 - reviewer 能拒绝“保留兼容、分期迁移、双轨共存”方案 (Priority: P3)

作为 reviewer，我希望这轮 spec 明确要求 forward-only 收口，不保留兼容层、弃用期或平行作者面。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Why this priority**: 这轮讨论已经明确以未来目标为准，若允许“先共存再慢慢迁”，最终只会保留更多旧壳层。

**Independent Test**: reviewer 能依据本 spec 直接否决任何要求保留旧入口、旧相位对象或兼容 facade 的方案。

**Acceptance Scenarios**:

1. **Given** 有人提议先保留旧 `setup / run` 与新 declaration model 双轨运行，**When** reviewer 对照本 spec，**Then** 能直接判定该提议不符合目标。
2. **Given** 有人提议让 `Form.rules / derived / fields` 长期并存，**When** reviewer 对照本 spec，**Then** 能直接判定该提议不符合目标。

### Edge Cases

- 某个包仍需要 direct kernel path 时，只能停在 expert 路由，不能回到 package root 的默认主叙事。
- 某个包的特殊能力需要额外 helper 时，仍必须先守住 shared Logic contract 和单主链约束。
- 中间实现阶段允许代码与 docs 暂时不一致，但 group registry 与 member spec 的边界不能含糊。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) 系统 MUST 把这轮“Logic 作者面相位统一 + 领域包 contract 收口”定义为一个总控 spec，并在 `135` 下维护可读 registry。
- **FR-002**: (NS-4, KF-9) 系统 MUST 将工作拆为 `136 / 137 / 138 / 139` 四个互斥 primary scope 的 member specs。
- **FR-003**: 系统 MUST 将 `122 / 125 / 127 / 129` 视为这轮工作的既有依赖基线；若它们阻碍更优设计，当前波次可以直接修订对应事实源，不得把旧边界当成不可调整前提。
- **FR-004**: (NS-3, KF-4) 系统 MUST 要求所有 member spec 以 forward-only 方式收口，不保留兼容层、弃用期、双轨默认入口或“以后再删”的存量债。
- **FR-005**: (NS-4, KF-9) 系统 MUST 在 `135/spec-registry.json` 与 `135/spec-registry.md` 中记录 member 的状态、依赖和 scope，并将它们作为 group SSoT。
- **FR-006**: 系统 MUST 要求后续 planning 与 tasks 只在 member spec 内展开，`135` 只承接总控边界、路由、顺序与 gate，不复制实现任务。
- **FR-007**: 系统 MUST 要求每个 member spec 在进入 plan/tasks 阶段时采用 SpecKit，并以 `$writing-plans` 的颗粒度生成实施计划与任务列表。
- **FR-008**: (NS-3, NS-10, KF-4, KF-8) 系统 MUST 要求本轮收口后的 docs、examples、tests、root exports 与 runtime diagnostics 共享同一套心智词汇。
- **FR-009**: 系统 MUST 允许本轮工作在必要时直接修订当前 NS/KF、charter、guardrails、既有 spec 与 group registry；任何治理文本都不得被视为不可调整边界。
- **FR-010**: 若 `136-139` 的 planning 明确暴露出 `@logixjs/domain` 或其他当前未纳入包面被同一相位合同直接阻塞，系统 MUST 新建独立 member spec，而不是把新范围硬塞进现有 member。

### Key Entities _(include if feature involves data)_

- **Spec Group Entry**: 记录 member spec 的编号、目录、状态、依赖与 primary scope。
- **Convergence Workstream**: 记录一个互斥的收口主题，例如核心相位模型、Form、Query、I18n。

### Non-Functional Requirements (Governance & Convergence)

- **NFR-001**: `135` 只承接总控治理，不复制 member 的实现细节、plan 或 tasks，避免平行真相源。
- **NFR-002**: 每个 member spec 的 scope 必须能用一句话解释，且不能与其他 member 的 primary scope 重叠。
- **NFR-003**: 本轮收口必须追求一次性清理后的稳定口径，不为旧示例、旧命名或旧包面保留额外过渡壳层。
- **NFR-003A**: 北极星与治理文本本身也必须服从这轮收口目标；若其现有表述阻碍更优设计，优先改事实源。
- **NFR-004**: 若 member 触及 hot path、diagnostics 或公开包面，必须同步更新对应 docs 事实源，避免“spec 已改，SSoT 未改”的状态长期存在。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-4, KF-9) 维护者可在 3 分钟内从 `135/spec-registry.md` 把任一争议路由到正确的 member spec。
- **SC-002**: 四个 member spec 都有互斥且稳定的一句话 scope，没有 scope 重叠或无主主题。
- **SC-003**: reviewer 可直接依据 `135` 否决任何要求保留兼容层、弃用期或双轨默认作者面的提议。
- **SC-004**: 后续进入 planning 阶段时，无需重新拆分问题边界，只需按 registry 顺序推进各 member。
