# Feature Specification: Form Cutover Roadmap

**Feature Branch**: `140-form-cutover-roadmap`
**Created**: 2026-04-16
**Status**: Planned
**Input**: User description: "围绕 Form 相关 SSoT、未来规划与 runtime control plane 等链路，建立一个总控 spec group，把后续实施切成互斥 member specs，并坚持零兼容、面向未来、单轨实施。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-4, NS-10
- **Kill Features (KF)**: KF-4, KF-8, KF-9

## Context

当前仓库里，Form 相关未来规划已经在 `docs/ssot/form/**`、`docs/ssot/runtime/**`、
若干 consumed proposal 与 review ledger 中收到了比较稳的程度。

真正开始实施时，新的风险已经不在“方向不清楚”，而在：

- authority 文档很多
- residue 很多
- cutover 之间有依赖
- 如果拆得不够细，就会漏
- 如果走兼容或双轨，就会把旧壳层重新固化

这份总控 spec 的职责，是把 Form 相关实施切成互斥 member specs，并把后续实施固定成：

- 零兼容
- 面向未来
- 单轨实施

同时把实施 planning 的主路径收成：

- `spec.md`
- `plan.md`
- `docs/superpowers/plans/*.md`

其中：

- `spec.md` 负责 authority 与 scope
- `plan.md` 负责技术方案与 file touch / proof obligations
- `docs/superpowers/plans/*.md` 负责详细实施步骤
- `tasks.md` 只保留薄索引、状态与验收入口

## Scope

### In Scope

- Form 相关实施总控 spec group
- member spec 的拆分、依赖顺序、gate 与完成口径
- Form 到 runtime control plane 的 cutover workstreams
- `specs/140-form-cutover-roadmap/spec-registry.json`
- `specs/140-form-cutover-roadmap/spec-registry.md`

### Out of Scope

- 不在本 spec 内直接实现任何代码
- 不在本 spec 内重开 Form 用户面主 API
- 不在本 spec 内重开旧 facade 的兼容路线
- 不在本 spec 内复制 member spec 的详细实施步骤

## Existing Baseline

当前总控工作以这些 living authority 为基线：

- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/03-kernel-form-host-split.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/runtime/09-verification-control-plane.md`

当前总控工作也接受这些 consumed freeze note 作为背景输入：

- `docs/proposals/form-static-ir-trial-contract.md`
- `docs/proposals/form-validation-funnel-export-contract.md`
- `docs/proposals/form-rule-i18n-message-contract.md`
- `docs/proposals/runtime-control-plane-materializer-report-contract.md`

这里的 baseline 都是可修订基线。
若它们阻碍更优设计，当前波次可以直接更新事实源。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 维护者能从一个总控入口路由 Form cutover 工作 (Priority: P1)

作为维护者，我希望通过一个总控 spec 看清 Form cutover 当前要推进哪些 member、依赖顺序是什么、每个 member 的 primary scope 是什么。

**Traceability**: NS-4, KF-9

**Why this priority**: 如果没有总控入口，实施会重新退化成“看到哪里改哪里”，authority 很容易再次分叉。

**Independent Test**: 维护者只读 `140/spec.md` 和 `140/spec-registry.md`，可以在 3 分钟内判断任一 residue 或实施问题应该路由到哪个 member spec。

**Acceptance Scenarios**:

1. **Given** 我看到一个关于 `runtime/09` report shell 的实现问题，**When** 我查看 `140` registry，**Then** 我能直接定位 `141` 为 primary owner。
2. **Given** 我看到一个关于 `errors.$schema` 或 raw schema writeback 的 residue，**When** 我查看 `140` registry，**Then** 我能直接定位 `143` 为 primary owner。

---

### User Story 2 - 实施者能在不遗漏 authority 的前提下生成详细实施计划 (Priority: P2)

作为实施者，我希望每个 member spec 都明确 authority inputs、file touch matrix、residue tombstone、verification matrix 与完成定义，然后再用 `$writing-plans` 展开真正的实施计划。

**Traceability**: NS-3, NS-10, KF-4

**Why this priority**: Form 这条链路文档很多，如果没有一套稳定拆法和 planning 路径，详细计划一定会漏。

**Independent Test**: 任一 member spec 进入 planning 阶段时，实施者不需要重新发明拆分方法，只需要按既定表格和 `$writing-plans` 模板往下展开。

**Acceptance Scenarios**:

1. **Given** 我要推进某个 member spec，**When** 我读取该 member 的 spec/plan，**Then** 我能直接生成一个详细实施计划，不需要重新搜索所有 Form 文档。
2. **Given** 我要验收某个 member 是否 ready for implementation，**When** 我检查它的 plan，**Then** 我能明确看到 authority、file touch、residue、verification 与 done definition。

---

### User Story 3 - reviewer 能直接拒绝兼容层、双轨和中间态方案 (Priority: P3)

作为 reviewer，我希望总控 spec 明确写死“零兼容、面向未来、单轨实施”，以便我直接否决兼容层、双写、影子路径、弃用期或长期并存方案。

**Traceability**: NS-3, NS-10, KF-4, KF-8

**Why this priority**: 当前阶段的最大风险就是为了“稳一点”重新留下旧壳层。

**Independent Test**: reviewer 能依据 `140/spec.md` 直接否决任何要求保留旧入口、旧 contract、双轨运行或先并存后删除的方案。

**Acceptance Scenarios**:

1. **Given** 有人提议先保留旧 error carrier 和新 carrier 双轨共存，**When** reviewer 对照本 spec，**Then** 能直接判定该提议不符合本轮原则。
2. **Given** 有人提议先做 dual-write 或 shadow path，**When** reviewer 对照本 spec，**Then** 能直接判定该提议不符合本轮原则。

### Edge Cases

- 某个问题横跨两个 member 且无法维持 primary scope 互斥时，必须新建 member spec，不能硬塞进现有 member。
- 如果旧 specs 与新 SSoT 冲突，先更新 authority，再继续 planning。
- 如果某个 member 的 `tasks.md` 仍需要存在，它也只能做薄索引，不能复制 detailed implementation steps。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-4, KF-9) 系统 MUST 为 Form cutover 建立一个总控 spec group，并在 `140` 下维护可读 registry。
- **FR-002**: 系统 MUST 将这轮 cutover 拆成互斥 member specs，而不是在一个 spec 内直接承接全部实施。
- **FR-003**: 系统 MUST 在 `140/spec-registry.json` 与 `140/spec-registry.md` 中记录 member 的状态、依赖、scope 与建议顺序，并将其作为 group SSoT。
- **FR-004**: (NS-3, KF-4, KF-8) 系统 MUST 要求所有 member spec 按零兼容、面向未来、单轨实施推进，不保留兼容层、双轨运行、双写、影子路径、弃用期或“先并存后删除”的执行方案。
- **FR-005**: 系统 MUST 要求每个 member spec 在进入 planning 阶段时都具备以下固定结构：
  - authority input table
  - file touch matrix
  - residue tombstone
  - verification matrix
  - done definition
- **FR-006**: 系统 MUST 要求每个 member spec 使用 SpecKit 生成 `plan.md`，再用 `$writing-plans` 生成 detailed implementation plan。
- **FR-007**: 系统 MUST 允许 `tasks.md` 在 cutover 类任务中退回薄索引角色，只承接：
  - chunk 列表
  - 状态
  - 依赖顺序
  - acceptance 入口
  - 对 detailed implementation plan 的链接
- **FR-008**: 系统 MUST 将本轮实施至少拆为以下 6 个 workstreams：
  - runtime control plane report shell cutover
  - validation bridge cutover
  - canonical error carrier cutover
  - settlement and submit verdict cutover
  - active-shape and locality cutover
  - host and examples dogfooding cutover
- **FR-009**: 系统 MUST 明确 member 之间的依赖顺序，使实施时不需要重新判断先做什么。
- **FR-010**: 若任一 member 的 planning 暴露出新的互斥 workstream，系统 MUST 新建独立 member spec，而不是污染现有 member scope。

### Key Entities _(include if feature involves data)_

- **Spec Group Entry**: 记录 member spec 的编号、目录、状态、依赖与一句话 scope。
- **Cutover Workstream**: 记录一条互斥的实施主线，例如 report shell、validation bridge、canonical error carrier。

### Non-Functional Requirements (Governance & Convergence)

- **NFR-001**: `140` 只承接总控治理、依赖和 gate，不复制 member 的详细实施步骤。
- **NFR-002**: 每个 member 的 primary scope 必须能用一句话解释，且不能与其他 member 重叠。
- **NFR-003**: 本轮所有 member 的 planning 与实施都必须遵守单轨实施，不为执行组织保留中间态兼容方案。
- **NFR-004**: 总控 spec 与 registry 的更新必须快于实现推进，避免 registry 滞后于真实 execution route。
- **NFR-005**: 详细实施计划的 canonical 落点是 `docs/superpowers/plans/*.md`，不是 group spec 里的 prose。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-4, KF-9) 维护者可在 3 分钟内从 `140/spec-registry.md` 把任一 Form cutover 问题路由到正确的 member spec。
- **SC-002**: 6 个 member workstream 都有互斥且稳定的一句话 scope，没有无主问题或 scope 重叠。
- **SC-003**: reviewer 可直接依据 `140/spec.md` 否决任何兼容层、双写、影子路径、弃用期或长期双轨方案。
- **SC-004**: 任一 member 进入 planning 阶段时，都能按固定的 5 张表展开，而不需要重新发明实施拆法。
- **SC-005**: `tasks.md` 与 detailed implementation plan 的分工清晰，不再同时承担两套详细任务真相源。
