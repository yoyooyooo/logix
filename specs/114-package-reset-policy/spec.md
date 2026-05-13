# Feature Specification: Package Reset Policy

**Feature Branch**: `114-package-reset-policy`
**Created**: 2026-04-05
**Status**: Done
**Input**: 建立全仓子包的分类与重启政策，明确哪些包保留、哪些包改名封存、哪些包从 0 到 1 重建，以及统一文件结构约束；对已对齐目标契约的实现与测试资产优先复用。

## Context

当前仓库已有大量子包，但这轮路线已经切到激进 cutover。此时“是否照顾旧子包”的正确问题是先把旧包归类：

- 哪些只是名字还能保留
- 哪些只保留可复用内核
- 哪些热链路、协议、helper 与测试可以直接沿用
- 哪些应该改名封存
- 哪些可以直接停止增长

没有这份政策，后续每个包级 spec 都会重复做同一轮裁决。

## Scope

### In Scope

- 建立子包 inventory 与处置枚举
- 建立可复用资产 inventory
- 固定“改名封存 + 新目录重建”的操作协议
- 固定统一文件结构约束
- 明确公共测试镜像、internal cluster、公开子模块的基本规则

### Out of Scope

- 不直接改任何一个包的实现代码
- 不替某个包决定具体 API 细节

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 先知道包去向再开工 (Priority: P1)

作为维护者，我能在重构前明确每个包的去向，避免边做边猜。

**Why this priority**: 包去向不明会导致目录先改一版，过几天又整包推翻。

**Independent Test**: 查看包政策输出后，能快速回答 `core`、`core-ng`、`react`、`query`、`cli`、`examples` 相关包的处置类型。

**Acceptance Scenarios**:

1. **Given** 我准备重构某个包，**When** 我读取包政策，**Then** 我能知道该包是保留、封存重建、并入 kernel 还是停止增长。
2. **Given** 某个包已有热链路或覆盖测试已满足目标契约，**When** 我读取包政策，**Then** 我能知道这些资产应直接复用、平移还是只做最小适配。

---

### User Story 2 - 统一文件结构约束 (Priority: P2)

作为实现者，我能拿到统一的 package topology 约束，确保新目录不会各长各的。

**Why this priority**: 如果每个 spec 都自己发明目录规则，后续包间会再次碎裂。

**Independent Test**: 任意包都能按政策回答公开层、internal 层、测试镜像、示例或 fixtures 的放置位置。

**Acceptance Scenarios**:

1. **Given** 我新增一个公开子模块，**When** 我对照包政策，**Then** 我知道它应该放在 `src/*.ts` 还是 `src/<domain>/index.ts` 一类稳定入口。
2. **Given** 我需要封存旧目录，**When** 我按协议执行，**Then** 我知道旧目录应如何改名，新的主线目录如何命名。

### Edge Cases

- 某个包只需要拆出一层 `kernel`，不需要整体重建，此时处置类型必须能表达“并入 kernel”。
- 某个包已经偏离主线又仍有少量可复用实现，处置策略必须允许“旧目录封存 + 内核片段迁移”。
- 某个包的公开面需要重写，但内部测试夹具仍可复用，此时策略必须允许“主线重启 + 测试资产平移”。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 为当前所有关键包建立 inventory，并给出明确处置类型。
- **FR-002**: 系统 MUST 定义统一处置枚举，至少包含 `preserve`、`freeze-and-rebootstrap`、`merge-into-kernel`、`drop`。
- **FR-003**: 系统 MUST 定义“改名封存 + 新目录重建”的操作协议，包括旧目录命名规则、新目录主线规则、事实源回写规则。
- **FR-004**: 系统 MUST 固定包级文件结构约束，包括公开层、internal 层、测试目录、示例或 fixtures 的基本位置。
- **FR-005**: 系统 MUST 明确各类包的默认拓扑模板，至少覆盖 core、host integration、domain package、CLI、tooling。
- **FR-006**: 系统 MUST 为每个关键包记录可复用资产，至少覆盖热链路实现、协议、helper、fixtures、覆盖测试中的一类。

### Key Entities _(include if feature involves data)_

- **Package Disposition Record**: 记录包名、当前职责、目标职责、处置类型、可复用资产、回写页面、后续 owner spec。
- **Package Topology Contract**: 记录包的公开层、internal 层、test mirror、examples 或 fixtures 的结构约束。

### Non-Functional Requirements (Stability & Consistency)

- **NFR-001**: 包政策必须可被后续 spec 复用，不能让每个包再次自定义处置枚举。
- **NFR-002**: 统一拓扑规则必须足够简单，能被 LLM 与维护者稳定生成和校验。
- **NFR-003**: 包政策必须与 docs 事实源一致，任何包去向变化都要能回写到相关 SSoT 或 standards。
- **NFR-004**: 包政策必须默认优先复用已对齐目标契约的实现与测试资产，禁止把“全量重写”当作默认姿势。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 当前关键包都能在单一政策文档中找到明确处置类型。
- **SC-002**: 任意实现者在开始包级重构前，都能用 5 分钟以内判断该包的目录与迁移策略。
- **SC-003**: 后续 115 到 119 不需要重复发明处置枚举与目录模板。
- **SC-004**: 任意关键包都能明确区分“应重写部分”和“可直接复用部分”。
