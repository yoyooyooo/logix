# Feature Specification: O-009 ReadQuery 严格门禁前移到构建期

**Feature Branch**: `099-o009-readquery-build-gate`  
**Created**: 2026-02-25  
**Status**: Active  
**Input**: User description: "O-009 ReadQuery 严格门禁前移到构建期：在 module/logic 编译期产出 selector 质量报告与静态约束，运行时仅消费已定级 selector，减少热路径治理分支。"

## Background

当前 `ReadQuery` 的动态回退判定与 strict gate 决策仍在运行时发生，导致热路径存在治理分支：

- 运行时仍需根据 selector 编译结果判定 lane/fallbackReason。
- 运行时仍需做 strict gate 规则匹配并输出告警/错误。
- 同一 selector 的“质量定级”缺少构建期稳定产物，跨环境口径容易漂移。

本特性将把“selector 质量定级 + 严格门禁决策”前移到 module/logic 构建期，运行时只消费已定级结果并执行最小必要路径。

## North Stars & Kill Features Traceability _(optional)_

- **North Stars (NS)**: NS-3, NS-10
- **Kill Features (KF)**: KF-3, KF-8

## Related (read-only references)

- `packages/logix-core/src/internal/runtime/core/ReadQuery.ts`
- `packages/logix-core/src/internal/runtime/core/ModuleRuntime.impl.ts`
- `packages/logix-core/test/ReadQuery/ReadQuery.strictGate.test.ts`
- `specs/057-core-ng-static-deps-without-proxy/spec.md`
- `specs/068-watcher-pure-wins/spec.md`

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 构建期产出 selector 质量报告与静态约束 (Priority: P1)

作为 runtime/平台维护者，我希望在 module/logic 编译期产出 selector 质量报告（包含 lane、fallbackReason、稳定 selectorId、readsDigest、约束判定），让“能否通过 strict gate”在构建期就可审计。

**Traceability**: NS-3, KF-3

**Why this priority**: 若没有构建期定级，治理判定只能在运行时重复执行，热路径无法彻底收敛。

**Independent Test**: 在仅执行构建任务的情况下，可生成质量报告并对违规 selector 产出可序列化失败信息。

**Acceptance Scenarios**:

1. **Given** module 中存在可静态化 selector，**When** 执行编译，**Then** 质量报告将其标记为 static 且包含稳定 `selectorId` 与 `readsDigest`。
2. **Given** module 中存在不可静态化 selector，**When** 执行编译，**Then** 质量报告标记 dynamic 且包含稳定 `fallbackReason`，并按 strict gate 规则给出 warn/error 结论。
3. **Given** strict gate 设置为 error，**When** 构建期存在不满足约束的 selector，**Then** 构建失败并输出结构化诊断（可序列化）。

---

### User Story 2 - 运行时仅消费已定级 selector，简化热路径 (Priority: P1)

作为 runtime 维护者，我希望 `ModuleRuntime` 在订阅路径中优先消费构建期定级产物，不再重复执行 strict gate 决策分支，降低提交与订阅热路径治理开销。

**Traceability**: NS-10, KF-8

**Why this priority**: 热路径治理分支越少，越容易保障吞吐/延迟并减少诊断噪声。

**Independent Test**: 在不引入 Devtools 的最小运行场景下，可验证运行时路径改为消费定级结果且行为与原语义等价。

**Acceptance Scenarios**:

1. **Given** 存在构建期产出的定级 selector，**When** 运行时订阅该 selector，**Then** 运行时直接消费定级结果，不再重复 strict gate 匹配。
2. **Given** 定级结果标记为 static，**When** 提交无关状态变更，**Then** 行为与旧实现等价，且无额外治理分支触发。
3. **Given** 输入 selector 未定级，**When** 运行时命中该路径，**Then** 走显式的受控降级策略并给出稳定 `fallbackReason`（而非静默退化）。

---

### User Story 3 - 诊断链路/IR 对齐与迁移可落地 (Priority: P2)

作为平台与 Devtools 维护者，我希望构建期报告、运行时动态 trace、IR 锚点保持同一套稳定标识，并提供破坏性变更迁移说明。

**Traceability**: NS-3, NS-10, KF-3, KF-8

**Why this priority**: 前移门禁会改变治理边界，必须保证可解释链路与迁移成本可控。

