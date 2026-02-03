# Feature Specification: Platform-Grade Rewriter MVP（受限子集重写器：最小补丁回写）

**Feature Branch**: `082-platform-grade-rewriter-mvp`  
**Created**: 2026-01-09  
**Status**: Done  
**Input**: 为“全双工前置”建立 Platform-Grade 子集的最小回写能力：基于解析出的锚点索引与补全候选，生成最小且可解释的源码补丁；当存在歧义/冲突/风险时显式失败或降级为 report-only，避免 silent corruption。

## Context

平台要做到“单一真相源”，就必须能把结论写回源码，而不是把结论长期存放在 sidecar/缓存里。

但源码回写属于高风险能力：如果补丁不稳定、改动面过大、或在不确定情况下乱写，会直接破坏全双工的可信度与可回放性。

因此本 spec 的核心不是“能改”，而是“**只在高置信度且改动最小时改**；否则明确拒绝并解释原因”。

## Clarifications

### Session 2026-01-09

- AUTO: Q: 幂等的判定标准？→ A: 字节级无变化（write-back 后再次运行应产生 0 diff）。
- AUTO: Q: plan→write 竞态如何处理？→ A: write-back 前必须校验目标文件 digest 与 plan 时一致；不一致必须失败（禁止强行覆盖）。
- AUTO: Q: 风格/格式策略？→ A: 最小 diff + 尽量保持原文件风格；不强制全文件 reprint/format，做不到则拒绝写回。

## Goals / Scope

### In Scope

- 支持对 Platform-Grade 子集内的少量“锚点字段缺口”做最小回写（典型例：补齐 `services`、补齐定位元数据等）。
- 支持对 Platform-Grade 子集内的 WorkflowDef 做最小回写：当缺少 `steps[*].key`（stepKey）且可被确定性补全时，只补齐缺失字段；当存在重复 key 时只报告并拒绝写回（宁可不改）。
- 生成补丁必须满足：确定性、最小 diff、幂等（重复执行不产生新差异）。
- 冲突/歧义必须显式失败，并输出结构化原因（reason codes），支持 CI/Devtools 门禁与人工修复。

### Out of Scope

- 不做“任意 TS 代码”层面的无损 roundtrip。
- 不做业务逻辑的语义级重写（只改锚点字段/元数据，不改业务计算语句）。
- 不解决 merge/rebase 冲突（只在单文件可控范围内给出补丁或失败）。

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 对缺失锚点字段生成最小可审阅补丁（只改缺失，不覆盖已有） (Priority: P1)

作为平台/工具链维护者，我希望当某个模块缺失必要锚点字段且缺口可高置信度确定时，系统能生成一份最小源码补丁，并保证不会覆盖作者已有声明；这样平台可以把“缺口”在一次提交里闭环回写，保持单一真相源。

**Why this priority**: 没有安全回写能力，自动补全永远只能停留在报告层，长期必然产生并行真相源与解释漂移。

**Independent Test**: 对同一输入源码重复生成补丁，补丁内容一致；应用补丁后再次生成无新差异；对已声明字段补丁为空。

**Acceptance Scenarios**:

1. **Given** 模块缺失 `services` 或定位元数据，**When** 生成补丁并应用，**Then** 源码只新增缺失字段，原有代码不被重排/改写，且重复运行幂等。
2. **Given** 模块已显式声明对应字段，**When** 生成补丁，**Then** 补丁为空并在报告中标记为“已声明，跳过”。

3. **Given** WorkflowDef 的某些 steps 缺少 `key`，且 `079` 已产出确定性的补全候选，**When** 生成补丁并应用，**Then** 只对缺失 `key` 的 step 做最小写入，且重复运行幂等（第二次 0 diff）。

---

### User Story 2 - 发生歧义/冲突时必须显式失败并可解释（宁可不改） (Priority: P1)

作为仓库维护者，我希望当系统无法确定改动点、或存在多种合理写入方式、或检测到可能破坏语义/格式的风险时，系统必须拒绝自动回写，并给出结构化原因与人工修复建议（宁可错过不可乱补）。

