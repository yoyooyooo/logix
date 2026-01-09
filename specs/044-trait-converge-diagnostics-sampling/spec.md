# Feature Specification: Trait 收敛诊断的低成本采样（计时/统计）

**Feature Branch**: `044-trait-converge-diagnostics-sampling`  
**Created**: 2025-12-27  
**Status**: Planned  
**Input**: User description: "Traits 收敛诊断的低成本采样（计时/统计）与生产可观测性"

## Assumptions

- diagnostics=off 仍代表“近零成本”：不开启任何采样/计时/对象分配。
- 本 spec 引入 `diagnostics=sampled` 档位，与既有 `off`/`light`/`full` 一起形成 `off/light/sampled/full` 四档：在比 full 更低的开销下，保留对性能长尾的可观测性（不追求逐 step 完整解释）。
- 采样结果必须可序列化、可对比、可被 Devtools 消费，并使用稳定标识（`instanceId/txnSeq/opSeq` 等）。

## Out of Scope

- 不在本特性中改变 `specs/039-trait-converge-int-exec-evidence/` 的“整型执行链路”与其证据门禁；本特性聚焦“计时/统计如何更低成本”。
- 不承诺在采样模式下提供与 full 等价的逐步因果链解释；采样只提供统计意义上的定位能力（Top-N/分位数/摘要）。
- 不把采样变成常驻的“暗开关”：off 就必须完全关闭。

## Dependencies

- 至少一个可复现的浏览器基线，用于量化 off/light/sampled/full 四档的 overhead 曲线（重点关注 sampled 相对 off/full 的收益）。
- 既有 `trait:*` 证据链路可用于承载采样摘要（或提供明确迁移方案）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 生产环境可低成本捕获长尾 (Priority: P1)

作为运行时维护者，我希望在生产/近生产环境中开启一种低成本的“采样诊断”模式，用极小的开销持续捕获收敛性能长尾信号，从而在出现抖动/回归时能定位“最可能的慢点”。

**Why this priority**: full 诊断往往开销不可接受，off 又完全失明；需要一个“纯赚”的中间档位。

**Independent Test**: 在固定基准下对比 sampled 与 off 的开销差值，并验证 sampled 能稳定产出可序列化摘要。

**Acceptance Scenarios**:

1. **Given** 启用 sampled 模式，**When** 运行高频收敛基准，**Then** 系统能输出采样摘要（例如 Top-N step/trait、采样次数、总览分位数）且可序列化。
2. **Given** 构造某个特定 trait 明显变慢的回归，**When** 运行基准并开启 sampled，**Then** 采样摘要能把该 trait 归入 Top-N（允许统计误差，但应在稳定阈值内）。

---

### User Story 2 - 诊断口径不漂移且可解释 (Priority: P2)

作为 Devtools/平台消费者，我希望 sampled 模式不会引入新的“黑盒口径”：它的输出字段含义稳定，且能解释采样策略（采样率/丢弃规则/是否触发降级）。

**Independent Test**: 切换不同采样策略/采样率，输出字段语义不变，且能从证据中读出本次的采样配置摘要。

**Acceptance Scenarios**:

1. **Given** 不同采样率配置，**When** 诊断开启，**Then** 证据摘要能解释本次采样率与有效样本数，不需要读代码才能理解。

---

### User Story 3 - off 档位保持近零成本 (Priority: P3)

作为业务开发者，我希望 diagnostics=off 仍是“近零成本”的默认选择，不会因为引入 sampled 而被迫承担常驻计时开销。

**Independent Test**: 在相同基线下，对比 off（新版本）与 off（旧版本）开销，确保无回归。

**Acceptance Scenarios**:

1. **Given** diagnostics=off，**When** 运行基准，**Then** 不产生采样分配/计时，且性能回归在阈值内。

---

### Edge Cases

- 采样率极低时（样本很少），如何避免输出误导性结论？
- 在发生 budget_exceeded/runtime_error 等降级时，采样摘要如何与降级证据对齐？
- sampled 与 light/full 同时启用时，优先级与字段裁剪如何裁决？

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统必须提供一种“采样诊断模式”，用于对 trait 收敛过程的计时/统计进行抽样采集，并输出 Slim、可序列化的摘要证据。
- **FR-002**: 系统必须支持配置采样策略（至少：采样率/采样间隔），并在证据中输出本次生效配置的摘要（避免口径漂移）。
- **FR-003**: 系统必须保证 diagnostics=off 时完全不启用采样能力（近零成本），且默认行为不变。
- **FR-004**: 系统必须保证采样证据使用稳定标识（`instanceId/txnSeq/opSeq` 等），并可用于跨版本/跨跑道对比。
- **FR-005**: 若采样摘要需要新增/调整证据字段，必须遵守单一事实源：协议/schema 的裁决只能落在对应 SSoT（不得在 feature 目录复制一份 schema）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 系统必须为 sampled 模式定义 overhead 预算，并在实现前后提供可复现基线以验证“采样是纯赚”（或至少不负优化）。
- **NFR-002**: sampled 模式的额外开销必须显著低于 full（以 time/alloc 的对比证据裁决）。
- **NFR-003**: diagnostics=off 的额外开销必须接近零。
- **NFR-004**: 必须保持同步事务边界：采样不得引入事务窗口内的 IO/async。
- **NFR-005**: 若采样引入新的用户可见口径（例如新增档位/字段），必须同步更新对外文档的心智模型与术语。

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: sampled 模式相对 off 的额外开销在目标基线下可度量且满足预算（不引入明显长尾）。
- **SC-002**: sampled 模式相对 full 的开销显著更低（time/alloc），且在注入“单 trait 变慢”的场景下能稳定把目标归入 Top-N（允许统计误差）。
- **SC-003**: diagnostics=off 在新版本中仍保持近零开销（无回归）。

## Notes

- 与 `specs/039-trait-converge-int-exec-evidence/` 的关系：039 解决执行链路本身的性能与证据门禁；本特性解决“诊断计时/统计本身如何足够便宜”，避免“为了观测而伤害被观测对象”。
