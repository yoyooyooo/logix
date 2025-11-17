# Feature Specification: 可序列化诊断与稳定身份（Observability Hardening）

**Feature Branch**: `[016-serializable-diagnostics-and-identity]`  
**Created**: 2025-12-18  
**Status**: Draft  
**Input**: User description: "把 005/011/013 的横切问题收敛：诊断事件必须可序列化、锚点必须稳定且单一事实源（instanceId），避免双锚点/cause:unknown 污染证据包与跨宿主链路。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 证据包永不因不可序列化而崩溃 (Priority: P1)

作为 Devtools/Sandbox 使用者，我希望导出/导入证据包时永不因为事件里夹带不可序列化对象（例如 `Cause`、DOM、循环引用、BigInt）而崩溃；即使字段被降级，也必须以**可解释的数据标记**被观察到（UI 展示属于后续交付面，但核心数据必须可被 UI 消费）。

**Why this priority**: 证据包是“可回放/可对齐”的基石；一旦崩溃，所有上层诊断/回归/协作都会失效。

**Delivery Slice**: 当前执行顺序以 `tasks.md` 为准：先在 core 层锁定可导出事件/Hub snapshot 的 JSON 硬门与降级口径；EvidencePackage 的 export/import 与 UI 交付面在 Deferred Phase 补齐。

**Independent Test**: 构造包含不可序列化 `cause` 的 `lifecycle:error` 与超大 payload，导出为 EvidencePackage 后 `JSON.stringify` 必须成功；导入后可读取 `errorSummary + downgrade.reason`（UI 展示在 Deferred 交付面完成）。

**Acceptance Scenarios**:

1. **Given** 运行时产生包含不可序列化对象图的错误原因，**When** 导出为 EvidencePackage，**Then** 导出的 payload 满足协议层 JSON 硬门，且附带可读的降级标记与摘要信息。
2. **Given** 一份经过降级的 EvidencePackage，**When** 导入到 Devtools 数据层，**Then** 不崩溃且能按 runId/seq 还原顺序，并能提供可消费的 `errorSummary + downgrade.reason`（用于 UI 提示“已降级（不可序列化/超大）”）。

---

### User Story 2 - instanceId 成为唯一实例锚点 (Priority: P1)

作为平台集成者与运行时维护者，我希望事件/回调/证据包里只存在一个权威的实例锚点：`instanceId`。禁止出现“第二锚点字段”，也不应再出现在用户心智模型中。

**Why this priority**: 双锚点会制造“双真相源”，导致聚合、回放、跨宿主对齐不可证明且难以排障。

**Independent Test**: 对任意一条可导出的 debug 事件/生命周期错误事件，断言 `instanceId` 必填且可关联；并满足宪法要求的事务关联字段（`txnId` 或可确定性重建的等价集合）；导出/导入后不依赖“第二锚点”也能聚合到同一实例。

**Acceptance Scenarios**:

1. **Given** 同一模块的多个实例并行运行，**When** 导出并导入证据包，**Then** Devtools 能用 `instanceId` 正确区分实例并关联其事务窗口/错误事件。
2. **Given** React `RuntimeProvider.onError` 收到未处理错误，**When** 上报错误上下文，**Then** 上下文包含 `instanceId`（不再存在“第二锚点字段”）。

---

### User Story 3 - 诊断默认近零成本且可裁剪 (Priority: P2)

作为性能敏感的业务开发者，我希望默认诊断不会显著增加核心路径分配与时间；当启用诊断时，事件数量/体积有明确预算，并能通过 `off|light|full` 分档裁剪。

**Why this priority**: 可诊断性是产品能力，但不能以牺牲核心路径性能为代价；必须可预测、可量化。

**Independent Test**: 在关闭诊断时，导出链路不产生额外事件与高成本序列化；在开启诊断时，每条事件能在预算内完成 JSON 化。

**Acceptance Scenarios**:

1. **Given** 诊断档位为 off，**When** 运行高频事务，**Then** 不产生可导出的诊断事件（或仅保留零成本计数），不做递归 JSON 降级扫描，并满足 `perf.md` 中定义的默认门槛（p95 ≤ +5%）。
2. **Given** 诊断档位为 light/full，**When** 发生错误与关键生命周期转折点，**Then** 产生 Slim 且可 JSON 序列化的事件，并可被导出为证据包。

