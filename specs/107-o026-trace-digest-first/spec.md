# Feature Specification: O-026 Trace 载荷 digest-first 精简

**Feature Branch**: `107-o026-trace-digest-first`  
**Created**: 2026-02-26  
**Status**: Planned  
**Input**: User description: "O-026 Trace 载荷 digest-first 精简，事件默认 staticIrDigest+anchor，详细结构按需回查静态 IR，并完成三端迁移。"

## Source Traceability

- **Backlog Item**: O-026
- **Source File**: `docs/todo-optimization-backlog/items/O-026-trace-digest-first-payload.md`
- **Source Link**: [docs/todo-optimization-backlog/items/O-026-trace-digest-first-payload.md](../../docs/todo-optimization-backlog/items/O-026-trace-digest-first-payload.md)

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: N/A
- **Kill Features (KF)**: N/A

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 事件载荷先 digest（Priority: P1）

作为 runtime 性能维护者，我希望 trace 事件默认只携带 digest 与锚点，减少编码、传输与存储开销。

**Why this priority**: O-026 主目标是降低事件体积与导出成本。  
**Independent Test**: 对比改造前后 bytes/event、编码延迟与导出吞吐。

**Acceptance Scenarios**:

1. **Given** 高频 `state:update` 事件，**When** 开启 digest-first，**Then** 事件体积明显下降。
2. **Given** digest-first 事件，**When** 导出 evidence，**Then** 吞吐提升且结构稳定。

---

### User Story 2 - 按需回查静态 IR（Priority: P2）

作为调试消费者，我希望通过 `staticIrDigest + nodeId/stepId` 按需回查详细结构，不依赖事件内重载荷。

**Why this priority**: 保持可解释性与性能平衡。  
**Independent Test**: 使用 digest 与锚点完成回查并成功解释事件。

**Acceptance Scenarios**:

1. **Given** digest-first 事件，**When** 请求详细结构，**Then** 能从静态 IR 回查到对应节点。
2. **Given** digest 缺失或错配，**When** 消费端处理，**Then** 触发可测试降级策略。

---

### User Story 3 - 三端迁移一致（Priority: P3）

作为平台维护者，我希望 Devtools/Replay/Platform 三端先完成 digest 适配，再切 runtime digest-only。

**Why this priority**: breaking 面在消费端协议依赖。  
**Independent Test**: 三端合同一致性测试全绿。

**Acceptance Scenarios**:

1. **Given** 三端已适配 digest-first，**When** 切换 runtime 产物，**Then** 不发生协议断裂。
2. **Given** 旧字段依赖代码，**When** 执行迁移，**Then** 有明确替代路径。

### Edge Cases

- digest 缺失时必须有稳定降级码与可解释提示。
- digest 冲突/错配时必须能定位静态 IR 版本不一致。
- digest 计算开销不得抵消载荷精简收益。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: trace 事件 MUST 默认采用 digest-first 载荷（`staticIrDigest + nodeId/stepId + anchor`）。
- **FR-002**: 详细结构 MUST 通过静态 IR 按需回查，不再常驻事件载荷。
- **FR-003**: Devtools/Replay/Platform MUST 完成 digest-first 合同适配后再切 runtime 默认。
- **FR-004**: digest 缺失/错配 MUST 有明确降级策略与诊断码。
- **FR-005**: 旧重载荷字段迁移路径 MUST 文档化并可执行。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: bytes/event、编码时延、导出吞吐三项指标必须有可复现提升证据。
- **NFR-002**: 诊断事件保持 Slim/可序列化，关闭诊断时接近零成本。
- **NFR-003**: digest 计算开销受控，不得造成热路径超预算回归。
- **NFR-004**: 锚点稳定标识保持一致，不引入随机化字段。

### Key Entities _(include if feature involves data)_

- **TraceDigestPayload**: digest-first 事件载荷实体。
- **StaticIrLookupKey**: 静态 IR 回查键（digest + nodeId/stepId）。
- **TraceDigestDegradeRecord**: digest 缺失/错配降级记录。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: trace 事件平均体积显著下降并满足预算。
- **SC-002**: 导出性能和回放成功率不下降。
- **SC-003**: 三端 digest 合同一致性测试通过。
- **SC-004**: digest 缺失/错配场景可解释、可降级、可测试。