**Why this priority**: 回写错误会产生“看似修复、实际引入更深漂移”的系统性风险。

**Independent Test**: 构造一个存在多个候选插入点/语法形态不稳定的例子，系统必须失败并输出 reason codes，而不是写出不可信补丁。

**Acceptance Scenarios**:

1. **Given** 存在多个可插入点或结构不稳定，**When** 生成补丁，**Then** 显式失败并输出 reason codes + 可行动建议。

---

### User Story 3 - 支持 report-only 模式，便于审阅与门禁化 (Priority: P2)

作为平台/CI 使用者，我希望可以先以 report-only 方式运行：只输出“将会修改什么/为什么/在哪里”，不写回源码；这样可以在写回前审阅并作为门禁输入。

**Why this priority**: 自动回写需要审阅与可控推进；report-only 是安全推进的基础。

**Independent Test**: 同一输入下，report-only 与 write 模式产出的“拟修改摘要”一致；write 模式额外提供补丁/写回结果。

## Edge Cases

- 格式/注释/换行风格差异：补丁必须最小化改动面，避免无关格式噪音。
- 目标字段已存在但为 `{}`（作者显式声明为空）：视为已声明，禁止自动补全覆盖。
- 目标对象定义跨多处构造（动态组合）：必须拒绝回写并降级为 report-only。
- 同一文件多个模块/多处可写入：必须有稳定、可解释的 disambiguation；否则失败。
- plan 与 write 分离导致竞态：若磁盘文件在 Plan 与 Write 之间发生变化，必须拒绝写回并给出可解释原因（禁止强行覆盖）。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统 MUST 仅对 Platform-Grade 子集内的可控结构生成补丁；对子集外形态 MUST 显式失败或降级为 report-only。
- **FR-002**: 系统 MUST 支持最小范围的锚点字段回写（只补缺失字段），并保证不覆盖/不修改作者已有声明。
- **FR-003**: 系统 MUST 生成确定性补丁：稳定排序、稳定写入位置规则；在同一输入下重复生成一致。
- **FR-004**: 系统 MUST 保证幂等：应用补丁后再次生成补丁为空或无新差异（以字节级无变化为判定标准）。
- **FR-005**: 系统 MUST 提供 report-only 模式：仅输出拟修改清单与原因，不写回源码。
- **FR-006**: 系统 MUST 在歧义/冲突/风险时显式失败，并输出结构化 reason codes 与可行动建议。
- **FR-007**: 系统 MUST 防止 plan→write 竞态：write-back 前必须校验目标文件内容与 plan 时一致（基于可复现 digest）；不一致必须 fail（禁止强行覆盖）。

### Non-Functional Requirements (Performance & Diagnosability)

- **NFR-001**: 补丁生成与报告 MUST slim 且可序列化（JSON），便于 CI/Devtools 消费与门禁化。
- **NFR-002**: 回写行为 MUST 最小化改动面：不得引入与锚点补全无关的语义或格式变更。
- **NFR-003**: 默认不得引入运行时常驻成本；回写能力属于构建期/平台工具链按需能力。

### Key Entities _(include if feature involves data)_

- **Patch Plan**: 结构化的“拟修改计划”（位置、字段、原因），可用于 report-only 与写回执行。
- **Reason Codes**: 对失败/跳过/降级原因的枚举，支撑可解释与门禁化。
- **Idempotent Write-Back**: 以幂等为核心的回写语义，避免重复运行产生 diff 噪音。

## Success Criteria _(mandatory)_

- **SC-001**: 对代表性缺口（缺失 `services`/定位元数据）能生成最小补丁并成功写回；重复运行无新差异（幂等）。
- **SC-002**: 对任何存在歧义/动态组合/子集外形态的输入，系统不写回并给出结构化原因（宁可不改）。
- **SC-003**: report-only 模式输出可直接用于 CI/Devtools：包含拟修改清单、跳过清单、失败清单及 reason codes。
- **SC-004**: 当 plan→write 间文件变化（竞态）发生时，系统拒绝写回并输出可解释失败（reason codes 可门禁化）。