### Edge Cases

- 导出 payload 包含 `bigint` / `symbol` / 循环引用 / DOM 节点 / 函数 / class 实例时如何降级？
- 错误堆栈过长（>64KB）或包含敏感信息时如何裁剪（不做脱敏提示，但必须有体积上界）？
- 同一 run 内 seq 允许间隙；导入端不得假设连续。
- 非事务事件（例如 `module:init`）如何满足事务关联字段要求（`txnId` 或等价集合）？

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须定义“宿主内原始事件”与“可导出/跨宿主事件”的边界：导出形态必须满足协议层 JSON 硬门（以 `specs/005-unify-observability-protocol/contracts/schemas/json-value.schema.json` 为准）。
- **FR-002**: 系统必须为错误原因提供统一的可序列化摘要（`SerializableErrorSummary`），并规定降级标记（不可序列化/超大/未知）。
- **FR-003**: 系统必须将 `instanceId` 作为唯一实例锚点：导出/跨宿主事件必须包含 `moduleId + instanceId`；禁止出现“第二锚点字段”（不提供兼容读取）。
- **FR-004**: 系统必须把该边界与锚点规则同步到相关 specs 与文档：至少包含 005（协议 schemas）、011（生命周期错误上下文与 onError 桥）、013（trait:converge 证据锚点口径）。
- **FR-005**: 系统必须提供一条可执行的“序列化硬门”验收路径：至少对 EvidencePackage 做 `JSON.stringify` 断言，并覆盖 `lifecycle:error` / `diagnostic` / `trait:*` 事件类型。
- **FR-006**: 系统必须对齐稳定标识模型（参照 `specs/009-txn-patch-dirtyset/spec.md`）：可导出事件必须满足 `moduleId + instanceId + txnId`（或可确定性重建的等价集合，例如 `txnSeq`），并保证 `eventId/txnId` 不以随机/时间作为默认来源。
- **FR-007**: 系统必须将 `$.lifecycle.*` 固化为 setup-only 注册 API：run 段调用必须产生可导出的 `logic::invalid_phase` 诊断事件（Slim + 可序列化 + 含 `instanceId`），并暴露可序列化的 `LifecycleStatus.initProgress` 以诊断初始化卡住。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 导出/归一化链路不得成为核心路径新瓶颈：默认 off 档位必须近零成本（默认门槛：p95 ≤ +5%，见 `perf.md`）；light/full 档位必须声明事件数量与体积预算上界。
- **NFR-002**: 诊断事件必须是 Slim 且可 JSON 序列化；禁止把不可序列化对象图写入 ring buffer 或 EvidencePackage。
- **NFR-003**: 标识必须去随机化：`instanceId` 必须可注入/可推导；避免默认使用 `Math.random()/Date.now()` 生成主锚点。

### Key Entities *(include if feature involves data)*

- **Export Boundary**: “宿主内原始对象”与“可导出/跨宿主 JSON 负载”之间的边界与降级规则。
- **SerializableErrorSummary**: 错误原因的可序列化摘要形态（用于导出/跨宿主）。
- **ModuleRuntimeIdentity**: `moduleId + instanceId (+ runtimeLabel?)` 的实例锚点集合。
- **ObservationEnvelope/EvidencePackage**: 以 `runId + seq` 作为唯一权威顺序（允许间隙），并承载可导出事件负载（见 005 contracts）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 任意 EvidencePackage 必须可 `JSON.stringify` 成功；导入端不因不可序列化字段崩溃。
- **SC-002**: 导出/跨宿主事件必须以 `instanceId` 为唯一实例锚点；Devtools 只依赖 `instanceId` 聚合实例。
- **SC-003**: 诊断 off 档位下，导出链路不做递归降级扫描与深拷贝；light/full 档位下单条事件 JSON 化后体积有明确上界（例如 ≤4KB）。
- **SC-004**: 可导出事件满足宪法的事务关联字段要求：能以 `instanceId` 串起 `txnId/txnSeq` 等稳定标识，支持回放对齐与跨宿主桥接。