**Independent Test**: 仅通过报告与诊断回归测试，可验证构建期与运行时锚点一致、迁移信息完整。

**Acceptance Scenarios**:

1. **Given** 同一 selector 在构建期与运行时都被追踪，**When** 导出证据，**Then** 两者使用同一 `selectorId/moduleId/instanceId` 口径并可对齐。
2. **Given** 项目从运行时 strict gate 迁移到构建期 gate，**When** 按迁移说明升级配置，**Then** 行为可预测且不依赖兼容层。

---

### Edge Cases

- 构建产物缺失、版本漂移或哈希不匹配时：运行时必须按明确策略 fail-fast 或受控降级，并输出稳定原因码。
- 同一 `selectorId` 对应不同语义（reads/equals/lane）时：必须在构建期阻断，禁止进入运行时。
- 显式声明为 dynamic 的 selector：必须在报告中被标记为“已声明动态”，避免与“不可分析退化”混淆。
- 多模块并行构建时：报告合并必须保持 module 级隔离，不得污染其他模块定级结果。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 在 module/logic 编译期产出 `SelectorQualityReport`，最少包含 `moduleId`、`selectorId`、`lane`、`producer`、`fallbackReason?`、`readsDigest?`、`strictGateVerdict`。
- **FR-002**: 构建期 MUST 生成稳定可复现的 selector 标识与定级结果；同输入在同版本规则下必须产出相同结果。
- **FR-003**: strict gate 规则（`mode`、`requireStatic`、`denyFallbackReasons`）MUST 支持在构建期评估，并在 `error` 模式下阻断构建。
- **FR-004**: 运行时 `ReadQuery` 消费路径 MUST 优先读取构建期定级结果；对“已定级 selector”不得再重复执行同类 strict gate 判定分支。
- **FR-005**: 对未定级 selector，运行时 MUST 使用显式降级策略并记录稳定 `fallbackReason`，不得静默退化。
- **FR-006**: 诊断事件 MUST 同时覆盖“构建期质量报告结果”和“运行时消费结果”，并可序列化到 Slim 证据。
- **FR-007**: 统一最小 IR（Static IR + Dynamic Trace）MUST 对齐同一 selector 锚点字段，避免并行真相源。
- **FR-008**: 事务窗口内 MUST 禁止 IO；本特性新增逻辑不得引入事务内异步/外部调用。
- **FR-009**: 业务侧 MUST 不可写 `SubscriptionRef`；若引入新的订阅消费接口，必须保持只读约束。
- **FR-010**: 若本特性引入破坏性变更，项目 MUST 提供迁移说明，不提供兼容层与弃用期。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 需建立可复现性能基线并给出 before/after 对比；`changesReadQueryWithMeta` 相关路径在默认配置下 p95 延迟与分配不得回归。
- **NFR-002**: `diagnostics=off` 时本特性额外开销必须接近零；禁止引入热路径常驻对象分配。
- **NFR-003**: 诊断事件必须 Slim 且可序列化，字段命名与口径在构建报告、运行时事件、Devtools 展示保持一致。
- **NFR-004**: 稳定标识必须去随机化，至少覆盖 `instanceId/txnSeq/opSeq/selectorId` 的跨运行可解释性要求。
- **NFR-005**: 文档必须提供统一心智模型（≤5关键词）、粗粒度成本模型与优化阶梯，并与报告字段一致。

### Key Entities _(include if feature involves data)_

- **SelectorQualityReport**: module/logic 编译期 selector 质量报告。
- **SelectorQualityEntry**: 单个 selector 的定级记录（lane/readsDigest/fallbackReason/strictGateVerdict）。
- **ReadQueryBuildConstraint**: 构建期 strict gate 约束快照。
- **ReadQueryRuntimeConsumptionRecord**: 运行时消费定级结果的最小证据条目。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 对纳入 O-009 范围的 module/logic，构建期可稳定产出 selector 质量报告，且同输入重复构建结果一致。
- **SC-002**: 运行时在“已定级 selector”路径中不再重复 strict gate 决策，相关热路径分支数量下降并可通过测试验证。
- **SC-003**: build-time gate、fallbackReason、运行时行为等价回归测试全部通过。
- **SC-004**: `pnpm typecheck`、`pnpm lint`、`pnpm test:turbo` 全部通过。
- **SC-005**: 形成可对比的性能证据，证明默认路径无回归，并能解释构建期前移后的治理成本变化。
