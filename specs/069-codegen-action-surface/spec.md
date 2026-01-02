# Feature Specification: CodeGen：可跳转的 Action Surface（actions/dispatchers/reducers）

**Feature Branch**: `[069-codegen-action-surface]`  
**Created**: 2026-01-02  
**Status**: Draft  
**Input**: User description: "把 actions/dispatchers/reducers/manifest 相关样板代码自动化生成，并优先保证 IDE 跳转回原模块定义（必要时接受跳到生成代码）。"

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 生成 action surface，减少手写样板 (Priority: P1)

作为业务/运行时贡献者，我希望能通过一次性/可重复的 codegen，在不牺牲可诊断性与协议一致性的前提下，自动生成/更新模块的 action surface（actions/dispatchers/reducers 相关模板代码与派生清单），从而把精力集中在业务逻辑上，而不是重复写机械代码。

**Why this priority**: 067 引入 token-first 的 action 锚点后，手写 actions/reducers/effects 的样板会明显增多；codegen 是长期黄金路径。

**Independent Test**: 在一个示例模块中运行一次 codegen，得到可编译的 actions/dispatchers/reducers 骨架；再次运行输出应 deterministic（可 diff），且不会破坏用户手写逻辑。

**Acceptance Scenarios**:

1. **Given** 一个按 067 约定定义的模块，**When** 运行 codegen，**Then** 生成/更新的产物可通过 typecheck 且输出 deterministic。
2. **Given** 用户在生成区域外写了自定义逻辑，**When** 反复运行 codegen，**Then** 用户代码不被覆盖且 diff 可解释。

---

### User Story 2 - 跳转体验优先回到原模块 (Priority: P2)

作为开发者，我更在意“从 dispatch 调用点跳到 action 定义点”。我希望 codegen 的设计优先保证 IDE F12/Find References 能跳回原模块文件的 action 定义；如果确实做不到，再退化为跳到生成文件，但必须提供清晰的“回链”指引（例如导出锚点/注释/约定）。

**Why this priority**: 这是本次 DX 改造的核心价值（可定位/可重命名/可审阅）。

**Independent Test**: 在 IDE 中从 `$.dispatchers.add(1)` 的 `add` 上执行跳转，验证落点优先为原模块定义；若落到 `.gen.ts`，仍可一跳定位到原模块锚点。

**Acceptance Scenarios**:

1. **Given** 一个模块使用 `$.dispatchers.<K>` 派发，**When** IDE 跳转到定义，**Then** 能定位到 `actions.<K>` 的定义锚点（原模块优先）。

---

### User Story 3 - 生成产物与 manifest/契约对齐 (Priority: P3)

作为平台/CI/Studio 的使用者，我希望 codegen 生成的派生产物（如 manifest 辅助信息、对外契约片段、quickstart 片段）与 067 的 ActionToken/ActionRef 语义保持单一事实源，避免出现“生成器真相源”和“运行时真相源”分裂。

**Why this priority**: 避免并行真相源，保证 full duplex 链路可回放。

**Independent Test**: codegen 输出与 `Reflection.extractManifest` 的结果可做一致性检查（至少 action 列表与 tag 规则一致）。

**Acceptance Scenarios**:

1. **Given** codegen 输出了 action 列表/摘要，**When** 与运行时反射提取结果对比，**Then** 关键字段一致（actionTag、payload 形态等）。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- codegen 输出与用户手写/重构发生冲突时如何处理（拒绝写入/提示手工介入/生成 patch）？
- 生成目标文件缺失/格式不符合约定时的行为（fail fast + 证据）。
- 多模块/多入口时的选择规则（优先单一事实源，避免“到处生成”）。

## Requirements _(mandatory)_

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系统 MUST 提供一个可重复执行的 codegen 入口（脚本/CLI），为采用 067 action surface 的模块生成/更新样板代码与必要派生物。
- **FR-002**: codegen 输出 MUST deterministic（稳定排序、稳定格式、无随机/时间字段），并且 diff 可解释。
- **FR-003**: codegen MUST 优先保证 IDE 跳转回原模块定义；若只能落到生成文件，MUST 提供可回链到原模块锚点的机制。
- **FR-004**: codegen MUST 明确“生成边界”：不得覆盖用户手写逻辑；冲突必须 fail fast 并给出证据。
- **FR-005**: codegen 产物与运行时反射/manifest 的语义 MUST 对齐（ActionToken/ActionRef 单一事实源）。

### Non-Functional Requirements (Performance & Diagnosability)

<!--
  If this feature touches Logix runtime hot paths, treat performance and
  diagnosability as first-class requirements:
  - Define budgets (time/alloc/memory) and how they are measured
  - Define what diagnostic events/Devtools surfaces exist and their overhead
-->

- **NFR-001**: System MUST define performance budgets for the affected hot paths
  and record a measurable baseline (benchmark/profile) before implementation.
- **NFR-002**: System MUST provide structured diagnostic signals for key state /
  flow transitions, and diagnostics MUST have near-zero overhead when disabled.
- **NFR-003**: System MUST use deterministic identifiers for instances/transactions
  in diagnostic and replay surfaces (no random/time defaults).
- **NFR-004**: System MUST enforce a synchronous transaction boundary: no IO/async
  work inside a transaction window, and no out-of-transaction write escape hatches.
- **NFR-005**: If this feature changes runtime performance boundaries or introduces
  an automatic policy, the project MUST update user-facing documentation to provide
  a stable mental model: (≤5 keywords), a coarse cost model, and an “optimization ladder”
  (default → observe → narrow writes → stable rowId → module/provider override & tuning → split/refactor).
  Vocabulary MUST stay aligned across docs, benchmarks, and diagnostic evidence fields.
- **NFR-006**: If this feature relies on internal hooks or cross-module collaboration
  protocols, the system MUST encapsulate them as explicit injectable contracts
  (Runtime Services) that are mockable per instance/session, and MUST support exporting
  slim, serializable evidence/IR for a controlled trial run in Node.js or browsers
  without relying on process-global singletons.
- **NFR-007**: If this feature introduces breaking changes, the project MUST provide a
  migration note (plan.md / PR) and MUST NOT keep compatibility layers or a deprecation
  period (forward-only evolution).

### Key Entities _(include if feature involves data)_

- **生成目标（Generation Target）**: 被写入/更新的源码文件与生成文件集合（原模块优先，其次 `.gen.ts`）。
- **锚点（Anchor）**: 用于跳转/引用/对齐的稳定位置（优先为 `actions.<K>` 定义行）。
- **派生物（Derived Artifacts）**: 与 manifest/quickstart/contracts 相关的可序列化产物（可选，按 ROI 分期）。

## Success Criteria _(mandatory)_

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 对同一输入反复运行 codegen，输出字节级一致（deterministic）。
- **SC-002**: 生成的 action surface 可通过 `pnpm typecheck`（或等价质量门），并能在最小示例中运行。
- **SC-003**: 从 `$.dispatchers.<K>(...)` 的 `<K>` 跳转到定义点：原模块优先；若落到生成文件，也能一跳回链到原模块锚点。
- **SC-004**: 生成边界清晰：用户手写逻辑不被覆盖；冲突有可解释失败策略与证据。
