# Feature Specification: O-005 单一最小 IR 收敛（Static IR + Dynamic Trace）

**Feature Branch**: `[098-unified-minimal-ir]`  
**Created**: 2026-02-25  
**Status**: Planned  
**Input**: User description: "O-005 单一最小 IR 收敛：Static IR + Dynamic Trace 同一事实链；收敛多源 IR，减少 trial/fallback 常态化；full cutover 从可选门禁升级为默认策略；验收是 Devtools/Evidence/Replay/Platform 对同一 IR 解释一致。"

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-1, NS-3, NS-5, NS-10
- **Kill Features (KF)**: 本特性不单独新增 KF；沿用北极星约束落地

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 默认 full cutover 的单一 IR 执行链 (Priority: P1)

作为 Runtime 维护者，我希望默认执行路径只产出并消费一套最小 IR（Static IR + Dynamic Trace），并且不再隐式走 trial/fallback，这样核心执行语义、诊断语义和失败语义都能稳定收敛。

**Traceability**: NS-3, NS-5, NS-10

**Why this priority**: 不先收敛默认执行链，后续 Devtools/Evidence/Replay/Platform 的一致性都会建立在不稳定前提上。

**Independent Test**: 仅开启默认策略运行同一场景，验证无隐式 fallback，且失败均以结构化 reason codes 暴露。

**Acceptance Scenarios**:

1. **Given** runtime 使用默认策略，**When** 执行包含 module/flow/trait 的标准场景，**Then** 只导出一套最小 IR，并记录稳定锚点链路（instanceId/txnSeq/opSeq/tickSeq/linkId）。
2. **Given** 出现不满足 full cutover 的输入，**When** 执行运行，**Then** 系统 fail-fast 或显式降级并给出 reason codes，不允许静默回退到旧路径。
3. **Given** 诊断关闭，**When** 场景高频执行，**Then** 仅保留最小锚点事实，不引入显著额外开销。

---

### User Story 2 - 四类消费者对同一 IR 的解释一致 (Priority: P2)

作为平台与工具链维护者，我希望 Devtools、Evidence、Replay、Platform 都消费同一份 IR 事实链，并得到一致的因果解释，避免“每个消费者一套私有语义”。

**Traceability**: NS-1, NS-5, NS-10

**Why this priority**: 若解释不一致，定位与回放结论会互相冲突，无法形成可信闭环。

**Independent Test**: 固定同一输入场景，分别导出四类消费视图，比较锚点覆盖与因果顺序是否一致。

**Acceptance Scenarios**:

1. **Given** 同一 run 的输出工件，**When** 四类消费者分别读取，**Then** 对同一事务链的锚点映射与顺序一致。
2. **Given** 诊断事件触发降级（如 non_serializable/oversized），**When** 四类消费者解释该事件，**Then** 都能看到一致的 downgrade 原因与可追溯锚点。

---

### User Story 3 - 破坏性收敛可迁移、可交接 (Priority: P3)

作为业务与工具集成方，我希望在无兼容层前提下仍能按迁移说明完成升级，以便快速进入新模型而不长期背负双栈维护成本。

**Traceability**: NS-3, NS-10

**Why this priority**: forward-only 政策允许 breaking，但必须给出可执行迁移路径，否则会阻塞升级。

**Independent Test**: 按迁移说明改造旧消费者后，能通过同一 IR 验收并移除旧协议依赖。

**Acceptance Scenarios**:

1. **Given** 旧版多源 IR 消费方，**When** 按迁移说明完成改造，**Then** 可通过统一 IR 契约验收且无兼容层依赖。
2. **Given** 升级后出现不兼容输入，**When** 运行迁移检查，**Then** 能定位到明确断点并给出对应迁移动作。

---

### Edge Cases

