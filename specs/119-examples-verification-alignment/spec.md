# Feature Specification: Examples Verification Alignment

**Feature Branch**: `119-examples-verification-alignment`
**Created**: 2026-04-05
**Status**: Done
**Input**: 重排 examples/logix、场景样例与 verification 入口，使示例、fixtures/env、steps、expect 和 docs 锚点一致。

## Context

当前 `examples/logix` 已有 `features`、`patterns`、`runtime`、`scenarios` 等目录，但它们和新的 verification control plane 还没有形成统一叙事。若 examples 继续沿旧结构增长，后续文档、CLI、sandbox、test 都会缺少同一套示例入口。

这份 spec 的职责是把 examples 与 verification 的目录关系、示例锚点、docs 回写点一次规划到位，并优先复用那些已经能表达主线语义的现有 examples 与场景测试。

## Scope

### In Scope

- `examples/logix` 的目标目录拓扑
- `features / patterns / runtime / scenarios / verification` 的关系
- `fixtures/env + steps + expect` 的示例入口
- docs 锚点与 examples 的交叉回写

### Out of Scope

- 不在本 spec 内重写全部示例代码
- 不负责 CLI 或 core kernel 本体规划

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 示例能对应文档与验证入口 (Priority: P1)

作为作者或 reviewer，我能从 docs 找到对应示例，也能从示例走回 verification 入口。

**Why this priority**: examples 若只是一堆散落 demo，无法承担主线 dogfooding 与验证样例的角色。

**Independent Test**: 任取一个 docs 锚点，都能找到对应 example 或 verification 示例；任取一个 example，也能找到它对应的 docs 页面或验证入口。

**Acceptance Scenarios**:

1. **Given** 我在读 runtime 文档，**When** 我需要一个可运行例子，**Then** 我能定位到对应 example。
2. **Given** 我在看 scenario 示例，**When** 我想把它转成验证输入，**Then** 我能找到 `fixtures/env`、`steps`、`expect` 的对应入口。

---

### User Story 2 - 示例目录不再混杂 (Priority: P2)

作为维护者，我希望 examples 的目录拓扑在开新例子之前就固定下来。

**Why this priority**: 目录不先规划，后续例子会持续长成历史混合物。

**Independent Test**: 阅读 spec 后，能明确不同类型示例应该放在哪个目录，不再混写。

**Acceptance Scenarios**:

1. **Given** 我要新增一个 pattern 复用示例或 verification 示例，**When** 我对照 spec，**Then** 我知道它应进入哪个目录和怎样命名。

### Edge Cases

- 某些现有 scenario 既是业务样例又是验证材料，此时必须定义主归属和辅助链接。
- 旧示例若继续存在，也必须标明它是否仍代表主线语义。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 定义 `examples/logix` 的目标目录结构，至少覆盖 `features`、`patterns`、`runtime`、`scenarios`、`verification`。
- **FR-002**: 系统 MUST 定义场景示例与 `fixtures/env + steps + expect` 之间的对应关系。
- **FR-003**: 系统 MUST 为 runtime、domain、control plane 文档提供稳定的 examples 锚点与回写规则。
- **FR-004**: 系统 MUST 明确哪些现有示例继续保留，哪些需要迁移、封存或重写。
- **FR-005**: 系统 MUST 让 examples 既能服务 dogfooding，也能服务 verification 与 reviewer 验收。
- **FR-006**: 系统 MUST 识别哪些现有 scenarios、patterns、fixtures 与测试可以直接复用或最小适配。

### Non-Functional Requirements (Usability & Drift)

- **NFR-001**: examples 的结构必须足够直观，维护者与 Agent 都能稳定找到入口。
- **NFR-002**: verification 示例必须与 control plane 输入协议保持一致，不得额外长出另一套 DSL。
- **NFR-003**: docs、examples、verification 三者之间的锚点关系必须可持续回写。
- **NFR-004**: examples 与 verification 的重排默认优先保留已对齐主链语义的现有样例。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: docs 与 examples 之间能建立一一对应的主线锚点。
- **SC-002**: 任意维护者在 5 分钟内能判断某个新示例应放在 examples 的哪个目录。
- **SC-003**: verification 协议可以直接从 examples 中找到真实样例输入。
