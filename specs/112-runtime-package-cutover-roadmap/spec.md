# Feature Specification: Runtime Package Cutover Roadmap

**Feature Branch**: `112-runtime-package-cutover-roadmap`
**Created**: 2026-04-05
**Status**: Done
**Input**: 建立一套 docs 与 packages 的激进 cutover 总控 spec，按 forward-only 原则把 docs 收口、子包 reset 策略、core kernel 下沉、CLI 重启、examples 与 verification 收口拆成可并行推进的成员 specs。

## Context

当前仓库的新 docs 骨架已经成形，但实现侧仍夹杂旧 facade、旧命名、旧目录拓扑和存量子包语义。这个总控 spec 的前提已经明确：

- 现有子包属于存量材料，不属于默认兼容目标
- 当旧包语义与新方向偏差过大时，允许先改名封存，再从 0 到 1 重建
- 当已有热链路、协议、实现片段或测试已经对齐目标契约时，默认优先复用或平移，不做无价值重写
- `@logixjs/core` 需要显式下沉出 `kernel`
- docs、package topology、examples、verification 必须一起规划，避免二次返工

本 spec 只负责拆路线、定依赖、给单入口，不承载成员 spec 的实现细节。

## Scope

### In Scope

- 创建 113 到 119 的成员 spec，并给出依赖顺序
- 明确哪些工作属于 docs 收口、哪些属于 topology 规划、哪些属于实际重构入口
- 建立 group registry，作为这一轮 cutover 的成员关系 SSoT
- 固定统一口径：现有子包按保留、封存重建、并入 kernel、待删除四类处理，并明确可复用资产的保留规则

### Out of Scope

- 不在本 spec 内直接改 runtime、React、CLI 或 examples 代码
- 不复制成员 spec 的任务清单
- 不替成员 spec 提前做 plan、tasks、contracts 的细节展开

## Members

- `specs/113-docs-runtime-cutover/`
- `specs/114-package-reset-policy/`
- `specs/115-core-kernel-extraction/`
- `specs/116-host-runtime-rebootstrap/`
- `specs/117-domain-package-rebootstrap/`
- `specs/118-cli-rebootstrap/`
- `specs/119-examples-verification-alignment/`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 只记一个编号也能推进 (Priority: P1)

作为维护者，我只需要记住 `112`，就能知道本轮 cutover 的成员 specs、依赖顺序和下一跳入口。

**Why this priority**: 当前工作横跨 docs、runtime、子包、examples 和 verification，缺少总控编号会导致路线再次碎裂。

**Independent Test**: 打开 `112/spec.md`、`112/spec-registry.json`、`112/spec-registry.md`，能在 2 分钟内回答先做什么、后做什么、每个成员负责哪一块。

**Acceptance Scenarios**:

1. **Given** 我刚进入这个仓库，**When** 我从 `112` 开始读，**Then** 我能定位所有成员 spec 和它们的依赖顺序。
2. **Given** 某个成员 spec 完成或冻结，**When** 我更新 group registry，**Then** 总控入口能反映当前状态而不需要复制成员任务。

---

### User Story 2 - 把旧包视为存量材料而非包袱 (Priority: P2)

作为架构维护者，我可以明确每个现有子包的去向，不再默认延续旧名字、旧目录和旧公开面。

**Why this priority**: 这轮方案已经转成激进 cutover，若继续把旧包当作兼容边界，后续每个 spec 都会被历史结构拖住。

**Independent Test**: 查看 group spec 和 `114`，能明确哪些包进入封存重建、哪些包保留、哪些包并入 kernel，以及哪些热链路或测试资产会直接复用。

**Acceptance Scenarios**:

1. **Given** 某个包与新方向明显冲突，**When** 我查看总控与包政策 spec，**Then** 我能看到它进入“改名封存 + 新包重建”的路径。
2. **Given** 某个包仍有可保留内核，**When** 我查看相关 spec，**Then** 我能看到它保留的只是可复用内核和契约，不含旧 facade 负担。

---

### User Story 3 - 避免并行真相源 (Priority: P3)

作为 reviewer，我希望 group 文档只承接成员关系和门禁，所有实现细节都回到成员 spec。

**Why this priority**: docs、plan、tasks、roadmap 一旦交叉复制，很快又会回到多份真相源。

**Independent Test**: 修改 `spec-registry.json` 后重新审视 group 文档，成员关系变化可见，成员实现细节仍停留在各自 spec 中。

**Acceptance Scenarios**:

1. **Given** 成员依赖关系有调整，**When** 我只更新 group registry，**Then** 总控 spec 仍然成立，不需要复制实现细节。

### Edge Cases

- 某个成员 spec 被判定为 no-go，group registry 仍要保留条目并标明冻结原因。
- 若某个包需要拆成两轮重构，必须新增成员 spec，不允许把两个不同目标塞进一个成员 spec。
- 若旧包目录改名封存，新目录的事实源必须立即回写到对应成员 spec，避免“新旧目录都像主线”。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 提供一个 group registry 事实源，记录 113 到 119 的成员 id、目录、状态与依赖。
- **FR-002**: 系统 MUST 明确本轮 cutover 的唯一总控入口为 `112`，并给出成员 spec 的跳转关系。
- **FR-003**: 系统 MUST 统一现有子包的处置模型，至少覆盖 `preserve`、`freeze-and-rebootstrap`、`merge-into-kernel`、`drop` 四类去向。
- **FR-004**: 系统 MUST 把 docs 收口、package topology、core kernel、host 包、domain 包、CLI、examples 与 verification 拆成互斥成员 spec。
- **FR-005**: 系统 MUST 要求成员 spec 在进入实现前写清回写点，至少包含 docs、目录结构、examples 或 verification 中的受影响入口。
- **FR-006**: 系统 MUST 要求各成员 spec 记录可直接复用的热链路、协议、helper、fixtures 与测试资产，避免重复劳动。

### Non-Functional Requirements (Governance & Drift)

- **NFR-001**: group 只承接成员关系与推进门禁，不能复制成员 spec 的实现任务或技术细节。
- **NFR-002**: 本轮方案 MUST 遵守 forward-only，默认不保留兼容层与弃用期。
- **NFR-003**: 任何成员 spec 只要改变核心判断，就必须回写新事实源，避免 docs 与 topology 漂移。
- **NFR-004**: 本轮改造 MUST 以“复用已对齐资产、激进改造必要升级点”为主基调，禁止为了目录整洁或叙事统一而重写已可复用的实现。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 任意维护者在 2 分钟内能从 `112` 找到本轮 cutover 的所有成员 spec 与依赖顺序。
- **SC-002**: 113 到 119 的职责边界清晰，没有两个成员 spec 同时声称拥有同一目录或同一裁决。
- **SC-003**: 后续进入 plan 阶段时，所有成员 spec 都能以 `112/spec-registry.json` 作为唯一成员关系来源。