- 运行期事件缺失关键锚点（如 `instanceId` 或 `txnSeq`）时，必须视为协议违例并显式失败或降级，不允许补造伪锚点。
- 某些模块只能降级为 Gray/Black Box 时，必须保留最小可诊断信息（owner/loc/粗粒 source-sink）并输出 reason codes。
- `meta` 含不可序列化对象或超预算内容时，必须结构化降级（`non_serializable`/`oversized`），不得静默丢弃。
- replay 输入存在锚点断裂（如 `txnSeq` 非单调）时，必须拒绝生成“看似可回放”的结果。
- 事务窗口出现 IO/await 或写逃逸时，必须立即触发可解释诊断并阻断该违规路径。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: (NS-3, NS-5) 系统 MUST 将 Static IR 与 Dynamic Trace 收敛为单一最小 IR 事实链，并为每条动态记录保留可回链到静态结构的锚点。
- **FR-002**: (NS-1, NS-5) 系统 MUST 让 Devtools、Evidence、Replay、Platform 四类消费者读取同一 IR 载体与锚点语义，不允许并行私有事实源。
- **FR-003**: (NS-3) 系统 MUST 将 full cutover 升级为默认策略，并禁止隐式 trial/fallback 常态化路径。
- **FR-004**: (NS-3, NS-10) 当 full cutover 条件不满足时，系统 MUST fail-fast 或显式降级并产出结构化 reason codes；不得静默回退。
- **FR-005**: (NS-5) 系统 MUST 在动态证据中提供稳定且可复现的锚点集合（至少覆盖 `moduleId`、`instanceId`、`txnSeq`、`tickSeq`，以及可用时的 `opSeq/linkId`）。
- **FR-006**: (NS-10) 系统 MUST 保证可导出诊断事件为 Slim 且可序列化；遇到不可序列化或超预算数据时必须记录降级原因。
- **FR-007**: (NS-3, NS-5) 系统 MUST 维持事务窗口禁止 IO/await 与禁止写逃逸（包括业务侧直接写 SubscriptionRef）的执行纪律。
- **FR-008**: (NS-3) 系统 MUST 提供破坏性收敛迁移说明，明确旧 IR 入口/字段到新事实链的映射与替代动作。
- **FR-009**: (NS-1) 系统 MUST 让同一 run 的四类消费结果可进行一致性对账（锚点覆盖、顺序、降级原因）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统 MUST 为本特性涉及的 runtime 热路径建立可复现性能基线（before/after + diff），并在同 envId/profile 下对比。
- **NFR-002**: 默认诊断关闭时，核心路径额外开销 MUST 维持接近零成本（目标：关键基准回归不超过 2%）。
- **NFR-003**: 诊断开启时，系统 MUST 提供可解释成本数据（至少区分 light/full 档位），并记录预算触发与裁剪统计。
- **NFR-004**: 所有新增或调整的动态事件 MUST 保持 Slim/JsonValue 可序列化，并采用有界缓冲与可观测降级。
- **NFR-005**: 稳定标识 MUST 去随机化；`instanceId/txnSeq/opSeq` 不得默认依赖 `Math.random()` 或墙钟时间生成。
- **NFR-006**: 本特性作为 breaking change MUST 提供迁移说明，且 MUST NOT 引入兼容层或弃用过渡期。
- **NFR-007**: 若本特性改变用户的性能认知边界，文档 MUST 同步更新统一术语（≤5 关键词）、粗粒度成本模型与优化梯子。

## Breaking 风险、迁移说明与用户影响

### Breaking 风险

- 默认执行策略从“可选 full cutover + 常态 fallback”改为“默认 full cutover + 显式失败/降级”，会改变部分场景的失败暴露时机。
- 多源 IR 并存将被收敛，依赖旧入口或旧字段语义的消费者需要一次性切换。
- 部分“隐式补齐锚点”行为将被禁止，历史上依赖补造行为的调试脚本会失效。

### 迁移说明（无兼容层）

- 提供一份迁移清单，至少包含：旧入口/字段 → 新入口/字段映射、必须整改项、可自动检查项、失败 reason code 对照。
- 迁移完成标准：消费者只读取统一最小 IR；默认路径无隐式 fallback；四类消费者一致性验收通过。
- 迁移期间允许通过显式配置选择“停止升级并失败”，不允许通过兼容层偷偷继续旧语义。

### 用户影响

- 对终端业务用户：功能语义不应变化，但故障可解释性与回放一致性会提升，问题暴露会更早更明确。
- 对开发者与工具维护者：需要按迁移说明更新 IR 消费逻辑；升级后将减少多源协议维护成本。

### Key Entities _(include if feature involves data)_

- **UnifiedStaticIR**: 静态结构事实源，包含 module/flow/trait 等结构切片与可对齐锚点。
- **UnifiedDynamicTrace**: 动态证据时间线，记录事务与操作的稳定序列以及降级元信息。
- **IrEvidencePackage**: 供 Devtools/Evidence/Replay/Platform 共享消费的统一导出载体。
- **MigrationNote**: 破坏性升级交付物，定义映射规则、断点类型与迁移动作。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: (NS-1, NS-5) 对同一验收场景，Devtools/Evidence/Replay/Platform 的锚点覆盖与事务顺序一致性达到 100%。
- **SC-002**: (NS-3) 默认策略下，隐式 fallback 计数为 0；所有回退仅以显式失败或显式降级出现。
- **SC-003**: 核心热路径在同 envId/profile 的 before/after 对比中，无超预算回归（按本特性 plan 中预算阈值判定）。
- **SC-004**: 诊断关闭场景下，额外开销满足 NFR-002 预算；诊断开启时可输出完整成本与降级统计。
- **SC-005**: 至少 1 组代表性旧消费者按迁移说明完成升级，并通过统一 IR 一致性验收。
- **SC-006**: 任一被记录的失败或降级都可通过 reason code + 锚点链路被解释与复现。
